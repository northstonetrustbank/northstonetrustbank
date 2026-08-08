import { AccountManagerFooter } from "@/components/account-manager-footer";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";
import { balanceCents, ensureAccount, formatMoney, getSavings, pendingDepositCents, pendingWithdrawalCents } from "@/lib/bank";
import { getDict, getLocale } from "@/i18n/server";
import { fill } from "@/i18n";
import { buildProductView, latestByKey, productsWithLabels } from "@/lib/product-view";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { NotificationCenter } from "@/components/notification-center";
import { BankCard } from "@/components/bank-card";
import { ProductTile } from "@/components/product-tile";
import { TransactionList } from "@/components/transaction-list";

export const metadata = { title: "Dashboard — Northstone Trust Bank" };

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

  const account = await ensureAccount(user.id);
  const savings = await getSavings(user.id);
  const [balance, pending, reservedOut, savingsBal, transactions, notifications, applications] =
    await Promise.all([
      balanceCents(account.id),
      pendingDepositCents(account.id),
      // Money already committed to a withdrawal or a held transfer. The hero is
      // labelled "available", so it has to come off — otherwise a client is told
      // they have money that the next withdrawal will refuse to let them spend.
      pendingWithdrawalCents(account.id),
      savings ? balanceCents(savings.id) : Promise.resolve(0),
      db.transaction.findMany({
        where: { accountId: account.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.productApplication.findMany({ where: { userId: user.id } }),
    ]);

  // Transfers stuck at the VAT gate. Without a way back to the code screen, a
  // client who closes that page has no route to their own held money.
  const heldForVat = await db.transaction.findMany({
    where: {
      account: { userId: user.id },
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
      savingsOpen: Boolean(savings),
      savingsBalanceCents: savingsBal,
      savingsNumber: savings?.number,
      t,
      locale,
      currency: user.currency,
      holderName,
    })
  );

  const dateFmt = new Intl.DateTimeFormat(
    { en: "en-US", fr: "fr-FR", de: "de-DE", es: "es-ES" }[locale],
    { dateStyle: "medium" }
  );

  const notifItems = notifications.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    unread: n.readAt === null,
    time: dateFmt.format(n.createdAt),
  }));

  return (
    <main className="flex-1 bg-navy-50/50">
      <header className="border-b border-white/10 bg-navy-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Logo theme="dark" href="/dashboard" />
          <div className="flex items-center gap-3">
            <NotificationCenter
              items={notifItems}
              labels={{ title: t.notif.title, empty: t.notif.empty, dismiss: t.notif.dismiss }}
            />
            <LanguageSwitcher current={locale} variant="dark" />
            <form action={logoutAction}>
              <button className="rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
                {t.common.signOut}
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {submitted && (
          <p className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            {t.bank.submittedBanner}
          </p>
        )}
        {withdrawSubmitted && (
          <p className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            {t.bank.withdrawSubmittedBanner}
          </p>
        )}
        {transferred && (
          <p className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            {t.bank.transferredBanner}
          </p>
        )}
        {applied && (
          <p className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            {t.bank.appliedBanner}
          </p>
        )}
        {sent && (
          <p className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            {sent === "instant" ? t.bank.sentInstantBanner : t.bank.sentPendingBanner}
          </p>
        )}

        {heldForVat.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-amber-900">{t.vat.pendingBanner}</p>
            <ul className="mt-2 space-y-1">
              {heldForVat.map((tx) => (
                <li key={tx.id}>
                  <Link
                    href={`/verify-transfer/${tx.id}`}
                    className="text-sm font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950"
                  >
                    {formatMoney(Math.abs(tx.amountCents), locale, account.currency)} ·{" "}
                    {tx.reference} — {t.vat.openIt}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <h1 className="text-2xl font-semibold tracking-tight text-navy-900">
          {fill(t.dashboard.welcome, { name: user.firstName })}
        </h1>

        {/* Balance hero */}
        <div className="mt-6 overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 to-navy-950 p-8 shadow-lg shadow-navy-900/20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-navy-300">
                {t.bank.availableBalance}
              </p>
              <p className="mt-2 text-4xl font-semibold tracking-tight text-white">
                {formatMoney(balance - reservedOut, locale, account.currency)}
              </p>
              <p className="mt-2 text-sm text-navy-300">
                {t.bank.accountNo} {account.number}
              </p>
              {reservedOut > 0 && (
                <p className="mt-3 mr-2 inline-block rounded-full bg-amber-400/20 px-3 py-1 text-xs font-medium text-amber-100">
                  {fill(t.bank.reservedNote, {
                    amount: formatMoney(reservedOut, locale, account.currency),
                  })}
                </p>
              )}
              {pending > 0 && (
                <p className="mt-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-navy-100">
                  {fill(t.bank.pendingNote, {
                    amount: formatMoney(pending, locale, account.currency),
                  })}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/deposit"
                className="rounded-full bg-accent-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600"
              >
                {t.bank.makeDeposit}
              </Link>
              <Link
                href="/withdraw"
                className="rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t.bank.withdraw}
              </Link>
              <Link
                href="/send"
                className="rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t.bank.sendMoney}
              </Link>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/activity"
            className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-accent-500/40 hover:shadow-sm"
          >
            {t.activity.link}
          </Link>
          <Link
            href="/statements"
            className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-accent-500/40 hover:shadow-sm"
          >
            {t.statements.link}
          </Link>
          <Link
            href="/goals"
            className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-accent-500/40 hover:shadow-sm"
          >
            {t.bank.goalsLink}
          </Link>
          <Link
            href="/account"
            className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-accent-500/40 hover:shadow-sm"
          >
            {t.bank.accountSettings}
          </Link>
          <Link
            href="/support"
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-accent-500/40 hover:shadow-sm"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            {t.support.link}
          </Link>
          {savings && (
            <Link
              href="/transfer"
              className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-accent-500/40 hover:shadow-sm"
            >
              {t.bank.transfer}
            </Link>
          )}
        </div>

        {/* Product suite for the client's account type — every product as a card */}
        <h2 className="mt-10 text-lg font-semibold tracking-tight text-navy-900">
          {t.products.yourProducts}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{t.products.productsSubtitle}</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {productViews.map((v) => (
            <Link
              key={v.def.key}
              href={v.href}
              className="group block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
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
              <div className="mt-3 flex items-center gap-2 px-1">
                <p className="text-sm font-semibold text-navy-900">{v.title}</p>
                {!v.value && (
                  <span className="rounded-full bg-accent-50 px-2.5 py-0.5 text-[11px] font-semibold text-accent-700 transition group-hover:bg-accent-500 group-hover:text-white">
                    {v.cta}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Recent activity */}
        <h2 className="mt-10 text-lg font-semibold tracking-tight text-navy-900">
          {t.bank.recent}
        </h2>
        <div className="mt-4">
          <TransactionList
            rows={transactions}
            labels={{ types: t.bank.types, statuses: t.bank.statuses, reference: t.bank.reference, vatNeeded: t.vat.needed }}
            locale={locale}
            currency={account.currency}
            emptyText={t.bank.none}
          />
        </div>

        <p className="mt-8 flex items-center justify-end gap-2 text-right text-xs text-gray-400">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[9px] font-bold text-gray-500">
            FDIC
          </span>
          {t.bank.fdic}
        </p>
      </div>
      <AccountManagerFooter labels={{ title: t.bank.managerTitle, body: t.bank.managerBody }} />
    </main>
  );
}
