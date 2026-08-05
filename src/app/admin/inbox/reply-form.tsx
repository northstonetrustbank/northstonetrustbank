"use client";

import { useActionState } from "react";
import { replyMailAction } from "@/lib/actions/mail-actions";
import type { FormState } from "@/lib/actions/auth-actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-navy-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20";

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
      <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-700">
        {state.ok}
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-5 border-t border-navy-50 pt-5">
      <input type="hidden" name="box" value={box} />
      <input type="hidden" name="to" value={to} />
      <p className="text-[13px] font-semibold text-navy-800">
        Reply to <span className="text-gray-600">{to}</span>
      </p>
      <label className="mt-3 block text-[13px] font-semibold text-navy-800">
        Subject
        <input name="subject" defaultValue={subject} className={inputClass} />
      </label>
      <label className="mt-3 block text-[13px] font-semibold text-navy-800">
        Message
        <textarea name="body" rows={6} className={inputClass} placeholder="Type your reply…" />
      </label>

      {state?.error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-full bg-navy-800 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-navy-700 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send reply"}
      </button>
    </form>
  );
}
