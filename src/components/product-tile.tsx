import { ProductArt } from "./product-art";

// A product that isn't a payment card — savings, a mortgage, insurance. The
// artwork is drawn rather than photographed so ten products read as one system,
// and so the figure on top always has a predictable surface behind it. Same
// aspect ratio as a card, so the grid stays even.

const STATUS_TONES = {
  ok: "bg-emerald-400/95 text-emerald-950",
  pending: "bg-amber-300/95 text-amber-950",
  bad: "bg-red-400/95 text-red-950",
  muted: "bg-white/25 text-white backdrop-blur-sm",
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
  className = "",
}: ProductTileProps) {
  return (
    <div
      className={`relative aspect-[1.586/1] w-full overflow-hidden rounded-2xl bg-navy-900 shadow-lg shadow-navy-900/20 ${className}`}
    >
      {art && (
        <ProductArt
          art={art}
          className={`absolute inset-0 h-full w-full transition duration-500 ${
            placeholder ? "opacity-70" : "opacity-100 group-hover:scale-[1.03]"
          }`}
        />
      )}
      {/* Keeps the figure legible over the busiest part of any illustration. */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-navy-950 via-navy-950/70 to-transparent" />

      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-end">
          {status && (
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${STATUS_TONES[status.tone]}`}
            >
              {status.label}
            </span>
          )}
        </div>

        <div>
          {value ? (
            <>
              {valueLabel && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-200">
                  {valueLabel}
                </p>
              )}
              <p className="mt-1 text-2xl font-semibold tracking-tight text-white">{value}</p>
            </>
          ) : cta ? (
            <span className="inline-flex rounded-full bg-white/15 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur-sm transition group-hover:bg-accent-500">
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
