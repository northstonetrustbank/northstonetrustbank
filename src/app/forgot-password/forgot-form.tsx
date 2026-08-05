"use client";

import { useActionState } from "react";
import { forgotPasswordAction, type FormState } from "@/lib/actions/auth-actions";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] text-navy-900 transition focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20";

export function ForgotForm({ labels }: { labels: { email: string; submit: string } }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    forgotPasswordAction,
    null
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <label className="block text-[13px] font-semibold text-navy-800">
        {labels.email}
        <input name="email" type="email" required className={inputClass} />
      </label>

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-700">
          {state.ok}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-accent-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600 disabled:opacity-60"
      >
        {pending ? "…" : labels.submit}
      </button>
    </form>
  );
}
