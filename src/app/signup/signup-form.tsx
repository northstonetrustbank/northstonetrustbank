"use client";

import { useActionState } from "react";
import { signupAction, type FormState } from "@/lib/actions/auth-actions";
import { PasswordInput } from "@/components/password-input";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-line bg-ink-2 px-3.5 py-2.5 text-[15px] text-fg placeholder:text-fg-faint transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";

const labelClass = "block text-[13px] font-semibold text-fg";

type Labels = {
  accountTypeLabel: string;
  typePersonal: string;
  typeCommercial: string;
  currencyLabel: string;
  currencyUsd: string;
  currencyEur: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  passwordHint: string;
  submit: string;
  submitting: string;
};

export function SignupForm({ labels }: { labels: Labels }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    signupAction,
    null
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <fieldset>
        <legend className="text-[13px] font-semibold text-fg">
          {labels.accountTypeLabel}
        </legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-full bg-ink-2 p-1">
          {[
            { value: "PERSONAL", label: labels.typePersonal },
            { value: "COMMERCIAL", label: labels.typeCommercial },
          ].map((opt, i) => (
            <label key={opt.value} className="cursor-pointer">
              <input
                type="radio"
                name="accountType"
                value={opt.value}
                defaultChecked={i === 0}
                className="peer sr-only"
              />
              <span className="block rounded-xl py-2 text-center text-sm font-semibold text-fg-muted transition peer-checked:bg-ink-1 peer-checked:text-fg peer-checked:shadow-sm">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-[13px] font-semibold text-fg">{labels.currencyLabel}</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-full bg-ink-2 p-1">
          {[
            { value: "USD", label: labels.currencyUsd },
            { value: "EUR", label: labels.currencyEur },
          ].map((opt, i) => (
            <label key={opt.value} className="cursor-pointer">
              <input type="radio" name="currency" value={opt.value} defaultChecked={i === 0} className="peer sr-only" />
              <span className="block rounded-xl py-2 text-center text-sm font-semibold text-fg-muted transition peer-checked:bg-ink-1 peer-checked:text-fg peer-checked:shadow-sm">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClass}>
          {labels.firstName}
          <input name="firstName" required maxLength={60} className={inputClass} />
        </label>
        <label className={labelClass}>
          {labels.lastName}
          <input name="lastName" required maxLength={60} className={inputClass} />
        </label>
      </div>
      <label className={labelClass}>
        {labels.email}
        <input name="email" type="email" required className={inputClass} />
      </label>
      <label className={labelClass}>
        {labels.phone}
        <input name="phone" type="tel" required className={inputClass} />
      </label>
      <label className={labelClass}>
        {labels.password}
        <PasswordInput name="password" required minLength={10} className={inputClass} autoComplete="new-password" />
        <span className="mt-1.5 block text-xs font-normal text-fg-muted">
          {labels.passwordHint}
        </span>
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
