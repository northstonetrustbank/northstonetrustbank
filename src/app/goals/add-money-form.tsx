"use client";

import { useActionState } from "react";
import { fundGoalAction } from "@/lib/actions/money-actions";
import type { FormState } from "@/lib/actions/auth-actions";

export function AddMoneyForm({
  goalId,
  labels,
}: {
  goalId: string;
  labels: { amount: string; add: string };
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(fundGoalAction, null);

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="goalId" value={goalId} />
      <label className="text-xs font-semibold text-fg-muted">
        {labels.amount}
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="0.00"
          className="mt-1 block w-28 rounded-md border border-line bg-ink-2 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        />
      </label>
      <button
        disabled={pending}
        className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
      >
        {labels.add}
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
