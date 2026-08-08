"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes, randomInt } from "crypto";
import path from "path";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  getSessionUser,
  hashPassword,
  verifyPassword,
  isAdmin,
  setPendingTwoFactor,
  getPendingTwoFactor,
  clearPendingTwoFactor,
  MAX_2FA_ATTEMPTS,
} from "@/lib/auth";
import { audit } from "@/lib/audit";
import {
  sendWelcomeEmail,
  sendKycReceivedEmail,
  sendPasswordResetEmail,
  sendLoginCodeEmail,
} from "@/lib/email";
import { uploadFile, deleteFiles, KYC_BUCKET } from "@/lib/storage";
import { getDict, getLocale } from "@/i18n/server";

export type FormState = { error?: string; ok?: string } | null;

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const DOC_TYPES = ["GOVERNMENT_ID", "DRIVERS_LICENSE", "PASSPORT"] as const;

// ---------- signup ----------

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDict();
  const locale = await getLocale();

  const schema = z.object({
    firstName: z.string().trim().min(1, t.errors.firstNameRequired).max(60),
    lastName: z.string().trim().min(1, t.errors.lastNameRequired).max(60),
    email: z.string().trim().toLowerCase().email(t.errors.emailInvalid),
    phone: z.string().trim().min(6, t.errors.phoneInvalid).max(20),
    password: z
      .string()
      .min(10, t.errors.passwordWeak)
      .regex(/[a-zA-Z]/, t.errors.passwordWeak)
      .regex(/[0-9]/, t.errors.passwordWeak),
  });

  const parsed = schema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { error: t.errors.emailExists };
  }

  const accountTypeRaw = String(formData.get("accountType") ?? "");
  const accountType = accountTypeRaw === "COMMERCIAL" ? "COMMERCIAL" : "PERSONAL";
  const currency = String(formData.get("currency") ?? "") === "EUR" ? "EUR" : "USD";

  const passwordHash = await hashPassword(data.password);
  const verifyToken = randomBytes(32).toString("hex");

  const user = await db.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      accountType,
      currency,
      locale,
      tokens: {
        create: {
          token: verifyToken,
          purpose: "EMAIL_VERIFY",
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48), // 48h
        },
      },
    },
  });

  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: "USER_SIGNUP",
    targetType: "USER",
    targetId: user.id,
    details: `New client application: ${data.firstName} ${data.lastName}`,
  });

  await sendWelcomeEmail(user.email, user.firstName, verifyToken, locale);

  await createSession(user.id, user.role);
  redirect("/onboarding");
}

// ---------- resend verification email ----------

export async function resendVerificationAction(
  _prev: FormState,
  _formData: FormData
): Promise<FormState> {
  const t = await getDict();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.emailVerified) return null;

  const lastToken = await db.verificationToken.findFirst({
    where: { userId: user.id, purpose: "EMAIL_VERIFY" },
    orderBy: { createdAt: "desc" },
  });
  if (lastToken && Date.now() - lastToken.createdAt.getTime() < 60_000) {
    return { error: t.onboarding.resendWait };
  }

  const verifyToken = randomBytes(32).toString("hex");
  await db.verificationToken.create({
    data: {
      userId: user.id,
      token: verifyToken,
      purpose: "EMAIL_VERIFY",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
    },
  });
  await sendWelcomeEmail(user.email, user.firstName, verifyToken, user.locale);
  return { ok: t.onboarding.resent };
}

// ---------- KYC submission (after email verification) ----------

