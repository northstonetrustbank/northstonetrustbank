"use client";

import { useActionState } from "react";
import { transferAction } from "@/lib/actions/product-actions";
import type { FormState } from "@/lib/actions/auth-actions";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-line bg-ink-2 px-3.5 py-2.5 text-[15px] text-fg transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";
const labelClass = "block text-[13px] font-semibold text-fg";

export function TransferForm({
  labels,
}: {
  labels: { toSavings: string; toChecking: string; amount: string; submit: string };
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(transferAction, null);

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <label className={labelClass}>
        Direction
        <select name="direction" className={inputClass} defaultValue="TO_SAVINGS">
          <option value="TO_SAVINGS">{labels.toSavings}</option>
          <option value="TO_CHECKING">{labels.toChecking}</option>
        </select>
      </label>
      <label className={labelClass}>
        {labels.amount}
        <input
          name="amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          required
          placeholder="0.00"
          className={inputClass}
        />
      </label>

      {state?.error && (
        <p className="rounded-lg border border-neg/25 bg-neg/10 px-3.5 py-2.5 text-sm text-neg">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-400 disabled:opacity-60"
      >
        {pending ? "…" : labels.submit}
      </button>
    </form>
  );
}
