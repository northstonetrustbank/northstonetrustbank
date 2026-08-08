import { AccountManagerFooter } from "@/components/account-manager-footer";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";
import { getDict, getLocale } from "@/i18n/server";
import { db } from "@/lib/db";
import { accountTimeline, lastEventDates } from "@/lib/account-timeline";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { AccountForms } from "./account-forms";
import { TwoFactorForm } from "./two-factor-form";
import { fill } from "@/i18n";

export const metadata = { title: "Account settings — Northstone Trust Bank" };

const INTL: Record<string, string> = { en: "en-US", fr: "fr-FR", de: "de-DE", es: "es-ES" };

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const t = await getDict();
  const locale = await getLocale();
  const home = isAdmin(user.role) ? "/admin" : "/dashboard";

  const [accounts, timeline, dates] = await Promise.all([
    db.account.findMany({ where: { userId: user.id }, orderBy: { kind: "asc" } }),
    accountTimeline(user.id),
    lastEventDates(user.id),
  ]);

  const dateFmt = new Intl.DateTimeFormat(INTL[locale] ?? "en-US", { dateStyle: "long" });
  const stampFmt = new Intl.DateTimeFormat(INTL[locale] ?? "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
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

  const security: { label: string; value: string; good: boolean }[] = [
    {
      label: t.account.passwordLast,
      value: dates.passwordChanged ? day(dates.passwordChanged) : t.account.never,
      good: Boolean(dates.passwordChanged),
    },
    {
      label: t.account.securityWordStatus,
      value: user.securityWordHash ? t.account.securityWordOn : t.account.securityWordOff,
      good: Boolean(user.securityWordHash),
    },
    {
      // Accounts verified before this page existed have no audit entry to date,
      // so fall back to the flag rather than claiming it never happened.
      label: t.account.emailVerifiedLabel,
      value: !user.emailVerified
        ? t.account.notYet
        : dates.emailVerified
          ? day(dates.emailVerified)
          : t.account.verified,
      good: user.emailVerified,
    },
    {
      label: t.account.documentsVerifiedLabel,
      value: dates.documentsDeleted
        ? t.account.documentsDeleted
        : dates.approved
          ? t.account.documentsApproved
          : dates.documentsSubmitted
            ? t.account.documentsSubmitted
            : t.account.notYet,
      good: Boolean(dates.approved || dates.documentsDeleted),
    },
    {
      label: t.twoFactor.title,
      value: user.twoFactorEnabled ? t.twoFactor.statusOn : t.twoFactor.statusOff,
      good: user.twoFactorEnabled,
    },
    {
      label: t.account.lastSignIn,
      value: dates.lastSignIn ? stampFmt.format(dates.lastSignIn) : t.account.never,
      good: true,
    },
  ];

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-navy-50/50">
      <header className="border-b border-white/10 bg-navy-900">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
          <Logo theme="dark" href={home} />
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
        <Link href={home} className="text-sm font-semibold text-accent-600 hover:text-accent-700">
          ← {t.bank.back}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-navy-900">
          {t.account.title}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t.account.subtitle}</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* Details */}
          <section className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
            <h2 className="text-lg font-semibold text-navy-900">{t.account.detailsTitle}</h2>
            <dl className="mt-5 divide-y divide-gray-100">
              {details.map((d) => (
                <div key={d.label} className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="text-sm text-gray-500">{d.label}</dt>
                  <dd className="break-all text-right text-sm font-semibold text-navy-900">
                    {d.value}
                  </dd>
                </div>
              ))}
            </dl>

            <h3 className="mt-7 text-[13px] font-semibold uppercase tracking-wide text-gray-500">
              {t.account.accountsTitle}
            </h3>
            <dl className="mt-3 divide-y divide-gray-100">
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-sm text-gray-500">{t.account.checkingLabel}</dt>
                <dd className="font-mono text-sm font-semibold text-navy-900">
                  {checking?.number ?? t.account.notYet}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-sm text-gray-500">{t.account.savingsLabel}</dt>
                <dd className="font-mono text-sm font-semibold text-navy-900">
                  {savings?.number ?? t.account.noSavings}
                </dd>
              </div>
            </dl>

            <p className="mt-5 rounded-lg bg-navy-50/70 px-3.5 py-2.5 text-xs leading-relaxed text-navy-700">
              {t.account.detailsNote}
            </p>
          </section>

          {/* Security status */}
          <section className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
            <h2 className="text-lg font-semibold text-navy-900">{t.account.securityStatusTitle}</h2>
            <dl className="mt-5 divide-y divide-gray-100">
              {security.map((s) => (
                <div key={s.label} className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="text-sm text-gray-500">{s.label}</dt>
                  <dd className="flex items-center gap-2 text-right text-sm font-semibold text-navy-900">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        s.good ? "bg-green-500" : "bg-amber-400"
                      }`}
                      aria-hidden="true"
                    />
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        {/* Change password / security word */}
        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
          <h2 className="text-lg font-semibold text-navy-900">{t.account.securityTitle}</h2>
          <AccountForms
            hasSecurityWord={!!user.securityWordHash}
            labels={{
              changePassword: t.account.changePassword,
              currentPassword: t.account.currentPassword,
              newPassword: t.account.newPassword,
              confirmPassword: t.account.confirmPassword,
              updatePassword: t.account.updatePassword,
              securityWordTitle: t.account.securityWordTitle,
              securityWordDesc: t.account.securityWordDesc,
              securityWordLabel: t.account.securityWordLabel,
              passwordToConfirm: t.account.passwordToConfirm,
              saveSecurityWord: t.account.saveSecurityWord,
              securityWordActive: t.account.securityWordActive,
              passwordHint: t.auth.passwordHint,
            }}
          />
          <TwoFactorForm
            enabled={user.twoFactorEnabled}
            labels={{
              title: t.twoFactor.title,
              desc: t.twoFactor.settingsDesc,
              statusOn: t.twoFactor.statusOn,
              statusOff: t.twoFactor.statusOff,
              enable: t.twoFactor.enable,
              disable: t.twoFactor.disable,
              confirmWithPassword: t.twoFactor.confirmWithPassword,
              recommendation: t.twoFactor.recommendation,
              onSince: user.twoFactorEnabledAt
                ? fill(t.twoFactor.onSince, { date: dateFmt.format(user.twoFactorEnabledAt) })
                : null,
            }}
          />
        </section>

        {/* History */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-navy-900">{t.account.historyTitle}</h2>
          <p className="mt-1 text-sm text-gray-500">{t.account.historyBody}</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {timeline.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-gray-500">
                {t.account.historyEmpty}
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {timeline.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" aria-hidden="true" />
                      <span className="text-sm font-medium text-navy-900">
                        {t.account.events[e.action] ?? e.action}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          e.byAdmin ? "bg-navy-100 text-navy-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {e.byAdmin ? t.account.byTeam : t.account.byYou}
                      </span>
                    </div>
                    <time className="text-xs text-gray-500">{stampFmt.format(e.at)}</time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
      <AccountManagerFooter labels={{ title: t.bank.managerTitle, body: t.bank.managerBody }} />
    </main>
  );
}
