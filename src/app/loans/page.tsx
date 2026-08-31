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
import { formatMoneyWhole } from "@/lib/bank";
import { LoanCalculator, type CalculatorProduct } from "./loan-calculator";
import { getDict, getLocale } from "@/i18n/server";
import { fill } from "@/i18n";
import { AppShell, Page } from "@/components/app-shell";
import { Icons } from "@/components/icons";
import {
  Card,
  Eyebrow,
  ProgressBar,
  SectionHead,
  StatusChip,
} from "@/components/ui";

export const metadata = { title: "Loans — Northstone Trust Bank" };

/** One consistent icon + tint per loan, so the grid reads as one set. */
const LOAN_STYLE: Record<string, { icon: string; chip: string; ink: string }> = {
  PERSONAL_LOAN: { icon: "lending", chip: "bg-brand-500/12", ink: "text-brand-500" },
  MORTGAGE: { icon: "mortgage", chip: "bg-emerald-500/12", ink: "text-emerald-600" },
  AUTO_LOAN: { icon: "car", chip: "bg-cyan-500/12", ink: "text-cyan-600" },
  STUDENT_LOAN: { icon: "student", chip: "bg-violet-500/12", ink: "text-violet-600" },
  HOME_IMPROVEMENT: { icon: "renovation", chip: "bg-gold-400/20", ink: "text-gold" },
  HOME_EQUITY: { icon: "buildings", chip: "bg-emerald-500/12", ink: "text-emerald-600" },
  BUSINESS_LOAN: { icon: "business", chip: "bg-violet-500/12", ink: "text-violet-600" },
};

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

  // Only products with published terms can be modelled, so the calculator and
  // the rate cards are always quoting the same numbers.
  const calculatorProducts: CalculatorProduct[] = lendingProducts
    .filter((d) => d.terms)
    .map((d) => ({
      key: d.key,
      title: titles.get(d.key) ?? d.key,
      aprFrom: d.terms!.aprFrom,
      minCents: d.terms!.minCents,
      maxCents: d.terms!.maxCents,
      minTermMonths: d.terms!.minTermMonths,
      maxTermMonths: d.terms!.maxTermMonths,
    }));

  const calculatorLabels = {
    title: t.loansPage.calculatorTitle,
    lede: t.loansPage.calculatorLede,
    product: t.loansPage.calculatorProduct,
    amount: t.loansPage.calculatorAmount,
    rate: t.loansPage.calculatorRate,
    term: t.loansPage.calculatorTerm,
    months: t.loansPage.calculatorMonths,
    monthly: t.loansPage.calculatorMonthly,
    totalInterest: t.loansPage.calculatorTotalInterest,
    totalPayable: t.loansPage.calculatorTotalPayable,
    outOfRange: t.loansPage.calculatorOutOfRange,
    apply: t.products.apply,
    disclaimer: t.products.ratesNote,
  };

  // Currency used by the loan cards below.
  const currency = user.currency;

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
        {holdings.loans.length > 0 && (
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
                        className="rounded-xl bg-brand-500 px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-600"
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

        {/* Choose a loan — always shown, so a client can borrow again even with
            a loan already running. Each card leads straight to its application,
            with the rate, ceiling and term on the face. */}
        {lendingProducts.length > 0 && (
          <section>
            <SectionHead
              title={t.loansPage.available}
              subtitle={t.loansPage.availableLede}
            />
            {/* Compact, rate-forward cards. One consistent icon chip per loan
                instead of mismatched artwork, the rate as the hero figure, and
                short enough that several fit on a screen to compare. */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {lendingProducts.map((d, i) => {
                const style = LOAN_STYLE[d.key] ?? { icon: "lending", chip: "bg-brand-500/12", ink: "text-brand-500" };
                const draw = Icons[style.icon] ?? Icons.lending;
                const money = (c: number) => formatMoneyWhole(c, locale, currency);
                return (
                  <div
                    key={d.key}
                    className="rise elev-1 flex flex-col rounded-2xl border border-line bg-ink-1 p-4 sm:p-5"
                    style={{ animationDelay: `${60 + i * 50}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.chip} ${style.ink}`}>
                        {draw({ className: "h-[22px] w-[22px]" })}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold leading-tight text-fg">
                          {titles.get(d.key) ?? d.key}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-fg-muted">
                          {blurbs.get(d.key)}
                        </p>
                      </div>
                      {d.terms && (
                        <div className="shrink-0 text-right">
                          <p className="tnum text-[20px] font-bold leading-none text-gold">
                            {d.terms.aprFrom}%
                          </p>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-fg-faint">
                            {t.loansPage.aprFrom}
                          </p>
                        </div>
                      )}
                    </div>

                    {d.terms && (
                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line-soft pt-3.5">
                        <p className="tnum text-[12px] text-fg-muted">
                          <span className="font-semibold text-fg">{money(d.terms.maxCents)}</span>{" "}
                          {t.loansPage.maxLine}
                          {" · "}
                          <span className="font-semibold text-fg">
                            {Math.round(d.terms.minTermMonths / 12)}–{Math.round(d.terms.maxTermMonths / 12)}y
                          </span>
                        </p>
                        <div className="flex shrink-0 items-center gap-3">
                          <Link
                            href={`/product/${d.key}`}
                            className="text-[13px] font-medium text-brand-500 transition hover:text-brand-600"
                          >
                            {t.loansPage.learnMore}
                          </Link>
                          <Link
                            href={`/apply?type=${d.key}`}
                            className="inline-flex items-center rounded-xl bg-brand-500 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-600"
                          >
                            {t.products.apply}
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* What a loan costs, before applying for one */}
        {calculatorProducts.length > 0 && (
          <section>
            <LoanCalculator
              products={calculatorProducts}
              labels={calculatorLabels}
              locale={locale}
              currency={user.currency}
            />
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
