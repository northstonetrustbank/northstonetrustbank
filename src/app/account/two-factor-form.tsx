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
    <div className="mt-8 border-t border-gray-100 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-navy-900">{labels.title}</h3>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
            enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
          }`}
        >
          {enabled ? labels.statusOn : labels.statusOff}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{labels.desc}</p>
      {enabled && labels.onSince && (
        <p className="mt-1 text-xs text-gray-500">{labels.onSince}</p>
      )}
      {!enabled && (
        <p className="mt-2 text-sm font-medium text-accent-700">{labels.recommendation}</p>
      )}

      <form action={action} className="mt-5 space-y-4">
        <label className="block text-[13px] font-semibold text-navy-800">
          {labels.confirmWithPassword}
          <PasswordInput
            name="password"
            required
            autoComplete="current-password"
            className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] text-navy-900 transition focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
          />
        </label>

        {state?.error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-800">
            {state.ok}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className={`w-full rounded-full py-3 text-sm font-semibold text-white transition disabled:opacity-60 ${
            enabled ? "bg-navy-800 hover:bg-navy-700" : "bg-accent-500 hover:bg-accent-600"
          }`}
        >
          {enabled ? labels.disable : labels.enable}
        </button>
      </form>
    </div>
  );
}
