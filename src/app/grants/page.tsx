import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getDict, getLocale } from "@/i18n/server";
import { AppShell, Page } from "@/components/app-shell";
import { Card, SectionHead } from "@/components/ui";
import { Icons } from "@/components/icons";
import { GrantForm } from "./grant-form";

export const metadata = { title: "Grants — Northstone Trust Bank" };

export default async function GrantsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status === "PENDING") redirect("/onboarding");
  if (user.status !== "ACTIVE") redirect("/login");

  const t = await getDict();
  await getLocale();

  const programs = [
    { value: "BUSINESS", label: t.services.programBusiness },
    { value: "EDUCATION", label: t.services.programEducation },
    { value: "HOME", label: t.services.programHome },
    { value: "EMERGENCY", label: t.services.programEmergency },
    { value: "COMMUNITY", label: t.services.programCommunity },
    { value: "HEALTH", label: t.services.programHealth },
  ];

  return (
    <AppShell user={user} active="grants" title={t.services.grantsHeading} subtitle={t.services.grantsLede}>
      <Page className="max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-600">
            <Icons.gift className="h-[22px] w-[22px]" />
          </span>
          <p className="text-sm leading-relaxed text-fg-muted">{t.services.reviewNote}</p>
        </div>

        <Card>
          <SectionHead title={t.services.grantsHeading} />
          <div className="mt-5">
            <GrantForm
              labels={{
                program: t.services.grantProgram,
                programHint: t.services.grantProgramHint,
                programs,
                amount: t.services.amountRequested,
                amountPlaceholder: t.services.amountPlaceholder,
                employment: t.services.grantEmployment,
                employments: [
                  { value: "EMPLOYED", label: t.services.emEmployed },
                  { value: "SELF_EMPLOYED", label: t.services.emSelf },
                  { value: "UNEMPLOYED", label: t.services.emUnemployed },
                  { value: "RETIRED", label: t.services.emRetired },
                  { value: "STUDENT", label: t.services.emStudent },
                ],
                householdIncome: t.services.grantIncome,
                incomes: [
                  { value: "U15", label: t.services.incUnder15 },
                  { value: "15_30", label: t.services.inc15to30 },
                  { value: "30_60", label: t.services.inc30to60 },
                  { value: "60_100", label: t.services.inc60to100 },
                  { value: "O100", label: t.services.incOver100 },
                ],
                dependents: t.services.grantDependents,
                reason: t.services.reason,
                reasonHint: t.services.reasonHint,
                choose: t.products.choose,
                submit: t.services.applyGrant,
                submitting: t.auth.submitting,
              }}
            />
          </div>
        </Card>
      </Page>
    </AppShell>
  );
}
