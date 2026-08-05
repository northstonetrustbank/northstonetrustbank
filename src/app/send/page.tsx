import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";
import { balanceCents, ensureAccount, formatMoney, pendingWithdrawalCents } from "@/lib/bank";
import { getDict, getLocale } from "@/i18n/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { SendForm } from "./send-form";

export const metadata = { title: "Send money — Northstone Trust Bank" };

export default async function SendPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status !== "ACTIVE") redirect("/login");

  const t = await getDict();
  const locale = await getLocale();
  const account = await ensureAccount(user.id);
  const [posted, pendingOut] = await Promise.all([
    balanceCents(account.id),
    pendingWithdrawalCents(account.id),
  ]);
  const available = posted - pendingOut;

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

      <div className="mx-auto w-full max-w-lg flex-1 px-6 py-12">
        <Link href="/dashboard" className="text-sm font-semibold text-accent-600 hover:text-accent-700">
          ← {t.bank.back}
        </Link>
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-9 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight text-navy-900">{t.send.title}</h1>
          <p className="mt-2 text-sm text-gray-500">
            {t.bank.available}: <strong className="text-navy-800">{formatMoney(available, locale, user.currency)}</strong>
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{t.send.body}</p>

          {!user.securityWordHash ? (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              {t.bank.securityWordMissing}
              <Link
                href="/account"
                className="mt-3 inline-block rounded-full bg-navy-800 px-5 py-2 text-xs font-bold text-white transition hover:bg-navy-700"
              >
                {t.bank.goToAccount}
              </Link>
            </div>
          ) : (
            <SendForm
              labels={{
                recipient: t.send.recipient,
                recipientHint: t.send.recipientHint,
                amount: t.bank.amount,
                securityWord: t.bank.securityWordField,
                submit: t.send.submit,
                submitting: t.send.submitting,
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}
