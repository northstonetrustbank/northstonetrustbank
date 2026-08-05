// Demo clients for showing the bank to a prospective owner. Every product is
// applied for AND fully activated, with a ledger that reconciles.
//
//   node --env-file=.env prisma/demo-clients.mjs create
//   node --env-file=.env prisma/demo-clients.mjs destroy
//
// These are demonstration accounts. Delete them before real clients arrive —
// broadcasts to "all clients" would otherwise include them.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes, randomInt } from "crypto";

const db = new PrismaClient();

const PASSWORD = "NorthstoneDemo123";
const SECURITY_WORD = "northstone";

const PERSONAL_EMAIL = "demo@northstonetrustbank.com";
const BUSINESS_EMAIL = "demo.business@northstonetrustbank.com";

const ref = (kind) => `NS-${kind}-${randomBytes(4).toString("hex").toUpperCase()}`;
const cardNumber = () => {
  let d = "9705";
  while (d.length < 16) d += String(randomInt(0, 10));
  return d;
};
const cvv = () => String(randomInt(0, 1000)).padStart(3, "0");
const expiry = (from = new Date()) => {
  const d = new Date(from.getFullYear() + 3, from.getMonth(), 1);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
};
/** N days ago. */
const ago = (days) => new Date(Date.now() - days * 86_400_000);
/** N days from now. */
const soon = (days) => new Date(Date.now() + days * 86_400_000);

async function accountNumber() {
  for (;;) {
    const n = `NS-${randomInt(10_000_000, 100_000_000)}`;
    if (!(await db.account.findUnique({ where: { number: n } }))) return n;
  }
}

/** A POSTED ledger row. Credits positive, debits negative — cents. */
async function post(accountId, { type, amountCents, note, when, applicationId, methodKey, counterparty }) {
  return db.transaction.create({
    data: {
      accountId,
      applicationId: applicationId ?? null,
      type,
      status: "POSTED",
      amountCents,
      reference: ref(type[0] === "W" ? "W" : "D"),
      note,
      methodKey: methodKey ?? null,
      counterparty: counterparty ?? null,
      createdAt: when,
      postedAt: when,
      reviewedBy: "info@northstonetrustbank.com",
    },
  });
}

/** An APPROVED, fully-set-up product. */
async function approveProduct(userId, productKey, extra = {}) {
  return db.productApplication.create({
    data: {
      userId,
      productKey,
      status: "APPROVED",
      decidedBy: "info@northstonetrustbank.com",
      decidedAt: extra.decidedAt ?? ago(60),
      createdAt: extra.createdAt ?? ago(65),
      adminNote: extra.adminNote ?? null,
      amountCents: extra.amountCents ?? null,
      termMonths: extra.termMonths ?? null,
      purpose: extra.purpose ?? null,
      details: extra.details ?? undefined,
      approvedAmountCents: extra.approvedAmountCents ?? null,
      cardTier: extra.cardTier ?? null,
      requestedTier: extra.requestedTier ?? null,
      interestRate: extra.interestRate ?? null,
      dueDate: extra.dueDate ?? null,
      outstandingCents: extra.outstandingCents ?? null,
      frozen: extra.frozen ?? false,
      cardNumber: extra.card ? cardNumber() : null,
      cardExpiry: extra.card ? expiry() : null,
      cardCvv: extra.card ? cvv() : null,
      cardHolder: extra.card ? extra.cardHolder : null,
      cardIssuedAt: extra.card ? ago(59) : null,
    },
  });
}

async function destroy() {
  for (const email of [PERSONAL_EMAIL, BUSINESS_EMAIL]) {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`not present: ${email}`);
      continue;
    }
    await db.chatConversation.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } }); // cascades accounts, ledger, products, goals
    console.log(`removed: ${email}`);
  }
}

