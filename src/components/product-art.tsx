// Artwork for the products that aren't payment cards.
//
// These are rendered images, fitted to the payment-card ratio on the app's own
// ground by scripts/build-product-art.mjs and served from /public/art. Serving
// them as files rather than inline markup means the browser caches each one
// instead of the server re-sending it inside every page.

/** Product art key → the file the build script writes. */
const FILES: Record<string, string> = {
  vault: "savings",
  house: "mortgage",
  contract: "personal-loan",
  shield: "insurance",
  deposit: "deposits",
  globe: "foreign-drafts",
  cheque: "interest-checking",
  handset: "tele-banking",
  market: "money-market",
  storefront: "small-business",
};

export function ProductArt({ art, className }: { art: string; className?: string }) {
  const name = FILES[art];
  if (!name) return null;

  return (
    // Deliberately a plain <img>. These are already WebP at exactly the two
    // widths the layout asks for, so the image optimiser would re-encode work
    // that is already done and bill for it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/art/${name}.webp`}
      srcSet={`/art/${name}-half.webp 450w, /art/${name}.webp 900w`}
      sizes="(max-width: 640px) 100vw, 400px"
      alt=""
      width={900}
      height={567}
      loading="lazy"
      decoding="async"
      className={`object-cover ${className ?? ""}`}
    />
  );
}
