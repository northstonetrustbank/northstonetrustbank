/**
 * Repayment arithmetic for approved lending. Everything here is derived from
 * figures an admin has already set on the application — the rate, the term and
 * the outstanding balance. Nothing is invented: when a figure the calculation
 * needs is missing, the function returns null and the page shows nothing
 * rather than a plausible-looking guess.
 */

/**
 * Pulls an annual percentage out of the free-text rate an admin typed, e.g.
 * "19.99% APR" -> 19.99, "6,25 %" -> 6.25. Returns null when there's no number
 * in there, or when it isn't a believable rate.
 */
export function parseRatePercent(rate: string | null | undefined): number | null {
  if (!rate) return null;
  const match = rate.replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  return value;
}

/**
 * Standard amortized payment for a principal over a term at an annual rate.
 * A zero rate divides the principal evenly across the term.
 */
export function monthlyPaymentCents(
  principalCents: number,
  annualRatePercent: number | null,
  termMonths: number | null | undefined
): number | null {
  if (!principalCents || principalCents <= 0) return null;
  if (!termMonths || termMonths <= 0) return null;
  if (annualRatePercent === null) return null;

  if (annualRatePercent === 0) return Math.round(principalCents / termMonths);

  const monthlyRate = annualRatePercent / 100 / 12;
  const growth = Math.pow(1 + monthlyRate, termMonths);
  const payment = (principalCents * monthlyRate * growth) / (growth - 1);
  return Number.isFinite(payment) ? Math.round(payment) : null;
}

/**
 * How much of the original amount has been repaid, as a percentage. Needs both
 * the amount advanced and what is still owed.
 */
export function repaidPercent(
  originalCents: number | null | undefined,
  outstandingCents: number | null | undefined
): number | null {
  if (!originalCents || originalCents <= 0) return null;
  if (outstandingCents === null || outstandingCents === undefined) return null;
  const repaid = originalCents - outstandingCents;
  return Math.max(0, Math.min(100, (repaid / originalCents) * 100));
}

/** Credit still available on a revolving line: limit less what's drawn. */
export function availableCreditCents(
  limitCents: number | null | undefined,
  outstandingCents: number | null | undefined
): number | null {
  if (limitCents === null || limitCents === undefined) return null;
  return Math.max(0, limitCents - (outstandingCents ?? 0));
}

/** True when a due date has passed without the balance being cleared. */
export function isOverdue(dueDate: Date | null | undefined, outstandingCents: number | null | undefined) {
  if (!dueDate || !outstandingCents || outstandingCents <= 0) return false;
  return dueDate.getTime() < Date.now();
}
