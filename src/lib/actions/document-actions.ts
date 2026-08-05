"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import path from "path";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { uploadFile, deleteFiles, APPLICATION_BUCKET } from "@/lib/storage";
import { productDef, docsFor } from "@/lib/products";
import { getDict } from "@/i18n/server";
import type { FormState } from "./auth-actions";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/**
 * Uploads one supporting document. One file per request keeps every upload well
 * inside the request body limit — a mortgage can ask for ten documents, which
 * would never fit in a single submission.
 */
export async function uploadApplicationDocumentAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const t = await getDict();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.status !== "ACTIVE" || isAdmin(user.role)) redirect("/login");

  const applicationId = String(formData.get("applicationId") ?? "");
  const docKey = String(formData.get("docKey") ?? "");

  const app = await db.productApplication.findFirst({
    where: { id: applicationId, userId: user.id },
  });
  if (!app) return { error: t.docs.uploadFailed };

  // Only accept a document this product actually asks for.
  const def = productDef(user.accountType, app.productKey);
  if (!def || !docsFor(def, app.details).some((d) => d.key === docKey)) {
    return { error: t.docs.uploadFailed };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: t.errors.needFile };
  if (file.size > MAX_UPLOAD_BYTES) return { error: t.errors.fileTooBig };
  if (!ALLOWED_MIME.includes(file.type)) return { error: t.errors.fileType };

  // Store the replacement BEFORE discarding the version already on file, so a
  // failed upload can't leave the applicant with nothing and no explanation.
  const ext = path.extname(file.name).toLowerCase() || ".bin";
  const storedName = `${randomBytes(16).toString("hex")}${ext}`;
  try {
    await uploadFile(
      APPLICATION_BUCKET,
      storedName,
      Buffer.from(await file.arrayBuffer()),
      file.type
    );
  } catch {
    return { error: t.errors.uploadFailed };
  }

  // Re-uploading replaces the previous version rather than stacking copies.
  const previous = await db.applicationDocument.findMany({
    where: { applicationId: app.id, docKey },
  });
  if (previous.length > 0) {
    await deleteFiles(APPLICATION_BUCKET, previous.map((d) => d.storedName)).catch(() => {});
    await db.applicationDocument.deleteMany({ where: { id: { in: previous.map((d) => d.id) } } });
  }

  await db.applicationDocument.create({
    data: {
      applicationId: app.id,
      docKey,
      fileName: file.name,
      storedName,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  });

  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: "APPLICATION_DOC_UPLOADED",
    targetType: "APPLICATION",
    targetId: app.id,
    details: `${app.productKey}: ${docKey} (${Math.round(file.size / 1024)} KB)`,
  });

  revalidatePath(`/product/${app.productKey}`);
  revalidatePath("/admin/applications");
  return { ok: t.docs.uploaded };
}

/** Removes a document the applicant uploaded by mistake. */
export async function deleteApplicationDocumentAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const docId = String(formData.get("docId") ?? "");
  const doc = await db.applicationDocument.findUnique({
    where: { id: docId },
    include: { application: true },
  });
  if (!doc) return;

  const admin = isAdmin(user.role);
  if (!admin && doc.application.userId !== user.id) return;

  await deleteFiles(APPLICATION_BUCKET, [doc.storedName]);
  await db.applicationDocument.delete({ where: { id: doc.id } });

  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: "APPLICATION_DOC_DELETED",
    targetType: "APPLICATION",
    targetId: doc.applicationId,
    details: `${doc.application.productKey}: ${doc.docKey} ${doc.fileName}`,
  });

  revalidatePath(`/product/${doc.application.productKey}`);
  revalidatePath("/admin/applications");
}

// ---------- admin ----------

/** Purges every document on an application once the decision is made. */
export async function purgeApplicationDocumentsAction(formData: FormData) {
  const admin = await getSessionUser();
  if (!admin || !isAdmin(admin.role)) return;

  const applicationId = String(formData.get("applicationId") ?? "");
  const docs = await db.applicationDocument.findMany({ where: { applicationId } });
  if (docs.length === 0) return;

  await deleteFiles(APPLICATION_BUCKET, docs.map((d) => d.storedName));
  await db.applicationDocument.deleteMany({ where: { applicationId } });

  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: "APPLICATION_DOCS_PURGED",
    targetType: "APPLICATION",
    targetId: applicationId,
    details: `Deleted ${docs.length} document(s): ${docs
      .map((d) => `${d.docKey}/${d.fileName}`)
      .join("; ")}`,
  });

  revalidatePath("/admin/applications");
}

/** Asks the applicant for something extra, with a note explaining what. */
export async function requestApplicationDocumentsAction(formData: FormData) {
  const admin = await getSessionUser();
  if (!admin || !isAdmin(admin.role)) return;

  const applicationId = String(formData.get("applicationId") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;

  const app = await db.productApplication.findUnique({
    where: { id: applicationId },
    include: { user: true },
  });
  if (!app) return;

  await db.productApplication.update({
    where: { id: applicationId },
    data: { docsRequestedAt: new Date(), docsNote: note },
  });

  await db.notification.create({
    data: {
      userId: app.userId,
      title: "We need a document for your application",
      body: note
        ? `To continue reviewing your application we need: ${note}. You can upload it from the product page.`
        : "To continue reviewing your application we need another document. You can upload it from the product page.",
    },
  });

  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: "APPLICATION_DOCS_REQUESTED",
    targetType: "APPLICATION",
    targetId: applicationId,
    details: note ?? "Documents requested",
  });

  revalidatePath("/admin/applications");
  revalidatePath(`/product/${app.productKey}`);
}
