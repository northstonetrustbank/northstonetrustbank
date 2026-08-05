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

// Built on the brand palette in globals.css — navy-800 #062A52, navy-900
// #04162C, navy-950 #020D1C, accent-500 #046BD4 — so the cards belong to the
// same system as the rest of the site rather than approximating it.
const FACES: Record<CardTheme, Face> = {
  BLUE: {
    background:
      "radial-gradient(120% 140% at 78% 8%, rgba(4,107,212,0.42) 0%, rgba(4,107,212,0) 58%)," +
      "linear-gradient(146deg,#0F4383 0%,#062A52 46%,#04162C 78%,#020D1C 100%)",
    ink: "#EFF5FC",
    inkSoft: "#8BB4E4",
    chip: "#E4C56B",
    chipLine: "#B9973A",
    ring: "#046BD4",
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
    // A real card's details are proportional to the card, and this one has a
    // fixed aspect ratio — so sizing the contents in pixels meant that once the
    // card got narrow (a tier picker, a two-up grid) the height shrank while the
    // text did not, and the bottom row was clipped by overflow-hidden. Everything
    // inside is now expressed in cqw — percentages of the card's own width — so
    // the face is identical at any size.
    <div
      className={`relative aspect-[1.586/1] w-full overflow-hidden rounded-2xl shadow-lg shadow-navy-900/20 ${className}`}
      style={{ background: face.background, containerType: "inline-size" }}
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

      {/* The padding lives here, not on the card. An element that declares
          container-type cannot resolve its OWN cqw units — those fall back to the
          viewport — so padding set on the card came out identical (and far too
          large) at every card size, squeezing the cardholder name out of view.
          This div is a child of the container, so its cqw resolves correctly. */}
      <div
        className="relative flex h-full flex-col justify-between"
        style={{ padding: "7.3cqw" }}
      >
        <div className="flex items-start justify-between" style={{ gap: "4.4cqw" }}>
          <div>
            <p
              className="font-semibold uppercase tracking-[0.2em]"
              style={{ color: face.ink, fontSize: "4.8cqw", lineHeight: 1.15 }}
            >
              Northstone
            </p>
            <p
              className="font-medium uppercase tracking-[0.32em]"
              style={{ color: face.inkSoft, fontSize: "2.9cqw", lineHeight: 1.3, marginTop: "0.5cqw" }}
            >
              Trust Bank
            </p>
          </div>
          {badge && (
            <span
              className="font-semibold uppercase tracking-[0.2em]"
              style={{ color: face.ink, fontSize: "3.7cqw", lineHeight: 1.2 }}
            >
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-center" style={{ gap: "4.4cqw" }}>
          {/* chip — flat gold reads as plastic, so it gets a lit top half,
              a shaded lower half and proper contact pads */}
          <svg style={{ width: "14cqw", height: "10.7cqw" }} viewBox="0 0 38 29" aria-hidden="true">
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
          {/* contactless */}
          <svg style={{ width: "6.6cqw", height: "8.1cqw" }} viewBox="0 0 18 22" aria-hidden="true">
            <path
              d="M3 7 a9 9 0 0 1 0 8 M8 4 a14 14 0 0 1 0 14"
              fill="none"
              stroke={face.inkSoft}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <p
          className="font-mono tracking-[0.1em]"
          style={{ color: face.ink, fontSize: "5.6cqw", lineHeight: 1.25, minHeight: "1.25em" }}
        >
          {placeholder ? "••••  ••••  ••••  ••••" : formatCardNumber(number, masked)}
        </p>

        <div className="flex items-end justify-between" style={{ gap: "4.4cqw" }}>
          <div className="min-w-0">
            <p
              className="truncate font-semibold uppercase tracking-[0.16em]"
              style={{ color: face.ink, fontSize: "3.7cqw", lineHeight: 1.25 }}
            >
              {holder || holderPlaceholder}
            </p>
            <p
              className="truncate uppercase tracking-[0.16em]"
              style={{ color: face.inkSoft, fontSize: "3.3cqw", lineHeight: 1.3, marginTop: "0.5cqw" }}
            >
              {expiry ? `Valid thru ${expiry}` : productName}
            </p>
          </div>
          {value ? (
            <div className="shrink-0 text-right">
              {valueLabel && (
                <p
                  className="uppercase tracking-[0.16em]"
                  style={{ color: face.inkSoft, fontSize: "2.9cqw", lineHeight: 1.3 }}
                >
                  {valueLabel}
                </p>
              )}
              <p className="font-semibold" style={{ color: face.ink, fontSize: "5.1cqw", lineHeight: 1.25 }}>
                {value}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {status && (
        <span
          className={`absolute top-1/2 -translate-y-1/2 rounded-full font-bold uppercase tracking-wide ${STATUS_TONES[status.tone]}`}
          style={{ right: "5.5cqw", fontSize: "3.4cqw", padding: "1.2cqw 3cqw", lineHeight: 1.2 }}
        >
          {status.label}
        </span>
      )}
    </div>
  );
}