export async function submitKycAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDict();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.emailVerified || user.status !== "PENDING") redirect("/onboarding");

  const docTypeRaw = String(formData.get("docType") ?? "");
  const docType = (DOC_TYPES as readonly string[]).includes(docTypeRaw)
    ? docTypeRaw
    : "GOVERNMENT_ID";

  // Front, back and a selfie holding the document. A passport has no back.
  const wanted: { side: string; field: string }[] = [
    { side: "FRONT", field: "documentFront" },
    ...(docType === "PASSPORT" ? [] : [{ side: "BACK", field: "documentBack" }]),
    { side: "SELFIE", field: "documentSelfie" },
  ];

  const uploads: { side: string; file: File }[] = [];
  for (const { side, field } of wanted) {
    const file = formData.get(field);
    if (!(file instanceof File) || file.size === 0) return { error: t.errors.needFile };
    if (file.size > MAX_UPLOAD_BYTES) return { error: t.errors.fileTooBig };
    if (!ALLOWED_MIME.includes(file.type)) return { error: t.errors.fileType };
    uploads.push({ side, file });
  }

  // Store the new photos BEFORE touching the old ones. If the bucket is
  // unreachable — misconfigured storage, a network blip — an applicant who was
  // resubmitting would otherwise be left with neither set and no explanation.
  const stored: { side: string; file: File; storedName: string }[] = [];
  try {
    for (const { side, file } of uploads) {
      const ext = path.extname(file.name).toLowerCase() || ".bin";
      const storedName = `${randomBytes(16).toString("hex")}${ext}`;
      await uploadFile(KYC_BUCKET, storedName, Buffer.from(await file.arrayBuffer()), file.type);
      stored.push({ side, file, storedName });
    }
  } catch {
    // Roll back whatever did land so the bucket doesn't collect orphans.
    if (stored.length > 0) {
      await deleteFiles(KYC_BUCKET, stored.map((s) => s.storedName)).catch(() => {});
    }
    return { error: t.errors.uploadFailed };
  }

  // Only now retire the earlier attempt, so a resubmission doesn't stack up.
  const previous = await db.kycDocument.findMany({ where: { userId: user.id } });
  if (previous.length > 0) {
    await deleteFiles(KYC_BUCKET, previous.map((d) => d.storedName)).catch(() => {});
    await db.kycDocument.deleteMany({ where: { userId: user.id } });
  }

  for (const { side, file, storedName } of stored) {
    await db.kycDocument.create({
      data: {
        userId: user.id,
        docType,
        side,
        fileName: file.name,
        storedName,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    });
  }

  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: "KYC_SUBMITTED",
    targetType: "USER",
    targetId: user.id,
    details: `Identity documents submitted (${docType}: ${uploads.map((u) => u.side).join(", ")})`,
  });

  await sendKycReceivedEmail(user.email, user.firstName, user.locale);

  revalidatePath("/onboarding");
  return null;
}

// ---------- forgot / reset password ----------

export async function forgotPasswordAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const t = await getDict();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) return { error: t.errors.emailInvalid };

  const user = await db.user.findUnique({ where: { email } });
  // Only act if the user exists, but always return the same message so we
  // never reveal whether an email is registered.
  if (user) {
    const token = randomBytes(32).toString("hex");
    await db.verificationToken.create({
      data: {
        userId: user.id,
        token,
        purpose: "PASSWORD_RESET",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour
      },
    });
    await audit({
      actorId: user.id,
      actorLabel: user.email,
      action: "PASSWORD_RESET_REQUESTED",
      targetType: "USER",
      targetId: user.id,
    });
    await sendPasswordResetEmail(user.email, user.firstName, token, user.locale);
  }

  return { ok: t.reset.sent };
}

export async function resetPasswordAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const t = await getDict();
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const pwCheck = z
    .string()
    .min(10)
    .regex(/[a-zA-Z]/)
    .regex(/[0-9]/)
    .safeParse(password);
  if (!pwCheck.success) return { error: t.errors.passwordWeak };
  if (password !== confirm) return { error: t.reset.mismatch };

  const record = await db.verificationToken.findUnique({
    where: { token },
    include: { user: true },
  });
  if (
    !record ||
    record.purpose !== "PASSWORD_RESET" ||
    record.usedAt ||
    record.expiresAt < new Date()
  ) {
    return { error: t.reset.invalid };
  }

  const passwordHash = await hashPassword(password);
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);
  await audit({
    actorId: record.userId,
    actorLabel: record.user.email,
    action: "PASSWORD_RESET_COMPLETED",
    targetType: "USER",
    targetId: record.userId,
  });

  return { ok: t.reset.done };
}

