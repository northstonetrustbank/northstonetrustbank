"use client";

import { useEffect, useRef, useState } from "react";
import { Composer, MessageList, useChatPolling, type ThreadLabels } from "./chat-thread";

export type ChatLabels = ThreadLabels & {
  open: string;
  title: string;
  subtitle: string;
  online: string;
  name: string;
  phone: string;
  email: string;
  cardLast4: string;
  contactHint: string;
  message: string;
  start: string;
  starting: string;
  contactRequired: string;
  closed: string;
  launcherPrompt: string;
};

const field =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-navy-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20";

const OPEN_KEY = "ns_chat_open";
const SEEN_KEY = "ns_chat_seen";

export function ChatWidget({
  labels,
  locale = "en",
  prefill,
}: {
  labels: ChatLabels;
  locale?: string;
  prefill?: { name?: string; email?: string };
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const seenRef = useRef(0);

  // Poll slowly while closed so a reply can raise the badge, quickly while open.
  const { messages, setMessages, started, poll } = useChatPolling(true, open ? 4000 : 15000);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOpen(window.localStorage.getItem(OPEN_KEY) === "1");
    seenRef.current = Number(window.localStorage.getItem(SEEN_KEY) ?? 0);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(OPEN_KEY, open ? "1" : "0");
  }, [open]);

  // Unread = admin messages arriving while the panel is shut.
  useEffect(() => {
    const fromAgent = messages.filter((m) => m.sender === "ADMIN").length;
    if (open) {
      seenRef.current = fromAgent;
      if (typeof window !== "undefined") window.localStorage.setItem(SEEN_KEY, String(fromAgent));
      setUnread(0);
    } else {
      setUnread(Math.max(0, fromAgent - seenRef.current));
    }
  }, [messages, open]);

  async function handleStart(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      phone: fd.get("phone"),
      email: fd.get("email"),
      cardLast4: fd.get("cardLast4"),
      message: fd.get("message"),
    };
    if (!String(payload.email || "").trim() && !String(payload.cardLast4 || "").trim()) {
      setError(labels.contactRequired);
      return;
    }
    setPending(true);
    const r = await fetch("/api/chat/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setPending(false);
    if (r.ok) await poll();
    else setError(labels.contactRequired);
  }

  async function handleSend(body: string) {
    // Show it straight away; the next poll reconciles with the server.
    setMessages((m) => [...m, { sender: "VISITOR", body, at: new Date().toISOString() }]);
    await fetch("/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    poll();
  }

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end sm:bottom-6 sm:right-6">
      {open && (
        <div
          className="mb-3 flex h-[min(32rem,calc(100vh-7rem))] w-[23rem] max-w-[calc(100vw-2.5rem)] flex-col
                     overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-navy-900/25
                     motion-safe:animate-[chatIn_180ms_ease-out]"
        >
          <div className="flex items-start justify-between gap-3 bg-gradient-to-br from-navy-800 to-navy-950 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white">
                T
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{labels.title}</p>
                <p className="flex items-center gap-1.5 text-xs text-navy-200">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  {labels.online}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-full p-1 text-navy-300 transition hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {started ? (
            <>
              <MessageList
                messages={messages}
                labels={labels}
                locale={locale}
                className="flex-1 bg-navy-50/40 p-4"
              />
              <Composer labels={labels} onSend={handleSend} autoFocus />
            </>
          ) : (
            <form onSubmit={handleStart} className="flex-1 space-y-3 overflow-y-auto p-5">
              <p className="text-[13px] leading-relaxed text-gray-600">{labels.subtitle}</p>
              <label className="block text-[13px] font-semibold text-navy-800">
                {labels.name}
                <input name="name" required defaultValue={prefill?.name} className={field} />
              </label>
              <label className="block text-[13px] font-semibold text-navy-800">
                {labels.phone}
                <input name="phone" type="tel" className={field} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[13px] font-semibold text-navy-800">
                  {labels.email}
                  <input name="email" type="email" defaultValue={prefill?.email} className={field} />
                </label>
                <label className="block text-[13px] font-semibold text-navy-800">
                  {labels.cardLast4}
                  <input name="cardLast4" inputMode="numeric" maxLength={4} className={field} />
                </label>
              </div>
              <p className="text-xs text-gray-500">{labels.contactHint}</p>
              <label className="block text-[13px] font-semibold text-navy-800">
                {labels.message}
                <textarea name="message" required rows={3} className={field} />
              </label>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                disabled={pending}
                className="w-full rounded-full bg-accent-500 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:opacity-60"
              >
                {pending ? labels.starting : labels.start}
              </button>
            </form>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        {!open && unread === 0 && (
          <span className="hidden rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-navy-800 shadow-lg shadow-navy-900/10 sm:block">
            {labels.launcherPrompt}
          </span>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={labels.open}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-accent-500 text-white shadow-lg shadow-accent-700/30 transition hover:bg-accent-600 hover:shadow-xl"
        >
          {open ? (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 20l1.1-3.4A8.5 8.5 0 1 1 21 11.5z" />
            </svg>
          )}
          {!open && unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">
              {unread}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
