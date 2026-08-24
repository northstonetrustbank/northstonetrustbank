import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { formatMoney } from "@/lib/bank";
import { loadPortfolio, monthChangePercent } from "@/lib/portfolio";
import { balanceTrend } from "@/lib/trend";
import { showWelcomeBonus, welcomeBonusState } from "@/lib/promo";
import { getDict, getLocale } from "@/i18n/server";
import { fill } from "@/i18n";
import { buildProductView, latestByKey, productsWithLabels } from "@/lib/product-view";
import { productsFor } from "@/lib/products";
import { AppShell, Page } from "@/components/app-shell";
import { AccountCard } from "@/components/account-card";
import { BankCard } from "@/components/bank-card";
import { BalanceTrend } from "@/components/balance-trend";
import { Greeting } from "@/components/greeting";
import { NavIcons } from "@/components/icons";
import { ProductBanner } from "@/components/product-banner";
import { ProductTile } from "@/components/product-tile";
import { TransactionList } from "@/components/transaction-list";
import { Eyebrow, QuickAction, SectionHead } from "@/components/ui";
import { WelcomeBonusBanner } from "@/components/welcome-bonus";

export const metadata = { title: "Dashboard — Northstone Trust Bank" };

const INTL_LOCALES: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
  de: "de-DE",
  es: "es-ES",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    submitted?: string;
    withdrawSubmitted?: string;
    transferred?: string;
    applied?: string;
    sent?: string;
  }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status === "PENDING") redirect("/onboarding");
  if (user.status !== "ACTIVE") redirect("/login");

  const t = await getDict();
  const locale = await getLocale();
  const { submitted, withdrawSubmitted, transferred, applied, sent } = await searchParams;

  const portfolio = await loadPortfolio(user.id);

  const [transactions, applications, change, bonus, trend, pending] = await Promise.all([
    db.transaction.findMany({
      where: { accountId: { in: portfolio.accountIds } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.productApplication.findMany({ where: { userId: user.id } }),
    monthChangePercent(portfolio.accountIds, portfolio.totalCents),
    welcomeBonusState(user.id, portfolio.accountIds, user.createdAt),
    balanceTrend(portfolio.accountIds),
    // Anything the client is waiting on. A pending item buried in a list reads
    // as nothing happening, which is exactly when people start worrying.
    db.transaction.findMany({
      where: { accountId: { in: portfolio.accountIds }, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Transfers stuck at the VAT gate. Without a way back to the code screen, a
  // client who closes that page has no route to their own held money.
  const heldForVat = await db.transaction.findMany({
    where: {
      accountId: { in: portfolio.accountIds },
      status: "PENDING",
      vatRequiredAt: { not: null },
      vatClearedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  // Latest application per product key, turned into a card view per product.
  const appByKey = latestByKey(applications);
  const holderName = `${user.firstName} ${user.lastName}`.trim();
  const productViews = productsWithLabels(t, user.accountType).map(({ def, item }) =>
    buildProductView({
      def,
      item,
      app: appByKey.get(def.key) ?? null,
      savingsOpen: Boolean(portfolio.savings),
      savingsBalanceCents: portfolio.savings?.balanceCents ?? 0,
      savingsNumber: portfolio.savings?.number,
      t,
      locale,
      currency: user.currency,
      holderName,
    })
  );

  // Savings is a personal product — business clients have no /product/SAVINGS
  // page, so offering them one would land on a 404.
  const savingsOffered = productsFor(user.accountType).some((d) => d.key === "SAVINGS");

  const dateFmt = new Intl.DateTimeFormat(INTL_LOCALES[locale] ?? "en-US", { dateStyle: "medium" });
  const shortDate = new Intl.DateTimeFormat(INTL_LOCALES[locale] ?? "en-US", {
    month: "short",
    day: "numeric",
  });

  // Formatted server-side so the chart carries no locale or currency logic.
  const trendData = trend.points.map((p) => ({
    v: p.balanceCents,
    date: shortDate.format(p.at),
    value: formatMoney(p.balanceCents, locale, portfolio.currency),
  }));

  const banners = [
    submitted && t.bank.submittedBanner,
    withdrawSubmitted && t.bank.withdrawSubmittedBanner,
    transferred && t.bank.transferredBanner,
    applied && t.bank.appliedBanner,
    sent && (sent === "instant" ? t.bank.sentInstantBanner : t.bank.sentPendingBanner),
  ].filter(Boolean) as string[];

  return (
    <AppShell
      user={user}
      active="dashboard"
      title={t.dashboard.overview}
    >
      <Page className="space-y-6">
        {heldForVat.length > 0 && (
          <div className="rounded-xl border border-gift/35 bg-gift/10 px-4 py-3">
            <p className="text-sm font-medium text-gift">{t.vat.pendingBanner}</p>
            <ul className="mt-2 space-y-1">
              {heldForVat.map((tx) => (
                <li key={tx.id}>
                  <Link
                    href={`/verify-transfer/${tx.id}`}
                    className="tnum text-sm font-semibold text-gift underline underline-offset-2"
                  >
                    {formatMoney(Math.abs(tx.amountCents), locale, portfolio.currency)} ·{" "}
                    {tx.reference} — {t.vat.openIt}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {banners.map((text) => (
          <p
            key={text}
            className="rounded-xl border border-pos/25 bg-pos/10 px-4 py-3 text-sm font-medium text-pos"
          >
            {text}
          </p>
        ))}

        {showWelcomeBonus(bonus) && !bonus.credited && (
          <WelcomeBonusBanner
            state={bonus}
            t={t}
            locale={locale}
            currency={portfolio.currency}
            creditedDate={null}
          />
        )}

        {/* Balance — the one thing on the page allowed to be loud */}
        <section className="rise">
          <div>
            <div className="min-w-0">
              <p className="text-[15px] text-fg-muted">
                <Greeting
                  morning={fill(t.dashboard.greetingMorning, { name: user.firstName })}
                  afternoon={fill(t.dashboard.greetingAfternoon, { name: user.firstName })}
                  evening={fill(t.dashboard.greetingEvening, { name: user.firstName })}
                  fallback={fill(t.dashboard.welcomeBack, { name: user.firstName })}
                />
              </p>
              <Eyebrow className="mt-4">{t.dashboard.totalBalance}</Eyebrow>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="display text-[40px] font-semibold leading-none text-fg sm:text-[52px]">
                  {formatMoney(
                    portfolio.totalCents - portfolio.totalPendingWithdrawalCents,
                    locale,
                    portfolio.currency
                  )}
                </p>
                {change !== null && (
                  <span
                    className={`tnum inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold ${
                      change >= 0 ? "bg-pos/12 text-pos" : "bg-neg/12 text-neg"
                    }`}
                  >
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(1)}% {t.dashboard.thisMonth}
                  </span>
                )}
              </div>
              {portfolio.totalPendingWithdrawalCents > 0 && (
                <p className="tnum mt-3 mr-2 inline-block rounded-lg bg-gift/15 px-3 py-1 text-xs font-medium text-gift">
                  {fill(t.bank.reservedNote, {
                    amount: formatMoney(
                      portfolio.totalPendingWithdrawalCents,
                      locale,
                      portfolio.currency
                    ),
                  })}
                </p>
              )}
              {portfolio.totalPendingDepositCents > 0 && (
                <p className="tnum mt-3 inline-block rounded-lg bg-ink-2 px-3 py-1 text-xs font-medium text-fg-muted">
                  {fill(t.bank.pendingNote, {
                    amount: formatMoney(
                      portfolio.totalPendingDepositCents,
                      locale,
                      portfolio.currency
                    ),
                  })}
                </p>
              )}
            </div>

          </div>

          {trend.hasShape && (
            <div className="-mx-1 mt-3">
              <BalanceTrend data={trendData} label={t.dashboard.trendLabel} />
            </div>
          )}
        </section>

        <div className="rise grid grid-cols-3 gap-2 sm:flex sm:gap-3" style={{ animationDelay: "80ms" }}>
          <QuickAction href="/transfers?tab=deposit" icon="plus" label={t.bank.actionDeposit} />
          <QuickAction href="/transfers?tab=send" icon="send" label={t.bank.actionSend} />
          <QuickAction href="/transfers?tab=withdraw" icon="bank" label={t.bank.withdraw} />
          <QuickAction href="/payments" icon="bill" label={t.payments.tabPay} />
          <QuickAction href="/statements" icon="statement" label={t.statements.link} />
          <QuickAction href="/goals" icon="target" label={t.bank.actionGoals} />
        </div>

        {pending.length > 0 && (
          <section className="rise" style={{ animationDelay: "120ms" }}>
            <SectionHead title={t.dashboard.inProgress} subtitle={t.dashboard.inProgressBody} />
            <div className="elev-2 mt-4 overflow-hidden rounded-2xl border border-line bg-ink-1">
              {pending.map((tx, i) => (
                <Link
                  key={tx.id}
                  href={`/activity/${tx.id}`}
                  className={`flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-ink-2 sm:px-5 ${
                    i > 0 ? "border-t border-line-soft" : ""
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400/12 text-amber-300">
                    <NavIcons.clock className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-fg">
                      {tx.note?.trim() ||
                        (t.bank.types[tx.type as keyof typeof t.bank.types] ?? tx.type)}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-fg-faint">
                      {t.txn.stepReview}
                    </p>
                  </div>
                  <p className="display shrink-0 text-[15px] font-semibold text-fg">
                    {formatMoney(Math.abs(tx.amountCents), locale, portfolio.currency)}
                  </p>
                  <NavIcons.chevronRight className="h-4 w-4 shrink-0 text-fg-faint" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {trend.hasShape && (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-line bg-ink-1 p-4 sm:p-5">
              <p className="flex items-center gap-2 text-[12px] font-medium text-fg-muted">
                <span className="h-2 w-2 rounded-full bg-pos/100" aria-hidden="true" />
                {t.dashboard.moneyIn}
              </p>
              <p className="tnum mt-1.5 text-xl font-semibold tracking-tight text-fg">
                {formatMoney(trend.inCents, locale, portfolio.currency)}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-ink-1 p-4 sm:p-5">
              <p className="flex items-center gap-2 text-[12px] font-medium text-fg-muted">
                <span className="h-2 w-2 rounded-full bg-neg/100" aria-hidden="true" />
                {t.dashboard.moneyOut}
              </p>
              <p className="tnum mt-1.5 text-xl font-semibold tracking-tight text-fg">
                {formatMoney(trend.outCents, locale, portfolio.currency)}
              </p>
            </div>
          </div>
        )}

        {/* Accounts */}
        <section>
          <SectionHead
            title={t.dashboard.yourAccounts}
            href="/accounts"
            linkLabel={t.dashboard.viewAll}
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {portfolio.accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                t={t}
                locale={locale}
                href={`/accounts/${account.id}`}
              />
            ))}
            {!portfolio.savings && savingsOffered && (
              <Link
                href="/product/SAVINGS"
                className="group flex min-h-[9.5rem] flex-col items-start justify-center gap-2 rounded-2xl border border-dashed border-line bg-ink-1/60 p-5 transition hover:border-accent-500/50 hover:bg-ink-1"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/12 text-brand-400">
                  <NavIcons.plus className="h-[18px] w-[18px]" />
                </span>
                <p className="text-sm font-semibold text-fg">{t.bank.openSavings}</p>
                <p className="text-[13px] leading-relaxed text-fg-muted">
                  {t.accountsPage.openSavingsBody}
                </p>
              </Link>
            )}
          </div>
        </section>

        {showWelcomeBonus(bonus) && bonus.credited && (
          <WelcomeBonusBanner
            state={bonus}
            t={t}
            locale={locale}
            currency={portfolio.currency}
            creditedDate={bonus.creditedAt ? dateFmt.format(bonus.creditedAt) : null}
          />
        )}

        {/* Product suite for the client's account type */}
        <section>
          <SectionHead title={t.products.yourProducts} subtitle={t.products.productsSubtitle} />

          {/* Phone: stacked banners. The artwork fills the right half of each
              card and bleeds off its edge, so the suite still looks like a
              bank, while five of them come to ~630px instead of the ~1900px
              five full tiles took. Nothing scrolls sideways. */}
          <div className="mt-4 space-y-3 sm:hidden">
            {productViews.map((v) => (
              <Link key={v.def.key} href={v.href} className="group block">
                <ProductBanner
                  title={v.title}
                  body={v.body}
                  art={v.render === "tile" ? v.art : null}
                  theme={v.render === "card" ? v.theme : null}
                  badge={v.render === "card" ? v.badge : null}
                  holder={v.render === "card" ? v.holder : null}
                  holderPlaceholder={v.render === "card" ? v.holderPlaceholder : ""}
                  number={v.render === "card" ? v.number : null}
                  expiry={v.render === "card" ? v.expiry : null}
                  valueLabel={v.valueLabel}
                  value={v.value}
                  status={v.status}
                  cta={v.cta}
                  placeholder={v.placeholder}
                />
              </Link>
            ))}
          </div>

          {/* Tablet and up there is room for every face at full size. */}
          <div className="mt-5 hidden gap-5 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {productViews.map((v) => (
              <Link
                key={v.def.key}
                href={v.href}
                className="group block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                {v.render === "card" ? (
                  <BankCard
                    theme={v.theme}
                    productName={v.title}
                    badge={v.badge}
                    holder={v.holder}
                    holderPlaceholder={v.holderPlaceholder}
                    number={v.number}
                    expiry={v.expiry}
                    valueLabel={v.valueLabel}
                    value={v.value}
                    status={v.status}
                    placeholder={v.placeholder}
                    className={`transition duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl ${
                      v.placeholder ? "opacity-80 group-hover:opacity-100" : ""
                    }`}
                  />
                ) : (
                  <ProductTile
                    title={v.title}
                    art={v.art}
                    valueLabel={v.valueLabel}
                    value={v.value}
                    status={v.status}
                    placeholder={v.placeholder}
                    cta={null}
                    className="transition duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl"
                  />
                )}
                {/* A product needs a name, a line on what it is, and a figure
                    or an action — not a title with a pill stuck to it. */}
                <div className="mt-3 flex items-end justify-between gap-3 px-1">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-fg">{v.title}</p>
                    {v.value ? (
                      <p className="tnum mt-0.5 truncate text-[13px] text-fg-muted">
                        {v.valueLabel ? `${v.valueLabel}: ` : ""}
                        {v.value}
                      </p>
                    ) : (
                      <p className="mt-0.5 line-clamp-1 text-[13px] text-fg-muted">{v.body}</p>
                    )}
                  </div>
                  {!v.value && (
                    <span className="shrink-0 text-[13px] font-medium text-brand-400 transition group-hover:text-fg">
                      {v.cta}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent activity */}
        <section>
          <SectionHead title={t.bank.recent} href="/activity" linkLabel={t.dashboard.viewAll} />
          <div className="mt-4">
            <TransactionList
              rows={transactions}
              labels={{
                types: t.bank.types,
                statuses: t.bank.statuses,
                vatNeeded: t.vat.needed,
                reference: t.bank.reference,
              }}
              locale={locale}
              currency={portfolio.currency}
              emptyText={t.bank.none}
            />
          </div>
        </section>

        <p className="flex items-center justify-end gap-2 text-right text-xs text-fg-faint">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line text-[9px] font-bold text-fg-muted">
            FDIC
          </span>
          {t.bank.fdic}
        </p>
      </Page>
    </AppShell>
  );
}
