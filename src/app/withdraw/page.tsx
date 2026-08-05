import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";
import { balanceCents, ensureAccount, formatMoney, pendingWithdrawalCents } from "@/lib/bank";
import { getDict, getLocale } from "@/i18n/server";
import { methodDef, methodVisibleFor } from "@/lib/methods";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { PaymentIcon } from "@/components/payment-icons";
import { WithdrawForm } from "./withdraw-form";

export const metadata = { title: "Withdraw — Northstone Trust Bank" };

export default async function WithdrawPage({
  searchParams,
}: {
  searchParams: Promise<{ method?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status === "PENDING") redirect("/onboarding");
  if (user.status !== "ACTIVE") redirect("/login");

  const t = await getDict();
  const locale = await getLocale();
  const { method: methodParam } = await searchParams;

  const account = await ensureAccount(user.id);
  const [posted, pendingOut] = await Promise.all([
    balanceCents(account.id),
    pendingWithdrawalCents(account.id),
  ]);
  const available = posted - pendingOut;

  const allMethods = await db.depositMethod.findMany({
    where: { enabled: true, forWithdrawal: true },
    orderBy: { sortOrder: "asc" },
  });
  const methods = allMethods.filter((m) => methodVisibleFor(m.accountTypes, user.accountType));
  const selected = methodParam ? methods.find((m) => m.key === methodParam) : undefined;

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

      <div className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <Link href="/dashboard" className="text-sm font-semibold text-accent-600 hover:text-accent-700">
          ← {t.bank.back}
        </Link>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-9 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight text-navy-900">{t.bank.withdrawTitle}</h1>
          <p className="mt-2 text-sm text-gray-500">
            {t.bank.available}: <strong className="text-navy-800">{formatMoney(available, locale, user.currency)}</strong>
          </p>

          {!selected ? (
            <>
              <p className="mt-3 text-[15px] leading-relaxed text-gray-600">{t.bank.chooseMethod}</p>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {methods.map((m) => (
                  <Link
                    key={m.key}
                    href={`/withdraw?method=${m.key}`}
                    className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 text-center transition hover:border-accent-500/50 hover:bg-navy-50/50"
                  >
                    <span className="text-navy-700">
                      <PaymentIcon icon={methodDef(m.key).icon} className="h-7 w-7" />
                    </span>
                    <span className="text-[13px] font-semibold text-navy-800">{m.label}</span>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-navy-50/70 p-4">
                <span className="text-navy-700">
                  <PaymentIcon icon={methodDef(selected.key).icon} className="h-7 w-7" />
                </span>
                <span className="font-semibold text-navy-900">{selected.label}</span>
                <Link href="/withdraw" className="ml-auto text-xs font-semibold text-accent-600 hover:text-accent-700">
                  {t.bank.chooseMethod}
                </Link>
              </div>
              <p className="mt-6 text-[15px] leading-relaxed text-gray-600">{t.bank.withdrawBody}</p>
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
                <WithdrawForm
                  methodKey={selected.key}
                  labels={{
                    amount: t.bank.amount,
                    details: t.bank.withdrawDetailsLabel,
                    detailsHint: t.bank.withdrawDetailsHint,
                    securityWord: t.bank.securityWordField,
                    submit: t.bank.submitWithdraw,
                    submitting: t.bank.submittingWithdraw,
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
