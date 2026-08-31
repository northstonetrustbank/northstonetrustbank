"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { NavIcons, Icons } from "@/components/icons";
import { BalanceTrend, type TrendDatum } from "@/components/balance-trend";

/**
 * The top of the overview: greeting, balance, its trend, and the things a
 * client actually came to do.
 *
 * It is one navy panel rather than loose text on the page ground. The flyer
 * leads with a navy block and a gold call to action, and the balance is the one
 * figure on the page that should be impossible to miss — a heading floating on
 * the background was not carrying that.
 */

export type HeroAction = {
  href: string;
  icon: string;
  label: string;
  /** Exactly one of these is gold — the thing we most want a client to do. */
  primary?: boolean;
};

const STORAGE_KEY = "ns_hide_balance";

// Whether the balance is covered is a per-device preference: hiding it on a
// phone in public is not a request to hide it on a laptop at home. It lives in
// localStorage, read through an external store rather than an effect — the
// server snapshot is "showing", so the first paint matches what the server
// rendered and there is no flash of the wrong state.
const listeners = new Set<() => void>();

function subscribe(notify: () => void) {
  listeners.add(notify);
  // A second tab toggling it should move this one too.
  window.addEventListener("storage", notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", notify);
  };
}

function readHidden() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Private browsing, or site data blocked. Showing it is the right default.
    return false;
  }
}

function writeHidden(next: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    /* nothing to persist to; the choice still holds for this page */
  }
  // localStorage does not raise "storage" in the tab that wrote it.
  listeners.forEach((l) => l());
}

export function BalanceHero({
  greeting,
  accountLabel,
  balance,
  changePercent,
  changeLabel,
  pendingNote,
  trend,
  trendLabel,
  actions,
  hideLabel,
  showLabel,
  bleed = false,
}: {
  greeting: React.ReactNode;
  /** "Checking · ···· 5789" — which account the figure belongs to. */
  accountLabel: string;
  balance: string;
  changePercent: number | null;
  changeLabel: string;
  pendingNote: string | null;
  trend: TrendDatum[];
  trendLabel: string;
  actions: HeroAction[];
  hideLabel: string;
  showLabel: string;
  /**
   * Full-bleed: runs to the screen edges and up behind the floating header,
   * rounded only at the bottom — the immersive top of the overview. Off, it is
   * a rounded card with a shadow, for anywhere it appears inside normal
   * padding.
   */
  bleed?: boolean;
}) {
  const hidden = useSyncExternalStore(subscribe, readHidden, () => false);

  return (
    <section
      className={`rise overflow-hidden bg-[linear-gradient(158deg,#013378_0%,#04162c_46%,#020d1c_100%)] ${
        bleed
          ? ""
          : "rounded-3xl shadow-[0_18px_40px_-18px_rgba(6,21,48,0.55)]"
      }`}
    >
      {/* The sticky header now sits in-flow above this, so the greeting just
          gets normal top spacing rather than clearing a floating bar. */}
      <div className={bleed ? "px-5 pt-6 sm:px-7" : "px-5 pt-5 sm:px-7 sm:pt-6"}>
        <p className="text-[13px] font-medium text-navy-300">{greeting}</p>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-navy-300">
              {accountLabel}
            </p>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="display text-[38px] font-semibold leading-none text-white sm:text-[46px]">
                {/* Same character count either way, so nothing jumps when it
                    is covered. */}
                {hidden ? "••••••" : balance}
              </p>
              {changePercent !== null && !hidden && (
                <span
                  className={`tnum inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold ${
                    changePercent >= 0
                      ? "bg-emerald-400/15 text-emerald-300"
                      : "bg-red-400/15 text-red-300"
                  }`}
                >
                  {changePercent >= 0 ? "+" : ""}
                  {changePercent.toFixed(1)}% {changeLabel}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => writeHidden(!hidden)}
            aria-pressed={hidden}
            aria-label={hidden ? showLabel : hideLabel}
            className="shrink-0 rounded-xl p-2 text-navy-300 transition hover:bg-white/10 hover:text-white"
          >
            {hidden ? (
              <NavIcons.eyeOff className="h-[18px] w-[18px]" />
            ) : (
              <NavIcons.eye className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>

        {pendingNote && !hidden && (
          <p className="tnum mt-3 inline-block rounded-lg bg-white/10 px-3 py-1 text-xs font-medium text-navy-200">
            {pendingNote}
          </p>
        )}
      </div>

      {trend.length > 1 && !hidden && (
        <div className="mt-3">
          <BalanceTrend data={trend} label={trendLabel} onDark />
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 px-5 pb-5 pt-4 sm:flex sm:px-7 sm:pb-6">
        {actions.map((a) => (
          <Link
            key={a.href + a.label}
            href={a.href}
            className="group flex flex-col items-center gap-2 rounded-2xl py-1 text-center focus:outline-none sm:w-[4.5rem]"
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                a.primary
                  ? "bg-[#3b82f6] text-white shadow-[0_6px_16px_-6px_rgba(59,130,246,0.9)] group-hover:bg-[#2f6fed]"
                  : "bg-white/10 text-white group-hover:bg-white/20"
              }`}
            >
              {(NavIcons[a.icon] ?? Icons[a.icon] ?? NavIcons.home)({ className: "h-5 w-5" })}
            </span>
            <span className="w-full truncate text-[11px] font-medium text-navy-200 transition group-hover:text-white">
              {a.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
