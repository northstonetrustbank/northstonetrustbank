"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import {
  ensureAccount,
  ensureAccountOfKind,
  getSavings,
  balanceCents,
  transferBetween,
  formatMoney,
  newReference,
  pendingWithdrawalCents,
} from "@/lib/bank";
import { productDef, fieldsFor, isCardTier } from "@/lib/products";
import { getDict } from "@/i18n/server";
import type { FormState } from "./auth-actions";

const MAX_AMOUNT_CENTS = 100_000_000;

async function requireClient() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.status !== "ACTIVE" || user.role !== "CLIENT") redirect("/login");
  return user;
}

// ---------- open a savings account (instant) ----------

export async function openSavingsAction() {
  const user = await requireClient();
  await ensureAccountOfKind(user.id, "SAVINGS");
  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: "SAVINGS_OPENED",
    targetType: "USER",
    targetId: user.id,
  });
  revalidatePath("/dashboard");
  revalidatePath("/product/SAVINGS");
}

// ---------- transfer between checking and savings ----------

export async function transferAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDict();
  const user = await requireClient();

  const direction = String(formData.get("direction")) === "TO_CHECKING" ? "TO_CHECKING" : "TO_SAVINGS";
  const raw = String(formData.get("amount") ?? "").trim().replace(",", ".");
  const amountCents = Math.round(Number(raw) * 100);
  if (!raw || !Number.isFinite(amountCents) || amountCents <= 0 || amountCents > MAX_AMOUNT_CENTS) {
    return { error: t.bank.amountInvalid };
  }

  const checking = await ensureAccount(user.id);
  const savings = await getSavings(user.id);
  if (!savings) return { error: t.bank.savingsNeeded };

  const from = direction === "TO_SAVINGS" ? checking : savings;
  const to = direction === "TO_SAVINGS" ? savings : checking;

  const fromBalance = await balanceCents(from.id);
  if (amountCents > fromBalance) return { error: t.bank.insufficientFunds };

  await transferBetween(from.id, to.id, amountCents, t.bank.transferNote);
  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: "TRANSFER",
    targetType: "USER",
    targetId: user.id,
    details: `${formatMoney(amountCents)} ${direction === "TO_SAVINGS" ? "to savings" : "to checking"}`,
  });

  redirect("/dashboard?transferred=1");
}

// ---------- product application ----------

export async function submitApplicationAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const t = await getDict();
  const user = await requireClient();

  const productKey = String(formData.get("productKey") ?? "").trim();
  const def = productDef(user.accountType, productKey);
  if (!def || def.kind !== "apply") return { error: t.products.applyError };

  // Block duplicate open applications for the same product.
  const open = await db.productApplication.findFirst({
    where: { userId: user.id, productKey, status: { in: ["SUBMITTED", "APPROVED"] } },
  });
  if (open) return { error: t.products.alreadyApplied };

  // Cards don't take a requested amount — the chosen tier carries its range.
  let amountCents: number | null = null;
  if (def.amount && !def.card) {
    const raw = String(formData.get("amount") ?? "").trim().replace(",", ".");
    const cents = Math.round(Number(raw) * 100);
    if (!raw || !Number.isFinite(cents) || cents <= 0 || cents > MAX_AMOUNT_CENTS) {
      return { error: t.bank.amountInvalid };
    }
    amountCents = cents;
  }

  const tierRaw = String(formData.get("requestedTier") ?? "").trim().toUpperCase();
  const requestedTier = def.card && isCardTier(tierRaw) ? tierRaw : null;

  const termRaw = Number(formData.get("termMonths"));
  const termMonths =
    def.term && Number.isFinite(termRaw) && termRaw > 0 && termRaw <= 480 ? Math.round(termRaw) : null;

  // The product's own questions, validated against its field definitions.
  const details: Record<string, string | number> = {};
  for (const field of fieldsFor(def)) {
    if (field.showIf) {
      const dependency = String(formData.get(field.showIf.field) ?? "");
      if (!field.showIf.equals.includes(dependency)) continue;
    }
    const raw = String(formData.get(field.name) ?? "").trim();
    if (!raw) {
      if (field.required) return { error: t.products.requiredField };
      continue;
    }
    if (field.kind === "money") {
      const cents = Math.round(Number(raw.replace(",", ".")) * 100);
      if (!Number.isFinite(cents) || cents < 0 || cents > MAX_AMOUNT_CENTS) {
        return { error: t.bank.amountInvalid };
      }
      details[field.name] = cents;
    } else if (field.kind === "number") {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return { error: t.products.requiredField };
      details[field.name] = Math.round(n);
    } else if (field.kind === "select") {
      if (!(field.options ?? []).includes(raw)) return { error: t.products.requiredField };
      details[field.name] = raw;
    } else {
      details[field.name] = raw.slice(0, 300);
    }
  }

  const purpose = typeof details.purpose === "string" ? details.purpose : null;

  await db.productApplication.create({
    data: {
      userId: user.id,
      productKey,
      amountCents,
      purpose,
      requestedTier,
      termMonths,
      details,
    },
  });

  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: "PRODUCT_APPLIED",
    targetType: "USER",
    targetId: user.id,
    details: `Applied for ${productKey}${amountCents ? ` (${formatMoney(amountCents)})` : ""}`,
  });

  redirect(`/product/${productKey}`);
}

