"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSessionUser, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import {
  balanceCents,
  ensureAccount,
  formatMoney,
  newReference,
  pendingWithdrawalCents,
} from "@/lib/bank";
import { sendAdjustmentEmail } from "@/lib/email";
import { newVatCode, verifyVatCode } from "@/lib/vat";
import { getDict } from "@/i18n/server";
import type { FormState } from "./auth-actions";

const MAX_AMOUNT_CENTS = 100_000_000;

async function requireClient() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.status !== "ACTIVE" || user.role !== "CLIENT") redirect("/login");
  return user;
}

function parseAmount(formData: FormData) {
  const raw = String(formData.get("amount") ?? "").trim().replace(",", ".");
  const cents = Math.round(Number(raw) * 100);
  return { raw, cents };
}

// ---------- send money ----------

export async function sendMoneyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDict();
  const user = await requireClient();

  const { raw, cents: amountCents } = parseAmount(formData);
  if (!raw || !Number.isFinite(amountCents) || amountCents <= 0 || amountCents > MAX_AMOUNT_CENTS) {
    return { error: t.bank.amountInvalid };
  }
  const recipient = String(formData.get("recipient") ?? "").trim();
  if (!recipient) return { error: t.send.recipientRequired };

  // Security word gate.
  const word = String(formData.get("securityWord") ?? "").trim().toLowerCase();
  if (!user.securityWordHash) return { error: t.bank.securityWordMissing };
  if (!(await verifyPassword(word, user.securityWordHash))) {
    return { error: t.bank.securityWordWrong };
  }

  const senderChecking = await ensureAccount(user.id);
  const [posted, pendingOut] = await Promise.all([
    balanceCents(senderChecking.id),
    pendingWithdrawalCents(senderChecking.id),
  ]);
  if (amountCents > posted - pendingOut) return { error: t.bank.insufficientFunds };

  // Resolve a Northstone recipient by account number or email.
  let recipientUserId: string | null = null;
  let recipientAccountId: string | null = null;
  const byNumber = await db.account.findUnique({
    where: { number: recipient },
    include: { user: true },
  });
  if (byNumber && byNumber.user.role === "CLIENT" && byNumber.user.status === "ACTIVE") {
    recipientUserId = byNumber.userId;
    recipientAccountId = byNumber.id;
  } else if (recipient.includes("@")) {
    const u = await db.user.findUnique({ where: { email: recipient.toLowerCase() } });
    if (u && u.role === "CLIENT" && u.status === "ACTIVE") {
      recipientUserId = u.id;
      recipientAccountId = (await ensureAccount(u.id)).id;
    }
  }

  if (recipientUserId === user.id) return { error: t.send.selfError };

  if (recipientUserId && recipientAccountId) {
    // Held for VAT clearance, not sent. Only the sender's leg exists for now,
    // as a PENDING debit — so the amount is reserved against their available
    // balance, while the recipient sees nothing until the code is entered.
    // The recipient's credit is written by clearVatAndReleaseAction.
    const ref = newReference("S");
    const held = await db.transaction.create({
      data: {
        accountId: senderChecking.id,
        type: "SEND",
        status: "PENDING",
        amountCents: -amountCents,
        reference: `${ref}-O`,
        note: `Sent to ${recipient}`,
        methodKey: "SEND",
        sendToAccountId: recipientAccountId,
        vatCode: newVatCode(),
        vatRequiredAt: new Date(),
      },
    });

    await audit({
      actorId: user.id,
      actorLabel: user.email,
      action: "SEND_INTERNAL_REQUESTED",
      targetType: "TRANSACTION",
      targetId: ref,
      details: `${formatMoney(amountCents)} to ${recipient} — held for VAT clearance`,
    });

    redirect(`/verify-transfer/${held.id}`);
  }

  // Not a Northstone account — direct them to the Withdraw flow for external transfers.
  return { error: t.send.externalUseWithdraw };
}

// ---------- VAT clearance ----------

/**
 * The client enters the code the bank issued. A withdrawal simply clears the
 * gate and joins the admin queue. A send is different: nothing has moved yet,
 * so clearing it is the moment the money actually changes hands.
 */
