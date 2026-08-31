import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { formatMoney } from "@/lib/bank";
import { loadPortfolio, monthChangePercent } from "@/lib/portfolio";
import { listPayees } from "@/lib/payees";
import { balanceTrend } from "@/lib/trend";
import { showWelcomeBonus, welcomeBonusState } from "@/lib/promo";
import { getDict, getLocale } from "@/i18n/server";
import { fill } from "@/i18n";
import { buildProductView, latestByKey, productsWithLabels } from "@/lib/product-view";
import { productsFor } from "@/lib/products";
import { AppShell, Page } from "@/components/app-shell";
import { AccountCard } from "@/components/account-card";
import { BankCard } from "@/components/bank-card";
import { BalanceHero } from "@/components/balance-hero";
import { Greeting } from "@/components/greeting";
import { Icons, NavIcons } from "@/components/icons";
import { ProductBanner } from "@/components/product-banner";
import { ProductTile } from "@/components/product-tile";
import { TransactionList } from "@/components/transaction-list";
import { SectionHead } from "@/components/ui";
import { ServiceCard, type ServiceAccent } from "@/components/service-card";
import { EmailSupport } from "@/components/email-support";
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

  const [transactions, applications, change, bonus, trend, pending, heldForVat] = await Promise.all([
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
    // Transfers stuck at the VAT gate. Without a way back to the code screen, a
    // client who closes that page has no route to their own held money.
    db.transaction.findMany({
      where: {
        accountId: { in: portfolio.accountIds },
        status: "PENDING",
        vatRequiredAt: { not: null },
        vatClearedAt: null,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

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

  // The two showcase products — the card and the mortgage — keep their
  // full-size faces. Everything else sits below in a clean two-up grid of the
  // same white service-card style, each with its own accent.
  const HERO_KEYS = ["CREDIT_CARD", "MORTGAGE"];
  const heroProducts = productViews.filter((v) => HERO_KEYS.includes(v.def.key));
  const restProducts = productViews.filter((v) => !HERO_KEYS.includes(v.def.key));

  // Icon and accent per product, so the grid reads as a set of distinct,
  // coloured services rather than dark muted tiles.
  const PRODUCT_STYLE: Record<string, { icon: string; accent: ServiceAccent }> = {
    SAVINGS: { icon: "savings", accent: "green" },
    PERSONAL_LOAN: { icon: "lending", accent: "blue" },
    AUTO_LOAN: { icon: "car", accent: "cyan" },
    STUDENT_LOAN: { icon: "student", accent: "violet" },
    HOME_IMPROVEMENT: { icon: "renovation", accent: "amber" },
    HOME_EQUITY: { icon: "buildings", accent: "green" },
    PERSONAL_INSURANCE: { icon: "insurance", accent: "blue" },
    DEPOSITS: { icon: "deposit", accent: "cyan" },
    FOREIGN_DRAFTS: { icon: "globe", accent: "blue" },
    INTEREST_CHECKING: { icon: "checking", accent: "green" },
    TELE_BANKING: { icon: "phone", accent: "violet" },
    MONEY_MARKET: { icon: "money", accent: "amber" },
    SMALL_BUSINESS: { icon: "business", accent: "violet" },
  };
  const productStyle = (key: string) => PRODUCT_STYLE[key] ?? { icon: "review", accent: "blue" as ServiceAccent };
  // Product status → the pill tones the service card knows.
  const pillTone = (tone?: string): "ok" | "pending" | "muted" =>
    tone === "ok" ? "ok" : tone === "pending" ? "pending" : "muted";

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

  // The people already paid, most recent first — the same list the payments
  // screen keeps, surfaced here so a repeat payment is one tap rather than
  // four. Guarded inside listPayees, so a missing table shows nothing.
  const beneficiaries = (await listPayees(user.id)).slice(0, 8).map((payee) => ({
    id: payee.id,
    name: payee.nickname ?? payee.name,
    initial: (payee.name.trim()[0] ?? "?").toUpperCase(),
  }));

  // Six, a clean 3x2 on a phone. Deposit is the one in blue — the action that
  // starts everything else.
  const heroActions = [
    { href: "/transfers?tab=deposit", icon: "plus", label: t.bank.actionDeposit, primary: true },
    { href: "/transfers?tab=send", icon: "send", label: t.bank.actionSend },
    { href: "/transfers?tab=withdraw", icon: "bank", label: t.bank.withdraw },
    { href: "/payments", icon: "bill", label: t.payments.tabPay },
    { href: "/goals", icon: "target", label: t.bank.actionGoals },
    { href: "/statements", icon: "statement", label: t.statements.link },
  ];

  // Whether each service already has something open, so its card reads "Pending"
  // / "Active" rather than always inviting a fresh application.
  const openStatuses = new Set(["SUBMITTED", "APPROVED"]);
  const isOpen = (keys: string[]) =>
    applications.some((a) => keys.includes(a.productKey) && openStatuses.has(a.status));
  const loanKeys = ["PERSONAL_LOAN", "AUTO_LOAN", "STUDENT_LOAN", "MORTGAGE", "HOME_IMPROVEMENT", "HOME_EQUITY"];
  const serviceStatus = {
    loan: isOpen(loanKeys),
    grant: isOpen(["GRANT"]),
    tax: isOpen(["TAX_REFUND"]),
    card: applications.some((a) => a.productKey === "CREDIT_CARD" && a.status === "APPROVED"),
  };

  // A concrete line per service card the way Clayton's do — the requested loan
  // amount when one is open, the card's last four when one is held — falling
  // back to the generic description otherwise.
  const openLoan = applications.find(
    (a) => loanKeys.includes(a.productKey) && openStatuses.has(a.status) && a.amountCents
  );
  const loanNote = openLoan?.amountCents
    ? fill(t.services.amountNote, { amount: formatMoney(openLoan.amountCents, locale, portfolio.currency) })
    : t.services.loansNote;
  const heldCard = applications.find((a) => a.productKey === "CREDIT_CARD" && a.cardNumber);
  const cardNote = heldCard?.cardNumber
    ? fill(t.services.cardNote, { last4: heldCard.cardNumber.slice(-4) })
    : t.services.cardsNote;

  // Insight figures. "Kept" is the share of money in that was not spent — a
  // real, honest health signal, unlike a balance-to-limit ratio we do not have.
  const netCents = trend.inCents - trend.outCents;
  const keptPct =
    trend.inCents > 0
      ? Math.max(0, Math.min(100, Math.round((netCents / trend.inCents) * 100)))
      : 0;

  // A real milestone: has a deposit ever posted? Drives the one achievement.
  const hasFirstDeposit = transactions.some(
    (tx) => tx.type === "DEPOSIT" && tx.status === "POSTED"
  );

  const heroAccountLabel = portfolio.primary
    ? `${t.bank.checking} \u00b7 \u00b7\u00b7\u00b7\u00b7 ${portfolio.primary.number.slice(-4)}`
    : t.dashboard.totalBalance;

  return (
    <AppShell user={user} active="dashboard" title={t.dashboard.overview} bleed>
      {/* The immersive top: balance, trend and actions in one gradient that
          runs to the screen edges and up behind the floating header. */}
      <BalanceHero
        bleed
          greeting={
            <Greeting
              morning={fill(t.dashboard.greetingMorning, { name: user.firstName })}
              afternoon={fill(t.dashboard.greetingAfternoon, { name: user.firstName })}
              evening={fill(t.dashboard.greetingEvening, { name: user.firstName })}
              fallback={fill(t.dashboard.welcomeBack, { name: user.firstName })}
            />
          }
          accountLabel={heroAccountLabel}
          balance={formatMoney(
            portfolio.totalCents - portfolio.totalPendingWithdrawalCents,
            locale,
            portfolio.currency
          )}
          changePercent={change}
          changeLabel={t.dashboard.thisMonth}
          pendingNote={
            // Money reserved against a transfer already started is named first:
            // it explains why the figure above is lower than they expect.
            [
              portfolio.totalPendingWithdrawalCents > 0
                ? fill(t.bank.reservedNote, {
                    amount: formatMoney(
                      portfolio.totalPendingWithdrawalCents,
                      locale,
                      portfolio.currency
                    ),
                  })
                : null,
              portfolio.totalPendingDepositCents > 0
                ? fill(t.bank.pendingNote, {
                    amount: formatMoney(
                      portfolio.totalPendingDepositCents,
                      locale,
                      portfolio.currency
                    ),
                  })
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || null
          }
          trend={trend.hasShape ? trendData : []}
          trendLabel={t.dashboard.trendLabel}
          hideLabel={t.dashboard.hideBalance}
          showLabel={t.dashboard.showBalance}
          actions={heroActions}
        />

      <Page className="space-y-6 pt-6">
        {heldForVat.length > 0 && (
          <div className="rounded-xl border border-gold/35 bg-gold/10 px-4 py-3">
            <p className="text-sm font-medium text-gold">{t.vat.pendingBanner}</p>
            <ul className="mt-2 space-y-1">
              {heldForVat.map((tx) => (
                <li key={tx.id}>
                  <Link
                    href={`/verify-transfer/${tx.id}`}
                    className="tnum text-sm font-semibold text-gold underline underline-offset-2"
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

        {/* Financial services — the four things beyond an account: borrowing,
            grants, refunds and cards. Each owns an accent so the row reads as
            distinct services, not a wall of navy. */}
        <section>
          <SectionHead
            title={t.services.title}
            subtitle={t.services.subtitle}
            href="/loans"
            linkLabel={t.services.viewAll}
          />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
            <ServiceCard
              accent="blue"
              icon="lending"
              title={t.services.loansTitle}
              status={
                serviceStatus.loan ? { label: t.services.pending, tone: "pending" } : { label: t.services.available, tone: "muted" }
              }
              note={loanNote}
              cta={serviceStatus.loan ? t.services.view : t.services.apply}
              ctaIcon={serviceStatus.loan ? undefined : "plus"}
              href="/loans"
            />
            <ServiceCard
              accent="green"
              icon="gift"
              title={t.services.grantsTitle}
              status={
                serviceStatus.grant ? { label: t.services.pending, tone: "pending" } : { label: t.services.available, tone: "ok" }
              }
              note={t.services.grantsNote}
              cta={serviceStatus.grant ? t.services.view : t.services.apply}
              href="/grants"
            />
            <ServiceCard
              accent="violet"
              icon="receipt"
              title={t.services.taxTitle}
              status={
                serviceStatus.tax ? { label: t.services.pending, tone: "pending" } : { label: t.services.available, tone: "ok" }
              }
              note={t.services.taxNote}
              cta={serviceStatus.tax ? t.services.view : t.services.apply}
              href="/tax-refund"
            />
            <ServiceCard
              accent="amber"
              icon="card"
              title={t.services.cardsTitle}
              status={
                serviceStatus.card ? { label: t.services.active, tone: "ok" } : { label: t.services.available, tone: "muted" }
              }
              note={cardNote}
              cta={t.services.manage}
              href="/cards"
            />
          </div>
        </section>

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
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400/12 text-amber-700">
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

        {/* Who you pay, then how the money moved. Both were a tap away
            before — a client should not have to go looking for either. */}
        {beneficiaries.length > 0 && (
          <section>
            <SectionHead
              title={t.dashboard.sendAgain}
              subtitle={t.dashboard.beneficiaries}
              href="/payments?tab=payees"
              linkLabel={t.dashboard.viewAll}
            />
            <div className="no-scrollbar -mx-5 mt-4 flex gap-3 overflow-x-auto px-5 sm:mx-0 sm:px-0">
              {beneficiaries.map((b) => (
                <Link
                  key={b.id}
                  href={`/payments?payee=${b.id}`}
                  className="group flex w-[4.75rem] shrink-0 flex-col items-center gap-2 text-center"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-ink-1 text-[15px] font-semibold text-brand-500 transition group-hover:border-brand-500/50">
                    {b.initial}
                  </span>
                  <span className="w-full truncate text-[11.5px] font-medium text-fg-muted transition group-hover:text-fg">
                    {b.name}
                  </span>
                </Link>
              ))}
              <Link
                href="/payments?tab=payees"
                className="group flex w-[4.75rem] shrink-0 flex-col items-center gap-2 text-center"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-line text-fg-faint transition group-hover:border-brand-500/50 group-hover:text-brand-500">
                  <NavIcons.plus className="h-5 w-5" />
                </span>
                <span className="w-full truncate text-[11.5px] font-medium text-fg-muted transition group-hover:text-fg">
                  {t.dashboard.addNew}
                </span>
              </Link>
            </div>
          </section>
        )}

        {trend.hasShape && (
          <section>
            <SectionHead title={t.dashboard.insights} subtitle={t.dashboard.last90} />

            {/* Account health \u2014 a share bar of money kept versus money spent,
                so "healthy" is a real figure, not a badge. */}
            <div className="elev-1 mt-4 rounded-2xl border border-line bg-ink-1 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-600">
                    <Icons.heart className="h-[20px] w-[20px]" />
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold text-fg">{t.dashboard.accountHealth}</p>
                    <p className="text-[13px] font-semibold text-emerald-600">
                      {netCents >= 0 ? t.dashboard.healthy : t.dashboard.watch}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-medium text-fg-faint">{t.dashboard.keptRatio}</p>
                  <p className="tnum text-lg font-semibold text-fg">{keptPct}%</p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-3">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${keptPct}%` }}
                />
              </div>
            </div>

            {/* This period \u2014 money in and out as tinted arrow tiles, with the
                net they produce below. */}
            <div className="elev-1 mt-4 rounded-2xl border border-line bg-ink-1 p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600">
                    <NavIcons.arrowDown className="h-[18px] w-[18px]" />
                  </span>
                  <p className="mt-2 text-[12px] font-medium text-fg-muted">{t.dashboard.income}</p>
                  <p className="tnum mt-0.5 text-lg font-semibold text-fg">
                    {formatMoney(trend.inCents, locale, portfolio.currency)}
                  </p>
                </div>
                <div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500/12 text-rose-600">
                    <NavIcons.arrowUp className="h-[18px] w-[18px]" />
                  </span>
                  <p className="mt-2 text-[12px] font-medium text-fg-muted">{t.dashboard.expenses}</p>
                  <p className="tnum mt-0.5 text-lg font-semibold text-fg">
                    {formatMoney(trend.outCents, locale, portfolio.currency)}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-3">
                <p className="text-[13px] font-medium text-fg-muted">{t.dashboard.net}</p>
                <p
                  className={`tnum text-[15px] font-semibold ${netCents >= 0 ? "text-pos" : "text-neg"}`}
                >
                  {netCents >= 0 ? "+" : "\u2212"}
                  {formatMoney(Math.abs(netCents), locale, portfolio.currency)}
                </p>
              </div>
            </div>

            {/* A single quiet tip, the way Clayton's carries one. */}
            <Link
              href="/goals"
              className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-[linear-gradient(120deg,#eef4ff_0%,#f6f0fb_100%)] p-4 transition hover:border-brand-500/30"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/12 text-brand-500">
                <Icons.bulb className="h-[20px] w-[20px]" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-fg">{t.dashboard.tipTitle}</span>
                  <span className="rounded-full bg-gold-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">
                    {t.dashboard.tip}
                  </span>
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-fg-muted">
                  {t.dashboard.tipBody}
                </span>
              </span>
            </Link>
          </section>
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

          {/* Phone: the four original products keep their full-size faces,
              stacked. Everything added since sits below in a coloured two-up
              grid, so the suite is not a dozen full-bleed cards deep. */}
          <div className="mt-4 space-y-3 sm:hidden">
            {heroProducts.map((v) => (
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

            {restProducts.length > 0 && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                {restProducts.map((v) => {
                  const s = productStyle(v.def.key);
                  return (
                    <ServiceCard
                      key={v.def.key}
                      accent={s.accent}
                      icon={s.icon}
                      title={v.title}
                      status={
                        v.status
                          ? { label: v.status.label, tone: pillTone(v.status.tone) }
                          : { label: t.services.available, tone: "muted" }
                      }
                      note={v.value ? `${v.valueLabel ? `${v.valueLabel}: ` : ""}${v.value}` : v.body}
                      cta={v.cta}
                      href={v.href}
                    />
                  );
                })}
              </div>
            )}
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
                reference: t.bank.reference,
                vatNeeded: t.vat.needed,
              }}
              locale={locale}
              currency={portfolio.currency}
              emptyText={t.bank.none}
            />
          </div>
        </section>

        {/* Achievements — one real milestone, not invented gamification. */}
        {hasFirstDeposit && (
          <section>
            <SectionHead title={t.dashboard.achievements} />
            <div className="elev-1 mt-4 flex items-center gap-3.5 rounded-2xl border border-line bg-[linear-gradient(120deg,#fbf3df_0%,#f6f0fb_100%)] p-4 sm:p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-400/25 text-gold">
                <Icons.review className="h-[22px] w-[22px]" />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-fg">{t.dashboard.firstDeposit}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-fg-muted">
                  {t.dashboard.firstDepositBody}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Need help — the same reassurance Clayton closes on, routed to the
            support tools we actually have. */}
        <section>
          <SectionHead title={t.dashboard.needHelp} />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
            <Link
              href="/support"
              className="elev-1 rounded-2xl border border-line bg-ink-1 p-4 text-center transition hover:border-brand-500/30 sm:p-5"
            >
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/12 text-brand-500">
                <NavIcons.chat className="h-[22px] w-[22px]" />
              </span>
              <p className="mt-2.5 text-[14px] font-semibold text-fg">{t.dashboard.liveChat}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-fg-muted">{t.dashboard.liveChatBody}</p>
            </Link>
            <EmailSupport
              title={t.dashboard.emailSupport}
              body={t.dashboard.emailSupportBody}
              chooseTitle={t.dashboard.emailChoose}
              supportLabel={t.dashboard.emailSupportTeam}
              managerLabel={t.dashboard.emailManager}
              supportEmail="support@trustlinefinancialgroup.com"
              managerEmail="accountmanager@trustlinefinancialgroup.com"
              subject={t.dashboard.emailSubject}
            />
          </div>
          <div className="elev-1 mt-3 flex items-center justify-center gap-6 rounded-2xl border border-line bg-[linear-gradient(120deg,#f6f9ff_0%,#f3f6fc_100%)] px-4 py-3.5 text-center">
            <span className="flex items-center gap-2 text-[12.5px] font-semibold text-fg">
              <NavIcons.clock className="h-4 w-4 text-brand-500" />
              {t.dashboard.support247}
            </span>
            <span className="text-[12.5px] text-fg-muted">{t.dashboard.support247Body}</span>
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
