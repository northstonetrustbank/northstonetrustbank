import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth";
import { downloadFile, KYC_BUCKET } from "@/lib/storage";

// Serves KYC uploads from private Supabase Storage. Only admins and the
// document's owner may view a file.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { name } = await params;
  // storedName is a hex string + extension; reject anything else to prevent
  // path traversal.
  if (!/^[a-f0-9]{32}\.[a-z0-9]{2,5}$/i.test(name)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const doc = await db.kycDocument.findFirst({ where: { storedName: name } });
  if (!doc) return new NextResponse("Not found", { status: 404 });

  if (!isAdmin(session.role) && doc.userId !== session.userId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const data = await downloadFile(KYC_BUCKET, name);
  if (!data) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${doc.fileName.replace(/[^\w.\- ]/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
