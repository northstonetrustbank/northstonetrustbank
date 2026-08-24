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
    // Gold rather than brand blue: this is a reward, not a balance, and the
    // blue panel made it read as just another figure. The hue is the one
    // already on the card chip and the Gold tier.
    <div className="rounded-2xl border border-gift/30 bg-gift/10 px-4 py-3.5 sm:px-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gift/15 text-gift">
          <Icons.gift className="h-[18px] w-[18px]" />
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
                className="text-[12px] font-semibold text-gift transition hover:text-fg"
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
