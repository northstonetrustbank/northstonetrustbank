"use server";

import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { getDict } from "@/i18n/server";
import type { FormState } from "./auth-actions";

const TOPICS = ["GENERAL", "ACCOUNT", "APPLICATION", "DEPOSIT", "COMPLAINT"] as const;

// General enquiries go to info@, everything else to the team that owns it.
// The message arrives in the admin inbox like any other mail, with the sender
// set as reply-to, so replying from there reaches the enquirer directly.
const ROUTING: Record<string, string> = {
  GENERAL: "info@northstonetrustbank.com",
  ACCOUNT: "support@northstonetrustbank.com",
  APPLICATION: "accountmanager@northstonetrustbank.com",
  DEPOSIT: "support@northstonetrustbank.com",
  COMPLAINT: "support@northstonetrustbank.com",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendContactMessageAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const t = await getDict();

  // Honeypot: a field hidden from people but filled in by most bots. Pretend
  // it worked rather than telling the bot it was caught.
  if (String(formData.get("company") ?? "").trim() !== "") {
    return { ok: t.contactPage.sent };
  }

  const parsed = z
    .object({
      name: z.string().trim().min(1).max(120),
      email: z.string().trim().toLowerCase().email(),
      topic: z.enum(TOPICS).catch("GENERAL"),
      message: z.string().trim().min(1).max(4000),
    })
    .safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      topic: formData.get("topic"),
      message: formData.get("message"),
    });

  if (!parsed.success) {
    const badEmail = parsed.error.issues.some((i) => i.path[0] === "email");
    return { error: badEmail ? t.contactPage.errorEmail : t.contactPage.errorRequired };
  }

  const { name, email, topic, message } = parsed.data;
  const topicLabel = t.contactPage.topics[topic as keyof typeof t.contactPage.topics] ?? topic;

  const html = `
    <p><strong>${escapeHtml(topicLabel)}</strong> — website contact form</p>
    <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
    <hr />
    <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
  `;

  try {
    await sendEmail({
      to: ROUTING[topic] ?? ROUTING.GENERAL,
      subject: `[Website] ${topicLabel} — ${name}`,
      html,
      replyTo: email,
    });
  } catch {
    return { error: t.contactPage.errorFailed };
  }

  return { ok: t.contactPage.sent };
}
