import type { CardTheme } from "@/lib/products";

// A physical-looking Northstone card face. Used everywhere a product is shown:
// the dashboard grid, the product page, and the apply flow. Products the client
// hasn't opened yet render the blue Northstone card with placeholder details.

type Face = {
  background: string;
  ink: string; // primary text
  inkSoft: string; // secondary text
  chip: string;
  chipLine: string;
  ring: string; // decorative arc colour
  /** Diagonal gloss band, the thing that makes a flat fill read as a card. */
  sheen: string;
  /** Lit top edge and shadowed bottom edge, so the card has thickness. */
  edge: string;
};

// Built on the brand palette in globals.css — navy-800 #0a1f3d, navy-900
// #061530, navy-950 #030c1f, accent-500 #2f6fed — so the cards belong to the
// same system as the rest of the site rather than approximating it.
const FACES: Record<CardTheme, Face> = {
  BLUE: {
    background:
      "radial-gradient(120% 140% at 78% 8%, rgba(47,111,237,0.42) 0%, rgba(47,111,237,0) 58%)," +
      "linear-gradient(146deg,#173763 0%,#0a1f3d 46%,#061530 78%,#030c1f 100%)",
    ink: "#F2F5FA",
    inkSoft: "#94A8C9",
    chip: "#E4C56B",
    chipLine: "#B9973A",
    ring: "#2F6FED",
    sheen: "linear-gradient(112deg,transparent 26%,rgba(255,255,255,0.10) 44%,rgba(255,255,255,0.02) 52%,transparent 62%)",
    edge: "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.45)",
  },
  BLACK: {
    background:
      "radial-gradient(120% 140% at 78% 8%, rgba(201,162,39,0.20) 0%, rgba(201,162,39,0) 55%)," +
      "linear-gradient(146deg,#33373F 0%,#1A1D23 42%,#0D0F13 76%,#050608 100%)",
    ink: "#F5F6F8",
    inkSoft: "#9AA1AE",
    chip: "#D9C07C",
    chipLine: "#A98718",
    ring: "#C9A227",
    sheen: "linear-gradient(112deg,transparent 24%,rgba(255,255,255,0.13) 44%,rgba(255,255,255,0.03) 53%,transparent 64%)",
    edge: "inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -1px 0 rgba(0,0,0,0.6)",
  },
  GOLD: {
    background:
      "linear-gradient(146deg,#F6E7B2 0%,#E3CE84 18%,#D9B44A 38%,#C9A227 58%,#A87F1C 82%,#8C6714 100%)",
    ink: "#3A2B07",
    inkSoft: "#7A5F16",
    chip: "#FBF2D4",
    chipLine: "#9C7A18",
    ring: "#FFF4CE",
    sheen: "linear-gradient(112deg,transparent 22%,rgba(255,255,255,0.55) 42%,rgba(255,255,255,0.12) 52%,transparent 66%)",
    edge: "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(90,64,10,0.5)",
  },
  PLATINUM: {
    background:
      "linear-gradient(146deg,#FBFCFD 0%,#E1E5EB 26%,#C2C8D2 52%,#A9B0BC 74%,#8E96A4 100%)",
    ink: "#1E2229",
    inkSoft: "#5B626D",
    chip: "#E7DCB4",
    chipLine: "#9C8A50",
    ring: "#FFFFFF",
    sheen: "linear-gradient(112deg,transparent 22%,rgba(255,255,255,0.75) 42%,rgba(255,255,255,0.2) 52%,transparent 66%)",
    edge: "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(80,88,100,0.45)",
  },
};

const STATUS_TONES = {
  ok: "bg-emerald-400/90 text-emerald-950",
  pending: "bg-amber-300/95 text-amber-950",
  bad: "bg-red-400/90 text-red-950",
  muted: "bg-white/20 text-white",
} as const;

/** Groups a card number into 4s; masks all but the last four when asked. */
/**
 * A card face shrunk to a thumbnail — same gradient, sheen and lit edge as the
 * full card, with none of the detail that would turn to mush at 88px wide.
 * Used where a product needs to be recognisable in a list rather than admired.
 */
export function CardSwatch({ theme, className = "" }: { theme: CardTheme; className?: string }) {
  const face = FACES[theme];
  return (
    <span
      aria-hidden="true"
      className={`block h-full w-full ${className}`}
      style={{ background: face.background, boxShadow: face.edge }}
    >
      <span className="block h-full w-full" style={{ background: face.sheen }} />
    </span>
  );
}

