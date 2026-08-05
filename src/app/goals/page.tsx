import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";
import { balanceCents, ensureAccount, formatMoney } from "@/lib/bank";
import { createGoalAction, releaseGoalAction } from "@/lib/actions/money-actions";
import { getDict, getLocale } from "@/i18n/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { AddMoneyForm } from "./add-money-form";

export const metadata = { title: "Savings goals — Northstone Trust Bank" };

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-navy-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20";

export default async function GoalsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status !== "ACTIVE") redirect("/login");

  const t = await getDict();
  const locale = await getLocale();
  const account = await ensureAccount(user.id);
  const [available, goals] = await Promise.all([
    balanceCents(account.id),
    db.savingsGoal.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
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

      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <Link href="/dashboard" className="text-sm font-semibold text-accent-600 hover:text-accent-700">
          ← {t.bank.back}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-navy-900">{t.goals.title}</h1>
        <p className="mt-1 text-[15px] text-gray-600">{t.goals.subtitle}</p>

        {/* Create a goal */}
        <form action={createGoalAction} className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[13px] font-semibold text-navy-800">
              {t.goals.name}
              <input name="name" required maxLength={60} placeholder={t.goals.namePlaceholder} className={inputClass} />
            </label>
            <label className="text-[13px] font-semibold text-navy-800">
              {t.goals.target}
              <input name="target" type="number" step="0.01" min="0" placeholder="0.00" className={inputClass} />
            </label>
          </div>
          <button className="mt-4 rounded-full bg-navy-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-navy-700">
            {t.goals.createBtn}
          </button>
        </form>

        {/* Goals list */}
        <div className="mt-6 space-y-4">
          {goals.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-navy-200 bg-white p-8 text-center text-sm text-gray-500">
              {t.goals.none}
            </p>
          ) : (
            goals.map((goal) => {
              const pct =
                goal.targetCents && goal.targetCents > 0
                  ? Math.min(100, Math.round((goal.currentCents / goal.targetCents) * 100))
                  : null;
              return (
                <div key={goal.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="font-semibold text-navy-900">{goal.name}</p>
                    <p className="text-sm text-gray-600">
                      <strong className="text-navy-900">{formatMoney(goal.currentCents, locale, user.currency)}</strong>{" "}
                      {goal.targetCents ? `${t.goals.of} ${formatMoney(goal.targetCents, locale, user.currency)}` : t.goals.saved}
                    </p>
                  </div>
                  {pct !== null && (
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-navy-50">
                      <div className="h-full rounded-full bg-accent-500" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-navy-50 pt-4">
                    <AddMoneyForm
                      goalId={goal.id}
                      labels={{ amount: t.goals.addAmount, add: t.goals.add }}
                    />
                    <form action={releaseGoalAction}>
                      <input type="hidden" name="goalId" value={goal.id} />
                      <button className="rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-navy-700 transition hover:bg-navy-50">
                        {t.goals.release}
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
