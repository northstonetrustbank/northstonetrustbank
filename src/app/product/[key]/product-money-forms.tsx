"use client";

import { useActionState } from "react";
import { drawCreditAction, payProductAction } from "@/lib/actions/product-actions";
import type { FormState } from "@/lib/actions/auth-actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-navy-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20";

function DrawForm({ appId, labels }: { appId: string; labels: { draw: string; drawAmount: string } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(drawCreditAction, null);
  return (
    <form action={action} className="rounded-xl border border-gray-200 p-4">
      <input type="hidden" name="appId" value={appId} />
      <label className="text-xs font-semibold text-gray-600">
        {labels.drawAmount}
        <input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" className={inputClass} />
      </label>
      {state?.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="mt-3 w-full rounded-full bg-navy-800 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-700 disabled:opacity-60"
      >
        {labels.draw}
      </button>
    </form>
  );
}

function PayForm({ appId, labels }: { appId: string; labels: { pay: string; payAmount: string } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(payProductAction, null);
  return (
    <form action={action} className="rounded-xl border border-gray-200 p-4">
      <input type="hidden" name="appId" value={appId} />
      <label className="text-xs font-semibold text-gray-600">
        {labels.payAmount}
        <input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" className={inputClass} />
      </label>
      {state?.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="mt-3 w-full rounded-full bg-accent-500 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:opacity-60"
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
    <div className="mt-6 grid gap-3 border-t border-gray-100 pt-6 sm:grid-cols-2">
      {showDraw && <DrawForm appId={appId} labels={labels} />}
      {showPay && <PayForm appId={appId} labels={labels} />}
    </div>
  );
}
