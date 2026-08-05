"use client";

import { useState } from "react";
import { Composer, MessageList, useChatPolling, type ThreadLabels } from "@/components/chat-thread";

// The signed-in version of live chat: a docked panel rather than a floating
// bubble, and no pre-chat form — the account already tells us who they are.

export function SupportConsole({
  clientName,
  labels,
  locale,
}: {
  clientName: string;
  labels: ThreadLabels & {
    online: string;
    signedInAs: string;
    startTitle: string;
    startBody: string;
    startPlaceholder: string;
    startButton: string;
    starting: string;
  };
  locale: string;
}) {
  const { messages, setMessages, started, poll } = useChatPolling(true, 4000);
  const [pending, setPending] = useState(false);

  async function handleStart(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const field = form.elements.namedItem("message") as HTMLTextAreaElement;
    const message = field.value.trim();
    if (!message) return;
    setPending(true);
    await fetch("/api/chat/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    setPending(false);
    field.value = "";
    await poll();
  }

  async function handleSend(body: string) {
    setMessages((m) => [...m, { sender: "VISITOR", body, at: new Date().toISOString() }]);
    await fetch("/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    poll();
  }

  return (
    <div className="flex h-[min(34rem,calc(100vh-16rem))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">
            T
          </span>
          <div>
            <p className="text-sm font-semibold text-navy-900">{labels.agent}</p>
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {labels.online}
            </p>
          </div>
        </div>
        <p className="hidden text-xs text-gray-500 sm:block">
          {labels.signedInAs} <span className="font-semibold text-navy-800">{clientName}</span>
        </p>
      </div>

      {started ? (
        <>
          <MessageList
            messages={messages}
            labels={labels}
            locale={locale}
            className="flex-1 bg-navy-50/40 p-5"
          />
          <Composer labels={labels} onSend={handleSend} />
        </>
      ) : (
        <form onSubmit={handleStart} className="flex flex-1 flex-col justify-center p-6 sm:p-10">
          <h2 className="text-lg font-semibold text-navy-900">{labels.startTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{labels.startBody}</p>
          <textarea
            name="message"
            required
            rows={4}
            placeholder={labels.startPlaceholder}
            className="mt-5 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm text-navy-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
          />
          <button
            disabled={pending}
            className="mt-4 self-start rounded-full bg-accent-500 px-8 py-3 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:opacity-60"
          >
            {pending ? labels.starting : labels.startButton}
          </button>
        </form>
      )}
    </div>
  );
}
