// Creates the first super-admin account. Run with: npm run seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const ADMIN_EMAIL = "info@northstonetrustbank.com";
// Staff sign in at /admin with this username. Stored lowercase — the sign-in
// lowercases whatever is typed, so "Admin" and "admin" both work.
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "257Mobag$";

async function main() {
  const existing = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    // Upsert rather than bail out: on a database seeded before usernames
    // existed, an early return would leave the owner unable to sign in at all.
    await db.user.update({
      where: { email: ADMIN_EMAIL },
      data: {
        username: ADMIN_USERNAME,
        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      },
    });
    console.log(`Super admin updated: ${ADMIN_EMAIL} (username ${ADMIN_USERNAME})`);
    return;
  }

  await db.user.create({
    data: {
      email: ADMIN_EMAIL,
      username: ADMIN_USERNAME,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      firstName: "Northstone",
      lastName: "Admin",
      phone: "N/A",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      emailVerified: true,
    },
  });

  await db.auditLog.create({
    data: {
      actorLabel: "system",
      action: "ADMIN_SEEDED",
      targetType: "USER",
      details: `Super admin account created: ${ADMIN_EMAIL}`,
    },
  });

  console.log("Super admin created.");
  console.log(`  sign in at /admin`);
  console.log(`  username: ${ADMIN_USERNAME}`);
  console.log(`  password: ${ADMIN_PASSWORD}`);
  console.log(`  (email ${ADMIN_EMAIL} also works at /login)`);
}

main().finally(() => db.$disconnect());
