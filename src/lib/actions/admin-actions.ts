"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import {
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
  sendAccountBlockedEmail,
  sendAccountUnblockedEmail,
  sendDepositPostedEmail,
  sendDepositRejectedEmail,
  sendProofRequestEmail,
  sendAdjustmentEmail,
  sendBroadcastEmail,
} from "@/lib/email";
import {
  balanceCents,
  ensureAccount,
  formatMoney,
  newReference,
  newCardNumber,
  newCardExpiry,
  newCardCvv,
} from "@/lib/bank";
import { deleteFiles, KYC_BUCKET } from "@/lib/storage";
import { methodDef } from "@/lib/methods";
import { productDef, CARD_TIERS } from "@/lib/products";

async function requireAdmin() {
  const admin = await getSessionUser();
  if (!admin || !isAdmin(admin.role) || admin.status !== "ACTIVE") {
    throw new Error("Not authorized");
  }
  return admin;
}

export async function approveAccountAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { kycDocuments: true },
  });
  // Approval requires a verified email and identity documents — either still
  // on file, or already reviewed and purged by an admin.
  const hasDocs = user ? user.kycDocuments.length > 0 || user.kycDocsDeletedAt !== null : false;
  if (!user || user.status !== "PENDING" || !user.emailVerified || !hasDocs) return;

  await db.user.update({
    where: { id: userId },
    data: { status: "ACTIVE", statusReason: null },
  });
  await ensureAccount(user.id);
  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: "ACCOUNT_APPROVED",
    targetType: "USER",
    targetId: user.id,
    details: `Approved ${user.firstName} ${user.lastName} <${user.email}>`,
  });
  await sendAccountApprovedEmail(user.email, user.firstName, user.locale);
  revalidatePath("/admin");
}

// ---------- deposit verification ----------

export async function verifyDepositAction(formData: FormData) {
  const admin = await requireAdmin();
  const txId = String(formData.get("txId"));

  const tx = await db.transaction.findUnique({
    where: { id: txId },
    include: { account: { include: { user: true } } },
  });
  if (!tx || tx.status !== "PENDING" || tx.type !== "DEPOSIT") return;

  await db.transaction.update({
    where: { id: txId },
    data: { status: "POSTED", postedAt: new Date(), reviewedBy: admin.email },
  });

  const client = tx.account.user;
  const newBalance = await balanceCents(tx.accountId);

  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: "DEPOSIT_POSTED",
    targetType: "TRANSACTION",
    targetId: tx.reference,
    details: `Credited ${formatMoney(tx.amountCents)} to ${client.email} (${tx.reference}); new balance ${formatMoney(newBalance)}`,
  });

  await sendDepositPostedEmail(
    client.email,
    client.firstName,
    client.locale,
    formatMoney(tx.amountCents, client.locale, client.currency),
    tx.reference,
    formatMoney(newBalance, client.locale, client.currency)
  );

  revalidatePath("/admin/deposits");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function requestProofAction(formData: FormData) {
  const admin = await requireAdmin();
  const txId = String(formData.get("txId"));

  const tx = await db.transaction.findUnique({
    where: { id: txId },
    include: { account: { include: { user: true } } },
  });
  if (!tx || tx.status !== "PENDING" || tx.type !== "DEPOSIT") return;

  await db.transaction.update({
    where: { id: txId },
    data: { proofRequestedAt: new Date() },
  });

  const client = tx.account.user;
  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: "DEPOSIT_PROOF_REQUESTED",
    targetType: "TRANSACTION",
    targetId: tx.reference,
    details: `Requested proof from ${client.email} for ${formatMoney(tx.amountCents)} (${tx.reference})`,
  });

  await sendProofRequestEmail(
    client.email,
    client.firstName,
    client.locale,
    formatMoney(tx.amountCents, client.locale, client.currency),
    tx.reference
  );

  revalidatePath("/admin/deposits");
}

// ---------- manual credit / debit (interest, bonus, withdrawals, fees) ----------

const MAX_ADJUST_CENTS = 100_000_000; // $1,000,000

