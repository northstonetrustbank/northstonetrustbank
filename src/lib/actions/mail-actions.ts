"use server";

import { getSessionUser, isAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sendBroadcastEmail } from "@/lib/email";
import { MAILBOX_ADDRESSES } from "@/lib/mailbox";
import type { FormState } from "./auth-actions";

async function requireAdmin() {
  const admin = await getSessionUser();
  if (!admin || !isAdmin(admin.role) || admin.status !== "ACTIVE") {
    throw new Error("Not authorized");
  }
  return admin;
}

export async function replyMailAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();

  const box = String(formData.get("box") ?? "");
  const to = String(formData.get("to") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  const mailbox = MAILBOX_ADDRESSES[box];
  if (!mailbox) return { error: "Unknown mailbox." };
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { error: "Invalid recipient address." };
  if (!subject) return { error: "Enter a subject." };
  if (!body) return { error: "Enter a reply." };

  const res = await sendBroadcastEmail(to, subject, body, {
    from: `Northstone Trust Bank <${mailbox}>`,
    replyTo: mailbox,
  });

  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: "MAIL_REPLIED",
    targetType: "MAILBOX",
    targetId: box,
    details: `Reply from ${mailbox} to ${to}: "${subject}"${res.ok ? "" : " (send failed)"}`,
  });

  if (!res.ok) return { error: `Could not send: ${res.error ?? "unknown error"}` };
  return { ok: "Reply sent." };
}
