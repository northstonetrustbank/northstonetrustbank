import "server-only";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

// Reads the company mailboxes over IMAP so admins can view and reply to
// incoming client mail from the portal. All three share one password.
export const MAILBOX_ADDRESSES: Record<string, string> = {
  info: "info@northstonetrustbank.com",
  support: "support@northstonetrustbank.com",
  accountmanager: "accountmanager@northstonetrustbank.com",
};

export type MailboxKey = keyof typeof MAILBOX_ADDRESSES;

export type MailSummary = {
  uid: number;
  subject: string;
  fromName: string;
  fromAddress: string;
  date: string | null;
  seen: boolean;
};

export type MailFull = {
  uid: number;
  subject: string;
  fromName: string;
  fromAddress: string;
  date: string | null;
  text: string;
  messageId: string;
};

function imapHost() {
  return process.env.IMAP_HOST ?? process.env.SMTP_HOST ?? "mail.spacemail.com";
}

function newClient(user: string) {
  const pass = process.env.SMTP_PASSWORD;
  if (!pass) throw new Error("SMTP_PASSWORD is not set");
  return new ImapFlow({
    host: imapHost(),
    port: Number(process.env.IMAP_PORT ?? 993),
    secure: true,
    auth: { user, pass },
    logger: false,
    // Fail fast rather than hang a serverless function.
    socketTimeout: 15000,
  });
}

/** Last `limit` messages in a mailbox's INBOX, newest first. */
export async function listMessages(box: string, limit = 25): Promise<MailSummary[]> {
  const user = MAILBOX_ADDRESSES[box];
  if (!user) return [];

  const client = newClient(user);
  await client.connect();
  try {
    const mb = await client.mailboxOpen("INBOX", { readOnly: true });
    const total = mb.exists;
    if (total === 0) return [];

    const start = Math.max(1, total - limit + 1);
    const out: MailSummary[] = [];
    for await (const msg of client.fetch(`${start}:*`, { envelope: true, flags: true, uid: true })) {
      out.push({
        uid: msg.uid,
        subject: msg.envelope?.subject || "(no subject)",
        fromName: msg.envelope?.from?.[0]?.name || "",
        fromAddress: msg.envelope?.from?.[0]?.address || "",
        date: msg.envelope?.date ? msg.envelope.date.toISOString() : null,
        seen: msg.flags?.has("\\Seen") ?? false,
      });
    }
    out.reverse();
    return out;
  } finally {
    await client.logout().catch(() => {});
  }
}

/** Full parsed message (plain text only, for safe display). */
export async function getMessage(box: string, uid: number): Promise<MailFull | null> {
  const user = MAILBOX_ADDRESSES[box];
  if (!user) return null;

  const client = newClient(user);
  await client.connect();
  try {
    await client.mailboxOpen("INBOX", { readOnly: true });
    const msg = await client.fetchOne(String(uid), { source: true, envelope: true }, { uid: true });
    if (!msg || !msg.source) return null;

    const parsed = await simpleParser(msg.source);
    const fallbackText =
      parsed.text ??
      (parsed.html ? parsed.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "");

    return {
      uid,
      subject: parsed.subject || "(no subject)",
      fromName: parsed.from?.value?.[0]?.name || "",
      fromAddress: parsed.from?.value?.[0]?.address || "",
      date: parsed.date ? parsed.date.toISOString() : null,
      text: fallbackText,
      messageId: parsed.messageId || "",
    };
  } finally {
    await client.logout().catch(() => {});
  }
}
