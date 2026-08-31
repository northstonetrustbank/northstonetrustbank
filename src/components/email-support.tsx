"use client";

import { useState } from "react";
import { Icons, NavIcons } from "@/components/icons";

/**
 * The "Email support" card. Clicking it did nothing useful before — it went to
 * the live-chat page. It now asks who the client wants to reach, then opens
 * their own email client (mailto) addressed to that inbox, with a subject
 * filled in. No chatbox, no dead end.
 */
export function EmailSupport({
  title,
  body,
  chooseTitle,
  supportLabel,
  managerLabel,
  supportEmail,
  managerEmail,
  subject,
}: {
  title: string;
  body: string;
  chooseTitle: string;
  supportLabel: string;
  managerLabel: string;
  supportEmail: string;
  managerEmail: string;
  subject: string;
}) {
  const [open, setOpen] = useState(false);
  const mailto = (to: string) => `mailto:${to}?subject=${encodeURIComponent(subject)}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="elev-1 block w-full rounded-2xl border border-line bg-ink-1 p-4 text-center transition hover:border-brand-500/30 sm:p-5"
      >
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-600">
          <Icons.draft className="h-[22px] w-[22px]" />
        </span>
        <span className="mt-2.5 block text-[14px] font-semibold text-fg">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-fg-muted">{body}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-line bg-ink-1 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-semibold text-fg">{chooseTitle}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-fg-muted transition hover:bg-ink-2"
              >
                <NavIcons.close className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              <a
                href={mailto(supportEmail)}
                className="flex items-center gap-3 rounded-xl border border-line bg-ink-2 px-4 py-3 transition hover:border-brand-500/40"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/12 text-brand-500">
                  <Icons.review className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-fg">{supportLabel}</span>
                  <span className="block truncate text-[12px] text-fg-muted">{supportEmail}</span>
                </span>
              </a>
              <a
                href={mailto(managerEmail)}
                className="flex items-center gap-3 rounded-xl border border-line bg-ink-2 px-4 py-3 transition hover:border-brand-500/40"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/12 text-violet-600">
                  <Icons.shield className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-fg">{managerLabel}</span>
                  <span className="block truncate text-[12px] text-fg-muted">{managerEmail}</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