async function createPersonal() {
  await db.user.deleteMany({ where: { email: PERSONAL_EMAIL } });

  const user = await db.user.create({
    data: {
      email: PERSONAL_EMAIL,
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      securityWordHash: await bcrypt.hash(SECURITY_WORD, 10),
      firstName: "James",
      lastName: "Whitfield",
      phone: "+1 212 555 0148",
      role: "CLIENT",
      status: "ACTIVE",
      accountType: "PERSONAL",
      currency: "USD",
      locale: "en",
      emailVerified: true,
      createdAt: ago(150),
    },
  });

  const checking = await db.account.create({
    data: { userId: user.id, number: await accountNumber(), kind: "CHECKING", currency: "USD", createdAt: ago(150) },
  });
  const savings = await db.account.create({
    data: { userId: user.id, number: await accountNumber(), kind: "SAVINGS", currency: "USD", createdAt: ago(120) },
  });

  const employment = {
    employmentStatus: "EMPLOYED",
    employer: "Meridian Architects",
    annualIncome: 9_600_000, // $96,000
    housingStatus: "OWN_MORTGAGE",
  };

  // ---- products, all approved and activated ----
  const card = await approveProduct(user.id, "CREDIT_CARD", {
    card: true,
    cardHolder: "JAMES WHITFIELD",
    cardTier: "PLATINUM",
    requestedTier: "PLATINUM",
    approvedAmountCents: 1_500_000, // $15,000 limit
    interestRate: "19.99% APR",
    dueDate: soon(12),
    outstandingCents: 128_450, // $1,284.50 owed
    details: employment,
    adminNote: "Approved at Platinum. Limit reviewed after 6 months.",
  });

  const loan = await approveProduct(user.id, "PERSONAL_LOAN", {
    amountCents: 1_200_000,
    approvedAmountCents: 1_200_000, // $12,000 disbursed
    termMonths: 36,
    purpose: "Kitchen renovation",
    interestRate: "8.90% APR",
    dueDate: soon(9),
    outstandingCents: 1_035_000, // $10,350 still owed after payments
    details: { ...employment, purpose: "Kitchen renovation" },
    decidedAt: ago(90),
    createdAt: ago(95),
  });

  const mortgage = await approveProduct(user.id, "MORTGAGE", {
    amountCents: 25_000_000,
    approvedAmountCents: 25_000_000, // $250,000
    termMonths: 300,
    interestRate: "5.25% APR",
    dueDate: soon(21),
    outstandingCents: 24_640_000, // $246,400 outstanding
    details: {
      ...employment,
      propertyType: "HOUSE",
      propertyPrice: 31_000_000,
      downPayment: 6_000_000,
      propertyLocation: "Beacon Hill, Boston, MA",
    },
    decidedAt: ago(120),
    createdAt: ago(130),
    adminNote: "25-year term. Property valuation on file.",
  });

  await approveProduct(user.id, "PERSONAL_INSURANCE", {
    details: { ...employment, coverType: "HOME", coveredPeople: 3 },
    interestRate: "Annual premium $840",
    dueDate: soon(40),
    decidedAt: ago(45),
    createdAt: ago(50),
    adminNote: "Buildings and contents. Renews annually.",
  });

  // ---- ledger, oldest first, ending on a sensible balance ----
  await post(checking.id, { type: "DEPOSIT", amountCents: 450_000, note: "Opening deposit", when: ago(150), methodKey: "BANK" });
  await post(checking.id, { type: "LOAN", amountCents: 1_200_000, note: "Personal loan disbursement", when: ago(90), applicationId: loan.id });

  for (let m = 4; m >= 0; m--) {
    const day = ago(m * 30 + 4);
    await post(checking.id, { type: "DEPOSIT", amountCents: 320_000, note: "Salary — Meridian Architects", when: day, methodKey: "ACH" });
    await post(checking.id, { type: "WITHDRAWAL", amountCents: -142_000, note: "Rent and household", when: ago(m * 30 + 2), methodKey: "BANK", counterparty: "Beacon Property Mgmt" });
    if (m < 3) {
      await post(checking.id, { type: "PAYMENT", amountCents: -55_000, note: "Personal loan repayment", when: ago(m * 30 + 6), applicationId: loan.id });
      await post(checking.id, { type: "PAYMENT", amountCents: -128_000, note: "Mortgage repayment", when: ago(m * 30 + 8), applicationId: mortgage.id });
    }
  }

  await post(checking.id, { type: "CREDIT", amountCents: 180_000, note: "Credit card draw", when: ago(38), applicationId: card.id });
  await post(checking.id, { type: "PAYMENT", amountCents: -60_000, note: "Credit card repayment", when: ago(20), applicationId: card.id });
  await post(checking.id, { type: "SEND", amountCents: -25_000, note: "Sent to another Northstone client", when: ago(15), counterparty: "A. Osei" });

  // savings: funded from checking
  await post(checking.id, { type: "TRANSFER", amountCents: -200_000, note: "Transfer to savings", when: ago(110) });
  await post(savings.id, { type: "TRANSFER", amountCents: 200_000, note: "Transfer from checking", when: ago(110) });
  await post(savings.id, { type: "ADJUSTMENT", amountCents: 3_150, note: "Interest for the quarter", when: ago(30) });

  // savings goals
  await db.savingsGoal.create({ data: { userId: user.id, name: "Emergency fund", targetCents: 600_000, currentCents: 250_000, createdAt: ago(100) } });
  await db.savingsGoal.create({ data: { userId: user.id, name: "Japan trip", targetCents: 400_000, currentCents: 115_000, createdAt: ago(40) } });
  await post(checking.id, { type: "GOAL", amountCents: -365_000, note: "Moved into savings goals", when: ago(40) });

  return { user, checking, savings };
}

