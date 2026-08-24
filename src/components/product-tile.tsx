import { ProductArt } from "./product-art";

// A product that isn't a payment card — savings, a mortgage, insurance. The
// artwork is drawn rather than photographed so ten products read as one system,
// and so the figure on top always has a predictable surface behind it. Same
// aspect ratio as a card, so the grid stays even.

const STATUS_TONES = {
  ok: "bg-emerald-400/95 text-emerald-950",
  pending: "bg-amber-300/95 text-amber-950",
  bad: "bg-red-400/95 text-red-950",
  muted: "bg-ink-3/80 text-fg backdrop-blur-sm",
} as const;

export type ProductTileProps = {
  /** Used for the artwork's accessible name; the visible label sits below. */
  title: string;
  art?: string | null;
  /** Bottom-left figure, e.g. a balance or what's outstanding. */
  valueLabel?: string | null;
  value?: string | null;
  status?: { label: string; tone: keyof typeof STATUS_TONES } | null;
  /** Not opened yet — the artwork sits back so the label leads. */
  placeholder?: boolean;
  /** Shown in place of the figure while the product isn't open. */
  cta?: string | null;
  /**
   * "sm" is the two-up grid on a phone: the artwork still leads, but the
   * padding and type step down so a 160px tile doesn't read as a shrunken
   * poster. Everything else is identical, so a tile is a tile at any width.
   */
  size?: "sm" | "md";
  /** Defaults to a payment card's ratio; the grid crops taller. */
  aspect?: string;
  className?: string;
};

export function ProductTile({
  title,
  art,
  valueLabel,
  value,
  status,
  placeholder = false,
  cta,
  size = "md",
  aspect = "aspect-[1.586/1]",
  className = "",
}: ProductTileProps) {
  const sm = size === "sm";
  return (
    <div
      className={`relative ${aspect} w-full overflow-hidden rounded-2xl border border-line bg-ink-1 elev-2 ${className}`}
    >
      {art && (
        <ProductArt
          art={art}
          className={`absolute inset-0 h-full w-full transition duration-500 ${
            placeholder ? "opacity-70" : "opacity-100 group-hover:scale-[1.03]"
          }`}
        />
      )}
      {/* A scrim only where something has to stay legible over the artwork. */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-0 to-transparent ${
          value || cta ? "h-2/3 via-ink-0/70" : "h-1/3 via-ink-0/25"
        }`}
      />

      <div className={`relative flex h-full flex-col justify-between ${sm ? "p-3" : "p-5"}`}>
        <div className="flex items-start justify-end">
          {status && (
            <span
              className={`shrink-0 rounded-full font-bold uppercase tracking-wide ${
                sm ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]"
              } ${STATUS_TONES[status.tone]}`}
            >
              {status.label}
            </span>
          )}
        </div>

        <div>
          {value ? (
            <>
              {valueLabel && !sm && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-muted">
                  {valueLabel}
                </p>
              )}
              <p
                className={`mt-1 font-semibold tracking-tight text-white ${
                  sm ? "text-[17px]" : "text-2xl"
                }`}
              >
                {value}
              </p>
            </>
          ) : cta ? (
            <span
              className={`inline-flex rounded-xl bg-ink-2 font-semibold text-white backdrop-blur-sm transition group-hover:bg-brand-500 ${
                sm ? "px-3 py-1.5 text-[12px]" : "px-4 py-2 text-[13px]"
              }`}
            >
              {cta}
            </span>
          ) : (
            <span className="sr-only">{title}</span>
          )}
        </div>
      </div>
    </div>
  );
}
