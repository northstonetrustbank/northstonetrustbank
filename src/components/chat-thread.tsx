"use client";

import { useEffect, useRef, useState } from "react";

// The conversation itself, shared by the floating widget on the public site and
// the docked support panel inside an account. Same messages, same API, two
// different frames around it.

export type ChatMsg = { sender: string; body: string; at: string };

export type ThreadLabels = {
  agent: string;
  you: string;
  placeholder: string;
  send: string;
  waiting: string;
  empty: string;
};

export function useChatPolling(active: boolean, intervalMs = 4000) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [started, setStarted] = useState<boolean | null>(null);

  async function poll() {
    try {
      const r = await fetch("/api/chat/poll", { cache: "no-store" });
      const d = await r.json();
      setStarted(Boolean(d.conversation));
      if (d.conversation) setMessages(d.messages);
    } catch {
      setStarted((s) => s ?? false);
    }
  }

  useEffect(() => {
    poll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(poll, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, intervalMs]);

  return { messages, setMessages, started, setStarted, poll };
}

function timeOf(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(
      new Date(iso)
    );
  } catch {
    return "";
  }
}

export function MessageList({
  messages,
  labels,
  locale,
  className = "",
}: {
  messages: ChatMsg[];
  labels: ThreadLabels;
  locale: string;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const awaitingReply =
    messages.length > 0 && messages[messages.length - 1].sender === "VISITOR";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div ref={scrollRef} className={`space-y-3 overflow-y-auto ${className}`}>
      {messages.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-500">{labels.empty}</p>
      )}
      {messages.map((m, i) => {
        const mine = m.sender === "VISITOR";
        return (
          <div key={`${m.at}-${i}`} className={mine ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[82%] ${mine ? "text-right" : "text-left"}`}>
              {!mine && (
                <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-accent-600">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent-500 text-[8px] text-white">
                    T
                  </span>
                  {labels.agent}
                </p>
              )}
              <div
                className={`inline-block rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  mine
                    ? "rounded-br-sm bg-accent-500 text-white"
                    : "rounded-bl-sm border border-gray-200 bg-white text-navy-900"
                }`}
              >
                <p className="whitespace-pre-line text-left">{m.body}</p>
              </div>
              <p className="mt-1 text-[10px] text-gray-400">{timeOf(m.at, locale)}</p>
            </div>
          </div>
        );
      })}

      {awaitingReply && (
        <p className="flex items-center justify-center gap-2 pt-1 text-[11px] text-gray-500">
          <span className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
          </span>
          {labels.waiting}
        </p>
      )}
    </div>
  );
}

/** Composer with Enter to send and Shift+Enter for a new line. */
export function Composer({
  labels,
  onSend,
  autoFocus = false,
}: {
  labels: ThreadLabels;
  onSend: (body: string) => void;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const body = value.trim();
    if (!body) return;
    onSend(body);
    setValue("");
    ref.current?.focus();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 border-t border-gray-100 bg-white p-3"
    >
      <textarea
        ref={ref}
        rows={1}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={labels.placeholder}
        className="max-h-28 flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-2.5 text-sm text-navy-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        aria-label={labels.send}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white transition hover:bg-accent-600 disabled:opacity-40"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      </button>
    </form>
  );
}
