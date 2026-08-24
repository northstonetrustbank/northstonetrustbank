import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { formatMoney, formatMoneyWhole } from "@/lib/bank";
import { loadHoldings } from "@/lib/holdings";
import { availableCreditCents } from "@/lib/lending";
import { toggleFreezeAction, updateCardControlAction } from "@/lib/actions/product-actions";
import { buildProductView, productsWithLabels } from "@/lib/product-view";
import { CARD_TIERS, TIER_LIMITS, TIER_THEMES, productsFor } from "@/lib/products";
import { getDict, getLocale } from "@/i18n/server";
import { AppShell, Page } from "@/components/app-shell";
import { BankCard } from "@/components/bank-card";
import { CardWithReveal } from "@/components/card-details";
import { NavIcons } from "@/components/icons";
import { TransactionList } from "@/components/transaction-list";
import { Card, Eyebrow, ProgressBar, SectionHead, StatusChip } from "@/components/ui";

export const metadata = { title: "Cards — Northstone Trust Bank" };

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status === "PENDING") redirect("/onboarding");
  if (user.status !== "ACTIVE") redirect("/login");

  const t = await getDict();
  const locale = await getLocale();
  const { card: cardParam } = await searchParams;

  const holdings = await loadHoldings(user.id, user.accountType);
  const labels = new Map(
    productsWithLabels(t, user.accountType).map(({ def, item }) => [def.key, item])
  );

  const selected =
    holdings.cards.find((h) => h.app.id === cardParam) ?? holdings.cards[0] ?? null;

  // Ledger rows tied to the selected card only.
  const rows = selected
    ? await db.transaction.findMany({
        where: { applicationId: selected.app.id },
        orderBy: { createdAt: "desc" },
        take: 12,
      })
    : [];

  const holderName = `${user.firstName} ${user.lastName}`.trim();

  const dateFmt = new Intl.DateTimeFormat(
    { en: "en-US", fr: "fr-FR", de: "de-DE", es: "es-ES" }[locale],
    { dateStyle: "medium" }
  );

  // A personal client applies for CREDIT_CARD, a business one for BUSINESS_CARD.
  const cardProduct = productsFor(user.accountType).find((d) => d.card);

  // Nothing held yet is not a reason to show nothing. The four tiers are real
  // products with real limits, so the page becomes the shopfront it should be.
  if (!selected) {
    return (
      <AppShell user={user} active="cards" title={t.cardsPage.title} subtitle={t.cardsPage.subtitle}>
        <Page className="space-y-6">
          <div className="rise">
            <h2 className="text-[17px] font-semibold tracking-tight text-fg">
              {t.cardsPage.empty}
            </h2>
            <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-fg-muted">
              {t.cardsPage.emptyBody}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {CARD_TIERS.map((tier, i) => {
              const range = TIER_LIMITS[tier];
              return (
                <div key={tier} className="rise" style={{ animationDelay: `${60 + i * 60}ms` }}>
                  <BankCard
                    theme={TIER_THEMES[tier]}
                    productName={t.products.tiers[tier]}
                    badge={t.products.tiers[tier]}
                    holderPlaceholder={t.products.yourName}
                    placeholder
                  />
                  <div className="mt-4 px-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[15px] font-semibold text-fg">
                        {t.products.tiers[tier]}
                      </p>
                      <p className="tnum text-[13px] font-medium text-fg-muted">
                        {range.max
                          ? `${formatMoneyWhole(range.min, locale, user.currency)} – ${formatMoneyWhole(range.max, locale, user.currency)}`
                          : `${formatMoneyWhole(range.min, locale, user.currency)}+`}
                      </p>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
                      {t.products.tierBlurbs[tier]}
                    </p>
                    {cardProduct && (
                      <Link
                        href={`/apply?type=${cardProduct.key}&tier=${tier}`}
                        className="mt-3 inline-block rounded-xl bg-brand-500 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-400"
                      >
                        {t.products.apply}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="px-1 text-[12px] text-fg-faint">{t.products.tierHint}</p>
        </Page>
      </AppShell>
    );
  }

  const { app, def } = selected;
  const item = labels.get(def.key) ?? { title: def.key, body: "" };
  const view = buildProductView({
    def,
    item,
    app,
    savingsOpen: false,
    savingsBalanceCents: 0,
    t,
    locale,
    currency: user.currency,
    holderName,
  });

  const available = availableCreditCents(app.approvedAmountCents, app.outstandingCents);
  const usedPercent =
    app.approvedAmountCents && app.approvedAmountCents > 0
      ? ((app.outstandingCents ?? 0) / app.approvedAmountCents) * 100
      : null;

  return (
    <AppShell user={user} active="cards" title={t.cardsPage.title} subtitle={t.cardsPage.subtitle}>
      <Page className="space-y-6">
        {/* Card switcher — only worth showing with more than one card */}
        {holdings.cards.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {holdings.cards.map(({ app: c, def: d }) => (
              <Link
                key={c.id}
                href={`/cards?card=${c.id}`}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[13px] font-semibold transition ${
                  c.id === app.id
                    ? "border-navy-800 bg-brand-500 text-white"
                    : "border-line bg-ink-1 text-fg hover:border-brand-500/40"
                }`}
              >
                {labels.get(d.key)?.title ?? d.key}
                {c.cardNumber && (
                  <span className="tnum font-mono text-[11px] opacity-70">
                    ···{c.cardNumber.slice(-4)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
          {/* The card itself, plus freeze */}
          <div className="space-y-4">
            {view.render === "card" && (
              <CardWithReveal
                card={{
                  theme: view.theme,
                  productName: view.title,
                  badge: view.badge,
                  holder: view.holder,
                  holderPlaceholder: view.holderPlaceholder,
                  number: view.number,
                  expiry: view.expiry,
                  valueLabel: view.valueLabel,
                  value: view.value,
                  status: view.status,
                  placeholder: view.placeholder,
                }}
                cvv={app.cardCvv}
                labels={{
                  show: t.products.showDetails,
                  hide: t.products.hideDetails,
                  number: t.products.cardNumberLabel,
                  expiry: t.products.expiryLabel,
                  cvv: t.products.cvvLabel,
                  copy: t.products.copy,
                  copied: t.products.copied,
                  notIssued: t.products.cardNotIssued,
                }}
              />
            )}

            <div className="flex flex-wrap items-center gap-3">
              <form action={toggleFreezeAction}>
                <input type="hidden" name="appId" value={app.id} />
                <button
                  type="submit"
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                    app.frozen
                      ? "bg-brand-500 text-white hover:bg-brand-400"
                      : "border border-line bg-ink-1 text-fg hover:border-brand-500/40"
                  }`}
                >
                  <NavIcons.snowflake className="h-4 w-4" />
                  {app.frozen ? t.products.unfreezeCard : t.products.freezeCard}
                </button>
              </form>
              {app.frozen && <StatusChip tone="bad">{t.products.frozenBadge}</StatusChip>}
            </div>

            {app.frozen && (
              <p className="rounded-xl border border-neg/25 bg-neg/10 px-4 py-3 text-[13px] text-neg">
                {t.products.frozenNote}
              </p>
            )}
          </div>

          {/* Balance, limits and controls */}
          <div className="space-y-5">
            <Card>
              <Eyebrow className="text-fg-muted">{t.products.outstandingLabel}</Eyebrow>
              <p className="tnum mt-1.5 text-3xl font-semibold tracking-tight text-fg">
                {formatMoney(app.outstandingCents ?? 0, locale, user.currency)}
              </p>

              {available !== null && (
                <>
                  <div className="mt-4 flex items-center justify-between text-[13px]">
                    <span className="text-fg-muted">{t.products.availableCredit}</span>
                    <span className="tnum font-semibold text-fg">
                      {formatMoney(available, locale, user.currency)}
                    </span>
                  </div>
                  {usedPercent !== null && (
                    <div className="mt-2">
                      <ProgressBar percent={usedPercent} tone={usedPercent > 80 ? "pending" : "info"} />
                      <p className="tnum mt-2 text-[12px] text-fg-muted">
                        {formatMoney(app.approvedAmountCents ?? 0, locale, user.currency)}{" "}
                        {t.products.creditLimitLabel.toLowerCase()}
                      </p>
                    </div>
                  )}
                </>
              )}

              <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line-soft pt-5 text-[13px]">
                {app.interestRate && (
                  <div>
                    <dt className="text-fg-muted">{t.products.interestRateLabel}</dt>
                    <dd className="tnum mt-0.5 font-semibold text-fg">{app.interestRate}</dd>
                  </div>
                )}
                {app.dueDate && (
                  <div>
                    <dt className="text-fg-muted">{t.products.dueDateLabel}</dt>
                    <dd className="tnum mt-0.5 font-semibold text-fg">
                      {dateFmt.format(app.dueDate)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-fg-muted">{t.cardsPage.dailyLimit}</dt>
                  <dd className="tnum mt-0.5 font-semibold text-fg">
                    {app.dailyLimitCents !== null && app.dailyLimitCents !== undefined
                      ? formatMoney(app.dailyLimitCents, locale, user.currency)
                      : t.cardsPage.noLimit}
                  </dd>
                </div>
                <div>
                  <dt className="text-fg-muted">{t.cardsPage.monthlyLimit}</dt>
                  <dd className="tnum mt-0.5 font-semibold text-fg">
                    {app.monthlyLimitCents !== null && app.monthlyLimitCents !== undefined
                      ? formatMoney(app.monthlyLimitCents, locale, user.currency)
                      : t.cardsPage.noLimit}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-[11px] text-fg-faint">{t.cardsPage.limitsNote}</p>
            </Card>

            {/* Client-controlled switches */}
            <Card>
              <SectionHead title={t.cardsPage.controls} />
              <div className="mt-4 space-y-3">
                <ControlRow
                  appId={app.id}
                  control="contactless"
                  label={t.cardsPage.contactless}
                  hint={t.cardsPage.contactlessHint}
                  on={app.contactless}
                  onLabel={t.cardsPage.on}
                  offLabel={t.cardsPage.off}
                />
                <ControlRow
                  appId={app.id}
                  control="onlinePayments"
                  label={t.cardsPage.online}
                  hint={t.cardsPage.onlineHint}
                  on={app.onlinePayments}
                  onLabel={t.cardsPage.on}
                  offLabel={t.cardsPage.off}
                />
              </div>
            </Card>
          </div>
        </div>

        {/* This card's activity */}
        <section>
          <SectionHead title={t.cardsPage.activity} href="/activity" linkLabel={t.dashboard.viewAll} />
          <div className="mt-4">
            <TransactionList
              rows={rows}
              labels={{
                types: t.bank.types,
                statuses: t.bank.statuses,
                vatNeeded: t.vat.needed,
                reference: t.bank.reference,
              }}
              locale={locale}
              currency={user.currency}
              emptyText={t.cardsPage.noActivity}
            />
          </div>
        </section>
      </Page>
    </AppShell>
  );
}

/** One switch row — a server-action form, so it works without JavaScript. */
function ControlRow({
  appId,
  control,
  label,
  hint,
  on,
  onLabel,
  offLabel,
}: {
  appId: string;
  control: "contactless" | "onlinePayments";
  label: string;
  hint: string;
  on: boolean;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <form
      action={updateCardControlAction}
      className="flex items-center justify-between gap-4 rounded-xl border border-line bg-ink-2 px-4 py-3"
    >
      <input type="hidden" name="appId" value={appId} />
      <input type="hidden" name="control" value={control} />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-fg">{label}</p>
        <p className="mt-0.5 text-[12px] text-fg-muted">{hint}</p>
      </div>
      <button
        type="submit"
        aria-pressed={on}
        className={`shrink-0 rounded-xl px-4 py-1.5 text-[12px] font-bold uppercase tracking-wide transition ${
          on
            ? "bg-pos/10 text-pos ring-1 ring-inset ring-emerald-600/20 hover:bg-emerald-100"
            : "bg-ink-2 text-fg-muted ring-1 ring-inset ring-gray-500/15 hover:bg-ink-3"
        }`}
      >
        {on ? onLabel : offLabel}
      </button>
    </form>
  );
}
