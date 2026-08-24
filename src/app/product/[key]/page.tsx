import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { openSavingsAction, toggleFreezeAction } from "@/lib/actions/product-actions";
import { balanceCents, formatMoney, getSavings } from "@/lib/bank";
import { getDict, getLocale } from "@/i18n/server";
import { fill } from "@/i18n";
import { productDef, productLabel, docsFor } from "@/lib/products";
import { DocumentChecklist } from "./document-checklist";
import { buildProductView } from "@/lib/product-view";
import { AppShell, Page } from "@/components/app-shell";
import { BackLink } from "@/components/ui";
import { BankCard } from "@/components/bank-card";
import { ProductTile } from "@/components/product-tile";
import { CardWithReveal } from "@/components/card-details";
import { TransactionList } from "@/components/transaction-list";
import { ProductMoneyForms } from "./product-money-forms";

export const metadata = { title: "Product — Northstone Trust Bank" };

// One page per product, whether or not the client holds it. Unopened products
// show the blue Northstone card and an Apply call to action; open ones show the
// real card face, its terms, its money controls, and its own activity.

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ drawn?: string; paid?: string; opened?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status !== "ACTIVE") redirect("/login");

  const { key } = await params;
  const { drawn, paid, opened } = await searchParams;

  const def = productDef(user.accountType, key);
  if (!def) {
    // Older links pointed at an application id — send them to the product page.
    const legacy = await db.productApplication.findFirst({
      where: { id: key, userId: user.id },
      select: { productKey: true },
    });
    redirect(legacy ? `/product/${legacy.productKey}` : "/dashboard");
  }

  const t = await getDict();
  const locale = await getLocale();

  const [apps, savings] = await Promise.all([
    db.productApplication.findMany({
      where: { userId: user.id, productKey: key },
      orderBy: { createdAt: "desc" },
      take: 1,
      include: { documents: true },
    }),
    getSavings(user.id),
  ]);
  const app = apps[0] ?? null;

  // Supporting paperwork, resolved against the answers they gave. Shown while
  // an application is being reviewed, and after a decision only if anything is
  // still outstanding.
  const docItems =
    app && app.status !== "DECLINED"
      ? docsFor(def, app.details).map((requirement) => {
          const file = app.documents.find((d) => d.docKey === requirement.key);
          return {
            key: requirement.key,
            required: Boolean(requirement.required),
            name: t.docs.names[requirement.key as keyof typeof t.docs.names] ?? requirement.key,
            hint: t.docs.hints[requirement.key as keyof typeof t.docs.hints] ?? "",
            uploaded: file
              ? { id: file.id, fileName: file.fileName, sizeBytes: file.sizeBytes }
              : null,
          };
        })
      : [];
  const outstanding = docItems.filter((d) => d.required && !d.uploaded).length;
  const showDocs = docItems.length > 0 && (app?.status === "SUBMITTED" || outstanding > 0);
  const savingsBal = savings ? await balanceCents(savings.id) : 0;

  const item = productLabel(t.landing, user.accountType, key) ?? { title: key, body: "" };
  const view = buildProductView({
    def,
    item,
    app,
    savingsOpen: Boolean(savings),
    savingsBalanceCents: savingsBal,
    savingsNumber: savings?.number,
    t,
    locale,
    currency: user.currency,
    holderName: `${user.firstName} ${user.lastName}`.trim(),
  });

  const dateFmt = new Intl.DateTimeFormat(
    { en: "en-US", fr: "fr-FR", de: "de-DE", es: "es-ES" }[locale],
    { dateStyle: "long" }
  );

  // Activity for this product: savings shows its account ledger, deposits shows
  // deposits into checking, everything else shows rows tagged to the product.
  let rows: Awaited<ReturnType<typeof db.transaction.findMany>> = [];
  if (def.kind === "savings" && savings) {
    rows = await db.transaction.findMany({
      where: { accountId: savings.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    });
  } else if (def.kind === "deposit") {
    rows = await db.transaction.findMany({
      where: { account: { userId: user.id, kind: "CHECKING" }, type: "DEPOSIT" },
      orderBy: { createdAt: "desc" },
      take: 25,
    });
  } else if (app?.status === "APPROVED") {
    rows = await db.transaction.findMany({
      where: { applicationId: app.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    });
  }

  const isRevolving = def.credit === "revolving";
  const isInstallment = def.credit === "installment";
  const limit = app?.approvedAmountCents ?? 0;
  const owed = app?.outstandingCents ?? 0;
  const available = Math.max(0, limit - owed);
  const active = view.state === "ACTIVE";

  // "Balance" means opposite things on a card and on a current account, so the
  // labels say plainly which is which. Owing nothing is a real figure — it
  // shows as zero rather than "not set".
  const terms: { label: string; value: string }[] = [];
  if (app?.status === "APPROVED") {
    const money = (cents: number) => formatMoney(cents, locale, user.currency);

    if (isRevolving) {
      terms.push(
        { label: t.products.creditLimitLabel, value: limit ? money(limit) : t.products.notSet },
        { label: t.products.availableCredit, value: money(available) },
        { label: t.products.balanceOwed, value: money(owed) }
      );
    } else if (isInstallment) {
      terms.push(
        { label: t.products.amountBorrowed, value: limit ? money(limit) : t.products.notSet },
        { label: t.products.remainingToRepay, value: money(owed) }
      );
    } else {
      terms.push({
        label: t.products.limitLabel,
        value: limit ? money(limit) : t.products.notSet,
      });
    }

    terms.push(
      { label: t.products.interestRateLabel, value: app.interestRate || t.products.notSet },
      {
        label: t.products.dueDateLabel,
        value: app.dueDate ? dateFmt.format(app.dueDate) : t.products.notSet,
      }
    );
    if (def.card) {
      terms.push({
        label: t.products.cardTierLabel,
        value: app.cardTier
          ? t.products.tiers[app.cardTier as keyof typeof t.products.tiers] ?? app.cardTier
          : t.products.notSet,
      });
    }
  }

  const cardProps =
    view.render === "card"
      ? {
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
        }
      : null;

  // Cards and lending have their own hubs; everything else belongs to accounts.
  const activeNav = def.card ? "cards" : def.credit ? "loans" : "accounts";

  return (
    <AppShell user={user} active={activeNav} title={view.title} subtitle={item.body}>
      <Page className="max-w-5xl">
        <BackLink href="/dashboard">{t.products.backToProducts}</BackLink>

        {(drawn || paid || opened) && (
          <p className="mt-4 rounded-xl border border-pos/25 bg-pos/10 px-4 py-3 text-sm font-medium text-pos">
            {drawn ? t.products.drewBanner : paid ? t.products.paidBanner : t.bank.transferredBanner}
          </p>
        )}

        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr]">
          {/* The product's own artwork — a card face, or its photograph */}
          <div>
            {cardProps ? (
              active ? (
                <CardWithReveal
                  card={cardProps}
                  cvv={app?.cardCvv}
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
              ) : (
                <>
                  <BankCard {...cardProps} />
                  {view.state !== "REVIEW" && (
                    <p className="mt-4 rounded-lg bg-ink-2 px-3.5 py-2.5 text-sm text-fg-muted">
                      {t.products.sampleCard}
                    </p>
                  )}
                </>
              )
            ) : (
              view.render === "tile" && (
                <ProductTile
                  title={view.title}
                  art={view.art}
                  valueLabel={view.valueLabel}
                  value={view.value}
                  status={view.status}
                  placeholder={view.placeholder}
                  cta={null}
                />
              )
            )}
          </div>

          {/* The detail panel */}
          <div className="rounded-2xl border border-line bg-ink-1 p-7 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              {view.state === "ACTIVE" && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    app?.frozen ? "bg-neg/12 text-neg" : "bg-pos/12 text-pos"
                  }`}
                >
                  {app?.frozen ? t.products.frozenBadge : t.products.activeBadge}
                </span>
              )}
            </div>
            {view.body && (
              <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">{view.body}</p>
            )}

            {/* --- Not opened yet --- */}
            {view.state === "APPLY" && (
              <div className="mt-6">
                <p className="rounded-lg border border-line bg-ink-2 px-4 py-3 text-sm text-fg-muted">
                  {t.products.verifyNote}
                </p>
                <Link
                  href={`/apply?type=${def.key}`}
                  className="mt-5 block rounded-xl bg-brand-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-400"
                >
                  {t.products.apply}
                </Link>
              </div>
            )}

            {view.state === "DECLINED" && (
              <div className="mt-6">
                <p className="rounded-lg border border-red-100 bg-neg/10 px-4 py-3 text-sm text-neg">
                  {t.products.declinedNote}
                  {app?.adminNote ? ` ${t.products.reasonLabel}: ${app.adminNote}` : ""}
                </p>
                <Link
                  href={`/apply?type=${def.key}`}
                  className="mt-5 block rounded-xl bg-brand-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-400"
                >
                  {t.products.reapply}
                </Link>
              </div>
            )}

            {view.state === "REVIEW" && app && (
              <div className="mt-6">
                <p className="rounded-lg border border-amber-100 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
                  {t.products.reviewNote}
                </p>
                <dl className="mt-4 divide-y divide-line-soft">
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-sm text-fg-muted">{t.products.statusLabel}</dt>
                    <dd className="text-sm font-semibold text-fg">{t.products.underReview}</dd>
                  </div>
                  {app.amountCents != null && (
                    <div className="flex items-center justify-between py-3">
                      <dt className="text-sm text-fg-muted">{t.products.requestedAmount}</dt>
                      <dd className="text-sm font-semibold text-fg">
                        {formatMoney(app.amountCents, locale, user.currency)}
                      </dd>
                    </div>
                  )}
                  {app.requestedTier && (
                    <div className="flex items-center justify-between py-3">
                      <dt className="text-sm text-fg-muted">{t.products.requestedTier}</dt>
                      <dd className="text-sm font-semibold text-fg">
                        {t.products.tiers[app.requestedTier as keyof typeof t.products.tiers] ??
                          app.requestedTier}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* --- Savings --- */}
            {def.kind === "savings" && view.state === "CLOSED" && (
              <form action={openSavingsAction} className="mt-6">
                <p className="rounded-lg border border-line bg-ink-2 px-4 py-3 text-sm text-fg-muted">
                  {t.products.openSavingsNote}
                </p>
                <button className="mt-5 w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-400">
                  {t.products.openSavingsCta}
                </button>
              </form>
            )}

            {def.kind === "savings" && savings && (
              <div className="mt-6">
                <dl className="divide-y divide-line-soft">
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-sm text-fg-muted">{t.products.balanceLabel}</dt>
                    <dd className="text-sm font-semibold text-fg">
                      {formatMoney(savingsBal, locale, savings.currency)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-sm text-fg-muted">{t.bank.accountNo}</dt>
                    <dd className="text-sm font-semibold text-fg">{savings.number}</dd>
                  </div>
                </dl>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/transfer"
                    className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400"
                  >
                    {t.bank.transfer}
                  </Link>
                  <Link
                    href="/goals"
                    className="rounded-xl border border-line bg-ink-2 px-6 py-2.5 text-sm font-semibold text-fg transition hover:border-brand-500/40"
                  >
                    {t.bank.goalsLink}
                  </Link>
                </div>
              </div>
            )}

            {/* --- Deposits --- */}
            {def.kind === "deposit" && (
              <div className="mt-6">
                <p className="rounded-lg border border-line bg-ink-2 px-4 py-3 text-sm text-fg-muted">
                  {t.products.depositIntro}
                </p>
                <Link
                  href="/deposit"
                  className="mt-5 block rounded-xl bg-brand-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-400"
                >
                  {t.bank.makeDeposit}
                </Link>
              </div>
            )}

            {/* --- Approved product terms & controls --- */}
            {app?.status === "APPROVED" && (
              <>
                {isInstallment && owed > 0 && (
                  <p className="mt-6 rounded-lg bg-ink-2 px-3.5 py-2.5 text-sm text-fg-muted">
                    {t.products.disbursedNote}
                  </p>
                )}
                <dl className="mt-4 divide-y divide-line-soft">
                  {terms.map((r) => (
                    <div key={r.label} className="flex items-center justify-between py-3">
                      <dt className="text-sm text-fg-muted">{r.label}</dt>
                      <dd className="text-sm font-semibold text-fg">{r.value}</dd>
                    </div>
                  ))}
                </dl>
                {isRevolving && (
                  <p className="mt-3 text-xs leading-relaxed text-fg-muted">
                    {t.products.owedNote}
                  </p>
                )}

                <ProductMoneyForms
                  appId={app.id}
                  showDraw={isRevolving && available > 0 && !app.frozen}
                  showPay={owed > 0}
                  labels={{
                    draw: t.products.draw,
                    drawAmount: t.products.drawAmount,
                    pay: t.products.pay,
                    payAmount: t.products.payAmount,
                  }}
                />

                {def.card && (
                  <div className="mt-6 border-t border-line-soft pt-6">
                    {app.frozen && (
                      <p className="mb-3 rounded-lg bg-neg/10 px-3.5 py-2.5 text-sm text-neg">
                        {t.products.frozenNote}
                      </p>
                    )}
                    <form action={toggleFreezeAction}>
                      <input type="hidden" name="appId" value={app.id} />
                      <button
                        className={`w-full rounded-xl py-3 text-sm font-semibold text-white transition ${
                          app.frozen ? "bg-brand-500 hover:bg-brand-400" : "bg-brand-500 hover:bg-brand-400"
                        }`}
                      >
                        {app.frozen ? t.products.unfreezeCard : t.products.freezeCard}
                      </button>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Supporting documents */}
        {showDocs && app && (
          <section className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-fg">
                {t.docs.title}
              </h2>
              <p className="text-sm text-fg-muted">
                {fill(t.docs.progress, {
                  done: String(docItems.filter((d) => d.uploaded).length),
                  total: String(docItems.length),
                })}
              </p>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-fg-muted">{t.docs.subtitle}</p>

            {app.docsRequestedAt && (
              <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3">
                <p className="text-sm font-semibold text-amber-900">{t.docs.requestedTitle}</p>
                {app.docsNote && (
                  <p className="mt-1 text-sm text-amber-300">{app.docsNote}</p>
                )}
              </div>
            )}

            {outstanding === 0 && (
              <p className="mt-4 rounded-xl border border-pos/25 bg-pos/10 px-4 py-3 text-sm font-medium text-pos">
                {t.docs.allIn}
              </p>
            )}

            <div className="mt-4">
              <DocumentChecklist
                applicationId={app.id}
                docs={docItems}
                labels={{
                  required: t.docs.required,
                  optional: t.docs.optional,
                  upload: t.docs.upload,
                  replace: t.docs.replace,
                  remove: t.docs.remove,
                  chooseFile: t.common.chooseFile,
                  noFile: t.common.noFileChosen,
                  optimising: t.common.optimising,
                  fileTooBig: t.common.fileTooBigPicked,
                }}
              />
            </div>
          </section>
        )}

        {/* Activity on this product */}
        {(active || def.kind === "deposit") && (
          <>
            <h2 className="mt-10 text-lg font-semibold tracking-tight text-fg">
              {t.products.activity}
            </h2>
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
                emptyText={t.products.noActivity}
              />
            </div>
          </>
        )}

        {app && (
          <p className="mt-8 text-right text-xs text-fg-faint">
            {fill(t.products.appliedOn, { date: dateFmt.format(app.createdAt) })}
          </p>
        )}
      </Page>
    </AppShell>
  );
}
