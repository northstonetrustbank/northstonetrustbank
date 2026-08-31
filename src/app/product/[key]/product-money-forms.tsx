"use client";

import { useActionState } from "react";
import { drawCreditAction, payProductAction } from "@/lib/actions/product-actions";
import type { FormState } from "@/lib/actions/auth-actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-fg focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";

function DrawForm({ appId, labels }: { appId: string; labels: { draw: string; drawAmount: string } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(drawCreditAction, null);
  return (
    <form action={action} className="rounded-xl border border-line p-4">
      <input type="hidden" name="appId" value={appId} />
      <label className="text-xs font-semibold text-fg-muted">
        {labels.drawAmount}
        <input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" className={inputClass} />
      </label>
      {state?.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="mt-3 w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
      >
        {labels.draw}
      </button>
    </form>
  );
}

function PayForm({ appId, labels }: { appId: string; labels: { pay: string; payAmount: string } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(payProductAction, null);
  return (
    <form action={action} className="rounded-xl border border-line p-4">
      <input type="hidden" name="appId" value={appId} />
      <label className="text-xs font-semibold text-fg-muted">
        {labels.payAmount}
        <input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" className={inputClass} />
      </label>
      {state?.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="mt-3 w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
      >
        {labels.pay}
      </button>
    </form>
  );
}

export function ProductMoneyForms({
  appId,
  showDraw,
  showPay,
  labels,
}: {
  appId: string;
  showDraw: boolean;
  showPay: boolean;
  labels: { draw: string; drawAmount: string; pay: string; payAmount: string };
}) {
  if (!showDraw && !showPay) return null;
  return (
    <div className="mt-6 grid gap-3 border-t border-line-soft pt-6 sm:grid-cols-2">
      {showDraw && <DrawForm appId={appId} labels={labels} />}
      {showPay && <PayForm appId={appId} labels={labels} />}
    </div>
  );
}
