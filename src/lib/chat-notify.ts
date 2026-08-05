import "server-only";
import { db } from "./db";
import { sendEmail } from "./email";

// Nobody watches the admin panel all day, so a chat that arrives while the tab
// is closed would otherwise sit unanswered. This emails the support inbox when
// a visitor needs attention.

/** Where chat alerts go. Overridable without a deploy. */
const NOTIFY_TO = process.env.CHAT_NOTIFY_EMAIL ?? "info@northstonetrustbank.com";

/** A busy conversation shouldn't send an alert per message. */
const QUIET_MINUTES = 15;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appUrl() {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://northstonetrustbank.com"
  );
}

/**
 * Emails support about a chat. Always fires for a new conversation; for
 * follow-up messages it stays quiet if we already alerted recently, so a
 * visitor typing six lines produces one email rather than six.
 *
 * Never throws: a failed alert must not stop a visitor sending their message.
 */
export async function notifyAdminsOfChat(conversationId: string, isNew: boolean) {
  try {
    const convo = await db.chatConversation.findUnique({
      where: { id: conversationId },
      include: {
        user: { select: { email: true, firstName: true, lastName: true, status: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!convo) return;

    if (!isNew && convo.lastNotifiedAt) {
      const quietUntil = convo.lastNotifiedAt.getTime() + QUIET_MINUTES * 60 * 1000;
      if (Date.now() < quietUntil) return;
    }

    const latest = convo.messages[0]?.body ?? "";
    const who = convo.user
      ? `${convo.user.firstName} ${convo.user.lastName} (client · ${convo.user.email})`
      : convo.name;

    const identifiers = [
      convo.email ? `Email: ${convo.email}` : null,
      convo.phone ? `Phone: ${convo.phone}` : null,
      convo.cardLast4 ? `Card ending: ${convo.cardLast4}` : null,
    ].filter(Boolean) as string[];

    const subject = isNew
      ? `New live chat — ${who}`
      : `New chat message — ${who}`;

    await sendEmail({
      to: NOTIFY_TO,
      subject,
      replyTo: convo.email ?? convo.user?.email ?? undefined,
      html: `
        <p><strong>${escapeHtml(who)}</strong> ${
          isNew ? "started a live chat." : "sent a new message."
        }</p>
        ${identifiers.length ? `<p>${identifiers.map(escapeHtml).join("<br />")}</p>` : ""}
        <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #046BD4;
                            background:#EFF5FC;white-space:pre-wrap">${escapeHtml(latest)}</blockquote>
        <p><a href="${appUrl()}/admin/chat">Open the chat console</a> to reply.</p>
        <p style="color:#5b6577;font-size:13px">Replying to this email does not reach the visitor —
        they are waiting in the chat window.</p>
      `,
    });

    await db.chatConversation.update({
      where: { id: conversationId },
      data: { lastNotifiedAt: new Date() },
    });
  } catch {
    // Deliberately swallowed — see the doc comment.
  }
}
