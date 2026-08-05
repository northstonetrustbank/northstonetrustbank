import Link from "next/link";

/**
 * Northstone brand mark: a pointy-top hexagon "stone" split by the counters of an
 * N — the bright face on the left, the deep face on the right. Paths are traced
 * from the supplied logo artwork, so this is the client's mark, not an approximation.
 *
 * theme "dark" = sitting on navy (the deep face is lifted so it stays readable),
 * theme "light" = sitting on white.
 */
export function LogoMark({
  className = "h-8 w-8",
  theme = "light",
}: {
  className?: string;
  theme?: "dark" | "light";
}) {
  const uid = theme === "dark" ? "d" : "l";
  // On navy the deepest stone tone disappears, so the deep face is lifted to navy-600/700.
  const deepTop = theme === "dark" ? "#2a6cc0" : "#013378";
  const deepBottom = theme === "dark" ? "#0d3f86" : "#04162c";

  return (
    <svg viewBox="0 0 104 124" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`ns-bright-${uid}`} x1="0" y1="0" x2="0.35" y2="1">
          <stop stopColor="#1a7ce4" />
          <stop offset="1" stopColor="#0459b4" />
        </linearGradient>
        <linearGradient id={`ns-deep-${uid}`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop stopColor={deepTop} />
          <stop offset="1" stopColor={deepBottom} />
        </linearGradient>
      </defs>
      {/* bright face — left stem of the N plus the head of its diagonal */}
      <path
        d="M52 0 L66 8 L67 12 L43 50 L35 47 L34 115 L0 95 L0 30 Z"
        fill={`url(#ns-bright-${uid})`}
      />
      {/* deep face — right stem plus the tail of the diagonal */}
      <path
        d="M73 13 L104 30 L104 95 L52 124 L48 122 L48 60 L73 75 Z"
        fill={`url(#ns-deep-${uid})`}
      />
    </svg>
  );
}

export function Logo({
  theme = "dark",
  subtitle,
  href = "/",
}: {
  theme?: "dark" | "light";
  subtitle?: string;
  href?: string | null;
}) {
  const nameColor = theme === "dark" ? "text-white" : "text-navy-900";
  const subColor = theme === "dark" ? "text-accent-100" : "text-accent-500";

  const content = (
    <span className="flex items-center gap-2.5">
      <LogoMark className="h-9 w-[30px] shrink-0" theme={theme} />
      <span className="leading-tight">
        <span className={`block text-[15px] font-bold tracking-[0.08em] ${nameColor}`}>
          NORTHSTONE
        </span>
        <span className={`block text-[9px] font-semibold uppercase tracking-[0.28em] ${subColor}`}>
          {subtitle ?? "Trust Bank"}
        </span>
      </span>
    </span>
  );

  if (href === null) return content;
  return <Link href={href}>{content}</Link>;
}
