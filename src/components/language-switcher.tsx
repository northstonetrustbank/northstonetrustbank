"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { LOCALES, type Locale } from "@/i18n";
import { setLocaleAction } from "@/lib/actions/locale-actions";

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" />
    </svg>
  );
}

export function LanguageSwitcher({
  current,
  variant = "dark",
}: {
  current: Locale;
  variant?: "dark" | "light";
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const buttonCls =
    variant === "dark"
      ? "text-white hover:bg-white/10"
      : "text-navy-800 hover:bg-navy-50";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Language"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 w-9 items-center justify-center rounded-full transition ${buttonCls} disabled:opacity-60`}
      >
        <GlobeIcon className="h-[19px] w-[19px]" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-20 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl shadow-navy-900/10">
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setOpen(false);
                if (l !== current) startTransition(() => setLocaleAction(l));
              }}
              className={`flex w-full items-center justify-between px-3.5 py-2 text-[13px] font-bold tracking-wide transition hover:bg-navy-50 ${
                l === current ? "text-accent-600" : "text-navy-800"
              }`}
            >
              {l.toUpperCase()}
              {l === current && <span className="text-accent-600">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
