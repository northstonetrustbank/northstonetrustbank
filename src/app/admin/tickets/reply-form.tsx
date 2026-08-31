"use client";

import { useActionState } from "react";
import { adminReplyTicketAction } from "@/lib/actions/ticket-actions";
import type { FormState } from "@/lib/actions/auth-actions";

export function AdminTicketReply({
  ticketId,
  currentStatus,
}: {
  ticketId: string;
  currentStatus: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    adminReplyTicketAction,
    null
  );

  return (
    <form action={action} className="mt-6 border-t border-line-soft pt-5">
      <input type="hidden" name="ticketId" value={ticketId} />

      {state?.error && (
        <p className="mb-3 rounded-lg border border-neg/25 bg-neg/10 px-3.5 py-2.5 text-sm text-neg">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="mb-3 rounded-lg border border-pos/25 bg-pos/10 px-3.5 py-2.5 text-sm text-pos">
          {state.ok}
        </p>
      )}

      <label className="block text-[13px] font-semibold text-fg" htmlFor="admin-reply">
        Reply to the client
      </label>
      <textarea
        id="admin-reply"
        name="body"
        required
        rows={5}
        maxLength={4000}
        className="mt-1.5 w-full resize-y rounded-lg border border-line bg-ink-2 px-3.5 py-2.5 text-[15px] text-fg transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="text-[13px] text-fg-muted" htmlFor="admin-reply-status">
          Set status
        </label>
        <select
          id="admin-reply-status"
          name="status"
          defaultValue={currentStatus === "RESOLVED" ? "RESOLVED" : "AWAITING_CLIENT"}
          className="rounded-lg border border-line bg-ink-2 px-3 py-2 text-[13px] text-fg"
        >
          <option value="AWAITING_CLIENT">Awaiting client</option>
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Resolved</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send reply"}
        </button>
      </div>
    </form>
  );
}