export async function adjustBalanceAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));
  const direction = String(formData.get("direction")) === "DEBIT" ? "DEBIT" : "CREDIT";
  const reason = String(formData.get("reason") || "").trim().slice(0, 200);
  const raw = String(formData.get("amount") ?? "").trim().replace(",", ".");
  const amountCents = Math.round(Number(raw) * 100);

  if (!reason) return; // a reason is mandatory for every manual adjustment
  if (!Number.isFinite(amountCents) || amountCents <= 0 || amountCents > MAX_ADJUST_CENTS) return;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "CLIENT" || user.status !== "ACTIVE") return;

  const account = await ensureAccount(user.id);
  const signedCents = direction === "DEBIT" ? -amountCents : amountCents;

  // Never let a manual debit take the balance below zero.
  if (direction === "DEBIT") {
    const current = await balanceCents(account.id);
    if (current < amountCents) return;
  }

  const reference = newReference("A");
  await db.transaction.create({
    data: {
      accountId: account.id,
      type: direction === "DEBIT" ? "WITHDRAWAL" : "ADJUSTMENT",
      status: "POSTED",
      amountCents: signedCents,
      reference,
      note: reason,
      reviewedBy: admin.email,
      postedAt: new Date(),
    },
  });

  const newBalance = await balanceCents(account.id);

  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: direction === "DEBIT" ? "ACCOUNT_DEBITED" : "ACCOUNT_CREDITED",
    targetType: "TRANSACTION",
    targetId: reference,
    details: `${direction === "DEBIT" ? "Debited" : "Credited"} ${formatMoney(amountCents)} ${direction === "DEBIT" ? "from" : "to"} ${user.email} (${reason}); new balance ${formatMoney(newBalance)}`,
  });

  await sendAdjustmentEmail(
    user.email,
    user.firstName,
    user.locale,
    direction,
    formatMoney(amountCents, user.locale),
    reference,
    reason,
    formatMoney(newBalance, user.locale)
  );

  revalidatePath("/admin/clients");
  revalidatePath("/dashboard");
}

// ---------- identity documents ----------

/**
 * Purges an applicant's identity images once review is finished: the files
 * leave the bucket and the rows leave the database, so nothing large is kept.
 * The audit log records what was removed, which is the only trace that stays.
 */
export async function deleteKycDocumentsAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));
  const docId = String(formData.get("docId") || "");

  const docs = await db.kycDocument.findMany({
    where: docId ? { id: docId, userId } : { userId },
  });
  if (docs.length === 0) return;

  // Storage first: if it fails we keep the rows so nothing is orphaned.
  await deleteFiles(KYC_BUCKET, docs.map((d) => d.storedName));
  await db.kycDocument.deleteMany({ where: { id: { in: docs.map((d) => d.id) } } });

  const remaining = await db.kycDocument.count({ where: { userId } });
  if (remaining === 0) {
    await db.user.update({ where: { id: userId }, data: { kycDocsDeletedAt: new Date() } });
  }

  const client = await db.user.findUnique({ where: { id: userId } });
  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: "KYC_DELETED",
    targetType: "USER",
    targetId: userId,
    details: `Deleted ${docs.length} identity file(s) for ${client?.email ?? userId}: ${docs
      .map((d) => `${d.docType}/${d.side} ${d.fileName} (${Math.round(d.sizeBytes / 1024)} KB)`)
      .join("; ")}`,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/clients");
}

// ---------- product applications ----------

