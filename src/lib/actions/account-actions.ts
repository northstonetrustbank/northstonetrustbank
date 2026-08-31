"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getDict } from "@/i18n/server";
import type { FormState } from "./auth-actions";

/**
 * Turns two-factor on or off. Both directions need the password: turning it on
 * so a hijacked session can't lock the real owner out, and turning it off so a
 * hijacked session can't quietly remove the protection.
 */
export async function toggleTwoFactorAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const t = await getDict();
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const password = String(formData.get("password") ?? "");
  if (!(await verifyPassword(password, user.passwordHash))) {
    return { error: t.account.wrongPassword };
  }

  const enable = !user.twoFactorEnabled;
  await db.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: enable, twoFactorEnabledAt: enable ? new Date() : null },
  });

  // Any half-finished sign-in codes are no longer meaningful.
  await db.verificationToken.deleteMany({ where: { userId: user.id, purpose: "TWO_FACTOR" } });

  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: enable ? "TWO_FACTOR_ENABLED" : "TWO_FACTOR_DISABLED",
    targetType: "USER",
    targetId: user.id,
  });

  revalidatePath("/account");
  return { ok: enable ? t.twoFactor.enabled : t.twoFactor.disabled };
}

/**
 * Turns two-factor on during the mandatory setup right after sign-in. No
 * password re-entry: the session is minutes old, and enabling protection is a
 * security-positive action (disabling it, in toggleTwoFactorAction, still
 * requires the password). Lands the client on the dashboard.
 */
export async function enableTwoFactorSetupAction(
  _prev: FormState,
  _formData: FormData
): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.twoFactorEnabled) {
    await db.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true, twoFactorEnabledAt: new Date() },
    });
    await audit({
      actorId: user.id,
      actorLabel: user.email,
      action: "TWO_FACTOR_ENABLED",
      targetType: "USER",
      targetId: user.id,
    });
  }
  redirect("/dashboard");
}

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const t = await getDict();
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!(await verifyPassword(current, user.passwordHash))) {
    return { error: t.account.wrongPassword };
  }
  const check = z.string().min(10).regex(/[a-zA-Z]/).regex(/[0-9]/).safeParse(next);
  if (!check.success) return { error: t.errors.passwordWeak };
  if (next !== confirm) return { error: t.reset.mismatch };

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: "PASSWORD_CHANGED",
    targetType: "USER",
    targetId: user.id,
  });
  return { ok: t.account.passwordUpdated };
}

export async function setSecurityWordAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const t = await getDict();
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const password = String(formData.get("password") ?? "");
  const word = String(formData.get("securityWord") ?? "").trim();

  if (!(await verifyPassword(password, user.passwordHash))) {
    return { error: t.account.wrongPassword };
  }
  if (word.length < 3) return { error: t.account.securityWordTooShort };

  await db.user.update({
    where: { id: user.id },
    data: { securityWordHash: await hashPassword(word.toLowerCase()) },
  });
  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: "SECURITY_WORD_SET",
    targetType: "USER",
    targetId: user.id,
  });
  return { ok: t.account.securityWordSet };
}

// ---------- signed-in devices ----------

/**
 * Ends another device's session. The client's own session is left alone — the
 * sign-out button is for that — so a mis-click can't log them out of the very
 * page they are on.
 */
export async function revokeSessionAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sessionId = String(formData.get("sessionId"));
  if (!sessionId || sessionId === session.sid) return;

  const record = await db.session.findFirst({
    where: { id: sessionId, userId: session.userId, revokedAt: null },
  });
  if (!record) return;

  await db.session.update({ where: { id: record.id }, data: { revokedAt: new Date() } });

  await audit({
    actorId: session.userId,
    actorLabel: record.label,
    action: "SESSION_REVOKED",
    targetType: "SESSION",
    targetId: record.id,
    details: `Ended session on ${record.label}`,
  });

  revalidatePath("/account/security");
}
