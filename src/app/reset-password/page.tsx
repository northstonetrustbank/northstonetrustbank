import Link from "next/link";
import { getDict, getLocale } from "@/i18n/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
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
    <main className="flex min-h-screen flex-1 items-center justify-center bg-navy-50/50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Logo theme="light" />
          <LanguageSwitcher current={locale} variant="light" />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-navy-900">
            {t.reset.chooseTitle}
          </h1>
          {token ? (
            <>
              <p className="mt-2 text-[15px] text-gray-600">{t.reset.chooseSubtitle}</p>
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
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {t.reset.invalid}
            </p>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-gray-600">
          <Link href="/login" className="font-semibold text-accent-600 hover:text-accent-700">
            {t.common.signIn}
          </Link>
        </p>
      </div>
    </main>
  );
}
