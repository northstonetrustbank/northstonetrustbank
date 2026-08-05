import "server-only";
import { randomInt, randomBytes } from "crypto";
import { db } from "./db";
import type { Locale } from "@/i18n";

const INTL_LOCALES: Record<Locale, string> = {
  en: "en-US",
  fr: "fr-FR",
  de: "de-DE",
  es: "es-ES",
};

/** Formats cents as localized currency, e.g. 123456 -> "$1,234.56". */
export function formatMoney(cents: number, locale: string = "en", currency = "USD") {
  const intl = INTL_LOCALES[(locale as Locale) in INTL_LOCALES ? (locale as Locale) : "en"];
  return new Intl.NumberFormat(intl, { style: "currency", currency }).format(cents / 100);
}

/**
 * Like formatMoney, but drops the cents on whole amounts — for headline figures
 * such as credit limit ranges, where "$2,500" reads better than "$2,500.00".
 */
export function formatMoneyWhole(cents: number, locale: string = "en", currency = "USD") {
  if (cents % 100 !== 0) return formatMoney(cents, locale, currency);
  const intl = INTL_LOCALES[(locale as Locale) in INTL_LOCALES ? (locale as Locale) : "en"];
  return new Intl.NumberFormat(intl, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Returns the user's account of a kind, creating it with a unique number if needed. */
export async function ensureAccountOfKind(userId: string, kind: "CHECKING" | "SAVINGS") {
  const existing = await db.account.findFirst({ where: { userId, kind } });
  if (existing) return existing;

  const owner = await db.user.findUnique({ where: { id: userId }, select: { currency: true } });
  const currency = owner?.currency ?? "USD";
  for (let attempt = 0; attempt < 5; attempt++) {
    const number = `NS-${randomInt(10_000_000, 100_000_000)}`;
    try {
      return await db.account.create({ data: { userId, number, kind, currency } });
    } catch {
      // number collision — retry with a new one
    }
  }
  throw new Error("Could not allocate an account number");
}

/** The primary checking account (auto-created). */
export function ensureAccount(userId: string) {
  return ensureAccountOfKind(userId, "CHECKING");
}

/** The client's savings account, or null if they haven't opened one. */
export function getSavings(userId: string) {
  return db.account.findFirst({ where: { userId, kind: "SAVINGS" } });
}

/** Balance = sum of POSTED ledger amounts. Never stored, always derived. */
export async function balanceCents(accountId: string) {
  const agg = await db.transaction.aggregate({
    where: { accountId, status: "POSTED" },
    _sum: { amountCents: true },
  });
  return agg._sum.amountCents ?? 0;
}

export async function pendingDepositCents(accountId: string) {
  const agg = await db.transaction.aggregate({
    where: { accountId, status: "PENDING", type: "DEPOSIT" },
    _sum: { amountCents: true },
  });
  return agg._sum.amountCents ?? 0;
}

/** Total of not-yet-approved withdrawals (returned as a positive number). */
export async function pendingWithdrawalCents(accountId: string) {
  const agg = await db.transaction.aggregate({
    where: { accountId, status: "PENDING", type: "WITHDRAWAL" },
    _sum: { amountCents: true },
  });
  return Math.abs(agg._sum.amountCents ?? 0);
}

/**
 * A display-only card number for a Northstone card. These are NOT real
 * card-network credentials — nothing can be spent with them. The 9705 prefix is
 * not an issued IIN, so a generated number can never collide with a live card.
 */
export function newCardNumber() {
  let digits = "9705";
  while (digits.length < 16) digits += String(randomInt(0, 10));
  return digits;
}

/** A card expiry three years out, formatted MM/YY. */
export function newCardExpiry(from = new Date()) {
  const d = new Date(from.getFullYear() + 3, from.getMonth(), 1);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
}

/** A three-digit security code. */
export function newCardCvv() {
  return String(randomInt(0, 1000)).padStart(3, "0");
}

/** Receipt reference like NS-D-8F3A21C4. */
export function newReference(prefix = "D") {
  return `NS-${prefix}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

/** Moves money between two of the user's accounts as two POSTED ledger entries. */
export async function transferBetween(
  fromAccountId: string,
  toAccountId: string,
  amountCents: number,
  note: string
) {
  const ref = newReference("T");
  await db.$transaction([
    db.transaction.create({
      data: {
        accountId: fromAccountId,
        type: "TRANSFER",
        status: "POSTED",
        amountCents: -amountCents,
        reference: `${ref}-O`,
        note,
        postedAt: new Date(),
      },
    }),
    db.transaction.create({
      data: {
        accountId: toAccountId,
        type: "TRANSFER",
        status: "POSTED",
        amountCents: amountCents,
        reference: `${ref}-I`,
        note,
        postedAt: new Date(),
      },
    }),
  ]);
  return ref;
}
