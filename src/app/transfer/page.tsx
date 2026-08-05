import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";
import { balanceCents, ensureAccount, formatMoney, getSavings } from "@/lib/bank";
import { getDict, getLocale } from "@/i18n/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { TransferForm } from "./transfer-form";

export const metadata = { title: "Move money — Northstone Trust Bank" };

export default async function TransferPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status !== "ACTIVE") redirect("/login");

  const t = await getDict();
  const locale = await getLocale();

  const checking = await ensureAccount(user.id);
  const savings = await getSavings(user.id);
  if (!savings) redirect("/dashboard");

  const [checkingBal, savingsBal] = await Promise.all([
    balanceCents(checking.id),
    balanceCents(savings.id),
  ]);

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
          <h1 className="text-xl font-semibold tracking-tight text-navy-900">{t.bank.transferTitle}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{t.bank.transferBody}</p>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-navy-50/70 p-4">
              <p className="text-gray-500">{t.bank.checking}</p>
              <p className="mt-1 text-lg font-semibold text-navy-900">{formatMoney(checkingBal, locale, user.currency)}</p>
            </div>
            <div className="rounded-xl bg-navy-50/70 p-4">
              <p className="text-gray-500">{t.bank.savings}</p>
              <p className="mt-1 text-lg font-semibold text-navy-900">{formatMoney(savingsBal, locale, user.currency)}</p>
            </div>
          </div>

          <TransferForm
            labels={{
              toSavings: t.bank.toSavings,
              toChecking: t.bank.toChecking,
              amount: t.bank.amount,
              submit: t.bank.transfer,
            }}
          />
        </div>
      </div>
    </main>
  );
}
