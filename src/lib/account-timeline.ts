import "server-only";
import { db } from "./db";

// The client-facing view of their own audit trail. The audit log already
// records everything that matters — signup, verification, approval, password
// changes — so the timeline is derived from it rather than duplicated into new
// columns. That also means it works for clients who joined before this page
// existed.

/** Events a client may see about their own account, in i18n key order. */
export const CLIENT_EVENTS = [
  "USER_SIGNUP",
  "EMAIL_VERIFIED",
  "KYC_SUBMITTED",
  "ACCOUNT_APPROVED",
  "ACCOUNT_REJECTED",
  "ACCOUNT_BLOCKED",
  "ACCOUNT_UNBLOCKED",
  "KYC_DELETED",
  "PASSWORD_CHANGED",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_COMPLETED",
  "SECURITY_WORD_SET",
  "TWO_FACTOR_ENABLED",
  "TWO_FACTOR_DISABLED",
  "SAVINGS_OPENED",
  "CARD_FROZEN",
  "CARD_UNFROZEN",
  "USER_LOGIN",
] as const;

export type ClientEvent = (typeof CLIENT_EVENTS)[number];

export type TimelineEntry = { id: string; action: ClientEvent; at: Date; byAdmin: boolean };

/**
 * Events belonging to a client: things they did (actor) and things done to
 * their account by an admin (target). Admin note text is deliberately not
 * exposed — the client sees what happened and when, not internal wording.
 */
export async function accountTimeline(userId: string, take = 40): Promise<TimelineEntry[]> {
  const rows = await db.auditLog.findMany({
    where: {
      action: { in: [...CLIENT_EVENTS] },
      OR: [{ actorId: userId }, { targetType: "USER", targetId: userId }],
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  // Someone who signs in daily would otherwise push every security event off
  // the page, so only the most recent handful of sign-ins are kept.
  const MAX_LOGINS = 5;
  let logins = 0;
  const kept: TimelineEntry[] = [];
  for (const r of rows) {
    if (r.action === "USER_LOGIN") {
      if (logins >= MAX_LOGINS) continue;
      logins += 1;
    }
    kept.push({
      id: r.id,
      action: r.action as ClientEvent,
      at: r.createdAt,
      byAdmin: r.actorId !== userId,
    });
    if (kept.length >= take) break;
  }
  return kept;
}

/** The most recent occurrence of each action, for the security summary. */
export async function lastEventDates(userId: string) {
  const rows = await db.auditLog.findMany({
    where: {
      action: { in: [...CLIENT_EVENTS] },
      OR: [{ actorId: userId }, { targetType: "USER", targetId: userId }],
    },
    orderBy: { createdAt: "desc" },
    select: { action: true, createdAt: true },
    take: 500,
  });

  const latest = new Map<string, Date>();
  for (const r of rows) if (!latest.has(r.action)) latest.set(r.action, r.createdAt);

  const passwordDates = [latest.get("PASSWORD_CHANGED"), latest.get("PASSWORD_RESET_COMPLETED")]
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => b.getTime() - a.getTime());

  // The newest sign-in is the current session, so the one before it is the
  // "last sign-in" a client actually wants to see.
  const logins = rows.filter((r) => r.action === "USER_LOGIN");

  return {
    opened: latest.get("USER_SIGNUP") ?? null,
    emailVerified: latest.get("EMAIL_VERIFIED") ?? null,
    documentsSubmitted: latest.get("KYC_SUBMITTED") ?? null,
    approved: latest.get("ACCOUNT_APPROVED") ?? null,
    documentsDeleted: latest.get("KYC_DELETED") ?? null,
    passwordChanged: passwordDates[0] ?? null,
    securityWordSet: latest.get("SECURITY_WORD_SET") ?? null,
    lastSignIn: logins[1]?.createdAt ?? logins[0]?.createdAt ?? null,
  };
}
