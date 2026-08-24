import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getDict, getLocale } from "@/i18n/server";
import { formatPeriod, statementPeriods } from "@/lib/statements";
import { AppShell, Page } from "@/components/app-shell";
import { NavIcons } from "@/components/icons";

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
    <AppShell
      user={user}
      active="documents"
      title={t.statements.title}
      subtitle={t.statements.subtitle}
    >
      <Page className="max-w-2xl">

        {periods.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-ink-1 p-10 text-center text-sm text-fg-muted">
            {t.statements.none}
          </p>
        ) : (
          <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-ink-1 shadow-sm">
            {periods.map((p) => {
              const key = formatPeriod(p);
              return (
                <li key={key}>
                  <Link
                    href={`/statements/${key}`}
                    className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-ink-2"
                  >
                    <span className="font-semibold text-fg">
                      {monthFmt.format(new Date(Date.UTC(p.year, p.month - 1, 1)))}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-400">
                      {t.statements.view}
                      <NavIcons.chevronRight className="h-4 w-4" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Page>
    </AppShell>
  );
}
