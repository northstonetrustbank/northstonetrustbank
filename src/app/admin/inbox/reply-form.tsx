"use client";

import { useActionState } from "react";
import { replyMailAction } from "@/lib/actions/mail-actions";
import type { FormState } from "@/lib/actions/auth-actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-fg focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";

export function ReplyForm({
  box,
  to,
  subject,
}: {
  box: string;
  to: string;
  subject: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    replyMailAction,
    null
  );

  if (state?.ok) {
    return (
      <p className="mt-4 rounded-lg border border-pos/25 bg-pos/10 px-3.5 py-2.5 text-sm text-pos">
        {state.ok}
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-5 border-t border-navy-50 pt-5">
      <input type="hidden" name="box" value={box} />
      <input type="hidden" name="to" value={to} />
      <p className="text-[13px] font-semibold text-fg">
        Reply to <span className="text-fg-muted">{to}</span>
      </p>
      <label className="mt-3 block text-[13px] font-semibold text-fg">
        Subject
        <input name="subject" defaultValue={subject} className={inputClass} />
      </label>
      <label className="mt-3 block text-[13px] font-semibold text-fg">
        Message
        <textarea name="body" rows={6} className={inputClass} placeholder="Type your reply…" />
      </label>

      {state?.error && (
        <p className="mt-3 rounded-lg border border-neg/25 bg-neg/10 px-3.5 py-2.5 text-sm text-neg">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send reply"}
      </button>
    </form>
  );
}