export async function clearVatAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDict();
  const user = await requireClient();

  const id = String(formData.get("transactionId") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  if (!id) return { error: t.vat.notFound };

  const result = await verifyVatCode(user.id, id, code);
  if (!result.ok) {
    if (result.reason === "wrong") return { error: t.vat.wrongCode };
    if (result.reason === "locked") return { error: t.vat.locked };
    if (result.reason === "already-cleared") return { error: t.vat.alreadyCleared };
    return { error: t.vat.notFound };
  }

  const tx = await db.transaction.findFirst({
    where: { id, account: { userId: user.id } },
    include: { account: true },
  });
  if (!tx) return { error: t.vat.notFound };

  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: "VAT_CLEARED",
    targetType: "TRANSACTION",
    targetId: tx.reference,
    details: `${user.email} cleared VAT on ${tx.reference}`,
  });

  // A withdrawal now waits on the bank; nothing moves here.
  if (tx.type !== "SEND") {
    revalidatePath("/dashboard");
    redirect("/dashboard?vatCleared=1");
  }

  // A send posts on clearance: the held debit and the recipient's credit are
  // written together, so the two legs can never exist apart.
  if (!tx.sendToAccountId) return { error: t.vat.notFound };
  const recipientAccount = await db.account.findUnique({
    where: { id: tx.sendToAccountId },
    include: { user: true },
  });
  if (!recipientAccount) return { error: t.vat.notFound };

  const now = new Date();
  const inRef = tx.reference.replace(/-O$/, "-I");
  await db.$transaction([
    db.transaction.update({
      where: { id: tx.id },
      data: { status: "POSTED", postedAt: now },
    }),
    db.transaction.create({
      data: {
        accountId: recipientAccount.id,
        type: "SEND",
        status: "POSTED",
        amountCents: Math.abs(tx.amountCents),
        reference: inRef,
        note: `Received from ${user.firstName} ${user.lastName}`,
        methodKey: "SEND",
        postedAt: now,
      },
    }),
    db.notification.create({
      data: {
        userId: recipientAccount.userId,
        title: "You received a transfer",
        body: `${user.firstName} ${user.lastName} sent you ${formatMoney(Math.abs(tx.amountCents))}.`,
      },
    }),
  ]);

  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: "SEND_INTERNAL",
    targetType: "TRANSACTION",
    targetId: tx.reference,
    details: `${formatMoney(Math.abs(tx.amountCents))} released to ${recipientAccount.number}`,
  });

  const [senderBal, recipientBal] = await Promise.all([
    balanceCents(tx.accountId),
    balanceCents(recipientAccount.id),
  ]);
  await sendAdjustmentEmail(
    user.email, user.firstName, user.locale, "DEBIT",
    formatMoney(Math.abs(tx.amountCents), user.locale, user.currency), tx.reference,
    tx.note ?? "Transfer", formatMoney(senderBal, user.locale, user.currency)
  );
  await sendAdjustmentEmail(
    recipientAccount.user.email, recipientAccount.user.firstName, recipientAccount.user.locale, "CREDIT",
    formatMoney(Math.abs(tx.amountCents), recipientAccount.user.locale, recipientAccount.user.currency), inRef,
    `Received from ${user.firstName} ${user.lastName}`,
    formatMoney(recipientBal, recipientAccount.user.locale, recipientAccount.user.currency)
  );

  revalidatePath("/dashboard");
  redirect("/dashboard?sent=instant");
}

/** Cancel a held transfer and release the reserved funds. */
export async function cancelHeldTransferAction(formData: FormData) {
  const user = await requireClient();
  const id = String(formData.get("transactionId") ?? "").trim();

  const tx = await db.transaction.findFirst({
    where: { id, account: { userId: user.id }, status: "PENDING" },
  });
  if (!tx || !tx.vatRequiredAt || tx.vatClearedAt) redirect("/dashboard");

  await db.transaction.update({
    where: { id: tx.id },
    data: { status: "REJECTED", rejectReason: "Cancelled by the client before VAT clearance" },
  });
  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: "VAT_CANCELLED",
    targetType: "TRANSACTION",
    targetId: tx.reference,
    details: `${user.email} cancelled ${tx.reference} before clearance`,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?vatCancelled=1");
}

// ---------- savings goals ----------

export async function createGoalAction(formData: FormData) {
  const user = await requireClient();
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) return;
  const targetRaw = String(formData.get("target") ?? "").trim().replace(",", ".");
  const targetCents = targetRaw ? Math.round(Number(targetRaw) * 100) : null;

  await db.savingsGoal.create({
    data: {
      userId: user.id,
      name,
      targetCents: targetCents && Number.isFinite(targetCents) && targetCents > 0 ? targetCents : null,
    },
  });
  revalidatePath("/goals");
}

export async function fundGoalAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDict();
  const user = await requireClient();
  const goalId = String(formData.get("goalId"));
  const { raw, cents } = parseAmount(formData);
  if (!raw || !Number.isFinite(cents) || cents <= 0) return { error: t.bank.amountInvalid };

  const goal = await db.savingsGoal.findFirst({ where: { id: goalId, userId: user.id } });
  if (!goal) return null;

  const checking = await ensureAccount(user.id);
  const [posted, pendingOut] = await Promise.all([
    balanceCents(checking.id),
    pendingWithdrawalCents(checking.id),
  ]);
  if (cents > posted - pendingOut) return { error: t.bank.insufficientFunds };

  await db.$transaction([
    db.transaction.create({
      data: {
        accountId: checking.id,
        type: "GOAL",
        status: "POSTED",
        amountCents: -cents,
        reference: newReference("G"),
        note: `To goal: ${goal.name}`,
        postedAt: new Date(),
      },
    }),
    db.savingsGoal.update({ where: { id: goal.id }, data: { currentCents: goal.currentCents + cents } }),
  ]);
  revalidatePath("/goals");
  return { ok: "1" };
}

// Return a goal's money to checking and close it.
export async function releaseGoalAction(formData: FormData) {
  const user = await requireClient();
  const goalId = String(formData.get("goalId"));
  const goal = await db.savingsGoal.findFirst({ where: { id: goalId, userId: user.id } });
  if (!goal) return;

  const checking = await ensureAccount(user.id);
  await db.$transaction([
    ...(goal.currentCents > 0
      ? [
          db.transaction.create({
            data: {
              accountId: checking.id,
              type: "GOAL",
              status: "POSTED",
              amountCents: goal.currentCents,
              reference: newReference("G"),
              note: `From goal: ${goal.name}`,
              postedAt: new Date(),
            },
          }),
        ]
      : []),
    db.savingsGoal.delete({ where: { id: goal.id } }),
  ]);
  revalidatePath("/goals");
}
