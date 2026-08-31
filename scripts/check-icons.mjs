// Every Icons.x / NavIcons.x in the app, checked against what is defined.
//
//   node scripts/check-icons.mjs
//
// A missing icon is not a missing picture: React renders an undefined
// component by throwing, so one wrong name returns 500 for the whole page.
// That has now taken down the homepage and the dashboard, so it gets a check
// rather than another pair of eyes.
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve("src");
const ICONS_FILE = path.join(SRC, "components/icons.tsx");
const source = fs.readFileSync(ICONS_FILE, "utf8");

/** The keys defined in one exported record. */
function keysOf(name) {
  const start = source.indexOf(`export const ${name}`);
  if (start < 0) throw new Error(`${name} not found in icons.tsx`);
  const open = source.indexOf("{", start);
  let depth = 0;
  let end = open;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = source.slice(open, end);
  // Only keys at the record's own depth, not those inside an icon's markup.
  const keys = new Set();
  let d = 0;
  for (const line of body.split("\n")) {
    const m = /^\s{2}([A-Za-z][A-Za-z0-9]*):\s*\(/.exec(line);
    if (d === 1 && m) keys.add(m[1]);
    for (const c of line) {
      if (c === "{") d++;
      else if (c === "}") d--;
    }
  }
  return keys;
}

const defined = { Icons: keysOf("Icons"), NavIcons: keysOf("NavIcons") };

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e.name)) files.push(p);
  }
})(SRC);

const problems = [];
for (const file of files) {
  if (file === ICONS_FILE) continue;
  const text = fs.readFileSync(file, "utf8");
  text.split("\n").forEach((line, i) => {
    for (const m of line.matchAll(/\b(NavIcons|Icons)\.([A-Za-z][A-Za-z0-9]*)/g)) {
      const [, record, key] = m;
      if (defined[record].has(key)) continue;
      // A name defined in the other record is the interesting case: it means
      // the icon exists and the reference simply points at the wrong record.
      const other = record === "Icons" ? "NavIcons" : "Icons";
      problems.push({
        file: path.relative(process.cwd(), file),
        line: i + 1,
        ref: `${record}.${key}`,
        note: defined[other].has(key) ? `defined in ${other}` : "not defined anywhere",
      });
    }
  });
}

if (!problems.length) {
  console.log(
    `OK  ${defined.Icons.size} Icons, ${defined.NavIcons.size} NavIcons, every reference resolves.`
  );
  process.exit(0);
}

console.log(`${problems.length} icon reference(s) resolve to undefined:\n`);
for (const p of problems) {
  console.log(`  ${p.file}:${p.line}  ${p.ref.padEnd(22)} ${p.note}`);
}
console.log("\nEach of these renders as undefined, which throws and 500s the page.");
process.exit(1);
