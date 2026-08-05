"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsReadAction } from "@/lib/actions/broadcast-actions";

export type NotifItem = {
  id: string;
  title: string;
  body: string;
  unread: boolean;
  time: string;
};

function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10.5 20a1.8 1.8 0 0 0 3 0" />
    </svg>
  );
}

export function NotificationCenter({
  items,
  labels,
}: {
  items: NotifItem[];
  labels: { title: string; empty: string; dismiss: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<NotifItem[]>([]);
  const [, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const unread = items.filter((i) => i.unread);

  // Pop up unread notifications on entry, retire after 10 seconds.
  useEffect(() => {
    if (unread.length > 0) {
      setToast(unread);
      const tm = setTimeout(() => setToast([]), 10000);
      return () => clearTimeout(tm);
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function togglePanel() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && unread.length > 0) {
      startTransition(async () => {
        await markNotificationsReadAction();
        router.refresh();
      });
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={togglePanel}
        aria-label={labels.title}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
      >
        <BellIcon className="h-[19px] w-[19px]" />
        {unread.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
            {unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-navy-900/10">
          <p className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-navy-900">
            {labels.title}
          </p>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">{labels.empty}</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className="border-b border-gray-50 px-4 py-3 last:border-0">
                  <p className="text-sm font-semibold text-navy-900">{n.title}</p>
                  <p className="mt-0.5 whitespace-pre-line text-[13px] leading-relaxed text-gray-600">
                    {n.body}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-400">{n.time}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Login popup toast */}
      {toast.length > 0 && (
        <div className="fixed right-4 top-20 z-[60] w-80 space-y-3">
          {toast.map((n) => (
            <div
              key={n.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xl shadow-navy-900/15"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-navy-900">{n.title}</p>
                <button
                  onClick={() => setToast((t) => t.filter((x) => x.id !== n.id))}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label={labels.dismiss}
                >
                  ✕
                </button>
              </div>
              <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-gray-600">
                {n.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
