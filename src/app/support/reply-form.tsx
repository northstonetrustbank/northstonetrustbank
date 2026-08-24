"use client";

import { useActionState } from "react";
import { replyToTicketAction } from "@/lib/actions/ticket-actions";
import type { FormState } from "@/lib/actions/auth-actions";

export function TicketReplyForm({
  ticketId,
  labels,
}: {
  ticketId: string;
  labels: { placeholder: string; send: string; sending: string };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(replyToTicketAction, null);

  return (
    <form action={action} className="mt-5 space-y-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      {state?.error && (
        <p className="rounded-lg border border-neg/25 bg-neg/10 px-3.5 py-2.5 text-sm text-neg">
          {state.error}
        </p>
      )}
      <textarea
        name="body"
        required
        rows={4}
        maxLength={4000}
        placeholder={labels.placeholder}
        className="w-full resize-y rounded-lg border border-line bg-ink-2 px-3.5 py-2.5 text-[15px] text-fg transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-60"
      >
        {pending ? labels.sending : labels.send}
      </button>
    </form>
  );
}
