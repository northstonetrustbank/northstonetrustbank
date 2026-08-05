"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Composer, MessageList, useChatPolling, type ThreadLabels } from "./chat-thread";
import { LogoMark } from "./logo";

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
  greetingTitle: string;
  greetingBody: string;
  dismiss: string;
  close: string;
  securityNote: string;
};

const field =
  "mt-1 w-full rounded-lg border border-gray-200 bg-navy-50/50 px-3 py-2 text-sm text-navy-900 placeholder:text-gray-400 focus:border-accent-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/20";

const OPEN_KEY = "ns_chat_open";
const SEEN_KEY = "ns_chat_seen";
const NUDGE_KEY = "ns_chat_nudge";

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
  const [nudge, setNudge] = useState(false);
  const seenRef = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);

  // Poll slowly while closed so a reply can raise the badge, quickly while open.
  const { messages, setMessages, started, poll } = useChatPolling(true, open ? 4000 : 15000);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const wasOpen = window.localStorage.getItem(OPEN_KEY) === "1";
    setOpen(wasOpen);
    seenRef.current = Number(window.localStorage.getItem(SEEN_KEY) ?? 0);

    // The greeting appears once per visitor, a beat after the page settles —
    // long enough not to fight the hero for attention.
    if (!wasOpen && window.localStorage.getItem(NUDGE_KEY) !== "1") {
      const t = setTimeout(() => setNudge(true), 3200);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(OPEN_KEY, open ? "1" : "0");
  }, [open]);

  const dismissNudge = useCallback(() => {
    setNudge(false);
    if (typeof window !== "undefined") window.localStorage.setItem(NUDGE_KEY, "1");
  }, []);

  const openPanel = useCallback(() => {
    setOpen(true);
    dismissNudge();
  }, [dismissNudge]);

  // Escape closes the panel, the way every other dialog on the web does.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Unread = agent messages that arrived while the panel was shut.
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
    <>
      {/* Backdrop — phones only, where the panel takes the whole screen. */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[69] bg-navy-950/40 backdrop-blur-[2px] sm:hidden"
          aria-hidden="true"
        />
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-end sm:inset-x-auto sm:bottom-6 sm:right-6">
        {open && (
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-label={labels.title}
            className="pointer-events-auto flex h-[100dvh] w-screen flex-col overflow-hidden bg-white
                       shadow-2xl shadow-navy-950/30 motion-safe:animate-[chatIn_200ms_ease-out]
                       sm:mb-3 sm:h-[min(34rem,calc(100dvh-8rem))] sm:w-[24rem] sm:rounded-2xl sm:border sm:border-navy-100"
          >
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 px-4 py-3.5">
              <div
                className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-accent-500/25 blur-2xl"
                aria-hidden="true"
              />
              <div className="relative flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                  <LogoMark className="h-5 w-[4.2ch]" theme="light" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{labels.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-navy-200">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    {labels.online}
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label={labels.close}
                  className="rounded-full p-1.5 text-navy-200 transition hover:bg-white/10 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            </div>

            {started ? (
              <>
                <MessageList
                  messages={messages}
                  labels={labels}
                  locale={locale}
                  className="flex-1 bg-navy-50/40 px-3 py-3"
                />
                <Composer labels={labels} onSend={handleSend} autoFocus />
              </>
            ) : (
              <div className="flex-1 overflow-y-auto bg-navy-50/40">
                {/* An opening line from us, so the first thing a visitor sees is a
                    conversation rather than a form. */}
                <div className="flex items-end gap-2 px-4 pt-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-navy-100">
                    <LogoMark className="h-4 w-[3.4ch]" theme="light" />
                  </span>
                  <div className="max-w-[78%] rounded-2xl rounded-bl-md border border-gray-200 bg-white px-3.5 py-2 text-sm leading-relaxed text-navy-900 shadow-sm">
                    {labels.subtitle}
                  </div>
                </div>

                <form onSubmit={handleStart} className="space-y-3 p-4">
                  <label className="block text-[13px] font-semibold text-navy-800">
                    {labels.name}
                    <input name="name" required defaultValue={prefill?.name} className={field} />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-[13px] font-semibold text-navy-800">
                      {labels.email}
                      <input name="email" type="email" defaultValue={prefill?.email} className={field} />
                    </label>
                    <label className="block text-[13px] font-semibold text-navy-800">
                      {labels.phone}
                      <input name="phone" type="tel" className={field} />
                    </label>
                  </div>
                  <label className="block text-[13px] font-semibold text-navy-800">
                    {labels.cardLast4}
                    <input name="cardLast4" inputMode="numeric" maxLength={4} className={field} />
                  </label>
                  <p className="text-[11px] leading-relaxed text-gray-500">{labels.contactHint}</p>
                  <label className="block text-[13px] font-semibold text-navy-800">
                    {labels.message}
                    <textarea name="message" required rows={3} className={field} />
                  </label>
                  {error && (
                    <p role="alert" className="text-xs font-medium text-red-600">
                      {error}
                    </p>
                  )}
                  <button
                    disabled={pending}
                    className="w-full rounded-full bg-accent-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent-700/25 transition hover:bg-accent-600 disabled:opacity-60"
                  >
                    {pending ? labels.starting : labels.start}
                  </button>
                </form>
              </div>
            )}

            <p className="border-t border-gray-100 bg-white px-4 py-2 text-center text-[10.5px] leading-relaxed text-gray-400">
              {labels.securityNote}
            </p>
          </div>
        )}

        {/* Launcher */}
        <div className="pointer-events-auto flex items-end gap-2.5 px-5 pb-5 sm:px-0 sm:pb-0">
          {!open && nudge && (
            <div className="relative max-w-[15rem] rounded-2xl rounded-br-md border border-navy-100 bg-white p-3.5 pr-8 text-left shadow-xl shadow-navy-900/10 motion-safe:animate-[chatIn_260ms_ease-out]">
              <button
                onClick={dismissNudge}
                aria-label={labels.dismiss}
                className="absolute right-1.5 top-1.5 rounded-full p-1 text-gray-300 transition hover:bg-navy-50 hover:text-navy-600"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
              <button onClick={openPanel} className="block text-left">
                <p className="text-[13px] font-bold text-navy-900">{labels.greetingTitle}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-gray-600">
                  {labels.greetingBody}
                </p>
              </button>
            </div>
          )}

          {!open && !nudge && unread === 0 && (
            <button
              onClick={openPanel}
              className="hidden rounded-full border border-navy-100 bg-white px-3.5 py-2 text-[13px] font-semibold text-navy-800 shadow-lg shadow-navy-900/10 transition hover:border-accent-200 hover:text-accent-600 sm:block"
            >
              {labels.launcherPrompt}
            </button>
          )}

          <span className="relative flex shrink-0">
            {/* a slow breathing ring, so the button reads as a live channel */}
            {!open && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full bg-accent-500/45 motion-safe:animate-[nsPulseRing_2.8s_ease-out_infinite]"
              />
            )}
            <button
              onClick={() => (open ? setOpen(false) : openPanel())}
              aria-label={labels.open}
              aria-expanded={open}
              className="relative flex h-14 w-14 items-center justify-center rounded-full bg-accent-500 text-white shadow-xl shadow-accent-700/35 transition hover:bg-accent-600 hover:shadow-2xl active:scale-95"
            >
            <span className={`absolute transition-all duration-200 ${open ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"}`}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </span>
            <span className={`absolute transition-all duration-200 ${open ? "rotate-90 opacity-0" : "rotate-0 opacity-100"}`}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 20l1.1-3.4A8.5 8.5 0 1 1 21 11.5z" />
              </svg>
            </span>
              {/* an agent-online dot, the way a staffed channel signals itself */}
              {!open && unread === 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-px -right-px h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-white"
                />
              )}
              {!open && unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">
                  {unread}
                </span>
              )}
            </button>
          </span>
        </div>
      </div>
    </>
  );
}
