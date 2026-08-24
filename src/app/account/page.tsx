import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getDict, getLocale } from "@/i18n/server";
import { db } from "@/lib/db";
import { lastEventDates } from "@/lib/account-timeline";
import { AppShell, Page, PlainShell } from "@/components/app-shell";
import { NavIcons } from "@/components/icons";
import { Card, SectionHead } from "@/components/ui";

export const metadata = { title: "Account settings — Northstone Trust Bank" };

const INTL: Record<string, string> = { en: "en-US", fr: "fr-FR", de: "de-DE", es: "es-ES" };

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const t = await getDict();
  const locale = await getLocale();
  const admin = isAdmin(user.role);

  const [accounts, dates] = await Promise.all([
    db.account.findMany({ where: { userId: user.id }, orderBy: { kind: "asc" } }),
    lastEventDates(user.id),
  ]);

  const dateFmt = new Intl.DateTimeFormat(INTL[locale] ?? "en-US", { dateStyle: "long" });
  const day = (d: Date | null) => (d ? dateFmt.format(d) : t.account.notYet);

  const checking = accounts.find((a) => a.kind === "CHECKING");
  const savings = accounts.find((a) => a.kind === "SAVINGS");

  const details: { label: string; value: string }[] = [
    { label: t.account.fullName, value: `${user.firstName} ${user.lastName}` },
    { label: t.account.emailLabel, value: user.email },
    { label: t.account.phoneLabel, value: user.phone },
    {
      label: t.account.accountTypeLabel,
      value:
        t.account.accountTypes[user.accountType as keyof typeof t.account.accountTypes] ??
        user.accountType,
    },
    {
      label: t.account.statusLabel,
      value: t.account.statuses[user.status as keyof typeof t.account.statuses] ?? user.status,
    },
    { label: t.account.currencyLabel, value: user.currency },
    { label: t.account.languageLabel, value: user.locale.toUpperCase() },
    { label: t.account.memberSince, value: day(dates.opened ?? user.createdAt) },
  ];

  // Where the rest of the settings live now that security has its own page.
  const links = [
    {
      href: "/account/security",
      icon: "shield",
      title: t.securityPageApp.title,
      body: t.settingsLinks.securityBody,
    },
    {
      href: "/documents",
      icon: "statement",
      title: t.appnav.documents,
      body: t.settingsLinks.documentsBody,
    },
    {
      href: "/support",
      icon: "chat",
      title: t.appnav.support,
      body: t.settingsLinks.supportBody,
    },
  ];

  const body = (
    <div className="space-y-6">
      <Card>
        <SectionHead title={t.account.detailsTitle} />
        <dl className="mt-4 divide-y divide-line-soft">
          {details.map((d) => (
            <div key={d.label} className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-sm text-fg-muted">{d.label}</dt>
              <dd className="break-all text-right text-sm font-semibold text-fg">
                {d.value}
              </dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-7 text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
          {t.account.accountsTitle}
        </h3>
        <dl className="mt-3 divide-y divide-line-soft">
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-sm text-fg-muted">{t.account.checkingLabel}</dt>
            <dd className="tnum font-mono text-sm font-semibold text-fg">
              {checking?.number ?? t.account.notYet}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-sm text-fg-muted">{t.account.savingsLabel}</dt>
            <dd className="tnum font-mono text-sm font-semibold text-fg">
              {savings?.number ?? t.account.noSavings}
            </dd>
          </div>
        </dl>

        <p className="mt-5 rounded-lg bg-ink-2 px-3.5 py-2.5 text-xs leading-relaxed text-fg-muted">
          {t.account.detailsNote}
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {links.map((link) => {
          const Icon = NavIcons[link.icon] ?? NavIcons.gear;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-2xl border border-line bg-ink-1 p-5 transition hover:border-brand-500/40 hover:shadow-md"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-2 text-fg-muted">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <p className="mt-3 text-sm font-semibold text-fg">{link.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{link.body}</p>
            </Link>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-fg-faint">
        {t.common.brand} · {t.settingsLinks.version}
      </p>
    </div>
  );

  if (admin) {
    return (
      <PlainShell title={t.account.title} subtitle={t.account.subtitle} backHref="/admin">
        {body}
      </PlainShell>
    );
  }

  return (
    <AppShell user={user} active="account" title={t.account.title} subtitle={t.account.subtitle}>
      <Page>{body}</Page>
    </AppShell>
  );
}
