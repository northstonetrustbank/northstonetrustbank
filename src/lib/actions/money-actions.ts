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
    // Same-bank instant transfer.
    const ref = newReference("S");
    await db.$transaction([
      db.transaction.create({
        data: {
          accountId: senderChecking.id,
          type: "SEND",
          status: "POSTED",
          amountCents: -amountCents,
          reference: `${ref}-O`,
          note: `Sent to ${recipient}`,
          methodKey: "SEND",
          postedAt: new Date(),
        },
      }),
      db.transaction.create({
        data: {
          accountId: recipientAccountId,
          type: "SEND",
          status: "POSTED",
          amountCents: amountCents,
          reference: `${ref}-I`,
          note: `Received from ${user.firstName} ${user.lastName}`,
          methodKey: "SEND",
          postedAt: new Date(),
        },
      }),
      db.notification.create({
        data: {
          userId: recipientUserId,
          title: "You received a transfer",
          body: `${user.firstName} ${user.lastName} sent you ${formatMoney(amountCents)}.`,
        },
      }),
    ]);
    await audit({
      actorId: user.id,
      actorLabel: user.email,
      action: "SEND_INTERNAL",
      targetType: "TRANSACTION",
      targetId: ref,
      details: `${formatMoney(amountCents)} to ${recipient}`,
    });

    // Email both sides (reuses the localized credit/debit templates).
    const recipientUser = await db.user.findUnique({ where: { id: recipientUserId } });
    const [senderBal, recipientBal] = await Promise.all([
      balanceCents(senderChecking.id),
      balanceCents(recipientAccountId),
    ]);
    await sendAdjustmentEmail(
      user.email, user.firstName, user.locale, "DEBIT",
      formatMoney(amountCents, user.locale, user.currency), `${ref}-O`,
      `Sent to ${recipient}`, formatMoney(senderBal, user.locale, user.currency)
    );
    if (recipientUser) {
      await sendAdjustmentEmail(
        recipientUser.email, recipientUser.firstName, recipientUser.locale, "CREDIT",
        formatMoney(amountCents, recipientUser.locale, recipientUser.currency), `${ref}-I`,
        `Received from ${user.firstName} ${user.lastName}`, formatMoney(recipientBal, recipientUser.locale, recipientUser.currency)
      );
    }
    redirect("/dashboard?sent=instant");
  }

  // Not a Northstone account — direct them to the Withdraw flow for external transfers.
  return { error: t.send.externalUseWithdraw };
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
