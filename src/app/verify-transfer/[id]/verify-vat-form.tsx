"use client";

import { useActionState } from "react";
import { clearVatAction, cancelHeldTransferAction } from "@/lib/actions/money-actions";

export type VatLabels = {
  codeLabel: string;
  submit: string;
  submitting: string;
  cancel: string;
  cancelHint: string;
  attemptsLeft: string;
};

export function VerifyVatForm({
  transactionId,
  labels,
  attemptsLeft,
}: {
  transactionId: string;
  labels: VatLabels;
  attemptsLeft: number;
}) {
  const [state, formAction, pending] = useActionState(clearVatAction, {});

  return (
    <>
      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="transactionId" value={transactionId} />
        <label className="block text-sm font-semibold text-navy-800">
          {labels.codeLabel}
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            autoFocus
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] text-navy-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
          />
        </label>

        {state?.error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {state.error}
          </p>
        )}

        {attemptsLeft < 5 && attemptsLeft > 0 && (
          <p className="text-xs text-gray-500">
            {attemptsLeft} {labels.attemptsLeft}
          </p>
        )}

        <button
          disabled={pending}
          className="w-full rounded-full bg-accent-500 py-3 text-sm font-semibold text-white shadow-md shadow-accent-700/25 transition hover:bg-accent-600 disabled:opacity-60"
        >
          {pending ? labels.submitting : labels.submit}
        </button>
      </form>

      <form action={cancelHeldTransferAction} className="mt-6 border-t border-gray-100 pt-5">
        <input type="hidden" name="transactionId" value={transactionId} />
        <button className="text-sm font-semibold text-red-700 hover:underline">
          {labels.cancel}
        </button>
        <p className="mt-1 text-xs text-gray-500">{labels.cancelHint}</p>
      </form>
    </>
  );
}
