"use client";

import { useActionState } from "react";
import { sendMoneyAction } from "@/lib/actions/money-actions";
import type { FormState } from "@/lib/actions/auth-actions";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] text-navy-900 transition focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20";
const labelClass = "block text-[13px] font-semibold text-navy-800";

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
        <span className="mt-1.5 block text-xs font-normal text-gray-500">{labels.recipientHint}</span>
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
        <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-accent-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600 disabled:opacity-60"
      >
        {pending ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
