"use client";

import { useActionState } from "react";
import { applyGrantAction } from "@/lib/actions/service-actions";
import type { FormState } from "@/lib/actions/auth-actions";
import { fieldClass, labelClass } from "@/components/ui";

type Option = { value: string; label: string };

type Labels = {
  program: string;
  programHint: string;
  programs: Option[];
  amount: string;
  amountPlaceholder: string;
  employment: string;
  employments: Option[];
  householdIncome: string;
  incomes: Option[];
  dependents: string;
  reason: string;
  reasonHint: string;
  choose: string;
  submit: string;
  submitting: string;
};

export function GrantForm({ labels }: { labels: Labels }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(applyGrantAction, null);

  return (
    <form action={formAction} className="space-y-5">
      <label className={labelClass}>
        {labels.program}
        <select name="program" defaultValue="" required className={fieldClass}>
          <option value="" disabled>
            {labels.choose}
          </option>
          {labels.programs.map((p) => (
            <option key={p.value} value={p.label}>
              {p.label}
            </option>
          ))}
        </select>
        <span className="mt-1.5 block text-xs font-normal text-fg-muted">{labels.programHint}</span>
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
          placeholder={labels.amountPlaceholder}
          className={fieldClass}
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClass}>
          {labels.employment}
          <select name="employment" defaultValue="" className={fieldClass}>
            <option value="">{labels.choose}</option>
            {labels.employments.map((e) => (
              <option key={e.value} value={e.label}>
                {e.label}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          {labels.householdIncome}
          <select name="householdIncome" defaultValue="" className={fieldClass}>
            <option value="">{labels.choose}</option>
            {labels.incomes.map((i) => (
              <option key={i.value} value={i.label}>
                {i.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={labelClass}>
        {labels.dependents}
        <input name="dependents" type="number" min="0" max="20" className={fieldClass} />
      </label>

      <label className={labelClass}>
        {labels.reason}
        <textarea name="reason" rows={4} required className={fieldClass} />
        <span className="mt-1.5 block text-xs font-normal text-fg-muted">{labels.reasonHint}</span>
      </label>

      {state?.error && (
        <p className="rounded-lg border border-neg/25 bg-neg/10 px-3.5 py-2.5 text-sm text-neg">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
