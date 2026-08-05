"use client";

import { useActionState } from "react";
import { sendContactMessageAction } from "@/lib/actions/contact-actions";
import type { FormState } from "@/lib/actions/auth-actions";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] text-navy-900 transition focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20";
const labelClass = "block text-[13px] font-semibold text-navy-800";

export function ContactForm({
  labels,
}: {
  labels: {
    name: string;
    email: string;
    topic: string;
    topics: Record<string, string>;
    message: string;
    send: string;
    sending: string;
  };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    sendContactMessageAction,
    null
  );

  if (state?.ok) {
    return (
      <p className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-800">
        {state.ok}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-5">
      {/* Honeypot — hidden from people, catnip for bots. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClass}>
          {labels.name}
          <input name="name" required maxLength={120} autoComplete="name" className={inputClass} />
        </label>
        <label className={labelClass}>
          {labels.email}
          <input
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            className={inputClass}
          />
        </label>
      </div>

      <label className={labelClass}>
        {labels.topic}
        <select name="topic" defaultValue="GENERAL" className={inputClass}>
          {Object.entries(labels.topics).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        {labels.message}
        <textarea name="message" required rows={6} maxLength={4000} className={inputClass} />
      </label>

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-accent-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600 disabled:opacity-60 sm:w-auto sm:px-10"
      >
        {pending ? labels.sending : labels.send}
      </button>
    </form>
  );
}
