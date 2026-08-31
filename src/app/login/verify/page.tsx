import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPendingTwoFactor } from "@/lib/auth";
import { getDict, getLocale } from "@/i18n/server";
import { fill } from "@/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { VerifyForm } from "./verify-form";

export const metadata = { title: "Sign-in code — Northstone Trust Bank" };

/** Masks an address for display: alex@example.com → a•••@example.com */
function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const head = name.slice(0, 1);
  return `${head}${"•".repeat(Math.max(2, Math.min(name.length - 1, 6)))}@${domain}`;
}

export default async function TwoFactorPage() {
  const pending = await getPendingTwoFactor();
  if (!pending) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: pending.userId },
    select: { email: true },
  });
  if (!user) redirect("/login");

  const t = await getDict();
  const locale = await getLocale();

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-ink-0 text-fg">
      <header className="border-b border-white/10 bg-[linear-gradient(158deg,#013378_0%,#04162c_60%,#020d1c_100%)]">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
          <Logo href="/" onDark />
          <LanguageSwitcher current={locale} variant="light" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 px-6 py-16">
        <div className="rounded-2xl border border-line bg-ink-1 p-9 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-400/15 text-2xl ring-1 ring-gold-400/30">
            ✉️
          </div>
          <h1 className="mt-5 text-center text-xl font-semibold tracking-tight text-fg">
            {t.twoFactor.checkTitle}
          </h1>
          <p className="mt-3 text-center text-[15px] leading-relaxed text-fg-muted">
            {fill(t.twoFactor.checkBody, { email: maskEmail(user.email) })}
          </p>

          <VerifyForm
            labels={{
              codeLabel: t.twoFactor.codeLabel,
              verify: t.twoFactor.verify,
              verifying: t.twoFactor.verifying,
              resend: t.twoFactor.resend,
              cancel: t.twoFactor.cancel,
              noEmailNote: t.twoFactor.noEmailNote,
            }}
          />
        </div>
      </div>
    </main>
  );
}
