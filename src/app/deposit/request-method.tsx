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
      <p className="mt-6 rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-700">
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
      className="mt-6 border-t border-gray-100 pt-5"
    >
      <p className="text-[13px] font-semibold text-navy-800">{labels.prompt}</p>
      <div className="mt-2 flex gap-2">
        <input
          name="wanted"
          required
          placeholder={labels.placeholder}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
        />
        <button className="rounded-full bg-navy-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-700">
          {labels.send}
        </button>
      </div>
    </form>
  );
}
