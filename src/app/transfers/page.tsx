import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { formatMoney } from "@/lib/bank";
import { loadPortfolio } from "@/lib/portfolio";
import { METHOD_COLUMNS, methodDef, methodEta, methodVisibleFor } from "@/lib/methods";
import { methodEtaOverrides } from "@/lib/method-eta";
import { getDict, getLocale } from "@/i18n/server";
import { AppShell, Page } from "@/components/app-shell";
import { NavIcons } from "@/components/icons";
import { PaymentIcon } from "@/components/payment-icons";
import { Card, Eyebrow, Tabs } from "@/components/ui";
import { DepositForm } from "../deposit/deposit-form";
import { RequestMethod } from "../deposit/request-method";
import { WithdrawForm } from "../withdraw/withdraw-form";
import { SendForm } from "../send/send-form";
import { TransferForm } from "../transfer/transfer-form";

export const metadata = { title: "Move money — Northstone Trust Bank" };

const TABS = ["send", "deposit", "withdraw", "between"] as const;
type Tab = (typeof TABS)[number];

function isTab(value: unknown): value is Tab {
  return typeof value === "string" && (TABS as readonly string[]).includes(value);
}

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; method?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status === "PENDING") redirect("/onboarding");
  if (user.status !== "ACTIVE") redirect("/login");

  const t = await getDict();
  const locale = await getLocale();
  const params = await searchParams;
  const tab: Tab = isTab(params.tab) ? params.tab : "send";
  const methodParam = params.method;

  const portfolio = await loadPortfolio(user.id);
  const available = portfolio.primary.availableCents;

  // Only the methods an admin has enabled for this flow and account type.
  const methods = (
    await db.depositMethod.findMany({
      where: {
        enabled: true,
        ...(tab === "withdraw" ? { forWithdrawal: true } : { forDeposit: true }),
      },
      orderBy: { sortOrder: "asc" },
      select: METHOD_COLUMNS,
    })
  ).filter((m) => methodVisibleFor(m.accountTypes, user.accountType));

  const selected = methodParam ? methods.find((m) => m.key === methodParam) : undefined;
  const etaOverrides = await methodEtaOverrides();

  const tabLabels: Record<Tab, string> = {
    send: t.transfers.tabSend,
    deposit: t.transfers.tabDeposit,
    withdraw: t.transfers.tabWithdraw,
    between: t.transfers.tabBetween,
  };

  // Between-accounts only makes sense once a savings account exists.
  const visibleTabs = TABS.filter((key) => key !== "between" || portfolio.savings);

  const securityWordMissing = !user.securityWordHash;

  return (
    <AppShell
      user={user}
      active="transfers"
      title={t.transfers.title}
      subtitle={t.transfers.subtitle}
    >
      <Page className="max-w-3xl space-y-5">
        {/* Bills live on their own screen — this is the signpost to it. */}
        <Link
          href="/payments"
          className="elev-1 flex items-center gap-3.5 rounded-2xl border border-line bg-ink-1 px-5 py-3.5 transition hover:border-brand-500/40"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-500/12 text-brand-400">
            <NavIcons.bill className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-medium text-fg">{t.payments.title}</span>
            <span className="block truncate text-xs text-fg-faint">{t.payments.lede}</span>
          </span>
          <NavIcons.chevronRight className="h-4 w-4 shrink-0 text-fg-faint" />
        </Link>

        {/* Available balance */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-ink-1 px-5 py-4">
          <div>
            <Eyebrow className="text-fg-muted">{t.bank.available}</Eyebrow>
            <p className="tnum mt-1 text-2xl font-semibold tracking-tight text-fg">
              {formatMoney(available, locale, portfolio.currency)}
            </p>
          </div>
          <p className="tnum font-mono text-[12px] text-fg-faint">{portfolio.primary.number}</p>
        </div>

        <Tabs
          items={visibleTabs.map((key) => ({
            key,
            href: `/transfers?tab=${key}`,
            label: tabLabels[key],
            active: key === tab,
          }))}
        />

        <Card>
          {/* ---- Send to another Northstone client ---- */}
          {tab === "send" && (
            <>
              <h2 className="text-lg font-semibold tracking-tight text-fg">{t.send.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">{t.send.body}</p>
              {securityWordMissing ? (
                <SecurityWordPrompt t={t} />
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
            </>
          )}

          {/* ---- Deposit ---- */}
          {tab === "deposit" && (
            <>
              <h2 className="text-lg font-semibold tracking-tight text-fg">
                {t.bank.depositTitle}
              </h2>
              {!selected ? (
                <>
                  <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">
                    {t.bank.chooseMethod}
                  </p>
                  <MethodGrid methods={methods} etas={etaOverrides} tab="deposit" />
                  <RequestMethod
                    labels={{
                      prompt: t.bank.methodRequestPrompt,
                      placeholder: t.bank.methodRequestPlaceholder,
                      send: t.bank.methodRequestSend,
                      sent: t.bank.methodRequestSent,
                    }}
                  />
                </>
              ) : (
                <>
                  <SelectedMethod
                    label={selected.label}
                    iconKey={selected.key}
                    eta={methodEta(selected.key, etaOverrides[selected.key])}
                    tab="deposit"
                    changeLabel={t.bank.chooseMethod}
                  />

                  {(selected.routeName ||
                    selected.routeIdentifier ||
                    selected.routeInstitution ||
                    selected.routeInstructions) && (
                    <div className="mt-4 rounded-xl border border-brand-500/25 bg-brand-500/10 p-4 text-sm">
                      <p className="font-semibold text-fg">{t.bank.depositRoute}</p>
                      <p className="mt-1 text-fg-muted">{t.bank.depositRouteHint}</p>
                      <dl className="mt-3 space-y-1.5 text-fg">
                        {selected.routeName && (
                          <div className="flex justify-between gap-4">
                            <dt className="text-fg-muted">{t.bank.routeName}</dt>
                            <dd className="font-semibold">{selected.routeName}</dd>
                          </div>
                        )}
                        {selected.routeIdentifier && (
                          <div className="flex justify-between gap-4">
                            <dt className="text-fg-muted">{t.bank.routeIdentifier}</dt>
                            <dd className="tnum font-semibold">{selected.routeIdentifier}</dd>
                          </div>
                        )}
                        {selected.routeInstitution && (
                          <div className="flex justify-between gap-4">
                            <dt className="text-fg-muted">{t.bank.routeInstitution}</dt>
                            <dd className="font-semibold">{selected.routeInstitution}</dd>
                          </div>
                        )}
                      </dl>
                      {selected.routeInstructions && (
                        <p className="mt-3 whitespace-pre-line text-fg-muted">
                          {selected.routeInstructions}
                        </p>
                      )}
                    </div>
                  )}

                  <p className="mt-6 text-[15px] leading-relaxed text-fg-muted">
                    {t.bank.depositBody}
                  </p>
                  <DepositForm
                    methodKey={selected.key}
                    labels={{
                      amount: t.bank.amount,
                      note: t.bank.note,
                      proof: t.bank.proof,
                      proofHint: t.bank.proofHint,
                      submit: t.bank.submitDeposit,
                      submitting: t.bank.submittingDeposit,
                      chooseFile: t.common.chooseFile,
                      noFile: t.common.noFileChosen,
                      optimising: t.common.optimising,
                      fileTooBig: t.common.fileTooBigPicked,
                    }}
                  />
                </>
              )}
            </>
          )}

          {/* ---- Withdraw ---- */}
          {tab === "withdraw" && (
            <>
              <h2 className="text-lg font-semibold tracking-tight text-fg">
                {t.bank.withdrawTitle}
              </h2>
              {!selected ? (
                <>
                  <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">
                    {t.bank.chooseMethod}
                  </p>
                  <MethodGrid methods={methods} etas={etaOverrides} tab="withdraw" />
                </>
              ) : (
                <>
                  <SelectedMethod
                    label={selected.label}
                    iconKey={selected.key}
                    eta={methodEta(selected.key, etaOverrides[selected.key])}
                    tab="withdraw"
                    changeLabel={t.bank.chooseMethod}
                  />
                  <p className="mt-6 text-[15px] leading-relaxed text-fg-muted">
                    {t.bank.withdrawBody}
                  </p>
                  {securityWordMissing ? (
                    <SecurityWordPrompt t={t} />
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
            </>
          )}

          {/* ---- Between own accounts ---- */}
          {tab === "between" && portfolio.savings && (
            <>
              <h2 className="text-lg font-semibold tracking-tight text-fg">
                {t.bank.transferTitle}
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">
                {t.bank.transferBody}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-ink-2 p-4">
                  <p className="text-fg-muted">{t.bank.checking}</p>
                  <p className="tnum mt-1 text-lg font-semibold text-fg">
                    {formatMoney(portfolio.primary.balanceCents, locale, portfolio.currency)}
                  </p>
                </div>
                <div className="rounded-xl bg-ink-2 p-4">
                  <p className="text-fg-muted">{t.bank.savings}</p>
                  <p className="tnum mt-1 text-lg font-semibold text-fg">
                    {formatMoney(portfolio.savings.balanceCents, locale, portfolio.currency)}
                  </p>
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
            </>
          )}
        </Card>
      </Page>
    </AppShell>
  );
}

function MethodGrid({
  methods,
  etas,
  tab,
}: {
  methods: { key: string; label: string }[];
  etas: Record<string, string | null>;
  tab: Tab;
}) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {methods.map((m) => (
        <Link
          key={m.key}
          href={`/transfers?tab=${tab}&method=${m.key}`}
          className="flex items-center gap-3.5 rounded-xl border border-line bg-ink-2/50 p-4 transition hover:border-brand-500/50 hover:bg-ink-2"
        >
          <span className="shrink-0 text-fg-muted">
            <PaymentIcon icon={methodDef(m.key).icon} className="h-7 w-7" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-medium text-fg">{m.label}</span>
            {/* How long it takes is what people actually choose a rail on. */}
            <span className="block truncate text-[12px] text-fg-faint">
              {methodEta(m.key, etas[m.key])}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

function SelectedMethod({
  label,
  iconKey,
  eta,
  tab,
  changeLabel,
}: {
  label: string;
  iconKey: string;
  eta: string;
  tab: Tab;
  changeLabel: string;
}) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl bg-ink-2 p-4">
      <span className="shrink-0 text-fg-muted">
        <PaymentIcon icon={methodDef(iconKey).icon} className="h-7 w-7" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-fg">{label}</span>
        <span className="block truncate text-[12px] text-fg-faint">{eta}</span>
      </span>
      <Link
        href={`/transfers?tab=${tab}`}
        className="ml-auto text-xs font-semibold text-brand-400 hover:text-brand-400"
      >
        {changeLabel}
      </Link>
    </div>
  );
}

function SecurityWordPrompt({ t }: { t: { bank: { securityWordMissing: string; goToAccount: string } } }) {
  return (
    <div className="mt-6 rounded-xl border border-amber-400/25 bg-amber-400/10 p-5 text-sm text-amber-300">
      {t.bank.securityWordMissing}
      <Link
        href="/account/security"
        className="mt-3 inline-block rounded-xl bg-brand-500 px-5 py-2 text-xs font-bold text-white transition hover:bg-brand-400"
      >
        {t.bank.goToAccount}
      </Link>
    </div>
  );
}
