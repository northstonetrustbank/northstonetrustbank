import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";
import { ensureAccount, getSavings } from "@/lib/bank";
import { getDict, getLocale } from "@/i18n/server";
import { fill } from "@/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { TransactionList } from "@/components/transaction-list";

export const metadata = { title: "Transactions — Northstone Trust Bank" };

const PAGE_SIZE = 25;
const TYPES = ["DEPOSIT", "WITHDRAWAL", "TRANSFER", "SEND", "LOAN", "CREDIT", "PAYMENT", "GOAL", "ADJUSTMENT"];
const STATUSES = ["PENDING", "POSTED", "REJECTED"];

const selectClass =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    account?: string;
    type?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status !== "ACTIVE") redirect("/login");

  const t = await getDict();
  const locale = await getLocale();
  const q = await searchParams;

  const [checking, savings] = await Promise.all([ensureAccount(user.id), getSavings(user.id)]);
  const accounts = [checking, ...(savings ? [savings] : [])];

  const accountId = accounts.some((a) => a.id === q.account) ? q.account : undefined;
  const type = q.type && TYPES.includes(q.type) ? q.type : undefined;
  const status = q.status && STATUSES.includes(q.status) ? q.status : undefined;
  const from = q.from ? new Date(`${q.from}T00:00:00Z`) : null;
  const to = q.to ? new Date(`${q.to}T23:59:59Z`) : null;
  const page = Math.max(1, Number(q.page) || 1);

  const where: Prisma.TransactionWhereInput = {
    accountId: accountId ?? { in: accounts.map((a) => a.id) },
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from && !isNaN(from.getTime()) ? { gte: from } : {}),
            ...(to && !isNaN(to.getTime()) ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    db.transaction.count({ where }),
    db.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const params = (overrides: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = {
      account: accountId,
      type,
      status,
      from: q.from,
      to: q.to,
      page: String(page),
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    return `/activity?${sp.toString()}`;
  };

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

      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <Link href="/dashboard" className="text-sm font-semibold text-accent-600 hover:text-accent-700">
          ← {t.bank.back}
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-900">{t.activity.title}</h1>
            <p className="mt-1 text-sm text-gray-500">{t.activity.subtitle}</p>
          </div>
          <Link
            href="/statements"
            className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-accent-500/40 hover:shadow-sm"
          >
            {t.statements.link}
          </Link>
        </div>

        <form className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-[13px] font-semibold text-navy-800">
              {t.activity.accountLabel}
              <select name="account" defaultValue={accountId ?? ""} className={selectClass}>
                <option value="">{t.activity.allAccounts}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.kind === "SAVINGS" ? t.bank.savings : t.bank.checking} · {a.number}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[13px] font-semibold text-navy-800">
              {t.activity.typeLabel}
              <select name="type" defaultValue={type ?? ""} className={selectClass}>
                <option value="">{t.activity.allTypes}</option>
                {TYPES.map((v) => (
                  <option key={v} value={v}>
                    {t.bank.types[v as keyof typeof t.bank.types] ?? v}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[13px] font-semibold text-navy-800">
              {t.activity.statusLabel}
              <select name="status" defaultValue={status ?? ""} className={selectClass}>
                <option value="">{t.activity.allStatuses}</option>
                {STATUSES.map((v) => (
                  <option key={v} value={v}>
                    {t.bank.statuses[v as keyof typeof t.bank.statuses] ?? v}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[13px] font-semibold text-navy-800">
              {t.activity.fromLabel}
              <input type="date" name="from" defaultValue={q.from ?? ""} className={selectClass} />
            </label>
            <label className="text-[13px] font-semibold text-navy-800">
              {t.activity.toLabel}
              <input type="date" name="to" defaultValue={q.to ?? ""} className={selectClass} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button className="rounded-full bg-accent-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600">
              {t.activity.apply}
            </button>
            <Link
              href="/activity"
              className="text-sm font-semibold text-gray-500 transition hover:text-navy-800"
            >
              {t.activity.clear}
            </Link>
          </div>
        </form>

        <div className="mt-6">
          <TransactionList
            rows={rows}
            labels={{ types: t.bank.types, statuses: t.bank.statuses, reference: t.bank.reference }}
            locale={locale}
            currency={user.currency}
            emptyText={t.activity.none}
          />
        </div>

        {total > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
            <p>
              {fill(t.activity.showing, {
                from: String((page - 1) * PAGE_SIZE + 1),
                to: String(Math.min(page * PAGE_SIZE, total)),
                total: String(total),
              })}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={params({ page: String(page - 1) })}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 font-semibold text-navy-800 transition hover:border-accent-500/40"
                >
                  {t.activity.prev}
                </Link>
              )}
              {page < pages && (
                <Link
                  href={params({ page: String(page + 1) })}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 font-semibold text-navy-800 transition hover:border-accent-500/40"
                >
                  {t.activity.next}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
