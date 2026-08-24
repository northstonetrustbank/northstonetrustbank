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

// --- app shell navigation + controls ---
export const NavIcons: Record<string, (p: IconProps) => React.ReactElement> = {
  home: ({ className }) => (
    <svg {...base} className={className}><path d="M4 10.5 12 4l8 6.5" /><path d="M6 9.5V20h12V9.5" /><path d="M10 20v-5h4v5" /></svg>
  ),
  wallet: ({ className }) => (
    <svg {...base} className={className}><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H17a2 2 0 0 1 2 2v1" /><rect x="3" y="7.5" width="18" height="12" rx="2" /><path d="M16 13.5h3" /></svg>
  ),
  list: ({ className }) => (
    <svg {...base} className={className}><path d="M4 7h16M4 12h16M4 17h10" /></svg>
  ),
  exchange: ({ className }) => (
    <svg {...base} className={className}><path d="M4 9h13l-3-3" /><path d="M20 15H7l3 3" /></svg>
  ),
  chat: ({ className }) => (
    <svg {...base} className={className}><path d="M20 12a7 7 0 0 1-7 7H8l-4 3v-4.2A7 7 0 0 1 11 5h2a7 7 0 0 1 7 7z" /></svg>
  ),
  gear: ({ className }) => (
    <svg {...base} className={className}><circle cx="12" cy="12" r="3" /><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
  ),
  logout: ({ className }) => (
    <svg {...base} className={className}><path d="M9 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" /><path d="M15 8l4 4-4 4M19 12H9" /></svg>
  ),
  menu: ({ className }) => (
    <svg {...base} className={className}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
  ),
  close: ({ className }) => (
    <svg {...base} className={className}><path d="M6 6l12 12M18 6L6 18" /></svg>
  ),
  chevronRight: ({ className }) => (
    <svg {...base} className={className}><path d="m9 6 6 6-6 6" /></svg>
  ),
  plus: ({ className }) => (
    <svg {...base} className={className}><path d="M12 5v14M5 12h14" /></svg>
  ),
  arrowUp: ({ className }) => (
    <svg {...base} className={className}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
  ),
  arrowDown: ({ className }) => (
    <svg {...base} className={className}><path d="M12 5v14M6 13l6 6 6-6" /></svg>
  ),
  snowflake: ({ className }) => (
    <svg {...base} className={className}><path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" /><path d="M12 6.5 10 4.5M12 6.5l2-2M12 17.5l-2 2M12 17.5l2 2" /></svg>
  ),
  lock: ({ className }) => (
    <svg {...base} className={className}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
  ),
  device: ({ className }) => (
    <svg {...base} className={className}><rect x="3" y="5" width="13" height="10" rx="2" /><path d="M2 19h13" /><rect x="17" y="9" width="5" height="10" rx="1.5" /></svg>
  ),
  download: ({ className }) => (
    <svg {...base} className={className}><path d="M12 4v10M8 10l4 4 4-4" /><path d="M5 19h14" /></svg>
  ),
  clock: ({ className }) => (
    <svg {...base} className={className}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 1.8" /></svg>
  ),
  vault: ({ className }) => (
    <svg {...base} className={className}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="12" cy="12" r="3.6" /><path d="M12 8.4V6.8M12 17.2v-1.6M15.6 12h1.6M6.8 12h1.6" /></svg>
  ),
  send: ({ className }) => (
    <svg {...base} className={className}><path d="M20.5 3.5 11 13" /><path d="M20.5 3.5 14.5 20.5l-3.5-7.5-7.5-3.5z" /></svg>
  ),
  bank: ({ className }) => (
    <svg {...base} className={className}><path d="M4 10h16" /><path d="M12 4 4 8h16z" /><path d="M6.5 10v7M10.5 10v7M13.5 10v7M17.5 10v7" /><path d="M4 20h16" /></svg>
  ),
  swap: ({ className }) => (
    <svg {...base} className={className}><path d="M4 8h11a3 3 0 0 1 0 6" /><path d="M7 5 4 8l3 3" /><path d="M20 16H9a3 3 0 0 1 0-6" /><path d="M17 19l3-3-3-3" /></svg>
  ),
  target: ({ className }) => (
    <svg {...base} className={className}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></svg>
  ),
  chevronLeft: ({ className }) => (
    <svg {...base} className={className}><path d="m15 6-6 6 6 6" /></svg>
  ),
  bill: ({ className }) => (
    <svg {...base} className={className}><path d="M6 3h12v17l-2.5-1.5L13 20l-2.5-1.5L8 20l-2-1.5z" /><path d="M9.5 8h5M9.5 12h5" /></svg>
  ),
  ticket: ({ className }) => (
    <svg {...base} className={className}><path d="M4 9V7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a2.5 2.5 0 0 0 0 5v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a2.5 2.5 0 0 0 0-5z" /><path d="M13 6v3M13 13v5" /></svg>
  ),
};
