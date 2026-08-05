// Lightweight line-SVG icon set. Each inherits color via currentColor and
// sizes with the given className. Used across product cards and benefit tiles.
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const Icons: Record<string, (p: IconProps) => React.ReactElement> = {
  // --- benefit tiles ---
  review: ({ className }) => (
    <svg {...base} className={className}><path d="M20 6 9 17l-5-5" /></svg>
  ),
  statement: ({ className }) => (
    <svg {...base} className={className}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>
  ),
  shield: ({ className }) => (
    <svg {...base} className={className}><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9.5 12l1.8 1.8 3.2-3.6" /></svg>
  ),
  globe: ({ className }) => (
    <svg {...base} className={className}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" /></svg>
  ),
  buildings: ({ className }) => (
    <svg {...base} className={className}><rect x="3" y="8" width="8" height="13" rx="1" /><rect x="13" y="3" width="8" height="18" rx="1" /><path d="M6 12h2M6 16h2M16 7h2M16 11h2M16 15h2" /></svg>
  ),
  lending: ({ className }) => (
    <svg {...base} className={className}><circle cx="12" cy="12" r="9" /><path d="M12 7v10M14.5 9.3c-.6-.7-1.5-1-2.5-1-1.4 0-2.5.8-2.5 2s1.1 1.8 2.5 1.8 2.5.6 2.5 1.8-1.1 2-2.5 2c-1 0-1.9-.3-2.5-1" /></svg>
  ),
  // --- personal products ---
  card: ({ className }) => (
    <svg {...base} className={className}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></svg>
  ),
  savings: ({ className }) => (
    <svg {...base} className={className}><circle cx="9" cy="12" r="7" /><circle cx="15" cy="12" r="7" /></svg>
  ),
  mortgage: ({ className }) => (
    <svg {...base} className={className}><path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></svg>
  ),
  insurance: ({ className }) => (
    <svg {...base} className={className}><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M12 8v6M9 11h6" /></svg>
  ),
  // --- commercial products ---
  deposit: ({ className }) => (
    <svg {...base} className={className}><path d="M12 3v10M8 9l4 4 4-4" /><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" /></svg>
  ),
  draft: ({ className }) => (
    <svg {...base} className={className}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M8 8l-2 2 2 2M16 16l2-2-2-2" /></svg>
  ),
  checking: ({ className }) => (
    <svg {...base} className={className}><circle cx="12" cy="12" r="9" /><path d="M8.5 15.5l7-7M9 9h.01M15 15h.01" /></svg>
  ),
  phone: ({ className }) => (
    <svg {...base} className={className}><path d="M6 3h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z" /></svg>
  ),
  money: ({ className }) => (
    <svg {...base} className={className}><path d="M4 19V9M9 19V5M14 19v-7M19 19v-4" /></svg>
  ),
  business: ({ className }) => (
    <svg {...base} className={className}><path d="M4 8h16l-1 12H5z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
  ),
  gift: ({ className }) => (
    <svg {...base} className={className}><rect x="4" y="9" width="16" height="11" rx="1" /><path d="M4 13h16M12 9v11" /><path d="M12 9C10 9 8 8 8 6.5A2 2 0 0 1 12 6a2 2 0 0 1 4 .5C16 8 14 9 12 9z" /></svg>
  ),
};
