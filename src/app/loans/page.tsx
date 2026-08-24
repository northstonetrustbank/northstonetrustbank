import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { formatMoney } from "@/lib/bank";
import { loadHoldings } from "@/lib/holdings";
import {
  availableCreditCents,
  isOverdue,
  monthlyPaymentCents,
  parseRatePercent,
  repaidPercent,
} from "@/lib/lending";
import { productsWithLabels } from "@/lib/product-view";
import { productsFor } from "@/lib/products";
import { getDict, getLocale } from "@/i18n/server";
import { fill } from "@/i18n";
import { AppShell, Page } from "@/components/app-shell";
import { Icons } from "@/components/icons";
import { ProductArt } from "@/components/product-art";
import {
  Card,
  EmptyState,
  Eyebrow,
  ProgressBar,
  SectionHead,
  StatusChip,
} from "@/components/ui";

export const metadata = { title: "Loans — Northstone Trust Bank" };

export default async function LoansPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status === "PENDING") redirect("/onboarding");
  if (user.status !== "ACTIVE") redirect("/login");

  const t = await getDict();
  const locale = await getLocale();

  const holdings = await loadHoldings(user.id, user.accountType);
  const labelled = productsWithLabels(t, user.accountType);
  const titles = new Map(labelled.map(({ def, item }) => [def.key, item.title]));
  const blurbs = new Map(labelled.map(({ def, item }) => [def.key, item.body]));

  // Every application the client has made, so the page shows decisions too.
  const applications = await db.productApplication.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const dateFmt = new Intl.DateTimeFormat(
    { en: "en-US", fr: "fr-FR", de: "de-DE", es: "es-ES" }[locale],
    { dateStyle: "medium" }
  );

  // What this client could actually borrow — cards live on their own page.
  const lendingProducts = productsFor(user.accountType).filter((d) => d.credit && !d.card);

  const lendingApplications = applications.filter((a) => {
    const title = titles.get(a.productKey);
    return title && holdings.loans.every((l) => l.app.id !== a.id);
  });

  return (
    <AppShell
      user={user}
      active="loans"
      title={t.loansPage.title}
      subtitle={t.loansPage.subtitle}
    >
      <Page className="space-y-8">
        {holdings.loans.length === 0 ? (
          <section>
            <EmptyState title={t.loansPage.empty} body={t.loansPage.emptyBody} />
            {lendingProducts.length > 0 && (
              <>
                <SectionHead className="mt-9" title={t.loansPage.available} />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {lendingProducts.map((d, i) => (
                    <Link
                      key={d.key}
                      href={`/product/${d.key}`}
                      className="rise elev-2 group flex flex-col overflow-hidden rounded-2xl border border-line bg-ink-1 transition hover:border-brand-500/40"
                      style={{ animationDelay: `${60 + i * 60}ms` }}
                    >
                      {/* The product's own illustration already existed and was
                          never shown on this page. */}
                      {d.art && (
                        <span className="block border-b border-line-soft">
                          <ProductArt art={d.art} className="block w-full" />
                        </span>
                      )}
                      <span className="flex flex-1 flex-col p-5">
                        <span className="text-[15px] font-semibold text-fg">
                          {titles.get(d.key) ?? d.key}
                        </span>
                        <span className="mt-1.5 flex-1 text-[13px] leading-relaxed text-fg-muted">
                          {blurbs.get(d.key)}
                        </span>
                        <span className="mt-4 inline-flex w-fit items-center rounded-xl bg-brand-500 px-4 py-2 text-[13px] font-semibold text-white transition group-hover:bg-brand-400">
                          {t.products.apply}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </section>
        ) : (
          <section>
            <SectionHead title={t.loansPage.activeLoans} />
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {holdings.loans.map(({ app, def }) => {
                const revolving = def.credit === "revolving";
                const principal = app.approvedAmountCents ?? 0;
                const owed = app.outstandingCents ?? 0;
                const rate = parseRatePercent(app.interestRate);
                const monthly = revolving
                  ? null
                  : monthlyPaymentCents(principal, rate, app.termMonths);
                const progress = revolving ? null : repaidPercent(principal, owed);
                const available = revolving
                  ? availableCreditCents(app.approvedAmountCents, owed)
                  : null;
                const overdue = isOverdue(app.dueDate, owed);

                return (
                  <Card key={app.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Eyebrow className="text-fg-muted">
                          {titles.get(def.key) ?? def.key}
                        </Eyebrow>
                        <p className="tnum mt-1.5 text-2xl font-semibold tracking-tight text-fg">
                          {formatMoney(owed, locale, user.currency)}
                        </p>
                        <p className="mt-0.5 text-[12px] text-fg-muted">
                          {revolving ? t.loansPage.drawn : t.loansPage.balanceOwed}
                        </p>
                      </div>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-2 text-fg-muted">
                        <Icons.lending className="h-5 w-5" />
                      </span>
                    </div>

                    {/* Repayment progress — installment lending only */}
                    {progress !== null && (
                      <div className="mt-4">
                        <ProgressBar percent={progress} tone="ok" />
                        <p className="tnum mt-2 text-[12px] text-fg-muted">
                          {fill(t.loansPage.paidOf, {
                            percent: String(Math.round(progress)),
                            total: formatMoney(principal, locale, user.currency),
                          })}
                        </p>
                      </div>
                    )}

                    <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line-soft pt-4 text-[13px]">
                      {app.interestRate && (
                        <div>
                          <dt className="text-fg-muted">{t.products.interestRateLabel}</dt>
                          <dd className="tnum mt-0.5 font-semibold text-fg">
                            {app.interestRate}
                          </dd>
                        </div>
                      )}
                      {app.dueDate && (
                        <div>
                          <dt className="text-fg-muted">{t.products.dueDateLabel}</dt>
                          <dd
                            className={`tnum mt-0.5 font-semibold ${
                              overdue ? "text-red-600" : "text-fg"
                            }`}
                          >
                            {dateFmt.format(app.dueDate)}
                          </dd>
                        </div>
                      )}
                      {monthly !== null && (
                        <div>
                          <dt className="text-fg-muted">{t.loansPage.monthlyPayment}</dt>
                          <dd className="tnum mt-0.5 font-semibold text-fg">
                            {formatMoney(monthly, locale, user.currency)}
                          </dd>
                        </div>
                      )}
                      {app.termMonths && (
                        <div>
                          <dt className="text-fg-muted">{t.loansPage.term}</dt>
                          <dd className="tnum mt-0.5 font-semibold text-fg">
                            {fill(t.loansPage.months, { count: String(app.termMonths) })}
                          </dd>
                        </div>
                      )}
                      {available !== null && (
                        <div>
                          <dt className="text-fg-muted">{t.products.availableCredit}</dt>
                          <dd className="tnum mt-0.5 font-semibold text-fg">
                            {formatMoney(available, locale, user.currency)}
                          </dd>
                        </div>
                      )}
                    </dl>

                    {overdue && (
                      <p className="mt-4 rounded-xl border border-neg/25 bg-neg/10 px-4 py-2.5 text-[13px] font-medium text-neg">
                        {t.loansPage.overdue}
                      </p>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        href={`/product/${def.key}`}
                        className="rounded-xl bg-brand-500 px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-400"
                      >
                        {t.loansPage.manage}
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Applications, decided and undecided */}
        {lendingApplications.length > 0 && (
          <section>
            <SectionHead title={t.loansPage.applications} />
            <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-ink-1">
              {lendingApplications.map((a, i) => (
                <Link
                  key={a.id}
                  href={`/product/${a.productKey}`}
                  className={`flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-ink-2 ${
                    i > 0 ? "border-t border-line-soft" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-fg">
                      {titles.get(a.productKey) ?? a.productKey}
                    </p>
                    <p className="tnum mt-0.5 text-[12px] text-fg-muted">
                      {dateFmt.format(a.createdAt)}
                      {a.termMonths
                        ? ` · ${fill(t.loansPage.months, { count: String(a.termMonths) })}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {(a.approvedAmountCents ?? a.amountCents) !== null && (
                      <span className="tnum text-[14px] font-semibold text-fg">
                        {formatMoney(
                          a.approvedAmountCents ?? a.amountCents ?? 0,
                          locale,
                          user.currency
                        )}
                      </span>
                    )}
                    <StatusChip
                      tone={
                        a.status === "APPROVED"
                          ? "ok"
                          : a.status === "DECLINED"
                            ? "bad"
                            : "pending"
                      }
                    >
                      {a.status === "APPROVED"
                        ? t.products.active
                        : a.status === "DECLINED"
                          ? t.products.declined
                          : t.products.underReview}
                    </StatusChip>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </Page>
    </AppShell>
  );
}
