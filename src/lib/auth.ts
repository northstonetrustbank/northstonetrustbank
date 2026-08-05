import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";

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

export type SessionPayload = { userId: string; role: string };

export async function createSession(userId: string, role: string) {
  const token = await new SignJWT({ userId, role })
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
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return { userId: payload.userId as string, role: payload.role as string };
  } catch {
    return null;
  }
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
