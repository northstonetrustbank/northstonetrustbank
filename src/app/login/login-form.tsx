"use client";

import { useActionState } from "react";
import { loginAction, type FormState } from "@/lib/actions/auth-actions";
import { PasswordInput } from "@/components/password-input";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] text-navy-900 placeholder:text-gray-400 transition focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20";

const labelClass = "block text-[13px] font-semibold text-navy-800";

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
