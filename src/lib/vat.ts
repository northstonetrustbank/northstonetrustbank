import "server-only";
import { randomInt } from "crypto";
import { db } from "./db";

/**
 * VAT clearance on money leaving an account.
 *
 * A withdrawal or a send does not go to the admin queue straight away: it is
 * held until the client enters a six-digit code that the bank issues. The shape
 * is deliberately the same as the sign-in second factor — a short numeric code,
 * a capped number of attempts — because staff and clients already understand it.
 *
 * The held row keeps `status: "PENDING"` throughout. That matters: the available
 * balance is worked out by summing PENDING outbound rows, so giving these a
 * status of their own would quietly release the reservation and let the same
 * money leave twice. "Cleared" is `vatClearedAt`, never a status change.
 */

export const MAX_VAT_ATTEMPTS = 5;

/** A six-digit code. randomInt is the CSPRNG, not Math.random. */
export function newVatCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** True when this row is waiting on the client to enter their code. */
export function awaitingVat(tx: {
  vatRequiredAt: Date | null;
  vatClearedAt: Date | null;
}) {
  return tx.vatRequiredAt !== null && tx.vatClearedAt === null;
}

/** True when this row has passed the gate and an admin may act on it. */
export function vatCleared(tx: {
  vatRequiredAt: Date | null;
  vatClearedAt: Date | null;
}) {
  return tx.vatRequiredAt === null || tx.vatClearedAt !== null;
}

export type VatResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "already-cleared" | "locked" | "wrong" };

/**
 * Check a code against a held transaction and clear the gate if it matches.
 * Scoped by userId so one client cannot clear another's transfer by guessing
 * an id. Attempts are counted on the row itself, so they survive a new session.
 */
export async function verifyVatCode(
  userId: string,
  transactionId: string,
  entered: string
): Promise<VatResult> {
  const tx = await db.transaction.findFirst({
    where: { id: transactionId, account: { userId } },
    select: {
      id: true,
      vatCode: true,
      vatAttempts: true,
      vatRequiredAt: true,
      vatClearedAt: true,
    },
  });

  if (!tx || !tx.vatRequiredAt) return { ok: false, reason: "not-found" };
  if (tx.vatClearedAt) return { ok: false, reason: "already-cleared" };
  if (tx.vatAttempts >= MAX_VAT_ATTEMPTS) return { ok: false, reason: "locked" };

  const code = entered.replace(/\D/g, "");
  if (!tx.vatCode || code !== tx.vatCode) {
    await db.transaction.update({
      where: { id: tx.id },
      data: { vatAttempts: { increment: 1 } },
    });
    return { ok: false, reason: "wrong" };
  }

  await db.transaction.update({
    where: { id: tx.id },
    data: { vatClearedAt: new Date() },
  });
  return { ok: true };
}
