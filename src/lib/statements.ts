import "server-only";
import { db } from "./db";

// Monthly statements are derived from the ledger — nothing is stored. A period
// is a calendar month in UTC, written "YYYY-MM".

export type Period = { year: number; month: number }; // month is 1-12

export function parsePeriod(value: string): Period | null {
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12 || year < 2000 || year > 2999) return null;
  return { year, month };
}

export function formatPeriod(p: Period) {
  return `${p.year}-${String(p.month).padStart(2, "0")}`;
}

export function periodRange(p: Period) {
  const start = new Date(Date.UTC(p.year, p.month - 1, 1));
  const end = new Date(Date.UTC(p.year, p.month, 1));
  return { start, end };
}

/** Every month that has at least one posted ledger row, newest first. */
export async function statementPeriods(userId: string): Promise<Period[]> {
  const rows = await db.transaction.findMany({
    where: { account: { userId }, status: "POSTED" },
    select: { postedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });
  const seen = new Map<string, Period>();
  for (const r of rows) {
    const d = r.postedAt ?? r.createdAt;
    const p = { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
    seen.set(formatPeriod(p), p);
  }
  return [...seen.values()].sort((a, b) => b.year - a.year || b.month - a.month);
}

/** Opening balance, closing balance and rows for one account in one month. */
export async function statementForAccount(accountId: string, p: Period) {
  const { start, end } = periodRange(p);
  // A handful of older rows have no postedAt, so fall back to createdAt.
  const before = {
    OR: [{ postedAt: { lt: start } }, { postedAt: null, createdAt: { lt: start } }],
  };
  const within = {
    OR: [
      { postedAt: { gte: start, lt: end } },
      { postedAt: null, createdAt: { gte: start, lt: end } },
    ],
  };
  const [openingAgg, rows] = await Promise.all([
    db.transaction.aggregate({
      where: { accountId, status: "POSTED", ...before },
      _sum: { amountCents: true },
    }),
    db.transaction.findMany({
      where: { accountId, status: "POSTED", ...within },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const opening = openingAgg._sum.amountCents ?? 0;
  const movement = rows.reduce((sum, r) => sum + r.amountCents, 0);
  const credits = rows.filter((r) => r.amountCents > 0).reduce((s, r) => s + r.amountCents, 0);
  const debits = rows.filter((r) => r.amountCents < 0).reduce((s, r) => s + r.amountCents, 0);
  return { opening, closing: opening + movement, credits, debits, rows };
}
