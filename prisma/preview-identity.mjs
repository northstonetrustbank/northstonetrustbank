// Gives the preview client a set of identity documents — real files in the
// private bucket, so the Documents page can be opened as well as listed.
// Placeholder artwork, not anyone's actual ID.
//
//   node --env-file=.env prisma/preview-identity.mjs add
//   node --env-file=.env prisma/preview-identity.mjs remove
import { deflateSync } from "node:zlib";
import { randomBytes, createHash } from "node:crypto";

const EMAIL = "preview-check@northstone.local";
const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_KYC_BUCKET ?? "kyc-documents";

const rest = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function api(path, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...init, headers: rest });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} -> ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

// ---- a minimal PNG encoder, so no image library is needed ----
function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/** Solid-colour PNG with a lighter band across it, so the three differ. */
function png(width, height, [r, g, b], bandRow) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter: none
    const inBand = y > bandRow && y < bandRow + Math.round(height * 0.18);
    for (let x = 0; x < width; x++) {
      raw[o++] = inBand ? Math.min(255, r + 60) : r;
      raw[o++] = inBand ? Math.min(255, g + 60) : g;
      raw[o++] = inBand ? Math.min(255, b + 60) : b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const users = await api(`User?email=eq.${encodeURIComponent(EMAIL)}&select=id`);
if (!users.length) throw new Error("preview client not found — run preview-via-api.mjs create first");
const userId = users[0].id;

if (process.argv[2] === "remove") {
  const docs = await api(`KycDocument?userId=eq.${userId}&select=storedName`);
  for (const d of docs) {
    await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${d.storedName}`, {
      method: "DELETE",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    });
  }
  await api(`KycDocument?userId=eq.${userId}`, { method: "DELETE" });
  console.log(`removed ${docs.length} identity documents`);
  process.exit(0);
}

const existing = await api(`KycDocument?userId=eq.${userId}&select=id`);
if (existing.length) {
  console.log("preview client already has identity documents");
  process.exit(0);
}

const sides = [
  ["FRONT", "licence-front.png", [16, 42, 82], 120],
  ["BACK", "licence-back.png", [26, 58, 46], 300],
  ["SELFIE", "holding-licence.png", [64, 40, 78], 220],
];

for (const [side, fileName, colour, band] of sides) {
  // The file route only serves names matching a 32-char hex + extension.
  const storedName = `${randomBytes(16).toString("hex")}.png`;
  const body = png(900, 560, colour, band);

  const up = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${storedName}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "image/png" },
    body,
  });
  if (!up.ok) throw new Error(`upload ${storedName} -> ${up.status} ${await up.text()}`);

  await api("KycDocument", {
    method: "POST",
    body: JSON.stringify({
      id: `ckyc${createHash("sha1").update(storedName).digest("hex").slice(0, 20)}`,
      userId,
      docType: "DRIVERS_LICENSE",
      side,
      fileName,
      storedName,
      mimeType: "image/png",
      sizeBytes: body.length,
      uploadedAt: new Date(Date.now() - 70 * 86_400_000).toISOString(),
    }),
  });
  console.log(`${side}: ${storedName} (${body.length} bytes)`);
}

console.log("done");
