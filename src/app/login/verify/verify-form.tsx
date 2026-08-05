"use client";

import { useActionState, useState, useTransition } from "react";
import {
  verifyTwoFactorAction,
  resendTwoFactorCodeAction,
  cancelTwoFactorAction,
} from "@/lib/actions/auth-actions";
import type { FormState } from "@/lib/actions/auth-actions";

export function VerifyForm({
  labels,
}: {
  labels: {
    codeLabel: string;
    verify: string;
    verifying: string;
    resend: string;
    cancel: string;
    noEmailNote: string;
  };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(verifyTwoFactorAction, null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resending, startResend] = useTransition();

  return (
    <>
      <form action={action} className="mt-8 space-y-5">
        <label className="block text-[13px] font-semibold text-navy-800">
          {labels.codeLabel}
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
            className="mt-1.5 w-full rounded-lg border border-gray-300 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-navy-900 transition focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
          />
        </label>

        {state?.error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {state.error}
          </p>
        )}
        {notice && (
          <p className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-800">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-accent-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600 disabled:opacity-60"
        >
          {pending ? labels.verifying : labels.verify}
        </button>
      </form>

      <p className="mt-5 text-xs leading-relaxed text-gray-500">{labels.noEmailNote}</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <button
          type="button"
          disabled={resending}
          onClick={() =>
            startResend(async () => {
              const result = await resendTwoFactorCodeAction();
              setNotice(result?.ok ?? null);
            })
          }
          className="font-semibold text-accent-600 transition hover:text-accent-700 disabled:opacity-60"
        >
          {labels.resend}
        </button>
        <form action={cancelTwoFactorAction}>
          <button className="font-semibold text-gray-500 transition hover:text-navy-800">
            {labels.cancel}
          </button>
        </form>
      </div>
    </>
  );
}
