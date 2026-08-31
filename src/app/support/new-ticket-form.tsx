"use client";

import { useActionState } from "react";
import { createTicketAction } from "@/lib/actions/ticket-actions";
import { TICKET_CATEGORIES } from "@/lib/tickets";
import type { FormState } from "@/lib/actions/auth-actions";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-line bg-ink-2 px-3.5 py-2.5 text-[15px] text-fg transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";
const labelClass = "block text-[13px] font-semibold text-fg";

export function NewTicketForm({
  labels,
}: {
  labels: {
    category: string;
    subject: string;
    body: string;
    submit: string;
    submitting: string;
    categories: Record<string, string>;
    choose: string;
  };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createTicketAction, null);

  return (
    <form action={action} className="mt-5 space-y-4">
      {state?.error && (
        <p className="rounded-lg border border-neg/25 bg-neg/10 px-3.5 py-2.5 text-sm text-neg">
          {state.error}
        </p>
      )}

      <div>
        <label className={labelClass} htmlFor="ticket-category">
          {labels.category}
        </label>
        <select id="ticket-category" name="category" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            {labels.choose}
          </option>
          {TICKET_CATEGORIES.map((key) => (
            <option key={key} value={key}>
              {labels.categories[key] ?? key}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="ticket-subject">
          {labels.subject}
        </label>
        <input
          id="ticket-subject"
          name="subject"
          required
          maxLength={120}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="ticket-body">
          {labels.body}
        </label>
        <textarea
          id="ticket-body"
          name="body"
          required
          rows={6}
          maxLength={4000}
          className={`${inputClass} resize-y`}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
      >
        {pending ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
