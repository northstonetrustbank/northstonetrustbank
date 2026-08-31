import Link from "next/link";
import { getDict, getLocale } from "@/i18n/server";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Open an account — Northstone Trust Bank" };

export default async function SignupPage() {
  const t = await getDict();
  const locale = await getLocale();

  return (
    <AuthShell
      locale={locale}
      panelTitle={
        <>
          {t.auth.signupPanelTitle1}
          <br />
          {t.auth.signupPanelTitle2}
        </>
      }
      panelBody={t.auth.signupPanelBody}
    >
      <h1 className="text-[26px] font-semibold tracking-tight text-fg">{t.auth.signupTitle}</h1>
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
        <Link href="/login" className="font-semibold text-brand-500 hover:text-brand-600">
          {t.common.signIn}
        </Link>
      </p>
    </AuthShell>
  );
}
