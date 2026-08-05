"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LogoMark } from "./logo";

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
  today: string;
  yesterday: string;
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

/** "Today" / "Yesterday" / a written date, for the separators between days. */
function dayOf(iso: string, locale: string, labels: ThreadLabels) {
  const d = new Date(iso);
  const midnight = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((midnight(new Date()) - midnight(d)) / 86_400_000);
  if (days === 0) return labels.today;
  if (days === 1) return labels.yesterday;
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: days > 300 ? "numeric" : undefined,
    }).format(d);
  } catch {
    return "";
  }
}

const sameDay = (a: string, b: string) =>
  new Date(a).toDateString() === new Date(b).toDateString();

/** The agent's face — the Northstone mark, not a letter. */
function AgentAvatar({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-navy-100 ${className}`}
    >
      <LogoMark className="h-4 w-[3.4ch]" theme="light" />
    </span>
  );
}

function TypingBubble({ label }: { label: string }) {
  return (
    <div className="flex items-end gap-2">
      <AgentAvatar />
      <div className="rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <span className="sr-only">{label}</span>
        <span className="flex gap-1" aria-hidden="true">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy-300 [animation-delay:-0.32s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy-300 [animation-delay:-0.16s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy-300" />
        </span>
      </div>
    </div>
  );
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

  // Jump to the newest message. useLayoutEffect so it happens before paint and
  // the panel never flashes at the top of a long conversation.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, awaitingReply]);

  return (
    <div ref={scrollRef} className={`overflow-y-auto ${className}`}>
      {messages.length === 0 && (
        <p className="px-6 py-10 text-center text-sm leading-relaxed text-gray-500">
          {labels.empty}
        </p>
      )}

      <div className="space-y-1">
        {messages.map((m, i) => {
          const mine = m.sender === "VISITOR";
          const prev = messages[i - 1];
          const next = messages[i + 1];
          // Group runs from the same sender: the avatar and name go on the
          // first of a run, the timestamp on the last.
          const startsRun = !prev || prev.sender !== m.sender || !sameDay(prev.at, m.at);
          const endsRun = !next || next.sender !== m.sender || !sameDay(next.at, m.at);
          const newDay = !prev || !sameDay(prev.at, m.at);

          return (
            <div key={`${m.at}-${i}`}>
              {newDay && (
                <div className="flex items-center gap-3 px-1 py-3">
                  <span className="h-px flex-1 bg-navy-100" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {dayOf(m.at, locale, labels)}
                  </span>
                  <span className="h-px flex-1 bg-navy-100" />
                </div>
              )}

              <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {!mine &&
                  (endsRun ? <AgentAvatar /> : <span className="h-7 w-7 shrink-0" aria-hidden />)}

                <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  {!mine && startsRun && (
                    <p className="mb-1 ml-1 text-[11px] font-semibold text-navy-700">
                      {labels.agent}
                    </p>
                  )}
                  <div
                    className={`px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                      mine
                        ? `bg-accent-500 text-white ${
                            endsRun ? "rounded-2xl rounded-br-md" : "rounded-2xl"
                          }`
                        : `border border-gray-200 bg-white text-navy-900 ${
                            endsRun ? "rounded-2xl rounded-bl-md" : "rounded-2xl"
                          }`
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  </div>
                  {endsRun && (
                    <p
                      className={`mt-1 text-[10px] text-gray-400 ${mine ? "mr-1" : "ml-1"}`}
                    >
                      {timeOf(m.at, locale)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {awaitingReply && (
        <div className="pt-2">
          <TypingBubble label={labels.waiting} />
        </div>
      )}
    </div>
  );
}

/** Composer with Enter to send, Shift+Enter for a new line, and auto-grow. */
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

  // Grow with the content up to a ceiling, then scroll inside.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  function submit() {
    const body = value.trim();
    if (!body) return;
    onSend(body);
    setValue("");
    ref.current?.focus();
  }

  const canSend = value.trim().length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 border-t border-gray-100 bg-white px-3 py-2.5"
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
        aria-label={labels.placeholder}
        className="max-h-[120px] flex-1 resize-none rounded-2xl border border-gray-200 bg-navy-50/50 px-4 py-2.5 text-sm text-navy-900 placeholder:text-gray-400 focus:border-accent-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/20"
      />
      <button
        type="submit"
        disabled={!canSend}
        aria-label={labels.send}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
          canSend
            ? "bg-accent-500 text-white shadow-md shadow-accent-700/25 hover:bg-accent-600"
            : "bg-navy-100 text-navy-300"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px] translate-x-[1px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      </button>
    </form>
  );
}
