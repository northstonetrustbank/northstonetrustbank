"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { sender: string; body: string; at: string };

export function AdminChatConsole({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function poll() {
    try {
      const r = await fetch(`/api/chat/admin?conversationId=${conversationId}`, { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setMessages(d.messages);
      }
    } catch {
      // ignore transient errors
    }
  }

  useEffect(() => {
    poll();
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("body") as HTMLInputElement;
    const body = input.value.trim();
    if (!body) return;
    input.value = "";
    setMessages((m) => [...m, { sender: "ADMIN", body, at: new Date().toISOString() }]);
    await fetch("/api/chat/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, body }),
    });
    poll();
  }

  return (
    <>
      <div ref={scrollRef} className="h-[52vh] space-y-3 overflow-y-auto bg-ink-2/40 p-4">
        {messages.map((m, i) => (
          <div key={i} className={m.sender === "ADMIN" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                m.sender === "ADMIN"
                  ? "rounded-br-sm bg-brand-500 text-white"
                  : "rounded-bl-sm border border-line bg-ink-1 text-fg"
              }`}
            >
              <p className="whitespace-pre-line">{m.body}</p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-line-soft p-3">
        <input
          name="body"
          autoComplete="off"
          placeholder="Type your reply…"
          className="flex-1 rounded-xl border border-line bg-ink-2 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        />
        <button className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-400">
          Send
        </button>
      </form>
    </>
  );
}
