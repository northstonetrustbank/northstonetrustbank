import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Encryption for the one field that would do real harm on its own.
 *
 * Everything else about a client is recoverable — a leaked address is an
 * embarrassment, a leaked SSN is somebody's credit file for the next decade.
 * So the SSN goes into the database as AES-256-GCM ciphertext and the key stays
 * in the environment. A stolen dump, a stale backup, a query run by the wrong
 * person: none of those hand over identities.
 *
 * This is not a substitute for access control. Staff who can open the review
 * screen see the full number, because that is what the bank needs to verify an
 * applicant. What it removes is the far larger set of people who can reach the
 * data without going through the app at all.
 */

const KEY_ENV = "SSN_ENC_KEY";

function key() {
  const raw = process.env[KEY_ENV];
  if (!raw) {
    // Deliberately loud. Falling back to plaintext "so it keeps working" is how
    // a field like this quietly stops being encrypted.
    throw new Error(
      `${KEY_ENV} is not set. Generate one with: openssl rand -base64 32`
    );
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(`${KEY_ENV} must decode to 32 bytes, got ${buf.length}.`);
  }
  return buf;
}

/** Stored as v1:iv:tag:ciphertext, all base64 — versioned so the scheme can change. */
export function encryptSsn(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

/**
 * Returns null rather than throwing on anything malformed. A single unreadable
 * row should not take down the whole client list for staff.
 */
export function decryptSsn(stored: string | null | undefined) {
  if (!stored) return null;
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(parts[1], "base64")
    );
    decipher.setAuthTag(Buffer.from(parts[2], "base64"));
    return (
      decipher.update(Buffer.from(parts[3], "base64")) + decipher.final("utf8")
    );
  } catch {
    return null;
  }
}

/** 9 digits, however the client typed it. */
export function normaliseSsn(input: string) {
  return input.replace(/[^0-9]/g, "");
}

/**
 * The ranges the Social Security Administration has never issued. Catches a
 * typo or a placeholder like 123-45-6789 before it reaches the database, where
 * it would sit looking like a real identity.
 */
export function ssnProblem(digits: string): "length" | "invalid" | null {
  if (digits.length !== 9) return "length";
  const area = digits.slice(0, 3);
  const group = digits.slice(3, 5);
  const serial = digits.slice(5);
  if (area === "000" || area === "666" || area[0] === "9") return "invalid";
  if (group === "00" || serial === "0000") return "invalid";
  if (/^(\d)\1{8}$/.test(digits)) return "invalid";
  if (digits === "123456789") return "invalid";
  return null;
}

/** 123456789 -> 123-45-6789, for display. */
export function formatSsn(digits: string) {
  if (digits.length !== 9) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

/** The full number as staff should see it, or null if it cannot be read. */
export function readSsn(stored: string | null | undefined) {
  const digits = decryptSsn(stored);
  return digits ? formatSsn(digits) : null;
}

/** A client's address as a single line, skipping the parts they left out. */
export function formatAddress(u: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
}) {
  const parts = [
    u.addressLine1,
    u.addressLine2,
    u.city,
    [u.region, u.postalCode].filter(Boolean).join(" ") || null,
    u.country,
  ].filter((p): p is string => Boolean(p && p.trim()));
  return parts.length ? parts.join(", ") : null;
}