async function createBusiness() {
  await db.user.deleteMany({ where: { email: BUSINESS_EMAIL } });

  const user = await db.user.create({
    data: {
      email: BUSINESS_EMAIL,
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      securityWordHash: await bcrypt.hash(SECURITY_WORD, 10),
      firstName: "Amara",
      lastName: "Osei",
      phone: "+1 212 555 0193",
      role: "CLIENT",
      status: "ACTIVE",
      accountType: "COMMERCIAL",
      currency: "USD",
      locale: "en",
      emailVerified: true,
      createdAt: ago(140),
    },
  });

  const checking = await db.account.create({
    data: { userId: user.id, number: await accountNumber(), kind: "CHECKING", currency: "USD", createdAt: ago(140) },
  });
  const savings = await db.account.create({
    data: { userId: user.id, number: await accountNumber(), kind: "SAVINGS", currency: "USD", createdAt: ago(100) },
  });

  const business = {
    employmentStatus: "SELF_EMPLOYED",
    employer: "Osei Logistics Ltd",
    annualIncome: 48_000_000,
    housingStatus: "OWN_OUTRIGHT",
    businessName: "Osei Logistics Ltd",
  };

  const bizCard = await approveProduct(user.id, "BUSINESS_CARD", {
    card: true,
    cardHolder: "OSEI LOGISTICS LTD",
    cardTier: "BLACK",
    requestedTier: "BLACK",
    approvedAmountCents: 4_000_000, // $40,000
    interestRate: "17.49% APR",
    dueDate: soon(14),
    outstandingCents: 612_000,
    details: business,
    adminNote: "Black tier — 3 years trading, strong revenue.",
  });

  const sbLoan = await approveProduct(user.id, "SMALL_BUSINESS", {
    amountCents: 7_500_000,
    approvedAmountCents: 7_500_000, // $75,000
    termMonths: 48,
    interestRate: "7.40% APR",
    dueDate: soon(11),
    outstandingCents: 6_820_000,
    details: { ...business, yearsTrading: 6, annualRevenue: 48_000_000, purpose: "Two additional delivery vehicles" },
    decidedAt: ago(80),
    createdAt: ago(88),
  });

  await approveProduct(user.id, "FOREIGN_DRAFTS", {
    amountCents: 1_500_000,
    approvedAmountCents: 1_500_000,
    details: { ...business, destinationCountry: "Germany", beneficiaryName: "Hafen Spedition GmbH" },
    adminNote: "Standing facility for EU supplier payments.",
    decidedAt: ago(55),
    createdAt: ago(60),
  });
  await approveProduct(user.id, "INTEREST_CHECKING", {
    details: business,
    interestRate: "2.10% AER",
    decidedAt: ago(70),
    createdAt: ago(75),
  });
  await approveProduct(user.id, "TELE_BANKING", {
    details: business,
    adminNote: "Two named signatories registered for phone banking.",
    decidedAt: ago(65),
    createdAt: ago(68),
  });
  await approveProduct(user.id, "MONEY_MARKET", {
    amountCents: 5_000_000,
    approvedAmountCents: 5_000_000,
    details: business,
    interestRate: "4.35% AER",
    dueDate: soon(60),
    decidedAt: ago(50),
    createdAt: ago(54),
  });

  // ---- ledger ----
  await post(checking.id, { type: "DEPOSIT", amountCents: 1_800_000, note: "Opening deposit", when: ago(140), methodKey: "WIRE" });
  await post(checking.id, { type: "LOAN", amountCents: 7_500_000, note: "Small business loan disbursement", when: ago(80), applicationId: sbLoan.id });

  for (let m = 4; m >= 0; m--) {
    await post(checking.id, { type: "DEPOSIT", amountCents: 940_000, note: "Customer settlements", when: ago(m * 30 + 5), methodKey: "ACH" });
    await post(checking.id, { type: "WITHDRAWAL", amountCents: -410_000, note: "Payroll", when: ago(m * 30 + 3), methodKey: "BANK", counterparty: "Payroll run" });
    await post(checking.id, { type: "WITHDRAWAL", amountCents: -186_000, note: "Fuel and maintenance", when: ago(m * 30 + 12), methodKey: "BANK", counterparty: "Fleet services" });
    if (m < 3) {
      await post(checking.id, { type: "PAYMENT", amountCents: -182_000, note: "Business loan repayment", when: ago(m * 30 + 7), applicationId: sbLoan.id });
    }
  }

  await post(checking.id, { type: "CREDIT", amountCents: 700_000, note: "Business card draw", when: ago(30), applicationId: bizCard.id });
  await post(checking.id, { type: "PAYMENT", amountCents: -88_000, note: "Business card repayment", when: ago(10), applicationId: bizCard.id });
  await post(checking.id, { type: "TRANSFER", amountCents: -1_500_000, note: "Transfer to savings", when: ago(100) });
  await post(savings.id, { type: "TRANSFER", amountCents: 1_500_000, note: "Transfer from checking", when: ago(100) });
  await post(savings.id, { type: "ADJUSTMENT", amountCents: 24_300, note: "Interest for the quarter", when: ago(25) });

  await db.savingsGoal.create({ data: { userId: user.id, name: "Vehicle replacement fund", targetCents: 3_000_000, currentCents: 900_000, createdAt: ago(90) } });
  await post(checking.id, { type: "GOAL", amountCents: -900_000, note: "Moved into savings goal", when: ago(90) });

  return { user, checking, savings };
}

