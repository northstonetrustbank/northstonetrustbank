import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";
import { getDict, getLocale } from "@/i18n/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { Icons } from "@/components/icons";
import { SupportConsole } from "./support-console";

export const metadata = { title: "Live support — Northstone Trust Bank" };

const INTL: Record<string, string> = { en: "en-US", fr: "fr-FR", de: "de-DE", es: "es-ES" };

export default async function SupportPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");

  const t = await getDict();
  const locale = await getLocale();

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
          ← {t.bank.back}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-navy-900">
          {t.support.title}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t.support.subtitle}</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
          <SupportConsole
            clientName={`${user.firstName} ${user.lastName}`.trim()}
            locale={INTL[locale] ?? "en-US"}
            labels={{
              agent: t.chat.agent,
              you: t.support.you,
              placeholder: t.chat.placeholder,
              send: t.chat.send,
              waiting: t.support.waiting,
              empty: t.support.empty,
              online: t.chat.online,
              signedInAs: t.support.signedInAs,
              startTitle: t.support.startTitle,
              startBody: t.support.startBody,
              startPlaceholder: t.support.startPlaceholder,
              startButton: t.support.startButton,
              starting: t.chat.starting,
            }}
          />

          <aside className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                <Icons.shield className="h-4 w-4" />
              </span>
              <p className="mt-3 text-[13px] font-semibold text-navy-900">
                {t.support.safetyTitle}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">{t.support.safetyBody}</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-[13px] font-semibold text-navy-900">{t.support.otherTitle}</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <a
                    href="mailto:support@northstonetrustbank.com"
                    className="break-words font-medium text-accent-600 hover:text-accent-700"
                  >
                    support@northstonetrustbank.com
                  </a>
                </li>
                <li>
                  <Link href="/faq" className="font-medium text-navy-800 hover:text-accent-600">
                    {t.nav.faq}
                  </Link>
                </li>
                <li>
                  <Link href="/security" className="font-medium text-navy-800 hover:text-accent-600">
                    {t.nav.security}
                  </Link>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-navy-50/60 p-5">
              <p className="text-[13px] font-semibold text-navy-900">{t.support.hoursTitle}</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">{t.support.hoursBody}</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
