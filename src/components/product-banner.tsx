import { BankCard } from "./bank-card";
import { ProductArt } from "./product-art";
import type { CardTheme } from "@/lib/products";

// A product at the same size as the checking card above it — 335x205 on a
// phone — so the overview reads as one set of cards rather than an account
// card followed by a row of something else.
//
// The name and the status sit inside the card, the way the account card
// carries its own. That is what keeps five of these to ~1070px: the original
// tiles were the same height again once their label sat underneath them.

const STATUS_TONES = {
  ok: "bg-emerald-400/95 text-emerald-950",
  pending: "bg-[#3b82f6] text-white",
  bad: "bg-red-400/95 text-red-950",
  muted: "bg-ink-3/80 text-fg backdrop-blur-sm",
} as const;

export type ProductBannerProps = {
  title: string;
  /** One line on what the product is — shown when there is no figure. */
  body: string;
  art?: string | null;
  /** Card products show their real face rather than artwork. */
  theme?: CardTheme | null;
  /** The rest of the card face — tier badge, holder, number, expiry. Passing
   *  these through is what makes it the Classic card from the Cards page
   *  rather than a blank blue rectangle. */
  badge?: string | null;
  holder?: string | null;
  holderPlaceholder?: string;
  number?: string | null;
  expiry?: string | null;
  valueLabel?: string | null;
  value?: string | null;
  status?: { label: string; tone: keyof typeof STATUS_TONES } | null;
  cta?: string | null;
  placeholder?: boolean;
};

export function ProductBanner({
  title,
  body,
  art,
  theme,
  badge,
  holder,
  holderPlaceholder = "",
  number,
  expiry,
  valueLabel,
  value,
  status,
  cta,
  placeholder = false,
}: ProductBannerProps) {
  // A card product is already a finished object with its own name and status
  // on its face — putting a second set on top of it would just be clutter.
  if (theme) {
    return (
      <BankCard
        theme={theme}
        productName={title}
        badge={badge}
        holder={holder}
        holderPlaceholder={holderPlaceholder}
        number={number}
        expiry={expiry}
        valueLabel={valueLabel}
        value={value}
        status={status}
        placeholder={placeholder}
        className="transition group-hover:shadow-2xl"
      />
    );
  }

  return (
    <div className="elev-2 relative aspect-[1.634/1] w-full overflow-hidden rounded-2xl border border-line bg-ink-1 transition group-hover:border-brand-500/40">
      {art && (
        <ProductArt
          art={art}
          className={`absolute inset-0 h-full w-full transition duration-500 ${
            placeholder ? "opacity-80" : "opacity-100"
          }`}
        />
      )}

      {/* Two scrims. A full wash holds the whole face down a step so no bright
          part of the artwork strands the text, and a stronger foot makes the
          bottom third genuinely dark to read over. The body text was
          text-fg-muted — a dark slate meant for white pages — sitting on a dark
          image, which is why it was all but invisible. */}
      <div className="absolute inset-0 bg-[#020d1c]/25" />
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-navy-950 via-navy-950/85 to-transparent" />

      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="flex justify-end">
          {status && (
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${STATUS_TONES[status.tone]}`}
            >
              {status.label}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold tracking-tight text-white [text-shadow:0_1px_8px_rgba(3,8,20,0.6)]">
            {title}
          </p>

          {value ? (
            <p className="tnum mt-1 truncate text-2xl font-semibold tracking-tight text-white">
              {value}
              {valueLabel && (
                <span className="ml-2 text-[11px] font-medium text-navy-200">{valueLabel}</span>
              )}
            </p>
          ) : (
            <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-snug text-navy-100 [text-shadow:0_1px_6px_rgba(3,8,20,0.7)]">
              {body}
            </p>
          )}

          {!value && cta && (
            <span className="mt-2.5 inline-flex rounded-xl bg-white px-4 py-2 text-[12.5px] font-semibold text-navy-900 shadow-sm transition group-hover:bg-[#3b82f6] group-hover:text-white">
              {cta}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
