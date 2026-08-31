"use client";

import { useActionState } from "react";
import { toggleTwoFactorAction } from "@/lib/actions/account-actions";
import type { FormState } from "@/lib/actions/auth-actions";
import { PasswordInput } from "@/components/password-input";

export function TwoFactorForm({
  enabled,
  labels,
}: {
  enabled: boolean;
  labels: {
    title: string;
    desc: string;
    statusOn: string;
    statusOff: string;
    enable: string;
    disable: string;
    confirmWithPassword: string;
    recommendation: string;
    onSince: string | null;
  };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(toggleTwoFactorAction, null);

  return (
    <div className="mt-8 border-t border-line-soft pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-fg">{labels.title}</h3>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
            enabled ? "bg-pos/12 text-pos" : "bg-ink-2 text-fg-muted"
          }`}
        >
          {enabled ? labels.statusOn : labels.statusOff}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{labels.desc}</p>
      {enabled && labels.onSince && (
        <p className="mt-1 text-xs text-fg-muted">{labels.onSince}</p>
      )}
      {!enabled && (
        <p className="mt-2 text-sm font-medium text-brand-400">{labels.recommendation}</p>
      )}

      <form action={action} className="mt-5 space-y-4">
        <label className="block text-[13px] font-semibold text-fg">
          {labels.confirmWithPassword}
          <PasswordInput
            name="password"
            required
            autoComplete="current-password"
            className="mt-1.5 w-full rounded-lg border border-line bg-ink-2 px-3.5 py-2.5 text-[15px] text-fg transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />
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
          className={`w-full rounded-xl py-3 text-sm font-semibold text-white transition disabled:opacity-60 ${
            enabled ? "bg-brand-500 hover:bg-brand-600" : "bg-brand-500 hover:bg-brand-600"
          }`}
        >
          {enabled ? labels.disable : labels.enable}
        </button>
      </form>
    </div>
  );
}
