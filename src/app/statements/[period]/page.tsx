import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { ensureAccount, formatMoney, getSavings } from "@/lib/bank";
import { getDict, getLocale } from "@/i18n/server";
import { parsePeriod, periodRange, statementForAccount } from "@/lib/statements";
import { Logo } from "@/components/logo";
import { PrintButton } from "./print-button";

export const metadata = { title: "Statement — Northstone Trust Bank" };

// A printable monthly statement, one section per account. Saving as PDF is the
// browser's own print dialog, so there's no PDF dependency to maintain.

export default async function StatementPage({
  params,
}: {
  params: Promise<{ period: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status !== "ACTIVE") redirect("/login");

  const { period } = await params;
  const p = parsePeriod(period);
  if (!p) redirect("/statements");

  const t = await getDict();
  const locale = await getLocale();
  const intlLocale = { en: "en-US", fr: "fr-FR", de: "de-DE", es: "es-ES" }[locale];

  const [checking, savings] = await Promise.all([ensureAccount(user.id), getSavings(user.id)]);
  const accounts = [checking, ...(savings ? [savings] : [])];
  const sections = await Promise.all(
    accounts.map(async (a) => ({ account: a, ...(await statementForAccount(a.id, p)) }))
  );

  const monthFmt = new Intl.DateTimeFormat(intlLocale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const dayFmt = new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium", timeZone: "UTC" });
  const { start } = periodRange(p);

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-ink-2 print:bg-ink-1">
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href="/statements"
            className="text-sm font-semibold text-brand-400 hover:text-brand-400"
          >
            {t.statements.back}
          </Link>
          <div className="flex flex-wrap gap-3">
            <a
              href={`/api/statements/${period}`}
              className="rounded-xl border border-line bg-ink-1 px-5 py-2.5 text-sm font-semibold text-fg transition hover:border-brand-500/40"
            >
              {t.statements.csv}
            </a>
            <PrintButton label={t.statements.print} />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-line bg-ink-1 p-9 shadow-sm print:border-0 print:p-0 print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-line-soft pb-6">
            <Logo href="/dashboard" />
            <div className="text-right text-sm">
              <p className="font-semibold text-fg">{t.statements.title}</p>
              <p className="mt-0.5 text-fg-muted">
                {t.statements.period}: {monthFmt.format(start)}
              </p>
              <p className="mt-0.5 text-fg-muted">
                {t.statements.issued}: {dayFmt.format(new Date())}
              </p>
            </div>
          </div>

          <div className="mt-6 text-sm">
            <p className="text-fg-muted">{t.statements.accountHolder}</p>
            <p className="mt-1 font-semibold text-fg">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-fg-muted">{user.email}</p>
          </div>

          {sections.map(({ account, opening, closing, credits, debits, rows }) => {
            let running = opening;
            return (
              <section key={account.id} className="mt-9">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
                  <h2 className="text-base font-semibold text-fg">
                    {account.kind === "SAVINGS" ? t.bank.savings : t.bank.checking}
                  </h2>
                  <p className="text-sm text-fg-muted">{account.number}</p>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: t.statements.openingBalance, value: opening },
                    { label: t.statements.moneyIn, value: credits },
                    { label: t.statements.moneyOut, value: debits },
                    { label: t.statements.closingBalance, value: closing },
                  ].map((cell) => (
                    <div key={cell.label} className="rounded-xl bg-ink-2 px-4 py-3 print:bg-transparent print:px-0">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
                        {cell.label}
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-fg">
                        {formatMoney(cell.value, locale, account.currency)}
                      </dd>
                    </div>
                  ))}
                </dl>

                {rows.length === 0 ? (
                  <p className="mt-5 text-sm text-fg-muted">{t.statements.noRows}</p>
                ) : (
                  <table className="mt-5 w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-line text-[11px] uppercase tracking-wide text-fg-muted">
                        <th className="py-2 font-semibold">{t.statements.date}</th>
                        <th className="py-2 font-semibold">{t.statements.description}</th>
                        <th className="py-2 text-right font-semibold">{t.statements.amount}</th>
                        <th className="py-2 text-right font-semibold">{t.statements.balance}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((tx) => {
                        running += tx.amountCents;
                        return (
                          <tr key={tx.id} className="border-b border-line-soft align-top">
                            <td className="py-2.5 whitespace-nowrap text-fg-muted">
                              {dayFmt.format(tx.postedAt ?? tx.createdAt)}
                            </td>
                            <td className="py-2.5">
                              <p className="font-medium text-fg">
                                {t.bank.types[tx.type as keyof typeof t.bank.types] ?? tx.type}
                              </p>
                              <p className="text-xs text-fg-muted">
                                {tx.reference}
                                {tx.note ? ` · ${tx.note}` : ""}
                              </p>
                            </td>
                            <td
                              className={`py-2.5 text-right font-semibold ${
                                tx.amountCents >= 0 ? "text-pos" : "text-fg"
                              }`}
                            >
                              {tx.amountCents >= 0 ? "+" : ""}
                              {formatMoney(tx.amountCents, locale, account.currency)}
                            </td>
                            <td className="py-2.5 text-right text-fg-muted">
                              {formatMoney(running, locale, account.currency)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </section>
            );
          })}

          <p className="mt-10 border-t border-line-soft pt-5 text-xs leading-relaxed text-fg-faint">
            {t.statements.footer}
          </p>
        </div>
      </div>
    </main>
  );
}