function humanizeProduct(key: string) {
  return key
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function approveApplicationAction(formData: FormData) {
  const admin = await requireAdmin();
  const appId = String(formData.get("appId"));
  const note = String(formData.get("note") || "").trim() || null;
  const cardTier = String(formData.get("cardTier") || "").trim() || null;
  const approvedRaw = String(formData.get("approvedAmount") ?? "").trim().replace(",", ".");
  const approvedAmountCents = approvedRaw ? Math.round(Number(approvedRaw) * 100) : null;

  const app = await db.productApplication.findUnique({ where: { id: appId }, include: { user: true } });
  if (!app || app.status !== "SUBMITTED") return;

  const client = app.user;
  const name = humanizeProduct(app.productKey);
  const def = productDef(client.accountType, app.productKey);

  // Card products get their face details issued straight away, so the client
  // sees a real card the moment it's approved. Display only — see newCardNumber.
  const cardData = def?.card
    ? {
        cardNumber: app.cardNumber ?? newCardNumber(),
        cardExpiry: app.cardExpiry ?? newCardExpiry(),
        cardCvv: app.cardCvv ?? newCardCvv(),
        cardHolder: app.cardHolder ?? `${client.firstName} ${client.lastName}`.trim().toUpperCase(),
        cardIssuedAt: new Date(),
      }
    : {};

  await db.productApplication.update({
    where: { id: appId },
    data: {
      status: "APPROVED",
      approvedAmountCents:
        approvedAmountCents && Number.isFinite(approvedAmountCents) ? approvedAmountCents : null,
      // Fall back to the tier the client asked for when the admin leaves it blank.
      cardTier: cardTier ?? app.requestedTier,
      adminNote: note,
      decidedBy: admin.email,
      decidedAt: new Date(),
      ...cardData,
    },
  });

  // Installment loans/mortgages: disburse the principal into checking and
  // record the outstanding balance owed. Revolving credit: just set the limit;
  // the client draws from it later. Service products: nothing to disburse.
  let disbursed = false;
  if (def?.credit === "installment" && approvedAmountCents && Number.isFinite(approvedAmountCents)) {
    const checking = await ensureAccount(client.id);
    await db.transaction.create({
      data: {
        accountId: checking.id,
        applicationId: app.id,
        type: "LOAN",
        status: "POSTED",
        amountCents: approvedAmountCents,
        reference: newReference("L"),
        note: `Loan disbursed: ${name}`,
        postedAt: new Date(),
      },
    });
    await db.productApplication.update({
      where: { id: app.id },
      data: { outstandingCents: approvedAmountCents },
    });
    disbursed = true;
  }

  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: "PRODUCT_APPROVED",
    targetType: "APPLICATION",
    targetId: app.id,
    details: `Approved ${name} for ${client.email}${approvedAmountCents ? ` (${formatMoney(approvedAmountCents)})` : ""}${disbursed ? " — disbursed to checking" : ""}`,
  });

  const disbursedLine = disbursed
    ? ` The funds have been disbursed to your checking account.`
    : "";
  await db.notification.create({
    data: {
      userId: client.id,
      title: `Your ${name} application was approved`,
      body: `Good news — your ${name} application has been approved${approvedAmountCents ? ` for ${formatMoney(approvedAmountCents)}` : ""}.${disbursedLine} You can see it on your dashboard.`,
    },
  });
  await sendBroadcastEmail(
    client.email,
    `Your ${name} application was approved`,
    `Hello ${client.firstName},\n\nYour ${name} application has been approved${approvedAmountCents ? ` for ${formatMoney(approvedAmountCents)}` : ""}.${disbursedLine}\n\nSign in to your dashboard to see the details.\n\n— Northstone Trust Bank`,
    { locale: client.locale }
  );

  revalidatePath("/admin/applications");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath(`/product/${app.productKey}`);
}

export async function declineApplicationAction(formData: FormData) {
  const admin = await requireAdmin();
  const appId = String(formData.get("appId"));
  const note = String(formData.get("note") || "").trim() || "Your application did not meet our current requirements.";

  const app = await db.productApplication.findUnique({ where: { id: appId }, include: { user: true } });
  if (!app || app.status !== "SUBMITTED") return;

  await db.productApplication.update({
    where: { id: appId },
    data: { status: "DECLINED", adminNote: note, decidedBy: admin.email, decidedAt: new Date() },
  });

  const client = app.user;
  const name = humanizeProduct(app.productKey);
  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: "PRODUCT_DECLINED",
    targetType: "APPLICATION",
    targetId: app.id,
    details: `Declined ${name} for ${client.email}: ${note}`,
  });

  await db.notification.create({
    data: {
      userId: client.id,
      title: `Update on your ${name} application`,
      body: `We're unable to approve your ${name} application at this time. Reason: ${note}. Contact support@northstonetrustbank.com with any questions.`,
    },
  });

  revalidatePath("/admin/applications");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

