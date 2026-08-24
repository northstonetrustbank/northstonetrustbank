"use client";

import { useActionState } from "react";
import { submitDepositAction } from "@/lib/actions/deposit-actions";
import type { FormState } from "@/lib/actions/auth-actions";
import { FileField } from "@/components/file-field";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-line bg-ink-2 px-3.5 py-2.5 text-[15px] text-fg placeholder:text-fg-faint transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";

const labelClass = "block text-[13px] font-semibold text-fg";

type Labels = {
  amount: string;
  note: string;
  proof: string;
  proofHint: string;
  submit: string;
  submitting: string;
  chooseFile: string;
  noFile: string;
  optimising: string;
  fileTooBig: string;
};

export function DepositForm({ methodKey, labels }: { methodKey: string; labels: Labels }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    submitDepositAction,
    null
  );

  return (
    <form action={formAction} className="mt-7 space-y-5">
      <input type="hidden" name="methodKey" value={methodKey} />
      <label className={labelClass}>
        {labels.amount}
        <input
          name="amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          max="1000000"
          required
          placeholder="0.00"
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        {labels.note}
        <input name="note" maxLength={200} className={inputClass} />
      </label>

      <div className={labelClass}>
        {labels.proof}
        <FileField
          name="proof"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          chooseLabel={labels.chooseFile}
          emptyLabel={labels.noFile}
          optimisingLabel={labels.optimising}
          tooBigLabel={labels.fileTooBig}
          required={false}
        />
        <span className="mt-1.5 block text-xs font-normal text-fg-muted">{labels.proofHint}</span>
      </div>

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
        {pending ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
