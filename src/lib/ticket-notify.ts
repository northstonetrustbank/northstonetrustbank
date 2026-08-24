import "server-only";
import { sendEmail } from "./email";

// A ticket that nobody sees is worse than no ticket at all — the client is
// told a person will read it. This alerts the support inbox as soon as one
// arrives, using the same mailbox as the chat alerts.

const NOTIFY_TO = process.env.CHAT_NOTIFY_EMAIL ?? "info@northstonetrustbank.com";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appUrl() {
  return (
    process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://northstonetrustbank.com"
  );
}

/**
 * Tells support a ticket needs attention. Never throws — a failed alert must
 * not cost the client their ticket, which is already saved by the time this
 * runs.
 */
export async function notifyNewTicket(
  reference: string,
  category: string,
  subject: string,
  clientEmail: string
) {
  try {
    const link = `${appUrl()}/admin/tickets`;
    await sendEmail({
      to: NOTIFY_TO,
      subject: `Support ticket ${reference} — ${subject.slice(0, 60)}`,
      html: `
        <p><strong>${escapeHtml(reference)}</strong> · ${escapeHtml(category)}</p>
        <p>${escapeHtml(subject)}</p>
        <p>From: ${escapeHtml(clientEmail)}</p>
        <p><a href="${link}">Open the support console</a></p>
      `,
    });
  } catch {
    // Alerting is best-effort by design.
  }
}
