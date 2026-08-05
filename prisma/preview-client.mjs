// Throwaway preview client for UI checks. Never touches real accounts.
//   node --env-file=.env prisma/preview-client.mjs create
//   node --env-file=.env prisma/preview-client.mjs destroy
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";

const db = new PrismaClient();

/** Deleting a user cascades its rows but not its files — clear those first. */
async function purgeFiles(email) {
  const docs = await db.kycDocument.findMany({ where: { user: { email } } });
  if (docs.length === 0) return 0;
  const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  await supa.storage
    .from(process.env.SUPABASE_KYC_BUCKET ?? "kyc-documents")
    .remove(docs.map((d) => d.storedName));
  return docs.length;
}
const EMAIL = "preview-check@northstone.local";
const APPLICANT = "preview-applicant@northstone.local";
const PASSWORD = "PreviewCheck123";
const mode = process.argv[2] ?? "create";

if (mode === "destroy") {
  // Optionally target one account: destroy preview-check@northstone.local
  const only = process.argv[3];
  const targets = only ? [only] : [EMAIL, APPLICANT];

  let files = 0;
  let chats = 0;
  for (const email of targets) {
    files += await purgeFiles(email);
    // A conversation survives its owner (userId is set to null on delete), so
    // remove it explicitly rather than leaving test threads in the console.
    const removed = await db.chatConversation.deleteMany({ where: { user: { email } } });
    chats += removed.count;
  }

  const n = await db.user.deleteMany({ where: { email: { in: targets } } });
  console.log(`removed ${n.count} user(s), ${files} identity file(s), ${chats} chat thread(s)`);
  console.log("targets:", targets.join(", "));
} else if (mode === "applicant") {
  // A verified-email applicant sitting on the identity step, for KYC checks.
  const files = await purgeFiles(APPLICANT);
  if (files) console.log("cleared", files, "old identity files");
  await db.user.deleteMany({ where: { email: APPLICANT } });
  const user = await db.user.create({
    data: {
      email: APPLICANT,
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      firstName: "Preview",
      lastName: "Applicant",
      phone: "+10000000001",
      role: "CLIENT",
      status: "PENDING",
      emailVerified: true,
    },
  });
  console.log("applicant:", user.email, PASSWORD);
} else {
  await db.user.deleteMany({ where: { email: EMAIL } });
  const user = await db.user.create({
    data: {
      email: EMAIL,
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      firstName: "Preview",
      lastName: "Check",
      phone: "+10000000000",
      role: "CLIENT",
      status: "ACTIVE",
      emailVerified: true,
    },
  });
  const account = await db.account.create({
    data: { userId: user.id, number: `NS-${randomInt(10_000_000, 100_000_000)}`, kind: "CHECKING" },
  });
  const now = new Date();
  const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 12));
  await db.transaction.createMany({
    data: [
      {
        accountId: account.id,
        type: "DEPOSIT",
        status: "POSTED",
        amountCents: 250_000,
        reference: `NS-D-PREV${randomInt(1000, 9999)}`,
        note: "Opening deposit",
        postedAt: lastMonth,
        createdAt: lastMonth,
      },
      {
        accountId: account.id,
        type: "WITHDRAWAL",
        status: "POSTED",
        amountCents: -45_000,
        reference: `NS-W-PREV${randomInt(1000, 9999)}`,
        note: "Rent",
        postedAt: new Date(),
      },
    ],
  });
  console.log("created:", user.email, PASSWORD, account.number);
}
await db.$disconnect();
