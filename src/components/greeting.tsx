"use client";

import { useSyncExternalStore } from "react";

// The server renders in UTC, so a server-side greeting would wish a New York
// client good evening over breakfast. These read the *browser's* clock:
// useSyncExternalStore renders the server snapshot during hydration and the
// client snapshot afterwards, without a setState-in-effect round trip.

/** Nothing changes underneath us, so there is nothing to subscribe to. */
const noSubscribe = () => () => {};

export function Greeting({
  morning,
  afternoon,
  evening,
  fallback,
}: {
  morning: string;
  afternoon: string;
  evening: string;
  fallback: string;
}) {
  const text = useSyncExternalStore(
    noSubscribe,
    () => {
      const hour = new Date().getHours();
      return hour < 12 ? morning : hour < 18 ? afternoon : evening;
    },
    () => fallback
  );

  return <>{text}</>;
}

/** Today's date, formatted in the client's own timezone. */
export function TodayDate({ locale }: { locale: string }) {
  const text = useSyncExternalStore(
    noSubscribe,
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date()),
    () => ""
  );

  // Reserves its line before hydration so the header doesn't jump.
  return <span className="inline-block min-h-[1em]">{text}</span>;
}
