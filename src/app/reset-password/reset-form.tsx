"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction, type FormState } from "@/lib/actions/auth-actions";
import { PasswordInput } from "@/components/password-input";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] text-navy-900 transition focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20";
const labelClass = "block text-[13px] font-semibold text-navy-800";

type Labels = {
  newPassword: string;
  confirmPassword: string;
  passwordHint: string;
  submit: string;
  signIn: string;
};

export function ResetForm({ token, labels }: { token: string; labels: Labels }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    resetPasswordAction,
    null
  );

  if (state?.ok) {
    return (
      <div className="mt-6">
        <p className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-700">
          {state.ok}
        </p>
        <Link
          href="/login"
          className="mt-5 inline-block w-full rounded-full bg-accent-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-accent-600"
        >
          {labels.signIn}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />
      <label className={labelClass}>
        {labels.newPassword}
        <PasswordInput name="password" required minLength={10} className={inputClass} autoComplete="new-password" />
        <span className="mt-1.5 block text-xs font-normal text-gray-500">{labels.passwordHint}</span>
      </label>
      <label className={labelClass}>
        {labels.confirmPassword}
        <PasswordInput name="confirm" required minLength={10} className={inputClass} autoComplete="new-password" />
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
        {pending ? "…" : labels.submit}
      </button>
    </form>
  );
}
