import { AccountManagerFooter } from "@/components/account-manager-footer";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";
import { getDict, getLocale } from "@/i18n/server";
import { formatPeriod, statementPeriods } from "@/lib/statements";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";

export const metadata = { title: "Statements — Northstone Trust Bank" };

export default async function StatementsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status !== "ACTIVE") redirect("/login");

  const t = await getDict();
  const locale = await getLocale();
  const periods = await statementPeriods(user.id);

  const monthFmt = new Intl.DateTimeFormat(
    { en: "en-US", fr: "fr-FR", de: "de-DE", es: "es-ES" }[locale],
    { month: "long", year: "numeric", timeZone: "UTC" }
  );

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

      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link href="/dashboard" className="text-sm font-semibold text-accent-600 hover:text-accent-700">
          ← {t.bank.back}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-navy-900">
          {t.statements.title}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t.statements.subtitle}</p>

        {periods.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-navy-200 bg-white p-10 text-center text-sm text-gray-500">
            {t.statements.none}
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {periods.map((p) => {
              const key = formatPeriod(p);
              return (
                <li key={key}>
                  <Link
                    href={`/statements/${key}`}
                    className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-navy-50/60"
                  >
                    <span className="font-semibold text-navy-900">
                      {monthFmt.format(new Date(Date.UTC(p.year, p.month - 1, 1)))}
                    </span>
                    <span className="text-sm font-semibold text-accent-600">
                      {t.statements.view} →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <AccountManagerFooter labels={{ title: t.bank.managerTitle, body: t.bank.managerBody }} />
    </main>
  );
}
