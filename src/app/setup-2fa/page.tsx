import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";
import { getDict, getLocale } from "@/i18n/server";
import { AuthShell } from "@/components/auth-shell";
import { Icons } from "@/components/icons";
import { EnableTwoFactor } from "./enable-2fa";

export const metadata = { title: "Secure your account — Northstone Trust Bank" };

/**
 * The mandatory two-factor gate. A client who has not turned 2FA on lands here
 * after signing in and cannot reach the app until they do — enforced both by
 * the login redirect and by AppShell, which sends any client without 2FA back
 * here. This page deliberately does not render inside AppShell, so there is no
 * loop.
 */
export default async function SetupTwoFactorPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status === "PENDING") redirect("/onboarding");
  // Already done — nothing to set up.
  if (user.twoFactorEnabled) redirect("/dashboard");

  const t = await getDict();
  const locale = await getLocale();

  const points = [t.setup2fa.point1, t.setup2fa.point2, t.setup2fa.point3];

  return (
    <AuthShell locale={locale} panelTitle={t.setup2fa.panelTitle} panelBody={t.setup2fa.panelBody}>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-500">
        <Icons.shield className="h-6 w-6" />
      </span>
      <h1 className="mt-5 text-[26px] font-semibold tracking-tight text-fg">{t.setup2fa.title}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">{t.setup2fa.subtitle}</p>

      {/* Why it matters — the reassurance that this guards against the account
          takeovers and scams that hit other banks. */}
      <p className="mt-5 rounded-xl border border-pos/25 bg-pos/8 px-4 py-3 text-[13px] leading-relaxed text-fg">
        {t.setup2fa.scamNote}
      </p>

      <ul className="mt-6 space-y-3">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-3 text-[14px] text-fg">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pos/15 text-pos">
              <Icons.review className="h-3.5 w-3.5" />
            </span>
            {p}
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <EnableTwoFactor label={t.setup2fa.enable} pendingLabel={t.setup2fa.enabling} />
      </div>

      {/* A <form> is not valid inside a <p>, and React bails out of hydration
          when it finds one. A div carrying the same type styles reads the same
          and nests legally. */}
      <div className="mt-4 text-center text-sm text-fg-muted">
        {t.setup2fa.notYou}{" "}
        <form action={logoutAction} className="inline">
          <button type="submit" className="font-semibold text-brand-500 hover:text-brand-600">
            {t.common.signOut}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
