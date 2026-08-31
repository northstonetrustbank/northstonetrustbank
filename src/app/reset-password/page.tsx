import Link from "next/link";
import { getDict, getLocale } from "@/i18n/server";
import { AuthShell } from "@/components/auth-shell";
import { ResetForm } from "./reset-form";

export const metadata = { title: "Choose a new password — Northstone Trust Bank" };

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const t = await getDict();
  const locale = await getLocale();

  return (
    <AuthShell
      locale={locale}
      panelTitle={t.auth.choosePanelTitle}
      panelBody={t.auth.choosePanelBody}
    >
      <h1 className="text-[26px] font-semibold tracking-tight text-fg">{t.reset.chooseTitle}</h1>
      {token ? (
        <>
          <p className="mt-2 text-[15px] text-fg-muted">{t.reset.chooseSubtitle}</p>
          <ResetForm
            token={token}
            labels={{
              newPassword: t.reset.newPassword,
              confirmPassword: t.reset.confirmPassword,
              passwordHint: t.auth.passwordHint,
              submit: t.reset.update,
              signIn: t.common.signIn,
            }}
          />
        </>
      ) : (
        <p className="mt-4 rounded-lg border border-neg/25 bg-neg/10 px-3.5 py-2.5 text-sm text-neg">
          {t.reset.invalid}
        </p>
      )}
      <p className="mt-6 text-center text-sm text-fg-muted">
        <Link href="/login" className="font-semibold text-brand-500 hover:text-brand-600">
          {t.common.signIn}
        </Link>
      </p>
    </AuthShell>
  );
}
