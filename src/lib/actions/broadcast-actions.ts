"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sendBroadcastEmail } from "@/lib/email";
import type { FormState } from "./auth-actions";

const FROM_ADDRESSES: Record<string, string> = {
  info: "Northstone Trust Bank <info@northstonetrustbank.com>",
  support: "Northstone Trust Bank <support@northstonetrustbank.com>",
  accountmanager: "Northstone Trust Bank <accountmanager@northstonetrustbank.com>",
};

const REPLY_TO: Record<string, string> = {
  info: "info@northstonetrustbank.com",
  support: "support@northstonetrustbank.com",
  accountmanager: "accountmanager@northstonetrustbank.com",
};

async function requireAdmin() {
  const admin = await getSessionUser();
  if (!admin || !isAdmin(admin.role) || admin.status !== "ACTIVE") {
    throw new Error("Not authorized");
  }
  return admin;
}

// Resolve the recipient filter for a chosen audience.
function audienceWhere(audience: string, singleEmail: string) {
  switch (audience) {
    case "ACTIVE":
      return { role: "CLIENT", status: "ACTIVE" };
    case "PENDING":
      return { role: "CLIENT", status: "PENDING" };
    case "BLOCKED":
      return { role: "CLIENT", status: "BLOCKED" };
    case "PERSONAL":
      return { role: "CLIENT", accountType: "PERSONAL", status: "ACTIVE" };
    case "COMMERCIAL":
      return { role: "CLIENT", accountType: "COMMERCIAL", status: "ACTIVE" };
    case "SINGLE":
      return { role: "CLIENT", email: singleEmail };
    case "ALL":
    default:
      return { role: "CLIENT" };
  }
}

export async function sendBroadcastAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const admin = await requireAdmin();

  const viaEmail = formData.get("channelEmail") === "on";
  const viaNotification = formData.get("channelNotification") === "on";
  const audience = String(formData.get("audience") ?? "ALL");
  const singleEmail = String(formData.get("singleEmail") ?? "").trim().toLowerCase();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const fromKey = String(formData.get("from") ?? "info");
  const fromAddress = FROM_ADDRESSES[fromKey] ?? FROM_ADDRESSES.info;
  const replyTo = REPLY_TO[fromKey] ?? REPLY_TO.info;

  if (!viaEmail && !viaNotification) {
    return { error: "Choose at least one channel (email or notification)." };
  }
  if (!subject) return { error: "Enter a subject / title." };
  if (!body) return { error: "Enter a message." };
  if (audience === "SINGLE" && !singleEmail) {
    return { error: "Enter the client's email address." };
  }

  const recipients = await db.user.findMany({
    where: audienceWhere(audience, singleEmail),
    select: { id: true, email: true, firstName: true, locale: true },
  });

  if (recipients.length === 0) {
    return { error: "No clients match that audience." };
  }

  // In-app notifications: one row per recipient.
  if (viaNotification) {
    await db.notification.createMany({
      data: recipients.map((r) => ({ userId: r.id, title: subject, body })),
    });
  }

  // Emails: branded HTML wrapper around the plain-text message.
  let emailOk = 0;
  let emailFail = 0;
  if (viaEmail) {
    for (const r of recipients) {
      const res = await sendBroadcastEmail(r.email, subject, body, {
        from: fromAddress,
        replyTo,
        locale: r.locale,
      });
      if (res.ok) emailOk++;
      else emailFail++;
    }
  }

  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: "BROADCAST_SENT",
    targetType: "AUDIENCE",
    targetId: audience,
    details: `"${subject}" to ${recipients.length} client(s) — ${
      viaNotification ? "notification" : ""
    }${viaNotification && viaEmail ? " + " : ""}${viaEmail ? `email (${emailOk} sent, ${emailFail} failed)` : ""}`,
  });

  revalidatePath("/admin/messages");

  const parts: string[] = [];
  if (viaNotification) parts.push(`${recipients.length} notification(s)`);
  if (viaEmail) parts.push(`${emailOk} email(s)${emailFail ? `, ${emailFail} failed` : ""}`);
  return { ok: `Sent: ${parts.join(" and ")}.` };
}

// Client marks their unread notifications as read (called when the panel opens).
export async function markNotificationsReadAction() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard");
}
