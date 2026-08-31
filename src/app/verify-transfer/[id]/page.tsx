import { AccountManagerFooter } from "@/components/account-manager-footer";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";
import { formatMoney } from "@/lib/bank";
import { MAX_VAT_ATTEMPTS } from "@/lib/vat";
import { getDict, getLocale } from "@/i18n/server";
import { Logo } from "@/components/logo";
import { VerifyVatForm } from "./verify-vat-form";

export const metadata = { title: "VAT clearance — Northstone Trust Bank" };

const INTL: Record<string, string> = { en: "en-US", fr: "fr-FR", de: "de-DE", es: "es-ES" };

export default async function VerifyTransferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status !== "ACTIVE") redirect("/login");

  const { id } = await params;
  const t = await getDict();
  const locale = await getLocale();

  // Scoped to this client's own accounts — an id from someone else's transfer
  // must not resolve.
  const tx = await db.transaction.findFirst({
    where: { id, account: { userId: user.id } },
    include: { account: true },
  });
  if (!tx || !tx.vatRequiredAt) redirect("/dashboard");
  if (tx.vatClearedAt || tx.status !== "PENDING") redirect("/dashboard");

  const amount = formatMoney(Math.abs(tx.amountCents), locale, tx.account.currency);
  const attemptsLeft = Math.max(0, MAX_VAT_ATTEMPTS - tx.vatAttempts);

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-navy-50/40">
      <header className="border-b border-white/10 bg-navy-900">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
          <Logo onDark href="/dashboard" />
          <form action={logoutAction}>
            <button className="rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
              {t.common.signOut}
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
        <Link href="/dashboard" className="text-sm font-semibold text-accent-600 hover:text-accent-700">
          ← {t.bank.back}
        </Link>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
            {t.vat.needed}
          </span>
          <h1 className="mt-4 text-xl font-bold text-navy-900">{t.vat.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{t.vat.body}</p>

          <dl className="mt-5 space-y-2 rounded-xl bg-navy-50/70 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">{t.vat.amountLabel}</dt>
              <dd className="font-semibold text-navy-900">{amount}</dd>
            </div>
            {tx.counterparty && (
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-gray-600">{t.vat.toLabel}</dt>
                <dd className="truncate text-right font-medium text-navy-900">{tx.counterparty}</dd>
              </div>
            )}
            {tx.note && !tx.counterparty && (
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-gray-600">{t.vat.toLabel}</dt>
                <dd className="truncate text-right font-medium text-navy-900">{tx.note}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">{t.vat.referenceLabel}</dt>
              <dd className="font-mono text-xs text-navy-900">{tx.reference}</dd>
            </div>
          </dl>

          <p className="mt-4 text-xs leading-relaxed text-gray-500">
            {tx.vatSentAt
              ? `${t.vat.sentAt} · ${new Intl.DateTimeFormat(INTL[locale] ?? "en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(tx.vatSentAt)}`
              : t.vat.notSentYet}
          </p>

          <VerifyVatForm
            transactionId={tx.id}
            attemptsLeft={attemptsLeft}
            labels={{
              codeLabel: t.vat.codeLabel,
              submit: t.vat.submit,
              submitting: t.vat.submitting,
              cancel: t.vat.cancel,
              cancelHint: t.vat.cancelHint,
              attemptsLeft: t.vat.attemptsLeft,
            }}
          />
        </div>
      </div>
      <AccountManagerFooter />
    </main>
  );
}
