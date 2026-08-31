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
        <label className="block text-[13px] font-semibold text-fg">
          {labels.codeLabel}
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
            className="mt-1.5 w-full rounded-lg border border-line bg-ink-2 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-fg transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />
        </label>

        {state?.error && (
          <p className="rounded-lg border border-neg/25 bg-neg/10 px-3.5 py-2.5 text-sm text-neg">
            {state.error}
          </p>
        )}
        {notice && (
          <p className="rounded-lg border border-pos/25 bg-pos/10 px-3.5 py-2.5 text-sm text-pos">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-brand-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
        >
          {pending ? labels.verifying : labels.verify}
        </button>
      </form>

      <p className="mt-5 text-xs leading-relaxed text-fg-muted">{labels.noEmailNote}</p>

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
          className="font-semibold text-brand-400 transition hover:text-brand-400 disabled:opacity-60"
        >
          {labels.resend}
        </button>
        <form action={cancelTwoFactorAction}>
          <button className="font-semibold text-fg-muted transition hover:text-fg">
            {labels.cancel}
          </button>
        </form>
      </div>
    </>
  );
}
