"use client";

import { useState } from "react";

// Password field with a show/hide eye toggle.
export function PasswordInput({
  name,
  required,
  minLength,
  className,
  autoComplete,
}: {
  name: string;
  required?: boolean;
  minLength?: number;
  className?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative block">
      <input
        name={name}
        type={show ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className={`${className ?? ""} pr-11`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide" : "Show"}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-fg-faint hover:text-fg-muted"
      >
        {show ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
            <path d="M9.9 4.2A9.7 9.7 0 0112 4c5 0 9 4.5 10 8-.3 1-1 2.3-2 3.5M6.1 6.1C4 7.4 2.6 9.4 2 12c1 3.5 5 8 10 8 1.4 0 2.7-.3 3.9-.8" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </span>
  );
}
