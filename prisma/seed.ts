// Creates the first super-admin account. Run with: npm run seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const ADMIN_EMAIL = "info@northstonetrustbank.com";
const ADMIN_PASSWORD = "ChangeMe-Northstone1"; // change immediately after first login

async function main() {
  const existing = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`Super admin already exists: ${ADMIN_EMAIL}`);
    return;
  }

  await db.user.create({
    data: {
      email: ADMIN_EMAIL,
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
  console.log(`  email:    ${ADMIN_EMAIL}`);
  console.log(`  password: ${ADMIN_PASSWORD}`);
  console.log("Change this password after your first login.");
}

main().finally(() => db.$disconnect());
