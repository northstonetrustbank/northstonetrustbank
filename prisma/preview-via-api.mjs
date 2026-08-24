// Throwaway preview client, created through the Supabase Data API rather than
// Prisma — for when the Postgres pooler is unreachable but HTTPS still works.
//
//   node --env-file=.env prisma/preview-via-api.mjs create
//   node --env-file=.env prisma/preview-via-api.mjs destroy
//
// Only ever touches the one preview address below. Never real accounts.
import bcrypt from "bcryptjs";

const EMAIL = "preview-check@northstone.local";
const PASSWORD = "PreviewCheck123";

const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function api(path, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...init, headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} -> ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

/** Ids only need to be unique text; Prisma's cuids are just strings too. */
const id = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
const iso = (d) => d.toISOString();
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);

const mode = process.argv[2] ?? "create";

if (mode === "destroy") {
  const users = await api(`User?email=eq.${encodeURIComponent(EMAIL)}&select=id`);
  if (!users.length) {
    console.log("nothing to remove");
  } else {
    const userId = users[0].id;
    // Transactions hang off accounts, which cascade from the user — but the
    // Data API does not cascade, so unwind it by hand, deepest first.
    const accounts = await api(`Account?userId=eq.${userId}&select=id`);
    for (const a of accounts) await api(`Transaction?accountId=eq.${a.id}`, { method: "DELETE" });
    await api(`Account?userId=eq.${userId}`, { method: "DELETE" });
    await api(`SavingsGoal?userId=eq.${userId}`, { method: "DELETE" });
    await api(`Notification?userId=eq.${userId}`, { method: "DELETE" });
    await api(`Session?userId=eq.${userId}`, { method: "DELETE" });
    const tickets = await api(`SupportTicket?userId=eq.${userId}&select=id`);
    for (const t of tickets) await api(`TicketMessage?ticketId=eq.${t.id}`, { method: "DELETE" });
    await api(`SupportTicket?userId=eq.${userId}`, { method: "DELETE" });
    await api(`ProductApplication?userId=eq.${userId}`, { method: "DELETE" });
    await api(`KycDocument?userId=eq.${userId}`, { method: "DELETE" });
    await api(`VerificationToken?userId=eq.${userId}`, { method: "DELETE" });
    await api(`ChatConversation?userId=eq.${userId}`, { method: "DELETE" });
    await api(`User?id=eq.${userId}`, { method: "DELETE" });
    console.log("removed:", EMAIL);
  }
  process.exit(0);
}

// --- create ---
const existing = await api(`User?email=eq.${encodeURIComponent(EMAIL)}&select=id`);
if (existing.length) {
  console.log("already exists:", EMAIL, PASSWORD);
  process.exit(0);
}

const userId = id("cpv");
const now = new Date();

await api("User", {
  method: "POST",
  body: JSON.stringify({
    id: userId,
    email: EMAIL,
    passwordHash: await bcrypt.hash(PASSWORD, 12),
    firstName: "Preview",
    lastName: "Check",
    phone: "+15550000000",
    role: "CLIENT",
    accountType: "PERSONAL",
    status: "ACTIVE",
    emailVerified: true,
    locale: "en",
    currency: "USD",
    createdAt: iso(daysAgo(75)),
    updatedAt: iso(now),
  }),
});

const accountId = id("cpa");
const number = `NS-${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
await api("Account", {
  method: "POST",
  body: JSON.stringify({
    id: accountId,
    userId,
    number,
    kind: "CHECKING",
    currency: "USD",
    createdAt: iso(daysAgo(75)),
  }),
});

// Two months of history, so statements, filters and the balance hero all have
// something real to render.
const ledger = [
  [62, "DEPOSIT", 250_000, "Opening deposit"],
  [54, "DEPOSIT", 120_000, "Salary"],
  [41, "WITHDRAWAL", -35_000, "Rent"],
  [33, "ADJUSTMENT", 1_250, "Interest"],
  [24, "DEPOSIT", 120_000, "Salary"],
  [18, "WITHDRAWAL", -8_940, "Utilities"],
  [9, "DEPOSIT", 45_000, "Transfer in"],
  [3, "WITHDRAWAL", -12_500, "Card payment"],
];

for (const [ago, type, amountCents, note] of ledger) {
  const at = daysAgo(ago);
  await api("Transaction", {
    method: "POST",
    body: JSON.stringify({
      id: id("cpt"),
      accountId,
      type,
      status: "POSTED",
      amountCents,
      reference: `NS-P-${Math.random().toString(16).slice(2, 10).toUpperCase()}`,
      note,
      createdAt: iso(at),
      postedAt: iso(at),
    }),
  });
}

console.log("created:", EMAIL, PASSWORD);
console.log("account:", number);
