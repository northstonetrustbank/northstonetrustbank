import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getDict, getLocale } from "@/i18n/server";
import { AppShell, Page } from "@/components/app-shell";
import { Card, SectionHead } from "@/components/ui";
import { Icons } from "@/components/icons";
import { TaxForm } from "./tax-form";

export const metadata = { title: "Tax refund — Northstone Trust Bank" };

export default async function TaxRefundPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status === "PENDING") redirect("/onboarding");
  if (user.status !== "ACTIVE") redirect("/login");

  const t = await getDict();
  await getLocale();

  const steps = [t.services.taxStep1, t.services.taxStep2, t.services.taxStep3];

  return (
    <AppShell user={user} active="taxRefund" title={t.services.taxHeading} subtitle={t.services.taxLede}>
      <Page className="max-w-2xl space-y-6">
        {/* How it works — filing is done for the client by their account
            manager. No SSN or ID.me password is ever collected here. */}
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/12 text-violet-600">
              <Icons.review className="h-[22px] w-[22px]" />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-fg">{t.services.taxHowTitle}</p>
              <p className="text-[13px] text-fg-muted">{t.services.taxHowLede}</p>
            </div>
          </div>
          <ol className="mt-5 space-y-3">
            {steps.map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-[14px] text-fg">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/12 text-[12px] font-bold text-violet-600">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </Card>

        {/* Identity is verified securely with ID.me — a redirect to their own
            site, never a password field here. */}
        <div className="flex items-start gap-3 rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/12 text-brand-500">
            <Icons.shield className="h-[20px] w-[20px]" />
          </span>
          <div>
            <p className="text-[14px] font-semibold text-fg">{t.services.idmeTitle}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">{t.services.idmeBody}</p>
          </div>
        </div>

        <Card>
          <SectionHead title={t.services.taxRequestTitle} subtitle={t.services.taxRequestLede} />
          <div className="mt-5">
            <TaxForm
              labels={{
                taxYear: t.services.taxYear,
                years: ["2025", "2024", "2023", "2022"],
                note: t.services.taxNoteLabel,
                noteHint: t.services.taxNoteHint,
                submit: t.services.taxRequestSubmit,
                submitting: t.auth.submitting,
              }}
            />
          </div>
        </Card>
      </Page>
    </AppShell>
  );
}
