import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getDict, getLocale } from "@/i18n/server";
import { AuthShell } from "@/components/auth-shell";
import { IdentityStep } from "@/app/onboarding/identity-step";

export const metadata = { title: "Your details — Northstone Trust Bank" };

/**
 * The same customer identification step, for clients who opened an account
 * before it existed.
 *
 * New applicants meet this inside onboarding. These clients are already ACTIVE
 * with money in the account, so they get it as a gate on the way to the
 * dashboard instead — AppShell sends any client with details missing here, and
 * this page renders outside AppShell so there is no loop.
 */
export default async function CompleteProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status === "PENDING") redirect("/onboarding");
  if (user.status !== "ACTIVE") redirect("/login");
  // Already given — nothing to complete.
  if (user.identityGivenAt) redirect("/dashboard");

  const t = await getDict();
  const locale = await getLocale();

  return (
    <AuthShell
      locale={locale}
      panelTitle={t.identity.completeTitle}
      panelBody={t.identity.completeBody}
    >
      <IdentityStep
        labels={{ ...t.identity, title: t.identity.completeTitle, body: t.identity.completeBody }}
        defaults={{ phone: user.phone, country: user.country ?? "United States" }}
      />
    </AuthShell>
  );
}
