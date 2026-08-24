import { NavIcons } from "@/components/icons";

/**
 * Where a pending thing has got to. A client who has just handed over money is
 * owed more than a chip that says "Pending" — this says which step is done,
 * which is happening now, and what is still to come.
 */
export type TrailStep = {
  label: string;
  /** Timestamp for a step already behind us. */
  at?: string | null;
  state: "done" | "current" | "todo" | "failed";
};

export function StatusTrail({ steps }: { steps: TrailStep[] }) {
  return (
    <ol className="relative">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const done = step.state === "done";
        const failed = step.state === "failed";
        const current = step.state === "current";

        return (
          <li key={step.label} className="relative flex gap-3.5 pb-5 last:pb-0">
            {/* The line joining this step to the next */}
            {!last && (
              <span
                className={`absolute left-[11px] top-6 h-[calc(100%-1.5rem)] w-px ${
                  done ? "bg-brand-500/50" : "bg-line"
                }`}
                aria-hidden="true"
              />
            )}

            <span
              className={`relative z-10 mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ${
                failed
                  ? "bg-neg/15 text-neg"
                  : done
                    ? "bg-brand-500 text-white"
                    : current
                      ? "bg-brand-500/15 text-brand-400 ring-2 ring-brand-500/30"
                      : "bg-ink-3 text-fg-faint"
              }`}
            >
              {failed ? (
                <NavIcons.close className="h-3 w-3" />
              ) : done ? (
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              )}
            </span>

            <div className="min-w-0 pt-0.5">
              <p
                className={`text-[13px] font-medium ${
                  failed ? "text-neg" : done || current ? "text-fg" : "text-fg-faint"
                }`}
              >
                {step.label}
              </p>
              {step.at && <p className="tnum mt-0.5 text-[12px] text-fg-faint">{step.at}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