export function formatCardNumber(number?: string | null, masked = false) {
  const digits = (number ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "••••  ••••  ••••  ••••";
  const groups = digits.match(/.{1,4}/g) ?? [];
  if (!masked) return groups.join("  ");
  return groups.map((g, i) => (i === groups.length - 1 ? g : "••••")).join("  ");
}

export type BankCardProps = {
  theme: CardTheme;
  /** Product name printed on the card, e.g. "Credit card". */
  productName: string;
  /** Small label top-right — the tier, or a short product word. */
  badge?: string | null;
  holder?: string | null;
  number?: string | null;
  expiry?: string | null;
  masked?: boolean;
  /** Bottom-right figure, e.g. available credit or savings balance. */
  valueLabel?: string | null;
  value?: string | null;
  status?: { label: string; tone: keyof typeof STATUS_TONES } | null;
  /** Draws the card dimmed with sample details (product not opened yet). */
  placeholder?: boolean;
  /** Name shown when there is no cardholder yet. */
  holderPlaceholder?: string;
  className?: string;
};

export function BankCard({
  theme,
  productName,
  badge,
  holder,
  number,
  expiry,
  masked = true,
  valueLabel,
  value,
  status,
  placeholder = false,
  holderPlaceholder = "Cardholder name",
  className = "",
}: BankCardProps) {
  const face = FACES[theme] ?? FACES.BLUE;

  return (
    <div
      className={`relative aspect-[1.586/1] w-full overflow-hidden rounded-2xl shadow-lg shadow-navy-900/20 ${className}`}
      style={{
        background: face.background,
        // 1cqw = 1% of this card's width, so the face scales as one piece and
        // never depends on the browser's font size.
        containerType: "inline-size",
      }}
    >
      {/* decorative arcs */}
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-20"
        style={{ background: `radial-gradient(circle, ${face.ring} 0%, transparent 70%)` }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-10 h-52 w-52 rounded-full opacity-15"
        style={{ background: `radial-gradient(circle, ${face.ring} 0%, transparent 70%)` }}
      />
      {/* gloss band sweeping across the face */}
      <div className="pointer-events-none absolute inset-0" style={{ background: face.sheen }} />
      {/* lit top edge and shadowed bottom edge — kept off the container so the
          hover shadow on the parent still applies */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ boxShadow: face.edge }}
      />

      {/* A card is fixed geometry, not a stack. Each detail is pinned to its
          own place on the face in percentages of the card, so growing the type
          can never push the holder's name off the bottom edge — which is
          exactly what a flex column with justify-between did. */}

      {/* Brand, and the tier opposite it */}
      <div
        className="absolute flex items-start justify-between gap-3"
        style={{ top: "8.5%", left: "6%", right: "6%" }}
      >
        <div className="min-w-0">
          <p
            className="font-semibold uppercase tracking-[0.2em]"
            style={{ color: face.ink, fontSize: "3.9cqw", lineHeight: 1.2 }}
          >
            Northstone
          </p>
          <p
            className="mt-0.5 font-medium uppercase tracking-[0.32em]"
            style={{ color: face.inkSoft, fontSize: "2.9cqw", lineHeight: 1.2 }}
          >
            Financial Group
          </p>
        </div>
        {badge && (
          <span
            className="shrink-0 font-semibold uppercase tracking-[0.2em]"
            style={{ color: face.ink, fontSize: "2.9cqw", lineHeight: 1.2 }}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Chip and contactless, where they sit on a real card */}
      <div className="absolute flex items-center gap-3" style={{ top: "34%", left: "6%" }}>
        {/* flat gold reads as plastic, so the chip gets a lit top half, a
            shaded lower half and proper contact pads */}
        <svg viewBox="0 0 38 29" aria-hidden="true" style={{ width: "8.8cqw", height: "6.7cqw" }}>
          <rect width="38" height="29" rx="5" fill={face.chip} />
          <path d="M0 14.5 H38 V24 a5 5 0 0 1 -5 5 H5 a5 5 0 0 1 -5 -5 Z" fill="#000" opacity="0.14" />
          <rect x="0.5" y="0.5" width="37" height="28" rx="4.5" fill="none" stroke="#FFF" strokeOpacity="0.5" />
          <g stroke={face.chipLine} strokeWidth="1.1" fill="none" opacity="0.85">
            <path d="M0 14.5 H38" />
            <path d="M13 0 V29" />
            <path d="M25 0 V29" />
            <path d="M13 7 H0 M25 7 H38 M13 22 H0 M25 22 H38" />
          </g>
        </svg>
        <svg viewBox="0 0 18 22" aria-hidden="true" style={{ width: "4.1cqw", height: "5.1cqw" }}>
          <path
            d="M3 7 a9 9 0 0 1 0 8 M8 4 a14 14 0 0 1 0 14"
            fill="none"
            stroke={face.inkSoft}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* The number */}
      <p
        className="absolute truncate font-mono tracking-[0.1em]"
        style={{
          top: "58%",
          left: "6%",
          right: "6%",
          color: face.ink,
          fontSize: "5cqw",
          lineHeight: 1.3,
        }}
      >
        {placeholder ? "\u2022\u2022\u2022\u2022  \u2022\u2022\u2022\u2022  \u2022\u2022\u2022\u2022  \u2022\u2022\u2022\u2022" : formatCardNumber(number, masked)}
      </p>

      {/* Holder, and what the card is */}
      <div className="absolute min-w-0" style={{ bottom: "9%", left: "6%", maxWidth: "50%" }}>
        <p
          className="truncate font-semibold uppercase tracking-[0.16em]"
          style={{ color: face.ink, fontSize: "3.7cqw", lineHeight: 1.25 }}
        >
          {holder || holderPlaceholder}
        </p>
        <p
          className="mt-0.5 truncate uppercase tracking-[0.16em]"
          style={{ color: face.inkSoft, fontSize: "3cqw", lineHeight: 1.25 }}
        >
          {expiry ? `Valid thru ${expiry}` : productName}
        </p>
      </div>

      {/* The figure, opposite the holder */}
      {value && (
        <div
          className="absolute min-w-0 text-right"
          style={{ bottom: "9%", right: "6%", maxWidth: "36%" }}
        >
          {valueLabel && (
            <p
              className="truncate uppercase tracking-[0.16em]"
              style={{ color: face.inkSoft, fontSize: "2.5cqw", lineHeight: 1.25 }}
            >
              {valueLabel}
            </p>
          )}
          <p
            className="tnum truncate font-semibold"
            style={{ color: face.ink, fontSize: "4.2cqw", lineHeight: 1.25 }}
          >
            {value}
          </p>
        </div>
      )}

      {status && (
        <span
          className={`absolute right-4 top-1/2 -translate-y-1/2 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${STATUS_TONES[status.tone]}`}
        >
          {status.label}
        </span>
      )}
    </div>
  );
}
