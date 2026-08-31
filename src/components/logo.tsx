import Link from "next/link";

/**
 * Northstone brand mark: a pointy-top hexagon "stone" split by the counters of an
 * N — the bright face on the left, the deep face on the right. Paths are traced
 * from the supplied logo artwork, so this is the client's mark, not an approximation.
 *
 * `onDark` is set only where the mark sits on a genuinely dark surface, where the
 * deepest stone tone disappears and the deep face has to be lifted to stay read.
 */
export function LogoMark({
  className = "h-8 w-8",
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  const uid = onDark ? "d" : "l";
  const deepTop = onDark ? "#2a6cc0" : "#013378";
  const deepBottom = onDark ? "#0d3f86" : "#04162c";

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
  onDark = false,
  subtitle,
  href = "/",
}: {
  /**
   * Set only where the logo sits on a genuinely dark surface — the marketing
   * header and footer, the legal pages, the auth shell. Everything else takes
   * its colour from the tokens, so it follows the page instead of assuming one.
   *
   * This used to be theme="dark" and defaulted to it, which is how the wordmark
   * ended up painted white on white once the app went light.
   */
  onDark?: boolean;
  subtitle?: string;
  href?: string | null;
}) {
  const nameColor = onDark ? "text-white" : "text-fg";
  const subColor = onDark ? "text-accent-100" : "text-brand-500";

  // Sizes step down on narrow phones. The signed-in header also carries a
  // language switcher and a sign-out button, and at 320px the three together
  // pushed the page wider than the screen, so it panned sideways under a thumb.
  const content = (
    <span className="flex min-w-0 items-center gap-2 sm:gap-2.5">
      <LogoMark className="h-8 w-[26px] shrink-0 sm:h-9 sm:w-[30px]" onDark={onDark} />
      <span className="min-w-0 leading-tight">
        <span
          className={`block text-[13px] font-bold tracking-[0.06em] sm:text-[15px] sm:tracking-[0.08em] ${nameColor}`}
        >
          NORTHSTONE
        </span>
        <span
          className={`block text-[8px] font-semibold uppercase tracking-[0.2em] sm:text-[9px] sm:tracking-[0.28em] ${subColor}`}
        >
          {subtitle ?? "Trust Bank"}
        </span>
      </span>
    </span>
  );

  if (href === null) return content;
  return <Link href={href}>{content}</Link>;
}
