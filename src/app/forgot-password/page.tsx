import Link from "next/link";
import { getDict, getLocale } from "@/i18n/server";
import { AuthShell } from "@/components/auth-shell";
import { ForgotForm } from "./forgot-form";

export const metadata = { title: "Reset password — Northstone Trust Bank" };

export default async function ForgotPage() {
  const t = await getDict();
  const locale = await getLocale();

  return (
    <AuthShell locale={locale} panelTitle={t.auth.resetPanelTitle} panelBody={t.auth.resetPanelBody}>
      <h1 className="text-[26px] font-semibold tracking-tight text-fg">{t.reset.title}</h1>
      <p className="mt-2 text-[15px] text-fg-muted">{t.reset.subtitle}</p>
      <ForgotForm labels={{ email: t.auth.email, submit: t.reset.submit }} />
      <p className="mt-6 text-center text-sm text-fg-muted">
        <Link href="/login" className="font-semibold text-brand-500 hover:text-brand-600">
          {t.common.signIn}
        </Link>
      </p>
    </AuthShell>
  );
}
