"use client";

import { useActionState } from "react";
import { loginAction, type FormState } from "@/lib/actions/auth-actions";
import { PasswordInput } from "@/components/password-input";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-line bg-ink-2 px-3.5 py-2.5 text-[15px] text-fg placeholder:text-fg-faint transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";

const labelClass = "block text-[13px] font-semibold text-fg";

type Labels = {
  email: string;
  password: string;
  submit: string;
  submitting: string;
};

export function LoginForm({ labels }: { labels: Labels }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    loginAction,
    null
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <label className={labelClass}>
        {labels.email}
        <input name="email" type="email" required className={inputClass} />
      </label>
      <label className={labelClass}>
        {labels.password}
        <PasswordInput name="password" required className={inputClass} autoComplete="current-password" />
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
