import { AccountManagerFooter } from "@/components/account-manager-footer";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";
import { openSavingsAction, toggleFreezeAction } from "@/lib/actions/product-actions";
import { balanceCents, formatMoney, getSavings } from "@/lib/bank";
import { getDict, getLocale } from "@/i18n/server";
import { fill } from "@/i18n";
import { productDef, productLabel, docsFor } from "@/lib/products";
import { DocumentChecklist } from "./document-checklist";
import { buildProductView } from "@/lib/product-view";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
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

  const view = buildProductView({
    def,
    item: productLabel(t.landing, user.accountType, key) ?? { title: key, body: "" },
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

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-navy-50/50">
      <header className="border-b border-white/10 bg-navy-900">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
          <Logo theme="dark" href="/dashboard" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher current={locale} variant="dark" />
            <form action={logoutAction}>
              <button className="rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
                {t.common.signOut}
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <Link href="/dashboard" className="text-sm font-semibold text-accent-600 hover:text-accent-700">
          ← {t.products.backToProducts}
        </Link>

        {(drawn || paid || opened) && (
          <p className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
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
                    <p className="mt-4 rounded-lg bg-navy-50/70 px-3.5 py-2.5 text-sm text-navy-700">
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
          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-navy-900">{view.title}</h1>
              {view.state === "ACTIVE" && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    app?.frozen ? "bg-red-100 text-red-700" : "bg-green-100 text-green-800"
                  }`}
                >
                  {app?.frozen ? t.products.frozenBadge : t.products.activeBadge}
                </span>
              )}
            </div>
            {view.body && (
              <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{view.body}</p>
            )}

            {/* --- Not opened yet --- */}
            {view.state === "APPLY" && (
              <div className="mt-6">
                <p className="rounded-lg border border-navy-100 bg-navy-50/60 px-4 py-3 text-sm text-navy-700">
                  {t.products.verifyNote}
                </p>
                <Link
                  href={`/apply?type=${def.key}`}
                  className="mt-5 block rounded-full bg-accent-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-accent-600"
                >
                  {t.products.apply}
                </Link>
              </div>
            )}

            {view.state === "DECLINED" && (
              <div className="mt-6">
                <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {t.products.declinedNote}
                  {app?.adminNote ? ` ${t.products.reasonLabel}: ${app.adminNote}` : ""}
                </p>
                <Link
                  href={`/apply?type=${def.key}`}
                  className="mt-5 block rounded-full bg-accent-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-accent-600"
                >
                  {t.products.reapply}
                </Link>
              </div>
            )}

            {view.state === "REVIEW" && app && (
              <div className="mt-6">
                <p className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {t.products.reviewNote}
                </p>
                <dl className="mt-4 divide-y divide-gray-100">
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-sm text-gray-500">{t.products.statusLabel}</dt>
                    <dd className="text-sm font-semibold text-navy-900">{t.products.underReview}</dd>
                  </div>
                  {app.amountCents != null && (
                    <div className="flex items-center justify-between py-3">
                      <dt className="text-sm text-gray-500">{t.products.requestedAmount}</dt>
                      <dd className="text-sm font-semibold text-navy-900">
                        {formatMoney(app.amountCents, locale, user.currency)}
                      </dd>
                    </div>
                  )}
                  {app.requestedTier && (
                    <div className="flex items-center justify-between py-3">
                      <dt className="text-sm text-gray-500">{t.products.requestedTier}</dt>
                      <dd className="text-sm font-semibold text-navy-900">
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
                <p className="rounded-lg border border-navy-100 bg-navy-50/60 px-4 py-3 text-sm text-navy-700">
                  {t.products.openSavingsNote}
                </p>
                <button className="mt-5 w-full rounded-full bg-accent-500 py-3 text-sm font-semibold text-white transition hover:bg-accent-600">
                  {t.products.openSavingsCta}
                </button>
              </form>
            )}

            {def.kind === "savings" && savings && (
              <div className="mt-6">
                <dl className="divide-y divide-gray-100">
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-sm text-gray-500">{t.products.balanceLabel}</dt>
                    <dd className="text-sm font-semibold text-navy-900">
                      {formatMoney(savingsBal, locale, savings.currency)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-sm text-gray-500">{t.bank.accountNo}</dt>
                    <dd className="text-sm font-semibold text-navy-900">{savings.number}</dd>
                  </div>
                </dl>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/transfer"
                    className="rounded-full bg-accent-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600"
                  >
                    {t.bank.transfer}
                  </Link>
                  <Link
                    href="/goals"
                    className="rounded-full border border-gray-200 px-6 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-accent-500/40"
                  >
                    {t.bank.goalsLink}
                  </Link>
                </div>
              </div>
            )}

            {/* --- Deposits --- */}
            {def.kind === "deposit" && (
              <div className="mt-6">
                <p className="rounded-lg border border-navy-100 bg-navy-50/60 px-4 py-3 text-sm text-navy-700">
                  {t.products.depositIntro}
                </p>
                <Link
                  href="/deposit"
                  className="mt-5 block rounded-full bg-accent-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-accent-600"
                >
                  {t.bank.makeDeposit}
                </Link>
              </div>
            )}

            {/* --- Approved product terms & controls --- */}
            {app?.status === "APPROVED" && (
              <>
                {isInstallment && owed > 0 && (
                  <p className="mt-6 rounded-lg bg-navy-50/70 px-3.5 py-2.5 text-sm text-navy-700">
                    {t.products.disbursedNote}
                  </p>
                )}
                <dl className="mt-4 divide-y divide-gray-100">
                  {terms.map((r) => (
                    <div key={r.label} className="flex items-center justify-between py-3">
                      <dt className="text-sm text-gray-500">{r.label}</dt>
                      <dd className="text-sm font-semibold text-navy-900">{r.value}</dd>
                    </div>
                  ))}
                </dl>
                {isRevolving && (
                  <p className="mt-3 text-xs leading-relaxed text-gray-500">
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
                  <div className="mt-6 border-t border-gray-100 pt-6">
                    {app.frozen && (
                      <p className="mb-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                        {t.products.frozenNote}
                      </p>
                    )}
                    <form action={toggleFreezeAction}>
                      <input type="hidden" name="appId" value={app.id} />
                      <button
                        className={`w-full rounded-full py-3 text-sm font-semibold text-white transition ${
                          app.frozen ? "bg-accent-500 hover:bg-accent-600" : "bg-navy-800 hover:bg-navy-700"
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
              <h2 className="text-lg font-semibold tracking-tight text-navy-900">
                {t.docs.title}
              </h2>
              <p className="text-sm text-gray-500">
                {fill(t.docs.progress, {
                  done: String(docItems.filter((d) => d.uploaded).length),
                  total: String(docItems.length),
                })}
              </p>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">{t.docs.subtitle}</p>

            {app.docsRequestedAt && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-900">{t.docs.requestedTitle}</p>
                {app.docsNote && (
                  <p className="mt-1 text-sm text-amber-800">{app.docsNote}</p>
                )}
              </div>
            )}

            {outstanding === 0 && (
              <p className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
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
            <h2 className="mt-10 text-lg font-semibold tracking-tight text-navy-900">
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
          <p className="mt-8 text-right text-xs text-gray-400">
            {fill(t.products.appliedOn, { date: dateFmt.format(app.createdAt) })}
          </p>
        )}
      </div>
      <AccountManagerFooter labels={{ title: t.bank.managerTitle, body: t.bank.managerBody }} />
    </main>
  );
}
