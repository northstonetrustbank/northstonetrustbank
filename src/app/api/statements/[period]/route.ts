import { NextResponse } from "next/server";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { ensureAccount, getSavings } from "@/lib/bank";
import { parsePeriod, statementForAccount } from "@/lib/statements";

// CSV export of one month's ledger, for the signed-in client only.

function csvCell(value: string | number) {
  const s = String(value);
  // Guard against spreadsheet formula injection, but leave plain numbers
  // (including negative amounts) alone so they stay numeric in a spreadsheet.
  const isNumber = /^-?\d+(\.\d+)?$/.test(s);
  const safe = !isNumber && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ period: string }> }) {
  const user = await getSessionUser();
  if (!user || isAdmin(user.role) || user.status !== "ACTIVE") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { period } = await params;
  const p = parsePeriod(period);
  if (!p) return new NextResponse("Invalid period", { status: 400 });

  const [checking, savings] = await Promise.all([ensureAccount(user.id), getSavings(user.id)]);
  const accounts = [checking, ...(savings ? [savings] : [])];

  const lines = ["Account,Account number,Date,Type,Reference,Note,Amount,Currency"];
  for (const account of accounts) {
    const { rows } = await statementForAccount(account.id, p);
    for (const tx of rows) {
      lines.push(
        [
          csvCell(account.kind),
          csvCell(account.number),
          csvCell((tx.postedAt ?? tx.createdAt).toISOString().slice(0, 10)),
          csvCell(tx.type),
          csvCell(tx.reference),
          csvCell(tx.note ?? ""),
          csvCell((tx.amountCents / 100).toFixed(2)),
          csvCell(account.currency),
        ].join(",")
      );
    }
  }

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="northstone-statement-${period}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