// ---------- login / logout ----------

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDict();

  // Clients sign in with an email; staff sign in at /admin with a username.
  // One field accepts either, so there is a single login path to reason about.
  const schema = z.object({
    identifier: z.string().trim().toLowerCase().min(1, t.errors.invalidCreds),
    password: z.string().min(1, t.errors.invalidCreds),
  });
  const parsed = schema.safeParse({
    identifier: formData.get("identifier") ?? formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { identifier } = parsed.data;
  // Usernames are stored lowercase, and the identifier is already lowercased,
  // so "Admin" and "admin" both resolve. Never pass an empty string to a
  // findUnique on a nullable column — it would match a row with no username.
  const user = identifier.includes("@")
    ? await db.user.findUnique({ where: { email: identifier } })
    : await db.user.findUnique({ where: { username: identifier } });

  // Same message for unknown identifier and wrong password — don't leak which.
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: t.errors.invalidCreds };
  }

  if (user.status === "BLOCKED") return { error: t.errors.blocked };
  if (user.status === "REJECTED") return { error: t.errors.rejected };

  // Two-factor is opt-in. When it is on, the password alone gets you no
  // session — only a short-lived pending token and a code in your inbox.
  if (user.twoFactorEnabled) {
    await issueTwoFactorCode(user.id, user.email, user.firstName, user.locale);
    await setPendingTwoFactor(user.id);
    redirect("/login/verify");
  }

  await createSession(user.id, user.role);
  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: "USER_LOGIN",
    targetType: "USER",
    targetId: user.id,
  });

  if (isAdmin(user.role)) redirect("/admin");
  if (user.status === "PENDING") redirect("/onboarding");
  redirect("/dashboard");
}

// ---------- two-factor at sign-in ----------

const TWO_FACTOR_MINUTES = 10;

/** Six digits, generated with a CSPRNG rather than Math.random. */
function newLoginCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Replaces any outstanding code with a fresh one and emails it. The code is
 * stored as `<userId>.<code>` so two clients can never collide on the same six
 * digits, and so a lookup is scoped to one account by construction.
 */
async function issueTwoFactorCode(
  userId: string,
  email: string,
  firstName: string,
  locale: string
) {
  await db.verificationToken.deleteMany({ where: { userId, purpose: "TWO_FACTOR" } });
  const code = newLoginCode();
  await db.verificationToken.create({
    data: {
      userId,
      token: `${userId}.${code}`,
      purpose: "TWO_FACTOR",
      expiresAt: new Date(Date.now() + TWO_FACTOR_MINUTES * 60 * 1000),
    },
  });
  await sendLoginCodeEmail(email, firstName, code, locale, TWO_FACTOR_MINUTES);
}

export async function verifyTwoFactorAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const t = await getDict();
  const pending = await getPendingTwoFactor();
  if (!pending) return { error: t.twoFactor.expired };

  const user = await db.user.findUnique({ where: { id: pending.userId } });
  if (!user) {
    await clearPendingTwoFactor();
    return { error: t.twoFactor.expired };
  }

  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  const token = await db.verificationToken.findFirst({
    where: {
      userId: user.id,
      purpose: "TWO_FACTOR",
      token: `${user.id}.${code}`,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!token) {
    const attempts = pending.attempts + 1;
    // Out of attempts: burn the code and send them back to the start, so a
    // stolen password can't be paired with a brute-forced six digits.
    if (attempts >= MAX_2FA_ATTEMPTS) {
      await db.verificationToken.deleteMany({
        where: { userId: user.id, purpose: "TWO_FACTOR" },
      });
      await clearPendingTwoFactor();
      return { error: t.twoFactor.tooManyAttempts };
    }
    await setPendingTwoFactor(user.id, attempts);
    return { error: t.twoFactor.wrongCode };
  }

  await db.verificationToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
  await clearPendingTwoFactor();
  await createSession(user.id, user.role);
  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: "USER_LOGIN",
    targetType: "USER",
    targetId: user.id,
    details: "Two-factor verified",
  });

  if (isAdmin(user.role)) redirect("/admin");
  if (user.status === "PENDING") redirect("/onboarding");
  redirect("/dashboard");
}

export async function resendTwoFactorCodeAction(): Promise<FormState> {
  const t = await getDict();
  const pending = await getPendingTwoFactor();
  if (!pending) return { error: t.twoFactor.expired };
  const user = await db.user.findUnique({ where: { id: pending.userId } });
  if (!user) return { error: t.twoFactor.expired };

  await issueTwoFactorCode(user.id, user.email, user.firstName, user.locale);
  return { ok: t.twoFactor.resent };
}

export async function cancelTwoFactorAction() {
  await clearPendingTwoFactor();
  redirect("/login");
}

export async function logoutAction() {
  // Staff sign out from /admin and should land back on the staff sign-in, not
  // on the client login page. The role is read before the session is destroyed.
  const user = await getSessionUser();
  const staff = user ? isAdmin(user.role) : false;
  await destroySession();
  redirect(staff ? "/admin" : "/login");
}
