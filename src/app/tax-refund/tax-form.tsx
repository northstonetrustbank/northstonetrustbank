"use client";

import { useActionState } from "react";
import { applyTaxRefundAction } from "@/lib/actions/service-actions";
import type { FormState } from "@/lib/actions/auth-actions";
import { fieldClass, labelClass } from "@/components/ui";

type Labels = {
  taxYear: string;
  years: string[];
  note: string;
  noteHint: string;
  submit: string;
  submitting: string;
};

export function TaxForm({ labels }: { labels: Labels }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    applyTaxRefundAction,
    null
  );

  return (
    <form action={formAction} className="space-y-5">
      <label className={labelClass}>
        {labels.taxYear}
        <select name="taxYear" defaultValue="" required className={fieldClass}>
          <option value="" disabled>
            —
          </option>
          {labels.years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        {labels.note}
        <textarea name="note" rows={3} maxLength={600} className={fieldClass} />
        <span className="mt-1.5 block text-xs font-normal text-fg-muted">{labels.noteHint}</span>
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
