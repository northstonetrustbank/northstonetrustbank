import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { balanceCents, ensureAccount, formatMoney } from "@/lib/bank";
import { createGoalAction, releaseGoalAction } from "@/lib/actions/money-actions";
import { getDict, getLocale } from "@/i18n/server";
import { AppShell, Page } from "@/components/app-shell";
import { Icons, NavIcons } from "@/components/icons";
import { AddMoneyForm } from "./add-money-form";

export const metadata = { title: "Savings goals — Northstone Trust Bank" };

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-fg focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; target?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status !== "ACTIVE") redirect("/login");

  const t = await getDict();
  const locale = await getLocale();
  const prefill = await searchParams;
  const account = await ensureAccount(user.id);
  const [available, goals] = await Promise.all([
    balanceCents(account.id),
    db.savingsGoal.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <AppShell user={user} active="accounts" title={t.goals.title} subtitle={t.goals.subtitle}>
      <Page className="max-w-2xl">
        {/* Goals are funded from checking, so lead with what is there to move */}
        <p className="mb-5 rounded-xl border border-line bg-ink-1 px-4 py-3 text-[13px] text-fg-muted">
          {t.bank.available}:{" "}
          <strong className="tnum text-fg">
            {formatMoney(available, locale, user.currency)}
          </strong>
        </p>

        {/* Create a goal */}
        <form action={createGoalAction} className="rounded-2xl border border-line bg-ink-1 p-6 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[13px] font-semibold text-fg">
              {t.goals.name}
              <input
                name="name"
                required
                maxLength={60}
                defaultValue={prefill.name ?? ""}
                placeholder={t.goals.namePlaceholder}
                className={inputClass}
              />
            </label>
            <label className="text-[13px] font-semibold text-fg">
              {t.goals.target}
              <input
                name="target"
                type="number"
                step="0.01"
                min="0"
                defaultValue={prefill.target ?? ""}
                placeholder="0.00"
                className={inputClass}
              />
            </label>
          </div>
          <button className="mt-4 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600">
            {t.goals.createBtn}
          </button>
        </form>

        {/* Goals list */}
        <div className="mt-6 space-y-4">
          {goals.length === 0 ? (
            /* An empty page should suggest, not apologise. Each of these fills
               the form above rather than creating anything on its own. */
            <div>
              <p className="text-[13px] text-fg-muted">{t.goals.none}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["target", t.goals.ideaEmergency, 200_000],
                    ["globe", t.goals.ideaTrip, 150_000],
                    ["mortgage", t.goals.ideaHome, 2_000_000],
                    ["gift", t.goals.ideaGift, 50_000],
                  ] as const
                ).map(([icon, label, target], i) => {
                  const Icon = NavIcons[icon] ?? Icons[icon];
                  return (
                    <a
                      key={label}
                      href={`/goals?name=${encodeURIComponent(label)}&target=${target / 100}`}
                      className="rise elev-1 flex items-center gap-3 rounded-2xl border border-line bg-ink-1 p-4 transition hover:border-brand-500/40"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-2 text-brand-400">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-medium text-fg">{label}</span>
                        <span className="tnum block text-[12px] text-fg-faint">
                          {formatMoney(target, locale, user.currency)}
                        </span>
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          ) : (
            goals.map((goal) => {
              const pct =
                goal.targetCents && goal.targetCents > 0
                  ? Math.min(100, Math.round((goal.currentCents / goal.targetCents) * 100))
                  : null;
              return (
                <div key={goal.id} className="rounded-2xl border border-line bg-ink-1 p-6 shadow-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="font-semibold text-fg">{goal.name}</p>
                    <p className="text-sm text-fg-muted">
                      <strong className="text-fg">{formatMoney(goal.currentCents, locale, user.currency)}</strong>{" "}
                      {goal.targetCents ? `${t.goals.of} ${formatMoney(goal.targetCents, locale, user.currency)}` : t.goals.saved}
                    </p>
                  </div>
                  {pct !== null && (
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-2">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-line-soft pt-4">
                    <AddMoneyForm
                      goalId={goal.id}
                      labels={{ amount: t.goals.addAmount, add: t.goals.add }}
                    />
                    <form action={releaseGoalAction}>
                      <input type="hidden" name="goalId" value={goal.id} />
                      <button className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-fg-muted transition hover:bg-ink-2">
                        {t.goals.release}
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Page>
    </AppShell>
  );
}
