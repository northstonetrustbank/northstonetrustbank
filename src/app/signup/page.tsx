import Image from "next/image";
import Link from "next/link";
import { getDict, getLocale } from "@/i18n/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Open an account — Northstone Trust Bank" };

export default async function SignupPage() {
  const t = await getDict();
  const locale = await getLocale();

  return (
    <main className="scheme-dark flex min-h-screen flex-1 bg-ink-0 text-fg">
      {/* Left brand panel */}
      <div className="relative hidden w-[42%] overflow-hidden bg-navy-900 lg:block">
        <Image src="/images/team-laptop.jpg" alt="" fill className="object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-900/70 to-navy-900/40" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo theme="dark" />
          <div>
            <h2 className="text-3xl font-semibold leading-snug tracking-tight text-white">
              {t.auth.signupPanelTitle1}
              <br />
              {t.auth.signupPanelTitle2}
            </h2>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-fg-muted">
              {t.auth.signupPanelBody}
            </p>
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="relative flex flex-1 items-center justify-center px-6 py-12">
        <div className="absolute right-6 top-6">
          <LanguageSwitcher current={locale} variant="dark" />
        </div>
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Logo theme="dark" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {t.auth.signupTitle}
          </h1>
          <p className="mt-2 text-[15px] text-fg-muted">{t.auth.signupSubtitle}</p>
          <SignupForm
            labels={{
              accountTypeLabel: t.auth.accountTypeLabel,
              typePersonal: t.auth.typePersonal,
              typeCommercial: t.auth.typeCommercial,
              currencyLabel: t.auth.currencyLabel,
              currencyUsd: t.auth.currencyUsd,
              currencyEur: t.auth.currencyEur,
              firstName: t.auth.firstName,
              lastName: t.auth.lastName,
              email: t.auth.email,
              phone: t.auth.phone,
              password: t.auth.password,
              passwordHint: t.auth.passwordHint,
              submit: t.auth.submit,
              submitting: t.auth.submitting,
            }}
          />
          <p className="mt-8 text-center text-sm text-fg-muted">
            {t.auth.alreadyClient}{" "}
            <Link href="/login" className="font-semibold text-brand-400 hover:text-brand-400">
              {t.common.signIn}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
