import Link from "next/link";
import { fill, type Dict } from "@/i18n";
import { formatMoney } from "@/lib/bank";
import { NavIcons } from "@/components/icons";
import { StatusChip } from "@/components/ui";
import type { PortfolioAccount } from "@/lib/portfolio";

/** Masked tail of an account number, e.g. "NS-48291023" -> "···· 1023". */
export function maskNumber(number: string) {
  return `···· ${number.slice(-4)}`;
}

/**
 * One deposit account, as a tappable card. Used on the dashboard grid and on
 * the accounts page — the same figures in both places, by construction.
 */
export function AccountCard({
  account,
  t,
  locale,
  href,
  showFullNumber = false,
}: {
  account: PortfolioAccount;
  t: Dict;
  locale: string;
  href?: string;
  showFullNumber?: boolean;
}) {
  const isSavings = account.kind === "SAVINGS";
  const Icon = isSavings ? NavIcons.vault : NavIcons.wallet;
  const kindLabel = isSavings ? t.bank.savings : t.bank.checking;

  const body = (
    <div className="elev-2 relative h-full overflow-hidden rounded-2xl border border-line bg-ink-1 p-5 transition group-hover:border-brand-500/40">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${
          isSavings ? "from-pos/15" : "from-brand-500/20"
        } to-transparent`}
        aria-hidden="true"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-fg">{kindLabel}</p>
          <p className="tnum mt-0.5 font-mono text-[12px] tracking-wider text-fg-faint">
            {showFullNumber ? account.number : maskNumber(account.number)}
          </p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-2 text-fg-muted">
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>

      <p className="display relative mt-6 text-[26px] font-semibold text-fg">
        {formatMoney(account.balanceCents, locale, account.currency)}
      </p>

      <div className="relative mt-3 flex flex-wrap items-center gap-2">
        <StatusChip tone="ok">{t.products.active}</StatusChip>
        {account.pendingDepositCents > 0 && (
          <span className="tnum text-[11px] font-medium text-amber-700">
            {fill(t.accountsPage.pendingIn, {
              amount: formatMoney(account.pendingDepositCents, locale, account.currency),
            })}
          </span>
        )}
        {account.pendingWithdrawalCents > 0 && (
          <span className="tnum text-[11px] font-medium text-fg-faint">
            {fill(t.accountsPage.heldForWithdrawal, {
              amount: formatMoney(account.pendingWithdrawalCents, locale, account.currency),
            })}
          </span>
        )}
      </div>
    </div>
  );

  if (!href) return body;

  return (
    <Link
      href={href}
      className="group block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      {body}
    </Link>
  );
}
