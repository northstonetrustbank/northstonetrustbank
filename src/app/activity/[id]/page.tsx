import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { formatMoney } from "@/lib/bank";
import { methodDef } from "@/lib/methods";
import { productsWithLabels } from "@/lib/product-view";
import { getDict, getLocale } from "@/i18n/server";
import { AppShell, Page } from "@/components/app-shell";
import { StatusTrail, type TrailStep } from "@/components/status-trail";
import { BackLink, Card, StatusChip, type Tone } from "@/components/ui";

export const metadata = { title: "Transaction — Northstone Trust Bank" };

const INTL: Record<string, string> = { en: "en-US", fr: "fr-FR", de: "de-DE", es: "es-ES" };

function statusTone(status: string): Tone {
  return status === "POSTED" ? "ok" : status === "REJECTED" ? "bad" : "pending";
}

export default async function TransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status !== "ACTIVE") redirect("/login");

  const { id } = await params;
  const { new: justSubmitted } = await searchParams;
  const t = await getDict();
  const locale = await getLocale();

  // Scoped through the account relation, so one client can never open another's
  // receipt by guessing an id.
  const tx = await db.transaction.findFirst({
    where: { id, account: { userId: user.id } },
    include: {
      account: { select: { number: true, kind: true, currency: true } },
      application: { select: { productKey: true } },
    },
  });
  if (!tx) notFound();

  const stampFmt = new Intl.DateTimeFormat(INTL[locale] ?? "en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const titles = new Map(
    productsWithLabels(t, user.accountType).map(({ def, item }) => [def.key, item.title])
  );

  const credit = tx.amountCents >= 0;

  // Deposits and withdrawals pass through a review; everything else is booked
  // the moment it happens, so it gets a two-step trail rather than three.
  const reviewed = tx.type === "DEPOSIT" || tx.type === "WITHDRAWAL";
  const trail: TrailStep[] = reviewed
    ? [
        { label: t.txn.stepSubmitted, at: stampFmt.format(tx.createdAt), state: "done" },
        {
          label: tx.status === "REJECTED" ? t.txn.stepDeclined : t.txn.stepReview,
          at: tx.status === "PENDING" ? null : stampFmt.format(tx.postedAt ?? tx.createdAt),
          state:
            tx.status === "PENDING" ? "current" : tx.status === "REJECTED" ? "failed" : "done",
        },
        ...(tx.status === "REJECTED"
          ? []
          : [
              {
                label: credit ? t.txn.stepCredited : t.txn.stepSent,
                at: tx.postedAt ? stampFmt.format(tx.postedAt) : null,
                state: (tx.status === "POSTED" ? "done" : "todo") as TrailStep["state"],
              },
            ]),
      ]
    : [
        { label: t.txn.stepSubmitted, at: stampFmt.format(tx.createdAt), state: "done" },
        {
          label: credit ? t.txn.stepCredited : t.txn.stepSent,
          at: tx.postedAt ? stampFmt.format(tx.postedAt) : null,
          state: tx.status === "POSTED" ? "done" : "current",
        },
      ];
  const kindLabel = tx.account.kind === "SAVINGS" ? t.bank.savings : t.bank.checking;

  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: t.bank.reference, value: tx.reference, mono: true },
    { label: t.txn.typeLabel, value: t.bank.types[tx.type as keyof typeof t.bank.types] ?? tx.type },
    { label: t.txn.accountLabel, value: `${kindLabel} · ${tx.account.number}`, mono: true },
    { label: t.txn.createdLabel, value: stampFmt.format(tx.createdAt) },
  ];

  if (tx.postedAt) rows.push({ label: t.txn.postedLabel, value: stampFmt.format(tx.postedAt) });
  if (tx.methodKey) {
    rows.push({ label: t.txn.methodLabel, value: methodDef(tx.methodKey).label });
  }
  if (tx.counterparty) rows.push({ label: t.txn.counterpartyLabel, value: tx.counterparty });
  if (tx.application) {
    rows.push({
      label: t.txn.productLabel,
      value: titles.get(tx.application.productKey) ?? tx.application.productKey,
    });
  }

  return (
    <AppShell
      user={user}
      active="activity"
      title={tx.note?.trim() || (t.bank.types[tx.type as keyof typeof t.bank.types] ?? tx.type)}
      subtitle={tx.reference}
    >
      <Page className="max-w-2xl space-y-5">
        <BackLink href="/activity">{t.txn.backToActivity}</BackLink>

        {justSubmitted && (
          <div className="rise flex items-start gap-3 rounded-2xl border border-pos/25 bg-pos/10 px-4 py-3.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pos/20 text-pos">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-fg">{t.txn.receiptTitle}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">
                {t.txn.receiptBody}
              </p>
            </div>
          </div>
        )}

        {/* The figure, big, with its state beside it */}
        <Card>
          <p
            className={`tnum text-3xl font-semibold tracking-tight ${
              tx.status === "REJECTED"
                ? "text-fg-faint line-through"
                : credit
                  ? "text-pos"
                  : "text-fg"
            }`}
          >
            {credit ? "+" : ""}
            {formatMoney(tx.amountCents, locale, tx.account.currency)}
          </p>
          <div className="mt-3">
            <StatusChip tone={statusTone(tx.status)}>
              {t.bank.statuses[tx.status as keyof typeof t.bank.statuses] ?? tx.status}
            </StatusChip>
          </div>

          {tx.status === "REJECTED" && tx.rejectReason && (
            <p className="mt-4 rounded-xl border border-neg/25 bg-neg/10 px-4 py-3 text-[13px] text-neg">
              {tx.rejectReason}
            </p>
          )}

          <div className="mt-6 border-t border-line-soft pt-5">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-faint">
              {t.txn.progressTitle}
            </p>
            <StatusTrail steps={trail} />
          </div>

          {tx.status === "PENDING" && (
            <p className="mt-4 rounded-xl bg-ink-2 px-4 py-3 text-[13px] leading-relaxed text-fg-muted">
              {t.txn.pendingNote}
            </p>
          )}
        </Card>

        <Card>
          <dl className="divide-y divide-line-soft">
            {rows.map((r) => (
              <div key={r.label} className="flex items-baseline justify-between gap-4 py-3 first:pt-0">
                <dt className="text-sm text-fg-muted">{r.label}</dt>
                <dd
                  className={`break-all text-right text-sm font-semibold text-fg ${
                    r.mono ? "tnum font-mono" : ""
                  }`}
                >
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>

          {tx.note?.trim() && (
            <div className="mt-4 rounded-xl bg-ink-2 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
                {t.txn.noteLabel}
              </p>
              <p className="mt-1 whitespace-pre-line text-[14px] text-fg">{tx.note}</p>
            </div>
          )}
        </Card>

        {/* Proof the client attached, if any */}
        {tx.proofStoredName && (
          <Card>
            <p className="text-[13px] font-semibold text-fg">{t.txn.proofLabel}</p>
            <a
              href={`/api/files/deposit/${tx.proofStoredName}`}
              className="mt-3 inline-block rounded-xl border border-line bg-ink-2 px-4 py-2 text-[13px] font-semibold text-fg transition hover:border-brand-500/40"
            >
              {tx.proofFileName ?? t.documentsPage.open}
            </a>
          </Card>
        )}

        <p className="px-1 text-[11px] text-fg-faint">{t.txn.keepNote}</p>
      </Page>
    </AppShell>
  );
}
