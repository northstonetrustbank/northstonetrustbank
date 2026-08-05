import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth";
import { downloadFile, APPLICATION_BUCKET } from "@/lib/storage";

// Serves supporting documents from private storage. Only admins and the
// applicant who uploaded the file may read it.
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { name } = await params;
  // storedName is hex + extension; reject anything else to prevent traversal.
  if (!/^[a-f0-9]{32}\.[a-z0-9]{2,5}$/i.test(name)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const doc = await db.applicationDocument.findFirst({
    where: { storedName: name },
    include: { application: { select: { userId: true } } },
  });
  if (!doc) return new NextResponse("Not found", { status: 404 });

  if (!isAdmin(session.role) && doc.application.userId !== session.userId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const data = await downloadFile(APPLICATION_BUCKET, name);
  if (!data) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${doc.fileName.replace(/[^\w.\- ]/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
