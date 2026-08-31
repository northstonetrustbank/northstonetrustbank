// Artwork for the products that aren't payment cards.
//
// Every product now has a rendered 3D illustration, fitted to the card ratio on
// the app's own near-black navy ground by scripts/build-product-art.mjs and
// served from /public/art as WebP at two widths. Serving them as files rather
// than inline markup means the browser caches each one instead of the server
// re-sending the artwork inside every page.

/** Product art key → the rendered file the build script writes. */
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
  // The four newer loans, once flat icon tiles, now their own renders.
  auto: "auto-loan",
  student: "student-loan",
  renovation: "home-improvement",
  equity: "home-equity",
};

export function ProductArt({ art, className }: { art: string; className?: string }) {
  const file = FILES[art];
  if (!file) return null;

  return (
    // Deliberately a plain <img>. These are already WebP at exactly the two
    // widths the layout asks for, so the image optimiser would re-encode work
    // that is already done and bill for it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/art/${file}.webp`}
      srcSet={`/art/${file}-half.webp 450w, /art/${file}.webp 900w`}
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
