import Link from "next/link";
import { formatMoney } from "@/lib/bank";
import { NavIcons } from "@/components/icons";

// Shared ledger table — used on the dashboard and on every product page.

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-400/12 text-amber-300",
  POSTED: "bg-pos/12 text-pos",
  REJECTED: "bg-neg/12 text-neg",
};

export type LedgerRow = {
  id: string;
  type: string;
  status: string;
  amountCents: number;
  reference: string;
  note: string | null;
  createdAt: Date;
  // Present on money-out rows. A transfer held at the VAT gate is still
  // PENDING, so the badge is derived from these rather than from the status.
  vatRequiredAt?: Date | null;
  vatClearedAt?: Date | null;
};

/** A held transfer reads "VAT code needed", not "Pending". */
function awaitingVat(tx: LedgerRow) {
  return Boolean(tx.vatRequiredAt) && !tx.vatClearedAt && tx.status === "PENDING";
}

export function TransactionList({
  rows,
  labels,
  locale,
  currency,
  emptyText,
  /** When false the rows are inert — used where a detail page makes no sense. */
  linkRows = true,
}: {
  rows: LedgerRow[];
  labels: {
    types: Record<string, string>;
    statuses: Record<string, string>;
    reference: string;
    vatNeeded: string;
  };
  locale: string;
  currency: string;
  emptyText: string;
  linkRows?: boolean;
}) {
  const dateFmt = new Intl.DateTimeFormat(
    ({ en: "en-US", fr: "fr-FR", de: "de-DE", es: "es-ES" } as Record<string, string>)[locale] ??
      "en-US",
    { dateStyle: "medium" }
  );

  return (
    <div className="elev-2 overflow-hidden rounded-2xl border border-line bg-ink-1">
      {rows.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-fg-muted">{emptyText}</p>
      ) : (
        <ul>
          {rows.map((tx) => {
            const body = (
              <div className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
                    tx.amountCents >= 0 ? "bg-pos/12 text-pos" : "bg-ink-3 text-fg-muted"
                  }`}
                  aria-hidden="true"
                >
                  {(tx.note?.trim() || labels.types[tx.type] || tx.type).charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-fg">
                    {tx.note?.trim() || (labels.types[tx.type] ?? tx.type)}
                  </p>
                  <p className="tnum mt-0.5 truncate text-[12px] text-fg-faint">
                    {dateFmt.format(tx.createdAt)}
                    {tx.note?.trim() ? ` · ${labels.types[tx.type] ?? tx.type}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`display text-[15px] font-semibold ${
                      tx.status === "REJECTED"
                        ? "text-fg-faint line-through"
                        : tx.amountCents >= 0
                          ? "text-pos"
                          : "text-fg"
                    }`}
                  >
                    {tx.amountCents >= 0 ? "+" : ""}
                    {formatMoney(tx.amountCents, locale, currency)}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
                      awaitingVat(tx)
                        ? "bg-gift/15 text-gift"
                        : (statusStyles[tx.status] ?? "")
                    }`}
                  >
                    {awaitingVat(tx)
                      ? labels.vatNeeded
                      : (labels.statuses[tx.status] ?? tx.status)}
                  </span>
                </div>
                {linkRows && (
                  <NavIcons.chevronRight className="h-4 w-4 shrink-0 text-fg-faint" />
                )}
              </div>
            );

            return (
              <li key={tx.id} className="border-b border-line-soft last:border-0">
                {linkRows ? (
                  <Link href={`/activity/${tx.id}`} className="block transition hover:bg-ink-2">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
