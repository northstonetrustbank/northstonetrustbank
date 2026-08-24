"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { saveMethodEta } from "@/lib/method-eta";
import { methodDef } from "@/lib/methods";
import type { FormState } from "./auth-actions";

async function requireAdmin() {
  const admin = await getSessionUser();
  if (!admin || !isAdmin(admin.role) || admin.status !== "ACTIVE") {
    throw new Error("Not authorized");
  }
  return admin;
}

// Create or update a method (keyed by its catalog key) with its deposit route.
export async function saveMethodAction(formData: FormData) {
  const admin = await requireAdmin();
  const key = String(formData.get("key") ?? "").trim().toUpperCase();
  if (!key) return;
  const def = methodDef(key);

  const data = {
    label: String(formData.get("label") ?? "").trim() || def.label,
    enabled: formData.get("enabled") === "on",
    accountTypes: (() => {
      const v = String(formData.get("accountTypes") ?? "ALL");
      return ["ALL", "PERSONAL", "COMMERCIAL"].includes(v) ? v : "ALL";
    })(),
    forDeposit: formData.get("forDeposit") === "on",
    forWithdrawal: formData.get("forWithdrawal") === "on",
    routeName: String(formData.get("routeName") ?? "").trim() || null,
    routeIdentifier: String(formData.get("routeIdentifier") ?? "").trim() || null,
    routeInstitution: String(formData.get("routeInstitution") ?? "").trim() || null,
    routeInstructions: String(formData.get("routeInstructions") ?? "").trim() || null,
  };

  await db.depositMethod.upsert({
    where: { key },
    update: data,
    create: { key, ...data },
  });

  await saveMethodEta(key, String(formData.get("etaLabel") ?? "").trim() || null);

  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: "METHOD_SAVED",
    targetType: "METHOD",
    targetId: key,
    details: `${data.enabled ? "Enabled" : "Disabled"} ${data.label} (${data.accountTypes})`,
  });

  revalidatePath("/admin/methods");
}

export async function toggleMethodAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  const method = await db.depositMethod.findUnique({ where: { id } });
  if (!method) return;
  await db.depositMethod.update({ where: { id }, data: { enabled: !method.enabled } });
  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: "METHOD_TOGGLED",
    targetType: "METHOD",
    targetId: method.key,
    details: `${!method.enabled ? "Enabled" : "Disabled"} ${method.label}`,
  });
  revalidatePath("/admin/methods");
}

// Client asks for a method that isn't offered yet — notifies admins.
export async function requestMethodAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const wanted = String(formData.get("wanted") ?? "").trim().slice(0, 80);
  if (!wanted) return;

  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: "METHOD_REQUESTED",
    targetType: "USER",
    targetId: user.id,
    details: `Requested payment method: ${wanted}`,
  });

  const admins = await db.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } }, select: { id: true } });
  await db.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      title: "Method request",
      body: `${user.firstName} (${user.email}) requested a payment method: ${wanted}`,
    })),
  });

  revalidatePath("/deposit");
}
