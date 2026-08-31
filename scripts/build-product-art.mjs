// Turns the delivered renders into product-tile artwork.
//
//   node scripts/build-product-art.mjs
//
// Each piece is fitted to the payment-card ratio (1.586:1) on the app's own
// ground, so a tile and a card face are interchangeable, then written as WebP
// at two widths. Run again whenever a render is replaced.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve("../illus");
const OUT = path.resolve("public/art");

// The app's ground. Pieces delivered on their own black sit on this too, so a
// tile never shows a seam where the render stops.
const GROUND = { r: 7, g: 13, b: 26, alpha: 1 };

const W = 900;
const H = Math.round(W / 1.586); // 567

/**
 * `fit: "cover"` for renders that came with their own background — they fill
 * the frame and their black becomes the tile's black. `fit: "contain"` for
 * cut-outs, which get set down on the ground with room around them.
 */
const PIECES = [
  { out: "savings", file: "ChatGPT Image Aug 24, 2026, 05_34_52 AM.png", fit: "contain", pad: 0.1 },
  { out: "mortgage", file: "ChatGPT Image Aug 24, 2026, 05_38_42 AM.png", fit: "cover" },
  { out: "personal-loan", file: "ChatGPT Image Aug 24, 2026, 05_42_51 AM.png", fit: "cover" },
  { out: "insurance", file: "ChatGPT Image Aug 24, 2026, 05_46_19 AM.png", fit: "contain", pad: 0.06 },
  { out: "deposits", file: "ChatGPT_Image_Aug_24__2026__05_55_22_AM-removebg-preview.png", fit: "contain", pad: 0.08 },
  { out: "foreign-drafts", file: "ChatGPT Image 24 août 2026, 06_41_13.png", fit: "contain", pad: 0.1 },
  { out: "interest-checking", file: "ChatGPT Image 24 août 2026, 06_51_04.png", fit: "cover" },
  { out: "tele-banking", file: "ChatGPT Image 24 août 2026, 06_54_16.png", fit: "cover" },
  { out: "money-market", file: "ChatGPT Image 24 août 2026, 07_36_05.png", fit: "cover" },
  { out: "small-business", file: "ChatGPT Image 24 août 2026, 07_40_47.png", fit: "cover" },
  { out: "auto-loan", file: "auto-loan.png", fit: "cover" },
  { out: "student-loan", file: "student-loan.png", fit: "cover" },
  { out: "home-improvement", file: "home-improvement.png", fit: "cover" },
  { out: "home-equity", file: "home-equity.png", fit: "cover" },
];

fs.mkdirSync(OUT, { recursive: true });

let total = 0;
for (const piece of PIECES) {
  const src = path.join(SRC, piece.file);
  if (!fs.existsSync(src)) {
    console.log(`MISSING  ${piece.out}  (${piece.file})`);
    continue;
  }

  for (const width of [W, Math.round(W / 2)]) {
    const height = Math.round(width / 1.586);
    const suffix = width === W ? "" : "-half";

    let img = sharp(src);

    if (piece.fit === "contain") {
      // Inset the cut-out so it does not touch the tile's edges.
      const inner = Math.round(height * (1 - (piece.pad ?? 0.1) * 2));
      const object = await sharp(src)
        .trim({ threshold: 8 })
        .resize({ height: inner, fit: "inside", withoutEnlargement: false })
        .toBuffer();

      img = sharp({
        create: { width, height, channels: 4, background: GROUND },
      }).composite([{ input: object, gravity: "center" }]);
    } else {
      img = img.resize({ width, height, fit: "cover", position: "attention" }).flatten({ background: GROUND });
    }

    const file = path.join(OUT, `${piece.out}${suffix}.webp`);
    const info = await img.webp({ quality: 82, effort: 6 }).toFile(file);
    if (!suffix) {
      console.log(`${piece.out.padEnd(18)} ${String(info.width)}x${info.height}  ${(info.size / 1024).toFixed(0)}KB`);
      total += info.size;
    }
  }
}

console.log(`\n${PIECES.length} pieces, ${(total / 1024 / 1024).toFixed(2)}MB at full width`);
