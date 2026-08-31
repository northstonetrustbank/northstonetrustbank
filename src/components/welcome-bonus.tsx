import Link from "next/link";
import { fill, type Dict } from "@/i18n";
import { formatMoney, formatMoneyWhole } from "@/lib/bank";
import { Icons } from "@/components/icons";
import { ProgressBar } from "@/components/ui";
import type { WelcomeBonusState } from "@/lib/promo";

/**
 * The new-client offer. It sits above the balance until the team has credited
 * it, because until then it is the thing the client is waiting on — but it
 * stays a slim band rather than a panel, so it never costs more than a couple
 * of lines on a phone.
 */
export function WelcomeBonusBanner({
  state,
  t,
  locale,
  currency,
  creditedDate,
}: {
  state: WelcomeBonusState;
  t: Dict;
  locale: string;
  currency: string;
  creditedDate: string | null;
}) {
  const target = formatMoneyWhole(state.thresholdCents, locale, currency);
  const funded = formatMoney(state.fundedCents, locale, currency);
  const showRateProgress = !state.qualifiesForRate;

  return (
    // A reward, not a balance. The old bg-gold/10 was a dark olive at 10% — a
    // muddy wash with the icon lost in it. This reads as a gift: a warm panel
    // and a solid gold chip, the same gold as the Deposit action.
    <div className="rounded-2xl border border-gold-400/45 bg-[linear-gradient(120deg,#fbf3df_0%,#fdfaf2_60%)] px-4 py-3.5 shadow-[0_8px_24px_-14px_rgba(201,162,39,0.6)] sm:px-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-400 text-navy-900 shadow-[0_4px_12px_-4px_rgba(201,162,39,0.9)]">
          <Icons.gift className="h-[19px] w-[19px]" />
        </span>

        <div className="min-w-0 flex-1">
          {/* The title already says what the offer is; a separate badge only
              costs a line on a phone. */}
          <p className="text-[14px] font-semibold text-fg">
            {state.credited ? t.promo.creditedTitle : t.promo.title}
          </p>

          <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">
            {state.credited && creditedDate
              ? fill(t.promo.creditedBody, {
                  amount: formatMoney(state.creditedCents, locale, currency),
                  date: creditedDate,
                })
              : t.promo.pendingBody}
          </p>

          {/* Progress towards the boosted introductory rate, on one line. */}
          {showRateProgress && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <ProgressBar percent={state.percent} className="min-w-[8rem] flex-1" />
              <p className="tnum text-[12px] font-medium text-fg-muted">
                {fill(t.promo.rateProgress, { funded, target })}
              </p>
              <Link
                href="/transfers?tab=deposit"
                className="text-[12px] font-semibold text-gold transition hover:text-fg"
              >
                {t.promo.fundNow}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
