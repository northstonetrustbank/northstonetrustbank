"use client";

import { useActionState } from "react";
import { enableTwoFactorSetupAction } from "@/lib/actions/account-actions";
import type { FormState } from "@/lib/actions/auth-actions";

export function EnableTwoFactor({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  // The action redirects on success, so this state only ever holds an error.
  const [state, action, pending] = useActionState<FormState, FormData>(
    enableTwoFactorSetupAction,
    null
  );

  return (
    <form action={action}>
      {state?.error && (
        <p className="mb-4 rounded-lg border border-neg/25 bg-neg/10 px-3.5 py-2.5 text-sm text-neg">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
      >
        {pending ? pendingLabel : label}
      </button>
    </form>
  );
}
