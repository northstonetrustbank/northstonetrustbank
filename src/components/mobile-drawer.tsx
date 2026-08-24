"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NavIcons } from "@/components/icons";

/**
 * The slide-over navigation for phones and small tablets. The nav itself is
 * rendered on the server and handed in as children, so the drawer and the
 * desktop sidebar can never drift apart.
 *
 * The panel is portalled to <body>. It has to be: the button sits inside a
 * header that uses backdrop-blur, and a backdrop-filter makes its element the
 * containing block for any position:fixed descendant — which pinned the drawer
 * inside a 64px bar and let its contents spill over the page with no surface
 * behind them.
 */
export function MobileDrawer({
  children,
  openLabel,
  closeLabel,
}: {
  children: React.ReactNode;
  openLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);

  // Close on Escape, and stop the page behind scrolling while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const panel = (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label={closeLabel}
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-line bg-ink-0 shadow-2xl">
        <div className="flex items-center justify-end px-3 py-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={closeLabel}
            className="rounded-xl p-2 text-fg-muted transition hover:bg-ink-2"
          >
            <NavIcons.close className="h-5 w-5" />
          </button>
        </div>
        {/* Closing on click is what makes a nav link feel right, but it must
            not swallow a control that stays put — the language buttons — and
            it must never close over a form. Closing unmounts this portal, and
            unmounting a <form> mid-click removes it before its action can
            dispatch: that is what stopped Sign out working on a phone. Its
            redirect tears the drawer down anyway. */}
        <div
          className="min-h-0 flex-1 overflow-y-auto pb-6"
          onClick={(e) => {
            const el = e.target as HTMLElement;
            if (el.closest("form")) return;
            if (el.closest("a,[data-close-drawer]")) setOpen(false);
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={openLabel}
        className="rounded-xl p-2 text-fg-muted transition hover:bg-ink-2 lg:hidden"
      >
        <NavIcons.menu className="h-5 w-5" />
      </button>

      {open && createPortal(panel, document.body)}
    </>
  );
}