// Draw from a revolving credit line into checking (increases what's owed).
export async function drawCreditAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDict();
  const user = await requireClient();
  const appId = String(formData.get("appId"));
  const raw = String(formData.get("amount") ?? "").trim().replace(",", ".");
  const cents = Math.round(Number(raw) * 100);
  if (!raw || !Number.isFinite(cents) || cents <= 0) return { error: t.bank.amountInvalid };

  const app = await db.productApplication.findFirst({
    where: { id: appId, userId: user.id, status: "APPROVED" },
  });
  const def = app ? productDef(user.accountType, app.productKey) : undefined;
  if (!app || def?.credit !== "revolving") return null;
  if (app.frozen) return { error: t.products.frozenNote };

  const limit = app.approvedAmountCents ?? 0;
  const owed = app.outstandingCents ?? 0;
  if (cents > limit - owed) return { error: t.products.overAvailable };

  const checking = await ensureAccount(user.id);
  await db.$transaction([
    db.transaction.create({
      data: {
        accountId: checking.id,
        applicationId: app.id,
        type: "CREDIT",
        status: "POSTED",
        amountCents: cents,
        reference: newReference("C"),
        note: `Credit line draw`,
        postedAt: new Date(),
      },
    }),
    db.productApplication.update({ where: { id: app.id }, data: { outstandingCents: owed + cents } }),
  ]);
  redirect(`/product/${app.productKey}?drawn=1`);
}

// Repay a loan or credit line from checking (reduces what's owed).
export async function payProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDict();
  const user = await requireClient();
  const appId = String(formData.get("appId"));
  const raw = String(formData.get("amount") ?? "").trim().replace(",", ".");
  const cents = Math.round(Number(raw) * 100);
  if (!raw || !Number.isFinite(cents) || cents <= 0) return { error: t.bank.amountInvalid };

  const app = await db.productApplication.findFirst({
    where: { id: appId, userId: user.id, status: "APPROVED" },
  });
  if (!app) return null;
  const owed = app.outstandingCents ?? 0;
  if (owed <= 0) return { error: t.products.overOwed };
  if (cents > owed) return { error: t.products.overOwed };

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
        applicationId: app.id,
        type: "PAYMENT",
        status: "POSTED",
        amountCents: -cents,
        reference: newReference("P"),
        note: `Payment`,
        postedAt: new Date(),
      },
    }),
    db.productApplication.update({ where: { id: app.id }, data: { outstandingCents: owed - cents } }),
  ]);
  redirect(`/product/${app.productKey}?paid=1`);
}

// Client freezes/unfreezes their own approved card.
export async function toggleFreezeAction(formData: FormData) {
  const user = await requireClient();
  const appId = String(formData.get("appId"));

  const app = await db.productApplication.findFirst({
    where: { id: appId, userId: user.id, status: "APPROVED" },
  });
  if (!app) return;

  await db.productApplication.update({
    where: { id: app.id },
    data: { frozen: !app.frozen },
  });
  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: app.frozen ? "CARD_UNFROZEN" : "CARD_FROZEN",
    targetType: "APPLICATION",
    targetId: app.id,
    details: `${app.frozen ? "Unfroze" : "Froze"} ${app.productKey}`,
  });

  revalidatePath(`/product/${app.productKey}`);
  revalidatePath("/dashboard");
}

// ---------- card controls (contactless / online payments) ----------

/**
 * A client turning their own card's contactless or online payments on or off.
 * Spending limits are deliberately NOT settable here — those are set by the
 * team on the application, the same way a real card's limits are.
 */
export async function updateCardControlAction(formData: FormData) {
  const user = await requireClient();
  const appId = String(formData.get("appId"));
  const control = String(formData.get("control"));
  if (control !== "contactless" && control !== "onlinePayments") return;

  const def = await db.productApplication.findFirst({
    where: { id: appId, userId: user.id, status: "APPROVED" },
  });
  if (!def) return;

  const next = !def[control];
  await db.productApplication.update({ where: { id: def.id }, data: { [control]: next } });

  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: next ? "CARD_CONTROL_ENABLED" : "CARD_CONTROL_DISABLED",
    targetType: "APPLICATION",
    targetId: def.id,
    details: `${control} ${next ? "enabled" : "disabled"} on ${def.productKey}`,
  });

  revalidatePath("/cards");
  revalidatePath(`/product/${def.productKey}`);
}
