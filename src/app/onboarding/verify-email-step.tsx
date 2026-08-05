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
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 text-2xl">
        ✉️
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-tight text-navy-900">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-gray-600">{body}</p>

      {state?.ok && (
        <p className="mx-auto mt-4 max-w-md rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
          {state.ok}
        </p>
      )}
      {state?.error && (
        <p className="mx-auto mt-4 max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          {state.error}
        </p>
      )}

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => router.refresh()}
          className="rounded-full bg-accent-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600"
        >
          {refreshLabel}
        </button>
        <form action={formAction}>
          <button
            disabled={pending}
            className="rounded-full border border-gray-300 px-6 py-2.5 text-sm font-semibold text-navy-800 transition hover:bg-navy-50 disabled:opacity-60"
          >
            {resendLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
