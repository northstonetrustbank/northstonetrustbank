// Products and their names are paired by position, so a name inserted in the
// wrong slot silently gives a loan another product's title in that language.
// This fails loudly instead.
//
//   node scripts/check-product-labels.mjs
import { PERSONAL_PRODUCTS, COMMERCIAL_PRODUCTS } from "../src/lib/products.ts";
import { en } from "../src/i18n/en.ts";
import { fr } from "../src/i18n/fr.ts";
import { de } from "../src/i18n/de.ts";
import { es } from "../src/i18n/es.ts";

const DICTS = { en, fr, de, es };
let bad = 0;

for (const [lang, d] of Object.entries(DICTS)) {
  for (const [label, defs, items] of [
    ["personal", PERSONAL_PRODUCTS, d.landing.personal.items],
    ["commercial", COMMERCIAL_PRODUCTS, d.landing.commercial.items],
  ]) {
    if (defs.length !== items.length) {
      console.log(`  FAIL ${lang}.${label}: ${defs.length} products but ${items.length} names`);
      bad++;
      continue;
    }
    console.log(`  ok   ${lang}.${label}: ${defs.length} products, ${items.length} names`);
  }
}

console.log(bad ? `\n${bad} mismatch(es)` : "\nevery product has a name in every language");
process.exit(bad ? 1 : 0);
