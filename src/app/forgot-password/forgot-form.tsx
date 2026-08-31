"use client";

import { useActionState } from "react";
import { forgotPasswordAction, type FormState } from "@/lib/actions/auth-actions";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-line bg-ink-2 px-3.5 py-2.5 text-[15px] text-fg transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";

export function ForgotForm({ labels }: { labels: { email: string; submit: string } }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    forgotPasswordAction,
    null
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <label className="block text-[13px] font-semibold text-fg">
        {labels.email}
        <input name="email" type="email" required className={inputClass} />
      </label>

      {state?.error && (
        <p className="rounded-lg border border-neg/25 bg-neg/10 px-3.5 py-2.5 text-sm text-neg">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-lg border border-pos/25 bg-pos/10 px-3.5 py-2.5 text-sm text-pos">
          {state.ok}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
      >
        {pending ? "…" : labels.submit}
      </button>
    </form>
  );
}
