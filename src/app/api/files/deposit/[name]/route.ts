import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth";
import { downloadFile, DEPOSIT_BUCKET } from "@/lib/storage";

// Serves deposit proof uploads from private Supabase Storage. Only admins and
// the deposit's owner may view.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { name } = await params;
  if (!/^[a-f0-9]{32}\.[a-z0-9]{2,5}$/i.test(name)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const tx = await db.transaction.findFirst({
    where: { proofStoredName: name },
    include: { account: true },
  });
  if (!tx) return new NextResponse("Not found", { status: 404 });

  if (!isAdmin(session.role) && tx.account.userId !== session.userId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const data = await downloadFile(DEPOSIT_BUCKET, name);
  if (!data) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": tx.proofMimeType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${(tx.proofFileName ?? name).replace(/[^\w.\- ]/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
