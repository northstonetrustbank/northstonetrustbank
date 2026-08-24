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
import { getPayee, payeeCounterparty, payeeLabel } from "@/lib/payees";
import { methodDef } from "@/lib/methods";
import { getDict } from "@/i18n/server";
import type { FormState } from "./auth-actions";

const MAX_AMOUNT_CENTS = 100_000_000;

async function requireClient() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.status !== "ACTIVE" || user.role !== "CLIENT") redirect("/login");
  return user;
}

// ---------- managing the address book ----------

export async function savePayeeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDict();
  const user = await requireClient();

  const id = String(formData.get("payeeId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) return { error: t.payments.nameRequired };

  const nickname = String(formData.get("nickname") ?? "").trim().slice(0, 60) || null;
  const kindRaw = String(formData.get("kind") ?? "BILLER").toUpperCase();
  const wantsInternal = kindRaw === "INTERNAL";
  const accountRef = String(formData.get("accountRef") ?? "").trim().slice(0, 120);
  if (!accountRef) return { error: t.payments.accountRefRequired };

  let kind = wantsInternal ? "INTERNAL" : kindRaw === "PERSON" ? "PERSON" : "BILLER";
  let methodKey: string | null = null;
  let institution: string | null = null;
  let internalUserId: string | null = null;

  if (wantsInternal) {
    // Resolve the Northstone client now, so the client finds out they mistyped
    // the account number here rather than at the moment they try to pay.
    const target = await resolveInternal(accountRef);
    if (!target) return { error: t.payments.internalNotFound };
    if (target.userId === user.id) return { error: t.payments.internalSelf };
    internalUserId = target.userId;
    institution = "Northstone Trust Bank";
  } else {
    methodKey = String(formData.get("methodKey") ?? "BANK").trim().toUpperCase();
    // A payee can only use a rail the bank actually sends money on.
    const enabled = await db.depositMethod.findFirst({
      where: { key: methodKey, enabled: true, forWithdrawal: true },
      select: { id: true },
    });
    if (!enabled) return { error: t.payments.methodUnavailable };
    institution = String(formData.get("institution") ?? "").trim().slice(0, 80) || null;
    kind = kindRaw === "PERSON" ? "PERSON" : "BILLER";
  }

  const data = { name, nickname, kind, methodKey, accountRef, institution, internalUserId };

  try {
    if (id) {
      const existing = await db.payee.findFirst({ where: { id, userId: user.id } });
      if (!existing) return { error: t.payments.payeeNotFound };
      await db.payee.update({ where: { id }, data });
    } else {
      await db.payee.create({ data: { ...data, userId: user.id } });
    }
  } catch {
    // The table is not there yet. Say so plainly instead of throwing a 500.
    return { error: t.payments.notReady };
  }

  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: id ? "PAYEE_UPDATED" : "PAYEE_ADDED",
    targetType: "PAYEE",
    targetId: id || name,
    details: `${user.email} ${id ? "updated" : "added"} payee ${name}`,
  });

  revalidatePath("/payments");
  return { ok: "1" };
}

/** Payees are archived, never deleted — their payment history has to survive. */
export async function archivePayeeAction(formData: FormData) {
  const user = await requireClient();
  const id = String(formData.get("payeeId") ?? "");
  try {
    const existing = await db.payee.findFirst({ where: { id, userId: user.id } });
    if (!existing) return;
    await db.payee.update({ where: { id }, data: { archivedAt: new Date() } });
    await audit({
      actorId: user.id,
      actorLabel: user.email,
      action: "PAYEE_REMOVED",
      targetType: "PAYEE",
      targetId: id,
      details: `${user.email} removed payee ${existing.name}`,
    });
  } catch {
    return;
  }
  revalidatePath("/payments");
}

// ---------- paying one ----------

