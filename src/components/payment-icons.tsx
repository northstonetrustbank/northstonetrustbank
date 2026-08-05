// Generic, trademark-safe SVG icons for payment methods. Official brand marks
// (Zelle, Cash App, PayPal, Venmo, Apple Pay) can be dropped in later if the
// bank obtains the brands' partner assets.
type P = { className?: string };

const S = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Glyph({ className, char }: P & { char: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="12" y="16.5" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">
        {char}
      </text>
    </svg>
  );
}

export const PaymentIcons: Record<string, (p: P) => React.ReactElement> = {
  bank: ({ className }) => (
    <svg {...S} className={className}><path d="M3 10l9-5 9 5" /><path d="M5 10v8M10 10v8M14 10v8M19 10v8" /><path d="M3 21h18" /></svg>
  ),
  ach: ({ className }) => (
    <svg {...S} className={className}><rect x="3" y="5" width="7" height="7" rx="1" /><rect x="14" y="12" width="7" height="7" rx="1" /><path d="M10 8h5a2 2 0 0 1 2 2v2" /></svg>
  ),
  wire: ({ className }) => (
    <svg {...S} className={className}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21" /><path d="M7 8l-2 2 2 2" /></svg>
  ),
  zelle: ({ className }) => (
    <svg {...S} className={className}><circle cx="12" cy="12" r="9" /><path d="M12 5v14M8.5 9h7l-7 6h7" /></svg>
  ),
  cashapp: (p) => <Glyph {...p} char="$" />,
  venmo: ({ className }) => (
    <svg {...S} className={className}><path d="M4 5h5a2 2 0 0 1 2 2v9M17 5c1 1.5 1.5 3 1.5 5 0 3-1.5 5-3 6" /><path d="M4 5l4 12" /></svg>
  ),
  paypal: ({ className }) => (
    <svg {...S} className={className}><path d="M7 20l2-14h5a3.5 3.5 0 0 1 0 7H9" /><path d="M9.5 20l1.5-9h4a3 3 0 0 1 0 6h-4" /></svg>
  ),
  applepay: ({ className }) => (
    <svg {...S} className={className}><rect x="2.5" y="6" width="19" height="12" rx="3" /><path d="M2.5 10h19" /><path d="M8 15h3" /></svg>
  ),
  check: ({ className }) => (
    <svg {...S} className={className}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M6 14h5M14 14h4M6 10h8" /></svg>
  ),
  cashier: ({ className }) => (
    <svg {...S} className={className}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M6 10h6M6 14h4" /><path d="M17 9l1.6 1 1.6-1v2.2c0 1.4-1 2.2-1.6 2.6-.6-.4-1.6-1.2-1.6-2.6z" /></svg>
  ),
  usdt: (p) => <Glyph {...p} char="₮" />,
  btc: (p) => <Glyph {...p} char="₿" />,
  other: ({ className }) => (
    <svg {...S} className={className}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" /></svg>
  ),
};

export function PaymentIcon({ icon, className }: { icon: string; className?: string }) {
  const Cmp = PaymentIcons[icon] ?? PaymentIcons.bank;
  return <Cmp className={className} />;
}
