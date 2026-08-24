"use client";

import { useState } from "react";
import { requestMethodAction } from "@/lib/actions/method-actions";

export function RequestMethod({
  labels,
}: {
  labels: { prompt: string; placeholder: string; send: string; sent: string };
}) {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <p className="mt-6 rounded-lg border border-pos/25 bg-pos/10 px-3.5 py-2.5 text-sm text-pos">
        {labels.sent}
      </p>
    );
  }

  return (
    <form
      action={async (fd) => {
        await requestMethodAction(fd);
        setSent(true);
      }}
      className="mt-6 border-t border-line-soft pt-5"
    >
      <p className="text-[13px] font-semibold text-fg">{labels.prompt}</p>
      <div className="mt-2 flex gap-2">
        <input
          name="wanted"
          required
          placeholder={labels.placeholder}
          className="flex-1 rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        />
        <button className="shrink-0 whitespace-nowrap rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400">
          {labels.send}
        </button>
      </div>
    </form>
  );
}
