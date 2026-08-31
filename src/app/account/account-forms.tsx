"use client";

import { useActionState } from "react";
import { changePasswordAction, setSecurityWordAction } from "@/lib/actions/account-actions";
import type { FormState } from "@/lib/actions/auth-actions";
import { PasswordInput } from "@/components/password-input";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-line bg-ink-2 px-3.5 py-2.5 text-[15px] text-fg transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";
const labelClass = "block text-[13px] font-semibold text-fg";
const cardClass = "mt-6 rounded-2xl border border-line bg-ink-1 p-7 shadow-sm";

type Labels = {
  changePassword: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  updatePassword: string;
  securityWordTitle: string;
  securityWordDesc: string;
  securityWordLabel: string;
  passwordToConfirm: string;
  saveSecurityWord: string;
  securityWordActive: string;
  passwordHint: string;
};

function Msg({ state }: { state: FormState }) {
  if (state?.error)
    return (
      <p className="rounded-lg border border-neg/25 bg-neg/10 px-3.5 py-2.5 text-sm text-neg">
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p className="rounded-lg border border-pos/25 bg-pos/10 px-3.5 py-2.5 text-sm text-pos">
        {state.ok}
      </p>
    );
  return null;
}

export function AccountForms({
  hasSecurityWord,
  labels,
}: {
  hasSecurityWord: boolean;
  labels: Labels;
}) {
  const [pwState, pwAction, pwPending] = useActionState<FormState, FormData>(
    changePasswordAction,
    null
  );
  const [swState, swAction, swPending] = useActionState<FormState, FormData>(
    setSecurityWordAction,
    null
  );

  return (
    <>
      {/* Change password */}
      <form action={pwAction} className={cardClass}>
        <h2 className="text-lg font-semibold text-fg">{labels.changePassword}</h2>
        <div className="mt-4 space-y-4">
          <label className={labelClass}>
            {labels.currentPassword}
            <PasswordInput name="current" required className={inputClass} autoComplete="current-password" />
          </label>
          <label className={labelClass}>
            {labels.newPassword}
            <PasswordInput name="password" required minLength={10} className={inputClass} autoComplete="new-password" />
            <span className="mt-1.5 block text-xs font-normal text-fg-muted">{labels.passwordHint}</span>
          </label>
          <label className={labelClass}>
            {labels.confirmPassword}
            <PasswordInput name="confirm" required minLength={10} className={inputClass} autoComplete="new-password" />
          </label>
          <Msg state={pwState} />
          <button
            disabled={pwPending}
            className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {labels.updatePassword}
          </button>
        </div>
      </form>

      {/* Security word */}
      <form action={swAction} className={cardClass}>
        <h2 className="text-lg font-semibold text-fg">{labels.securityWordTitle}</h2>
        <p className="mt-1 text-sm text-fg-muted">{labels.securityWordDesc}</p>
        {hasSecurityWord && (
          <p className="mt-3 rounded-lg bg-pos/10 px-3.5 py-2 text-sm text-pos">
            {labels.securityWordActive}
          </p>
        )}
        <div className="mt-4 space-y-4">
          <label className={labelClass}>
            {labels.securityWordLabel}
            <input name="securityWord" type="text" required minLength={3} className={inputClass} />
          </label>
          <label className={labelClass}>
            {labels.passwordToConfirm}
            <PasswordInput name="password" required className={inputClass} autoComplete="current-password" />
          </label>
          <Msg state={swState} />
          <button
            disabled={swPending}
            className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {labels.saveSecurityWord}
          </button>
        </div>
      </form>
    </>
  );
}
