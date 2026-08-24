import Link from "next/link";
import { getDict, getLocale } from "@/i18n/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { ForgotForm } from "./forgot-form";

export const metadata = { title: "Reset password — Northstone Trust Bank" };

export default async function ForgotPage() {
  const t = await getDict();
  const locale = await getLocale();

  return (
    <main className="scheme-dark flex min-h-screen flex-1 items-center justify-center bg-ink-0 px-4 py-12 text-fg">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Logo theme="light" />
          <LanguageSwitcher current={locale} variant="light" />
        </div>
        <div className="rounded-2xl border border-line bg-ink-1 p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{t.reset.title}</h1>
          <p className="mt-2 text-[15px] text-fg-muted">{t.reset.subtitle}</p>
          <ForgotForm labels={{ email: t.auth.email, submit: t.reset.submit }} />
        </div>
        <p className="mt-6 text-center text-sm text-fg-muted">
          <Link href="/login" className="font-semibold text-brand-400 hover:text-brand-400">
            {t.common.signIn}
          </Link>
        </p>
      </div>
    </main>
  );
}