// Update an approved product's ongoing terms (interest, due date, balance, freeze).
export async function updateProductAction(formData: FormData) {
  const admin = await requireAdmin();
  const appId = String(formData.get("appId"));
  const app = await db.productApplication.findUnique({ where: { id: appId } });
  if (!app || app.status !== "APPROVED") return;

  const interestRate = String(formData.get("interestRate") ?? "").trim() || null;
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
  const outstandingRaw = String(formData.get("outstanding") ?? "").trim().replace(",", ".");
  const outstandingCents = outstandingRaw ? Math.round(Number(outstandingRaw) * 100) : null;
  const frozen = formData.get("frozen") === "on";

  // Card face details. "Reissue" replaces the number, expiry and code outright.
  const def = productDef((await db.user.findUnique({ where: { id: app.userId } }))?.accountType ?? "PERSONAL", app.productKey);
  const reissue = formData.get("reissue") === "on";
  const cardTierRaw = String(formData.get("cardTier") ?? "").trim().toUpperCase();
  const cardData = def?.card
    ? {
        cardTier: (CARD_TIERS as readonly string[]).includes(cardTierRaw) ? cardTierRaw : app.cardTier,
        cardHolder: String(formData.get("cardHolder") ?? "").trim() || app.cardHolder,
        cardNumber: reissue
          ? newCardNumber()
          : String(formData.get("cardNumber") ?? "").replace(/\D/g, "").slice(0, 19) || app.cardNumber,
        cardExpiry: reissue
          ? newCardExpiry()
          : String(formData.get("cardExpiry") ?? "").trim().slice(0, 5) || app.cardExpiry,
        cardCvv: reissue
          ? newCardCvv()
          : String(formData.get("cardCvv") ?? "").replace(/\D/g, "").slice(0, 4) || app.cardCvv,
        cardIssuedAt: reissue ? new Date() : app.cardIssuedAt,
      }
    : {};

  await db.productApplication.update({
    where: { id: appId },
    data: {
      interestRate,
      dueDate: dueDate && !isNaN(dueDate.getTime()) ? dueDate : null,
      outstandingCents: outstandingCents && Number.isFinite(outstandingCents) ? outstandingCents : null,
      frozen,
      ...cardData,
    },
  });

  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: "PRODUCT_UPDATED",
    targetType: "APPLICATION",
    targetId: appId,
    details: `Updated ${app.productKey} terms`,
  });

  revalidatePath("/admin/applications");
  revalidatePath(`/product/${app.productKey}`);
  revalidatePath("/dashboard");
}

// ---------- withdrawal approval ----------

export async function approveWithdrawalAction(formData: FormData) {
  const admin = await requireAdmin();
  const txId = String(formData.get("txId"));

  const tx = await db.transaction.findUnique({
    where: { id: txId },
    include: { account: { include: { user: true } } },
  });
  if (!tx || tx.status !== "PENDING" || tx.type !== "WITHDRAWAL") return;
  // The row stays PENDING while it waits for VAT clearance, so the status check
  // above cannot catch it — without this an admin could pay out a withdrawal
  // the client never cleared, which is the whole point of the gate.
  if (tx.vatRequiredAt && !tx.vatClearedAt) return;

  await db.transaction.update({
    where: { id: txId },
    data: { status: "POSTED", postedAt: new Date(), reviewedBy: admin.email },
  });

  const client = tx.account.user;
  const newBalance = await balanceCents(tx.accountId);
  const label = methodDef(tx.methodKey ?? "BANK").label;

  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: "WITHDRAWAL_APPROVED",
    targetType: "TRANSACTION",
    targetId: tx.reference,
    details: `Approved ${formatMoney(Math.abs(tx.amountCents))} withdrawal for ${client.email} via ${label} (${tx.reference}); new balance ${formatMoney(newBalance)}`,
  });

  // A withdrawal is a debit — reuse the localized debit email.
  await sendAdjustmentEmail(
    client.email,
    client.firstName,
    client.locale,
    "DEBIT",
    formatMoney(Math.abs(tx.amountCents), client.locale, client.currency),
    tx.reference,
    `Withdrawal via ${label}`,
    formatMoney(newBalance, client.locale, client.currency)
  );

  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function rejectWithdrawalAction(formData: FormData) {
  const admin = await requireAdmin();
  const txId = String(formData.get("txId"));
  const reason = String(formData.get("reason") || "").trim() || "The withdrawal request could not be processed.";

  const tx = await db.transaction.findUnique({
    where: { id: txId },
    include: { account: { include: { user: true } } },
  });
  if (!tx || tx.status !== "PENDING" || tx.type !== "WITHDRAWAL") return;

  await db.transaction.update({
    where: { id: txId },
    data: { status: "REJECTED", rejectReason: reason, reviewedBy: admin.email },
  });

  const client = tx.account.user;
  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: "WITHDRAWAL_REJECTED",
    targetType: "TRANSACTION",
    targetId: tx.reference,
    details: `Rejected withdrawal of ${formatMoney(Math.abs(tx.amountCents))} for ${client.email} (${tx.reference}): ${reason}`,
  });

  await db.notification.create({
    data: {
      userId: client.id,
      title: "Withdrawal request declined",
      body: `Your withdrawal of ${formatMoney(Math.abs(tx.amountCents))} (${tx.reference}) was declined. Reason: ${reason}. Contact support@northstonetrustbank.com with any questions.`,
    },
  });

  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

