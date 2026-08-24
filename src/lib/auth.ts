import "server-only";
import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { describeDevice } from "./device";

const SESSION_COOKIE = "ns_session";
const SESSION_HOURS = 24;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export type SessionPayload = { userId: string; role: string; sid?: string };

/**
 * Signs a client in and records the device against their account, so it can be
 * listed — and ended — from the security page. The session row's id travels in
 * the cookie as `sid`; revoking the row invalidates the cookie at the very
 * next request, which a stateless JWT on its own could not do.
 */
export async function createSession(userId: string, role: string) {
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);

  let sid: string | undefined;
  try {
    const agent = (await headers()).get("user-agent");
    const record = await db.session.create({
      data: {
        userId,
        label: describeDevice(agent),
        userAgent: agent?.slice(0, 400) ?? null,
        expiresAt,
      },
    });
    sid = record.id;
  } catch {
    // Never block a sign-in because the device could not be recorded — the
    // session still works, it just won't be listed on the security page.
  }

  const token = await new SignJWT({ userId, role, sid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secretKey());

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  // Mark the device as signed out before dropping the cookie.
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secretKey());
      const sid = payload.sid as string | undefined;
      if (sid) {
        await db.session.updateMany({
          where: { id: sid, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    } catch {
      // An expired or tampered cookie has nothing to revoke.
    }
  }

  jar.delete(SESSION_COOKIE);
}

/** Sessions are only touched every few minutes, not on every page view. */
const LAST_SEEN_INTERVAL_MS = 5 * 60 * 1000;

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const sid = payload.sid as string | undefined;

    // Cookies issued before device tracking existed carry no sid. They stay
    // valid until they expire on their own, so nobody is signed out by the
    // upgrade; they simply don't appear in the device list.
    if (sid) {
      const record = await db.session.findUnique({ where: { id: sid } });
      if (!record || record.revokedAt || record.expiresAt < new Date()) return null;

      if (Date.now() - record.lastSeenAt.getTime() > LAST_SEEN_INTERVAL_MS) {
        await db.session.update({
          where: { id: record.id },
          data: { lastSeenAt: new Date() },
        });
      }
    }

    return { userId: payload.userId as string, role: payload.role as string, sid };
  } catch {
    return null;
  }
}

/** Every device currently signed in to this account, newest first. */
export async function activeSessions(userId: string) {
  return db.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
  });
}

/** Loads the full user for the current session, or null. */
export async function getSessionUser() {
  const session = await getSession();
  if (!session) return null;
  return db.user.findUnique({ where: { id: session.userId } });
}

export function isAdmin(role: string | undefined | null) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

// ---------- two-factor: the half-authenticated state between steps ----------

const PENDING_COOKIE = "ns_2fa";
const PENDING_MINUTES = 10;
export const MAX_2FA_ATTEMPTS = 5;

export type PendingPayload = { userId: string; attempts: number };

/**
 * Set once the password is accepted but before the code is. It is NOT a
 * session: it carries no role and nothing reads it as authentication. The
 * attempt count lives inside the signed token so it cannot be reset by
 * clearing a cookie value.
 */
export async function setPendingTwoFactor(userId: string, attempts = 0) {
  const token = await new SignJWT({ userId, attempts, kind: "2fa" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PENDING_MINUTES}m`)
    .sign(secretKey());

  const jar = await cookies();
  jar.set(PENDING_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PENDING_MINUTES * 60,
  });
}

export async function getPendingTwoFactor(): Promise<PendingPayload | null> {
  const jar = await cookies();
  const token = jar.get(PENDING_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.kind !== "2fa") return null;
    return { userId: payload.userId as string, attempts: Number(payload.attempts ?? 0) };
  } catch {
    return null;
  }
}

export async function clearPendingTwoFactor() {
  const jar = await cookies();
  jar.delete(PENDING_COOKIE);
}
