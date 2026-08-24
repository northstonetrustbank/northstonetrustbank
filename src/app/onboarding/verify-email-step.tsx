"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { resendVerificationAction, type FormState } from "@/lib/actions/auth-actions";

export function VerifyEmailStep({
  title,
  body,
  resendLabel,
  refreshLabel,
}: {
  title: string;
  body: string;
  resendLabel: string;
  refreshLabel: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    resendVerificationAction,
    null
  );

  return (
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/12 text-2xl">
        ✉️
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-tight text-fg">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-fg-muted">{body}</p>

      {state?.ok && (
        <p className="mx-auto mt-4 max-w-md rounded-lg border border-pos/25 bg-pos/10 px-4 py-2.5 text-sm text-pos">
          {state.ok}
        </p>
      )}
      {state?.error && (
        <p className="mx-auto mt-4 max-w-md rounded-lg border border-amber-400/25 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-300">
          {state.error}
        </p>
      )}

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => router.refresh()}
          className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400"
        >
          {refreshLabel}
        </button>
        <form action={formAction}>
          <button
            disabled={pending}
            className="rounded-xl border border-line px-6 py-2.5 text-sm font-semibold text-fg transition hover:bg-ink-2 disabled:opacity-60"
          >
            {resendLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