/**
 * Leaves one item in every admin queue, so the admin portal can be demonstrated
 * with real work in it rather than five empty screens.
 */
async function pendingWork(personal, business) {
  // waiting to be paid in
  await db.transaction.create({
    data: {
      accountId: personal.checking.id,
      type: "DEPOSIT",
      status: "PENDING",
      amountCents: 180_000,
      reference: ref("D"),
      note: "Transfer from Chase — please check",
      methodKey: "BANK",
      createdAt: ago(1),
    },
  });

  // waiting to be paid out
  await db.transaction.create({
    data: {
      accountId: business.checking.id,
      type: "WITHDRAWAL",
      status: "PENDING",
      amountCents: -450_000,
      reference: ref("W"),
      note: "Supplier payment",
      methodKey: "BANK",
      counterparty: "Hafen Spedition GmbH, IBAN DE44 5001 0517 5407 3249 31",
      createdAt: ago(1),
    },
  });

  // a product request awaiting a decision
  await db.productApplication.create({
    data: {
      userId: personal.user.id,
      productKey: "PERSONAL_INSURANCE",
      status: "SUBMITTED",
      purpose: "Cover for a second vehicle",
      details: {
        employmentStatus: "EMPLOYED",
        employer: "Meridian Architects",
        annualIncome: 9_600_000,
        housingStatus: "OWN_MORTGAGE",
        coverType: "AUTO",
        coveredPeople: 2,
      },
      createdAt: ago(2),
    },
  });

  // someone waiting in live chat
  const conv = await db.chatConversation.create({
    data: {
      visitorToken: `demo-${randomBytes(8).toString("hex")}`,
      name: "Rebecca Hale",
      email: "rebecca.hale@example.com",
      phone: "+1 212 555 0166",
      unreadForAdmin: true,
      createdAt: ago(0.02),
      lastMessageAt: ago(0.02),
    },
  });
  await db.chatMessage.create({
    data: {
      conversationId: conv.id,
      sender: "VISITOR",
      body: "Hello — what do I need to open a business account?",
      createdAt: ago(0.02),
    },
  });

  console.log("\nQueues seeded: 1 deposit, 1 withdrawal, 1 product request, 1 chat.");
}

async function balances(accountId) {
  const rows = await db.transaction.aggregate({
    _sum: { amountCents: true },
    where: { accountId, status: "POSTED" },
  });
  return rows._sum.amountCents ?? 0;
}

const money = (c) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

async function main() {
  const mode = process.argv[2] ?? "create";

  if (mode === "destroy") {
    await destroy();
    return;
  }

  const p = await createPersonal();
  const b = await createBusiness();
  await pendingWork(p, b);

  for (const [label, d] of [["PERSONAL", p], ["BUSINESS", b]]) {
    const chk = await balances(d.checking.id);
    const sav = await balances(d.savings.id);
    const apps = await db.productApplication.count({ where: { userId: d.user.id, status: "APPROVED" } });
    const txs = await db.transaction.count({ where: { account: { userId: d.user.id } } });
    console.log("");
    console.log(`${label}: ${d.user.email} / ${PASSWORD}`);
    console.log(`  ${d.user.firstName} ${d.user.lastName}`);
    console.log(`  checking ${d.checking.number}  ${money(chk)}`);
    console.log(`  savings  ${d.savings.number}  ${money(sav)}`);
    console.log(`  ${apps} products approved & activated, ${txs} ledger entries`);
    console.log(`  security word: ${SECURITY_WORD}`);
    if (chk < 0) console.log("  !! checking balance is negative — fix the demo ledger");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
