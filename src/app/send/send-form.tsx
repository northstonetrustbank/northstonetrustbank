"use client";

import { useActionState } from "react";
import { sendMoneyAction } from "@/lib/actions/money-actions";
import type { FormState } from "@/lib/actions/auth-actions";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-line bg-ink-2 px-3.5 py-2.5 text-[15px] text-fg transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";
const labelClass = "block text-[13px] font-semibold text-fg";

type Labels = {
  recipient: string;
  recipientHint: string;
  amount: string;
  securityWord: string;
  submit: string;
  submitting: string;
};

export function SendForm({ labels }: { labels: Labels }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(sendMoneyAction, null);

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <label className={labelClass}>
        {labels.recipient}
        <input name="recipient" required className={inputClass} placeholder="NS-12345678 or name@email.com" />
        <span className="mt-1.5 block text-xs font-normal text-fg-muted">{labels.recipientHint}</span>
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
      <label className={labelClass}>
        {labels.securityWord}
        <input name="securityWord" type="password" required className={inputClass} />
      </label>

      {state?.error && (
        <p className="rounded-lg border border-neg/25 bg-neg/10 px-3.5 py-2.5 text-sm text-neg">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
      >
        {pending ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
