import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { formatMoney } from "@/lib/bank";
import { loadPortfolio } from "@/lib/portfolio";
import { METHOD_COLUMNS, methodDef, methodEta, methodVisibleFor } from "@/lib/methods";
import { methodEtaOverrides } from "@/lib/method-eta";
import { billHistory, listPayees, type Payee } from "@/lib/payees";
import { getDict, getLocale } from "@/i18n/server";
import { AppShell, Page } from "@/components/app-shell";
import { Card, SectionHead, StatusChip, Tabs, type Tone } from "@/components/ui";
import { PayForm, type PayOption } from "./pay-form";
import { PayeeList, type PayeeRow } from "./payee-list";

export const metadata = { title: "Bills & payees — Northstone Trust Bank" };

const TABS = ["pay", "payees", "history"] as const;
type Tab = (typeof TABS)[number];

function isTab(value: unknown): value is Tab {
  return typeof value === "string" && (TABS as readonly string[]).includes(value);
}

/** First letter of the payee's name — a stand-in for a logo we don't have. */
function initialOf(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

/** Mask an account reference: a saved payee list shouldn't leak full numbers. */
function maskRef(ref: string | null) {
  if (!ref) return "";
  if (ref.includes("@")) return ref;
  return ref.length > 4 ? `••${ref.slice(-4)}` : ref;
}

const STATUS_TONE: Record<string, Tone> = {
  POSTED: "ok",
  PENDING: "pending",
  FAILED: "bad",
  REJECTED: "bad",
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; payee?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status === "PENDING") redirect("/onboarding");
  if (user.status !== "ACTIVE") redirect("/login");

  const t = await getDict();
  const locale = await getLocale();
  const params = await searchParams;

  const [portfolio, payees, overrides] = await Promise.all([
    loadPortfolio(user.id),
    listPayees(user.id),
    methodEtaOverrides(),
  ]);

  // Arriving from a payee's "Pay" button lands on the pay tab with it chosen.
  const tab: Tab = isTab(params.tab) ? params.tab : params.payee ? "pay" : "pay";

  // Only rails an admin has switched on for outbound money and this account
  // type — the same set the withdraw flow offers, so a payee can never be
  // saved against a route the bank won't actually send on.
  const methods = (
    await db.depositMethod.findMany({
      where: { enabled: true, forWithdrawal: true },
      orderBy: { sortOrder: "asc" },
      select: METHOD_COLUMNS,
    })
  )
    .filter((m) => methodVisibleFor(m.accountTypes, user.accountType))
    .map((m) => ({
      key: m.key,
      label: m.label || methodDef(m.key).label,
      eta: methodEta(m.key, overrides[m.key]),
    }));

  const money = (cents: number) => formatMoney(cents, locale, user.currency);

  const routeOf = (p: Payee) =>
    p.internalUserId
      ? `${t.payments.kindInternal} · ${maskRef(p.accountRef)}`
      : [methods.find((m) => m.key === p.methodKey)?.label ?? methodDef(p.methodKey ?? "BANK").label,
         p.institution,
         maskRef(p.accountRef)]
          .filter(Boolean)
          .join(" · ");

  const payOptions: PayOption[] = payees.map((p) => ({
    id: p.id,
    label: p.nickname ? `${p.name} · ${p.nickname}` : p.name,
    route: routeOf(p),
    eta: p.internalUserId ? "" : methodEta(p.methodKey ?? "BANK", overrides[p.methodKey ?? "BANK"]),
    internal: Boolean(p.internalUserId),
    initial: initialOf(p.name),
  }));

  const payeeRows: PayeeRow[] = payees.map((p) => ({
    id: p.id,
    name: p.name,
    nickname: p.nickname,
    kind: p.internalUserId ? "INTERNAL" : p.kind,
    methodKey: p.methodKey,
    accountRef: p.accountRef,
    institution: p.institution,
    route: routeOf(p),
    lastPaid: p.lastPaidAt
      ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(
          p.lastPaidAt
        )
      : t.payments.neverPaid,
    initial: initialOf(p.name),
    internal: Boolean(p.internalUserId),
  }));

  const formLabels = {
    addPayee: t.payments.addPayee,
    editPayee: t.payments.editPayee,
    payeeName: t.payments.payeeName,
    payeeNameHint: t.payments.payeeNameHint,
    nickname: t.payments.nickname,
    nicknameHint: t.payments.nicknameHint,
    kind: t.payments.kind,
    kindBiller: t.payments.kindBiller,
    kindPerson: t.payments.kindPerson,
    kindInternal: t.payments.kindInternal,
    method: t.payments.method,
    accountRef: t.payments.accountRef,
    accountRefInternal: t.payments.accountRefInternal,
    institution: t.payments.institution,
    institutionHint: t.payments.institutionHint,
    save: t.payments.save,
    saving: t.payments.saving,
    saved: t.payments.saved,
    cancel: t.payments.cancel,
  };

  const history = tab === "history" ? await billHistory(user.id) : [];

  return (
    <AppShell user={user} active="payments" title={t.payments.title} subtitle={t.payments.lede}>
      <Page className="max-w-3xl">
        <div>
          <Tabs
            items={[
              { key: "pay", href: "/payments?tab=pay", label: t.payments.tabPay, active: tab === "pay" },
              {
                key: "payees",
                href: "/payments?tab=payees",
                label: t.payments.tabPayees,
                active: tab === "payees",
                dot: payees.length > 0,
              },
              {
                key: "history",
                href: "/payments?tab=history",
                label: t.payments.tabHistory,
                active: tab === "history",
              },
            ]}
          />
        </div>

        <div className="mt-6">
          {tab === "pay" &&
            (payOptions.length === 0 ? (
              <Card>
                <div className="px-1 py-8 text-center">
                  <p className="text-[15px] font-semibold text-fg">{t.payments.noPayeesTitle}</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-fg-muted">
                    {t.payments.noPayeesBody}
                  </p>
                  <Link
                    href="/payments?tab=payees"
                    className="mt-5 inline-flex rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400"
                  >
                    {t.payments.addFirstPayee}
                  </Link>
                </div>
              </Card>
            ) : (
              <Card>
                <SectionHead title={t.payments.payTitle} />
                <div className="mt-5">
                  <PayForm
                    payees={payOptions}
                    preselect={params.payee}
                    available={money(portfolio.primary.availableCents)}
                    labels={{
                      choosePayee: t.payments.choosePayee,
                      amount: t.payments.amount,
                      memo: t.payments.memo,
                      memoHint: t.payments.memoHint,
                      securityWord: t.bank.securityWordField,
                      submit: t.payments.submitPay,
                      submitting: t.payments.submittingPay,
                      instantNote: t.payments.instantNote,
                      reviewNote: t.payments.reviewNote,
                      arrives: t.payments.arrives,
                      available: t.bank.available,
                    }}
                  />
                </div>
              </Card>
            ))}

          {tab === "payees" && (
            <PayeeList
              payees={payeeRows}
              methods={methods}
              labels={{
                ...formLabels,
                payeesTitle: t.payments.payeesTitle,
                remove: t.payments.remove,
                removeConfirm: t.payments.removeConfirm,
                lastPaid: t.payments.lastPaid,
                payThis: t.payments.payThis,
                noPayeesTitle: t.payments.noPayeesTitle,
                noPayeesBody: t.payments.noPayeesBody,
              }}
            />
          )}

          {tab === "history" &&
            (history.length === 0 ? (
              <Card>
                <div className="px-1 py-8 text-center">
                  <p className="text-[15px] font-semibold text-fg">{t.payments.noHistoryTitle}</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-fg-muted">
                    {t.payments.noHistoryBody}
                  </p>
                </div>
              </Card>
            ) : (
              <ul className="space-y-2.5">
                {history.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={`/activity/${row.id}`}
                      className="elev-1 flex items-center gap-3.5 rounded-2xl border border-line bg-ink-1 px-4 py-3.5 transition hover:border-brand-500/40 sm:px-5"
                    >
                      <span
                        aria-hidden="true"
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-3 text-sm font-semibold text-fg-muted"
                      >
                        {initialOf(row.payee?.name ?? "?")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-fg">
                          {row.payee?.name ?? row.note}
                        </span>
                        <span className="block truncate text-xs text-fg-faint">
                          {new Intl.DateTimeFormat(locale, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }).format(row.createdAt)}{" "}
                          · {row.reference}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="tnum block text-[15px] font-semibold text-fg">
                          {money(Math.abs(row.amountCents))}
                        </span>
                        <span className="mt-1 block">
                          <StatusChip tone={STATUS_TONE[row.status] ?? "muted"}>
                            {row.status}
                          </StatusChip>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
        </div>
      </Page>
    </AppShell>
  );
}
