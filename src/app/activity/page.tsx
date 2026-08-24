import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { ensureAccount, getSavings } from "@/lib/bank";
import { getDict, getLocale } from "@/i18n/server";
import { fill } from "@/i18n";
import { AppShell, Page } from "@/components/app-shell";
import { NavIcons } from "@/components/icons";
import { TransactionList } from "@/components/transaction-list";

export const metadata = { title: "Transactions — Northstone Trust Bank" };

const PAGE_SIZE = 25;
const TYPES = ["DEPOSIT", "WITHDRAWAL", "TRANSFER", "SEND", "LOAN", "CREDIT", "PAYMENT", "GOAL", "ADJUSTMENT"];
const STATUSES = ["PENDING", "POSTED", "REJECTED"];

const selectClass =
  "mt-1 w-full rounded-lg border border-line bg-ink-1 px-3 py-2 text-sm text-fg focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";

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
    q?: string;
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
  const search = (q.q ?? "").trim().slice(0, 80);
  // Shown on the collapsed filter row, so nobody wonders why a list looks short.
  const activeFilters = [accountId, type, status, q.from, q.to].filter(Boolean).length;

  const where: Prisma.TransactionWhereInput = {
    accountId: accountId ?? { in: accounts.map((a) => a.id) },
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { note: { contains: search, mode: "insensitive" as const } },
            { reference: { contains: search, mode: "insensitive" as const } },
            { counterparty: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
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
      q: search,
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
    <AppShell
      user={user}
      active="activity"
      title={t.activity.title}
      subtitle={t.activity.subtitle}
    >
      <Page className="max-w-4xl">
        <form className="rounded-2xl border border-line bg-ink-1 p-4 shadow-sm sm:p-5">
          {/* Search stays out in the open — it is what someone reaches for when
              hunting one payment. */}
          <label className="block text-[13px] font-semibold text-fg">
            <span className="sr-only">{t.activity.searchLabel}</span>
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder={t.activity.searchPlaceholder}
              className="w-full rounded-lg border border-line bg-ink-1 px-3.5 py-2.5 text-sm text-fg focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
            />
          </label>

          <details className="group mt-3" open={activeFilters > 0}>
            <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-semibold text-fg marker:content-none">
              <NavIcons.chevronRight className="h-4 w-4 text-fg-faint transition group-open:rotate-90" />
              {t.activity.filtersLabel}
              {activeFilters > 0 && (
                <span className="tnum rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-bold text-white">
                  {activeFilters}
                </span>
              )}
            </summary>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-[13px] font-semibold text-fg">
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
            <label className="text-[13px] font-semibold text-fg">
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
            <label className="text-[13px] font-semibold text-fg">
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
            <label className="text-[13px] font-semibold text-fg">
              {t.activity.fromLabel}
              <input type="date" name="from" defaultValue={q.from ?? ""} className={selectClass} />
            </label>
            <label className="text-[13px] font-semibold text-fg">
              {t.activity.toLabel}
              <input type="date" name="to" defaultValue={q.to ?? ""} className={selectClass} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400">
              {t.activity.apply}
            </button>
            <Link
              href="/activity"
              className="text-sm font-semibold text-fg-muted transition hover:text-fg"
            >
              {t.activity.clear}
            </Link>
            </div>
          </details>
        </form>

        <div className="mt-6">
          <TransactionList
            rows={rows}
            labels={{ types: t.bank.types, statuses: t.bank.statuses, reference: t.bank.reference, vatNeeded: t.vat.needed }}
            locale={locale}
            currency={user.currency}
            emptyText={t.activity.none}
          />
        </div>

        {total > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-fg-muted">
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
                  className="rounded-xl border border-line bg-ink-1 px-4 py-2 font-semibold text-fg transition hover:border-brand-500/40"
                >
                  {t.activity.prev}
                </Link>
              )}
              {page < pages && (
                <Link
                  href={params({ page: String(page + 1) })}
                  className="rounded-xl border border-line bg-ink-1 px-4 py-2 font-semibold text-fg transition hover:border-brand-500/40"
                >
                  {t.activity.next}
                </Link>
              )}
            </div>
          </div>
        )}
      </Page>
    </AppShell>
  );
}
