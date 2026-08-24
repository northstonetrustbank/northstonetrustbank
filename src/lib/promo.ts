import "server-only";
import { db } from "./db";

/**
 * The new-client welcome offer, as advertised on the homepage:
 *   • a flat $175 credited once the account is open — no deposit required;
 *   • a boosted introductory rate for the first 90 days, which needs the
 *     account funded with $2,500 or more.
 *
 * Nothing about the offer is stored on the user. The state is derived from the
 * ledger, so it stays truthful even if a bonus is later reversed: a BONUS row
 * exists or it does not.
 */
export const WELCOME_BONUS_CENTS = 17_500;
export const INTRO_RATE_THRESHOLD_CENTS = 250_000;
export const INTRO_RATE_DAYS = 90;

export type WelcomeBonusState = {
  /** The $175 has been posted to the ledger. */
  credited: boolean;
  creditedAt: Date | null;
  creditedCents: number;
  /** Total deposits verified so far, against the intro-rate threshold. */
  fundedCents: number;
  thresholdCents: number;
  /** 0–100, for the progress bar. */
  percent: number;
  qualifiesForRate: boolean;
  /** Still inside the window where opening the account earns the bonus. */
  eligible: boolean;
};

/** How long after signing up a client can still be credited the bonus. */
const ELIGIBILITY_DAYS = 90;

export async function welcomeBonusState(
  userId: string,
  accountIds: string[],
  memberSince: Date
): Promise<WelcomeBonusState> {
  const [bonus, funded] = await Promise.all([
    db.transaction.findFirst({
      where: { accountId: { in: accountIds }, type: "BONUS", status: "POSTED" },
      orderBy: { createdAt: "asc" },
    }),
    db.transaction.aggregate({
      where: { accountId: { in: accountIds }, type: "DEPOSIT", status: "POSTED" },
      _sum: { amountCents: true },
    }),
  ]);

  const fundedCents = funded._sum.amountCents ?? 0;
  const ageDays = (Date.now() - memberSince.getTime()) / 86_400_000;

  return {
    credited: Boolean(bonus),
    creditedAt: bonus?.postedAt ?? bonus?.createdAt ?? null,
    creditedCents: bonus?.amountCents ?? WELCOME_BONUS_CENTS,
    fundedCents,
    thresholdCents: INTRO_RATE_THRESHOLD_CENTS,
    percent: Math.min(100, Math.round((fundedCents / INTRO_RATE_THRESHOLD_CENTS) * 100)),
    qualifiesForRate: fundedCents >= INTRO_RATE_THRESHOLD_CENTS,
    eligible: ageDays <= ELIGIBILITY_DAYS,
  };
}

/** True when the dashboard should still be talking about the offer at all. */
export function showWelcomeBonus(state: WelcomeBonusState) {
  if (state.credited && state.qualifiesForRate) return false; // nothing left to tell them
  return state.eligible || state.credited;
}