export async function payBillAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDict();
  const user = await requireClient();

  const payeeId = String(formData.get("payeeId") ?? "").trim();
  const payee = await getPayee(user.id, payeeId);
  if (!payee) return { error: t.payments.payeeNotFound };

  const raw = String(formData.get("amount") ?? "").trim().replace(",", ".");
  const amountCents = Math.round(Number(raw) * 100);
  if (!raw || !Number.isFinite(amountCents) || amountCents <= 0 || amountCents > MAX_AMOUNT_CENTS) {
    return { error: t.bank.amountInvalid };
  }

  const memo = String(formData.get("memo") ?? "").trim().slice(0, 140);

  // Same gate as every other outbound movement.
  const word = String(formData.get("securityWord") ?? "").trim().toLowerCase();
  if (!user.securityWordHash) return { error: t.bank.securityWordMissing };
  if (!(await verifyPassword(word, user.securityWordHash))) {
    return { error: t.bank.securityWordWrong };
  }

  const checking = await ensureAccount(user.id);
  const [posted, pendingOut] = await Promise.all([
    balanceCents(checking.id),
    pendingWithdrawalCents(checking.id),
  ]);
  if (amountCents > posted - pendingOut) return { error: t.bank.insufficientFunds };

  const label = payeeLabel(payee);
  const note = memo ? `${label} — ${memo}` : label;

  // A payee inside the bank settles at once; anything leaving the bank queues
  // for the same review a withdrawal gets. Same money, same controls.
  if (payee.internalUserId) {
    const target = await db.user.findUnique({ where: { id: payee.internalUserId } });
    if (!target || target.status !== "ACTIVE") return { error: t.payments.internalNotFound };
    const targetAccount = await ensureAccount(target.id);

    const ref = newReference("P");
    await db.$transaction([
      db.transaction.create({
        data: {
          accountId: checking.id,
          type: "SEND",
          status: "POSTED",
          amountCents: -amountCents,
          reference: `${ref}-O`,
          note: `Paid ${note}`,
          methodKey: "SEND",
          payeeId: payee.id,
          postedAt: new Date(),
        },
      }),
      db.transaction.create({
        data: {
          accountId: targetAccount.id,
          type: "SEND",
          status: "POSTED",
          amountCents,
          reference: `${ref}-I`,
          note: `Payment from ${user.firstName} ${user.lastName}${memo ? ` — ${memo}` : ""}`,
          methodKey: "SEND",
          postedAt: new Date(),
        },
      }),
      db.notification.create({
        data: {
          userId: target.id,
          title: "You received a payment",
          body: `${user.firstName} ${user.lastName} paid you ${formatMoney(amountCents)}.`,
        },
      }),
      db.payee.update({ where: { id: payee.id }, data: { lastPaidAt: new Date() } }),
    ]);

    await audit({
      actorId: user.id,
      actorLabel: user.email,
      action: "BILL_PAID_INTERNAL",
      targetType: "TRANSACTION",
      targetId: ref,
      details: `${user.email} paid ${formatMoney(amountCents)} to ${label} (${ref})`,
    });

    const [senderBal, targetBal] = await Promise.all([
      balanceCents(checking.id),
      balanceCents(targetAccount.id),
    ]);
    await sendAdjustmentEmail(
      user.email, user.firstName, user.locale, "DEBIT",
      formatMoney(amountCents, user.locale, user.currency), `${ref}-O`,
      `Paid ${label}`, formatMoney(senderBal, user.locale, user.currency)
    );
    await sendAdjustmentEmail(
      target.email, target.firstName, target.locale, "CREDIT",
      formatMoney(amountCents, target.locale, target.currency), `${ref}-I`,
      `Payment from ${user.firstName} ${user.lastName}`,
      formatMoney(targetBal, target.locale, target.currency)
    );

    const sent = await db.transaction.findUnique({
      where: { reference: `${ref}-O` },
      select: { id: true },
    });
    revalidatePath("/payments");
    redirect(sent ? `/activity/${sent.id}?new=1` : "/payments?paid=1");
  }

  // Leaving the bank: a pending withdrawal, carrying the payee's details in
  // the same `counterparty` field the withdrawals queue already reads — so the
  // admin console needs no change to settle a bill payment.
  const reference = newReference("P");
  const created = await db.transaction.create({
    data: {
      accountId: checking.id,
      type: "WITHDRAWAL",
      status: "PENDING",
      amountCents: -amountCents,
      reference,
      methodKey: payee.methodKey ?? "BANK",
      counterparty: payeeCounterparty(payee, memo),
      note: `Bill payment — ${note}`,
      payeeId: payee.id,
    },
  });
  await db.payee.update({ where: { id: payee.id }, data: { lastPaidAt: new Date() } });

  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: "BILL_PAYMENT_REQUESTED",
    targetType: "TRANSACTION",
    targetId: reference,
    details:
      `${user.email} scheduled a ${methodDef(payee.methodKey ?? "BANK").label} bill payment of ` +
      `${formatMoney(amountCents)} to ${label} (${reference})`,
  });

  revalidatePath("/payments");
  redirect(`/activity/${created.id}?new=1`);
}

// ---------- helpers ----------

/** Find a Northstone client by account number or email. */
async function resolveInternal(ref: string) {
  const byNumber = await db.account.findUnique({
    where: { number: ref },
    include: { user: true },
  });
  if (byNumber && byNumber.user.role === "CLIENT" && byNumber.user.status === "ACTIVE") {
    return { userId: byNumber.userId };
  }
  if (ref.includes("@")) {
    const u = await db.user.findUnique({ where: { email: ref.toLowerCase() } });
    if (u && u.role === "CLIENT" && u.status === "ACTIVE") return { userId: u.id };
  }
  return null;
}
