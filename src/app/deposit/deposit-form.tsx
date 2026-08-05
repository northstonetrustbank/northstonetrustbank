"use client";

import { useActionState } from "react";
import { submitDepositAction } from "@/lib/actions/deposit-actions";
import type { FormState } from "@/lib/actions/auth-actions";
import { FileField } from "@/components/file-field";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] text-navy-900 placeholder:text-gray-400 transition focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20";

const labelClass = "block text-[13px] font-semibold text-navy-800";

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
        <span className="mt-1.5 block text-xs font-normal text-gray-500">{labels.proofHint}</span>
      </div>

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
