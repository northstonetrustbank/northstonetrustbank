import { AccountManagerFooter } from "@/components/account-manager-footer";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";
import { getDict, getLocale } from "@/i18n/server";
import { fill } from "@/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { VerifyEmailStep } from "./verify-email-step";
import { KycStep } from "./kyc-step";

export const metadata = { title: "Get started — Northstone Trust Bank" };

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status === "ACTIVE") redirect("/dashboard");
  if (user.status !== "PENDING") redirect("/login");

  const t = await getDict();
  const locale = await getLocale();
  const kycCount = await db.kycDocument.count({ where: { userId: user.id } });

  // Step: 0 = verify email, 1 = KYC, 2 = under review
  const step = !user.emailVerified ? 0 : kycCount === 0 ? 1 : 2;

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-navy-50/50">
      <header className="border-b border-white/10 bg-navy-900">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-6">
          <Logo theme="dark" href={null} />
          <div className="flex items-center gap-3">
            <LanguageSwitcher current={locale} variant="dark" />
            <form action={logoutAction}>
              <button className="rounded-full px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10">
                {t.common.signOut}
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        {/* Step indicator */}
        <ol className="flex items-center gap-2">
          {t.onboarding.steps.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  i < step
                    ? "bg-green-600 text-white"
                    : i === step
                      ? "bg-accent-500 text-white"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </span>
              <span
                className={`hidden text-sm font-semibold sm:block ${
                  i === step ? "text-navy-900" : "text-gray-500"
                }`}
              >
                {label}
              </span>
              {i < t.onboarding.steps.length - 1 && (
                <span className="mx-1 h-px flex-1 bg-gray-300" />
              )}
            </li>
          ))}
        </ol>

        <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-10 shadow-sm">
          {step === 0 && (
            <VerifyEmailStep
              title={t.onboarding.verifyTitle}
              body={fill(t.onboarding.verifyBody, { email: user.email })}
              resendLabel={t.onboarding.resend}
              refreshLabel={t.onboarding.verifyChecked}
            />
          )}

          {step === 1 && (
            <KycStep
              title={t.onboarding.kycTitle}
              body={t.onboarding.kycBody}
              docTypeLabel={t.onboarding.docTypeLabel}
              docTypes={t.onboarding.docTypes}
              uploadHint={t.onboarding.uploadHint}
              frontLabel={t.onboarding.uploadFront}
              backLabel={t.onboarding.uploadBack}
              selfieLabel={t.onboarding.uploadSelfie}
              selfieHint={t.onboarding.selfieHint}
              passportNote={t.onboarding.passportNote}
              submitLabel={t.onboarding.submitKyc}
              submittingLabel={t.onboarding.submittingKyc}
              chooseFileLabel={t.common.chooseFile}
              noFileLabel={t.common.noFileChosen}
              optimisingLabel={t.common.optimising}
              tooBigLabel={t.common.fileTooBigPicked}
            />
          )}

          {step === 2 && (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 text-2xl">
                ⏳
              </div>
              <h1 className="mt-5 text-xl font-semibold tracking-tight text-navy-900">
                {t.onboarding.reviewTitle}
              </h1>
              <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-gray-600">
                {fill(t.onboarding.reviewBody, {
                  name: user.firstName,
                  email: user.email,
                })}
              </p>
            </div>
          )}
        </div>
      </div>
      <AccountManagerFooter labels={{ title: t.bank.managerTitle, body: t.bank.managerBody }} />
    </main>
  );
}
