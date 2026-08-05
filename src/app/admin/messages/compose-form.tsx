"use client";

import { useActionState, useState } from "react";
import { sendBroadcastAction } from "@/lib/actions/broadcast-actions";
import type { FormState } from "@/lib/actions/auth-actions";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-navy-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20";
const labelClass = "block text-[13px] font-semibold text-navy-800";

export function ComposeForm({
  clients,
}: {
  clients: { email: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    sendBroadcastAction,
    null
  );
  const [audience, setAudience] = useState("ALL");

  return (
    <form action={formAction} className="mt-6 space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Channels */}
      <div>
        <p className={labelClass}>Channels</p>
        <div className="mt-2 flex flex-wrap gap-5 text-sm text-navy-800">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="channelEmail" defaultChecked className="h-4 w-4" />
            Email
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="channelNotification" defaultChecked className="h-4 w-4" />
            In-app notification
          </label>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Audience */}
        <label className={labelClass}>
          Send to
          <select
            name="audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className={inputClass}
          >
            <option value="ALL">All clients</option>
            <option value="ACTIVE">Active clients</option>
            <option value="PENDING">Pending review (onboarding)</option>
            <option value="BLOCKED">Blocked clients</option>
            <option value="PERSONAL">Personal accounts (active)</option>
            <option value="COMMERCIAL">Business accounts (active)</option>
            <option value="SINGLE">A single client…</option>
          </select>
        </label>

        {/* Send-as (email only) */}
        <label className={labelClass}>
          Send email as
          <select name="from" className={inputClass}>
            <option value="info">info@northstonetrustbank.com</option>
            <option value="support">support@northstonetrustbank.com</option>
            <option value="accountmanager">accountmanager@northstonetrustbank.com</option>
          </select>
        </label>
      </div>

      {audience === "SINGLE" && (
        <label className={labelClass}>
          Client email address
          <input
            name="singleEmail"
            type="email"
            list="client-emails"
            placeholder="Pick from the list or type an email"
            className={inputClass}
          />
          <datalist id="client-emails">
            {clients.map((c) => (
              <option key={c.email} value={c.email}>
                {c.name}
              </option>
            ))}
          </datalist>
        </label>
      )}

      <label className={labelClass}>
        Subject / title
        <input name="subject" maxLength={150} className={inputClass} />
      </label>

      <label className={labelClass}>
        Message
        <textarea
          name="body"
          rows={8}
          maxLength={5000}
          placeholder="Write in plain text. Blank lines start new paragraphs — we handle the formatting."
          className={inputClass}
        />
      </label>

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-700">
          {state.ok}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-navy-800 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-navy-700 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
