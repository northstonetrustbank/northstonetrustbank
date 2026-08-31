import Link from "next/link";
import { getDict, getLocale } from "@/i18n/server";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — Northstone Trust Bank" };

export default async function LoginPage() {
  const t = await getDict();
  const locale = await getLocale();

  return (
    <AuthShell locale={locale} panelTitle={t.auth.loginPanelTitle} panelBody={t.auth.loginPanelBody}>
      <h1 className="text-[26px] font-semibold tracking-tight text-fg">{t.auth.loginTitle}</h1>
      <p className="mt-2 text-[15px] text-fg-muted">{t.auth.loginSubtitle}</p>
      <LoginForm
        labels={{
          email: t.auth.email,
          password: t.auth.password,
          submit: t.common.signIn,
          submitting: t.auth.signingIn,
        }}
      />
      <p className="mt-4 text-center text-sm">
        <Link href="/forgot-password" className="font-semibold text-brand-500 hover:text-brand-600">
          {t.reset.forgotLink}
        </Link>
      </p>
      <p className="mt-6 text-center text-sm text-fg-muted">
        {t.auth.newTo}{" "}
        <Link href="/signup" className="font-semibold text-brand-500 hover:text-brand-600">
          {t.common.openAccount}
        </Link>
      </p>
    </AuthShell>
  );
}
