"use client";

import { useState } from "react";
import { BankCard, formatCardNumber, type BankCardProps } from "./bank-card";

// The client's own card, with the number/CVV hidden until they ask to see them.

export type CardDetailsLabels = {
  show: string;
  hide: string;
  number: string;
  expiry: string;
  cvv: string;
  copy: string;
  copied: string;
  notIssued: string;
};

export function CardWithReveal({
  card,
  cvv,
  labels,
}: {
  card: Omit<BankCardProps, "masked">;
  cvv?: string | null;
  labels: CardDetailsLabels;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const issued = Boolean(card.number);

  async function copyNumber() {
    if (!card.number) return;
    try {
      await navigator.clipboard.writeText(card.number.replace(/\D/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — the number is on screen anyway
    }
  }

  return (
    <div>
      <BankCard {...card} masked={!revealed} />

      {!issued ? (
        <p className="mt-4 rounded-lg bg-ink-2 px-3.5 py-2.5 text-sm text-fg-muted">
          {labels.notIssued}
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="mt-4 w-full rounded-xl border border-line bg-ink-1 py-2.5 text-sm font-semibold text-fg transition hover:border-brand-500/40 hover:shadow-sm"
          >
            {revealed ? labels.hide : labels.show}
          </button>

          {revealed && (
            <dl className="mt-3 divide-y divide-line-soft rounded-xl border border-line bg-ink-1 px-4">
              <div className="flex items-center justify-between gap-3 py-3">
                <dt className="text-sm text-fg-muted">{labels.number}</dt>
                <dd className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-fg">
                    {formatCardNumber(card.number, false)}
                  </span>
                  <button
                    type="button"
                    onClick={copyNumber}
                    className="rounded-full border border-line bg-ink-2 px-2.5 py-1 text-[11px] font-semibold text-fg-muted transition hover:border-brand-500/40"
                  >
                    {copied ? labels.copied : labels.copy}
                  </button>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-3">
                <dt className="text-sm text-fg-muted">{labels.expiry}</dt>
                <dd className="font-mono text-sm font-semibold text-fg">{card.expiry || "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-3">
                <dt className="text-sm text-fg-muted">{labels.cvv}</dt>
                <dd className="font-mono text-sm font-semibold text-fg">{cvv || "—"}</dd>
              </div>
            </dl>
          )}
        </>
      )}
    </div>
  );
}
