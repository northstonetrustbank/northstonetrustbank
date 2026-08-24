import Link from "next/link";
import { Icons, NavIcons } from "@/components/icons";

/* The shared surface vocabulary. Every panel, chip and control in the signed-in
   app is built from these, so a surface changes in one file rather than forty. */

/** A raised panel — the base surface for everything inside the shell. */
export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`elev-2 rounded-2xl border border-line bg-ink-1 ${
        padded ? "p-5 sm:p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** Section heading with an optional link on the right ("View all"). */
export function SectionHead({
  title,
  subtitle,
  href,
  linkLabel,
  className = "",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-fg">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-fg-muted">{subtitle}</p>}
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="shrink-0 text-[13px] font-medium text-brand-400 transition hover:text-fg"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

/** The small uppercase label above a figure. */
export function Eyebrow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-faint ${className}`}
    >
      {children}
    </p>
  );
}

export type Tone = "ok" | "pending" | "bad" | "muted" | "info";

const TONE_DOT: Record<Tone, string> = {
  ok: "bg-pos",
  pending: "bg-amber-400",
  bad: "bg-neg",
  muted: "bg-fg-faint",
  info: "bg-brand-400",
};

const TONE_CHIP: Record<Tone, string> = {
  ok: "bg-pos/12 text-pos",
  pending: "bg-amber-400/12 text-amber-300",
  bad: "bg-neg/12 text-neg",
  muted: "bg-ink-3 text-fg-muted",
  info: "bg-brand-500/12 text-brand-400",
};

/** Status pill, e.g. "Active", "Under review". */
export function StatusChip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold ${TONE_CHIP[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} aria-hidden="true" />
      {children}
    </span>
  );
}

/** A labelled figure. */
export function StatTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className="elev-1 rounded-2xl border border-line bg-ink-1 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-[12px] font-medium text-fg-muted">
        {tone && <span className={`h-2 w-2 rounded-full ${TONE_DOT[tone]}`} aria-hidden="true" />}
        {label}
      </p>
      <p className="display mt-1.5 text-xl font-semibold text-fg">{value}</p>
      {hint && <p className="mt-1 text-[12px] text-fg-faint">{hint}</p>}
    </div>
  );
}

/**
 * The row of action tiles beneath the balance — an icon in a raised well with
 * its label under it, which is how a phone banking app offers its verbs.
 */
export function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  const draw = NavIcons[icon] ?? Icons[icon] ?? NavIcons.home;
  return (
    <Link
      href={href}
      // Fills its cell in the phone grid; back to a fixed width in the row
      // that a wider screen has room for.
      className="group flex w-full flex-col items-center gap-2 rounded-2xl py-1 text-center focus:outline-none sm:w-[4.25rem] sm:shrink-0 sm:py-0"
    >
      <span className="elev-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-1 transition group-hover:bg-ink-2 group-focus-visible:ring-2 group-focus-visible:ring-brand-500">
        {draw({ className: "h-5 w-5 text-brand-400" })}
      </span>
      <span className="w-full truncate text-[11px] font-medium text-fg-muted transition group-hover:text-fg">
        {label}
      </span>
    </Link>
  );
}

/** Page tabs — an underline rail that scrolls rather than wrapping. */
export function Tabs({
  items,
}: {
  items: { key: string; href: string; label: string; active: boolean; dot?: boolean }[];
}) {
  return (
    <div className="no-scrollbar -mx-5 overflow-x-auto border-b border-line px-5 sm:-mx-8 sm:px-8">
      <nav className="flex min-w-max gap-6">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-3 pt-1 text-sm font-medium transition ${
              item.active
                ? "border-brand-500 text-fg"
                : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            {item.label}
            {item.dot && (
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" aria-hidden="true" />
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** A back link that uses a chevron rather than a text arrow. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-brand-400 transition hover:text-fg"
    >
      {NavIcons.chevronLeft({ className: "h-4 w-4" })}
      {children}
    </Link>
  );
}

/** Primary and secondary buttons, as links. */
export function ActionButton({
  href,
  icon,
  children,
  variant = "solid",
}: {
  href: string;
  icon?: string;
  children: React.ReactNode;
  variant?: "solid" | "ghost";
}) {
  const draw = icon ? (NavIcons[icon] ?? Icons[icon]) : null;
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
        variant === "solid"
          ? "bg-brand-500 text-white hover:bg-brand-400"
          : "border border-line bg-ink-1 text-fg hover:bg-ink-2"
      }`}
    >
      {draw && draw({ className: "h-4 w-4" })}
      {children}
    </Link>
  );
}

/** Empty-state block for lists with nothing in them yet. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-ink-1/50 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-fg">{title}</p>
      {body && (
        <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-fg-muted">{body}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Thin progress bar — repayment progress, savings goals, bonus funding. */
export function ProgressBar({
  percent,
  tone = "info",
  className = "",
}: {
  percent: number;
  tone?: Tone;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-ink-3 ${className}`}>
      <div
        className={`h-full rounded-full transition-all ${TONE_DOT[tone]}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/* Form controls, exported as class strings so plain <input> elements in server
   components stay plain rather than needing a wrapper for every field. */
export const fieldClass =
  "w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-[15px] text-fg placeholder:text-fg-faint transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";
export const labelClass = "block text-[13px] font-medium text-fg-muted";
export const btnPrimary =
  "rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-60";
export const btnGhost =
  "rounded-xl border border-line bg-ink-1 px-5 py-2.5 text-sm font-semibold text-fg transition hover:bg-ink-2";