/**
 * Email the client the VAT clearance code for a held transfer. The code itself
 * is generated when the transfer is created and shown to staff in the queue —
 * this only sends it on, and can be pressed again if it goes astray.
 */
export async function sendVatCodeAction(formData: FormData) {
  const admin = await requireAdmin();
  const txId = String(formData.get("txId"));

  const tx = await db.transaction.findUnique({
    where: { id: txId },
    include: { account: { include: { user: true } } },
  });
  if (!tx || tx.status !== "PENDING" || !tx.vatRequiredAt || tx.vatClearedAt) return;
  if (!tx.vatCode) return;

  const client = tx.account.user;
  const amount = formatMoney(Math.abs(tx.amountCents), client.locale, tx.account.currency);

  await sendBroadcastEmail(
    client.email,
    "Your VAT clearance code — Northstone Trust Bank",
    `Hello ${client.firstName},\n\n` +
      `Your VAT clearance code for the transfer of ${amount} (reference ${tx.reference}) is:\n\n` +
      `${tx.vatCode}\n\n` +
      `Enter it on the transfer's clearance page to confirm the transfer. ` +
      `Until it is entered, the amount stays reserved on your account and does not move.\n\n` +
      `If you did not request this transfer, do not enter the code — contact us at support@northstonetrustbank.com straight away.`,
    { locale: client.locale }
  );

  await db.transaction.update({
    where: { id: tx.id },
    data: { vatSentAt: new Date() },
  });

  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: "VAT_CODE_SENT",
    targetType: "TRANSACTION",
    targetId: tx.reference,
    details: `VAT clearance code emailed to ${client.email} for ${tx.reference} (${amount})`,
  });

  revalidatePath("/admin/withdrawals");
}

export async function rejectDepositAction(formData: FormData) {
  const admin = await requireAdmin();
  const txId = String(formData.get("txId"));
  const reason =
    String(formData.get("reason") || "").trim() || "The deposit could not be matched to a payment.";

  const tx = await db.transaction.findUnique({
    where: { id: txId },
    include: { account: { include: { user: true } } },
  });
  if (!tx || tx.status !== "PENDING" || tx.type !== "DEPOSIT") return;

  await db.transaction.update({
    where: { id: txId },
    data: { status: "REJECTED", rejectReason: reason, reviewedBy: admin.email },
  });

  const client = tx.account.user;

  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: "DEPOSIT_REJECTED",
    targetType: "TRANSACTION",
    targetId: tx.reference,
    details: `Rejected deposit of ${formatMoney(tx.amountCents)} from ${client.email} (${tx.reference}): ${reason}`,
  });

  await sendDepositRejectedEmail(
    client.email,
    client.firstName,
    client.locale,
    formatMoney(tx.amountCents, client.locale, client.currency),
    tx.reference,
    reason
  );

  revalidatePath("/admin/deposits");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function rejectAccountAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));
  const reason = String(formData.get("reason") || "").trim() || "Application did not meet our requirements.";

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== "PENDING") return;

  await db.user.update({
    where: { id: userId },
    data: { status: "REJECTED", statusReason: reason },
  });
  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: "ACCOUNT_REJECTED",
    targetType: "USER",
    targetId: user.id,
    details: `Rejected ${user.email}: ${reason}`,
  });
  await sendAccountRejectedEmail(user.email, user.firstName, reason, user.locale);
  revalidatePath("/admin");
}

export async function blockAccountAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));
  const reason = String(formData.get("reason") || "").trim() || "Suspicious activity review.";

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || isAdmin(user.role)) return; // admins cannot block admins from this screen

  await db.user.update({
    where: { id: userId },
    data: { status: "BLOCKED", statusReason: reason },
  });
  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: "ACCOUNT_BLOCKED",
    targetType: "USER",
    targetId: user.id,
    details: `Blocked ${user.email}: ${reason}`,
  });
  await sendAccountBlockedEmail(user.email, user.firstName, user.locale);
  revalidatePath("/admin/clients");
  revalidatePath("/admin");
}

export async function unblockAccountAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== "BLOCKED") return;

  await db.user.update({
    where: { id: userId },
    data: { status: "ACTIVE", statusReason: null },
  });
  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: "ACCOUNT_UNBLOCKED",
    targetType: "USER",
    targetId: user.id,
    details: `Unblocked ${user.email}`,
  });
  await sendAccountUnblockedEmail(user.email, user.firstName, user.locale);
  revalidatePath("/admin/clients");
  revalidatePath("/admin");
}
