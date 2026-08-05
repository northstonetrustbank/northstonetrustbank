import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";
import { getDict, getLocale } from "@/i18n/server";
import { fill } from "@/i18n";
import {
  productDef,
  productLabel,
  CARD_TIERS,
  TIER_LIMITS,
  SHARED_FIELDS,
} from "@/lib/products";
import { formatMoney, formatMoneyWhole } from "@/lib/bank";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { ApplyForm } from "./apply-form";

export const metadata = { title: "Apply — Northstone Trust Bank" };

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status !== "ACTIVE") redirect("/login");

  const { type } = await searchParams;
  const def = type ? productDef(user.accountType, type) : undefined;
  if (!def || def.kind !== "apply") redirect("/dashboard");

  const t = await getDict();
  const locale = await getLocale();
  const label = productLabel(t.landing, user.accountType, type!);

  // Each tier advertises its own limit range, so nobody has to name a number.
  const tierRanges = Object.fromEntries(
    CARD_TIERS.map((tier) => {
      const { min, max } = TIER_LIMITS[tier];
      const minLabel = formatMoneyWhole(min, locale, user.currency);
      return [
        tier,
        max === null
          ? fill(t.products.tierFrom, { min: minLabel })
          : fill(t.products.tierRange, {
              min: minLabel,
              max: formatMoneyWhole(max, locale, user.currency),
            }),
      ];
    })
  );
  // The currency prefix for money inputs, taken from the client's currency.
  const currencySymbol = formatMoney(0, locale, user.currency).replace(/[\d.,\s]/g, "");

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-navy-50/50">
      <header className="border-b border-white/10 bg-navy-900">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
          <Logo theme="dark" href="/dashboard" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher current={locale} variant="dark" />
            <form action={logoutAction}>
              <button className="rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
                {t.common.signOut}
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className={`mx-auto w-full flex-1 px-6 py-12 ${def.card ? "max-w-3xl" : "max-w-lg"}`}>
        <Link
          href={`/product/${def.key}`}
          className="text-sm font-semibold text-accent-600 hover:text-accent-700"
        >
          ← {t.bank.back}
        </Link>
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-9 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight text-navy-900">
            {fill(t.products.applyTitle, { product: label?.title ?? type! })}
          </h1>
          {label?.body && <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{label.body}</p>}
          <p className="mt-4 rounded-lg border border-navy-100 bg-navy-50/60 px-4 py-3 text-sm text-navy-700">
            {t.products.verifyNote}
          </p>
          <ApplyForm
            productKey={type!}
            productName={label?.title ?? type!}
            showAmount={!!def.amount}
            showTerm={!!def.term}
            showTiers={!!def.card}
            holderName={`${user.firstName} ${user.lastName}`.trim()}
            currencySymbol={currencySymbol}
            sharedFields={SHARED_FIELDS}
            productFields={def.fields ?? []}
            labels={{
              amount: t.products.amountLabel,
              purpose: t.products.purposeLabel,
              submit: t.products.submit,
              submitting: t.products.applying,
              chooseTier: t.products.chooseTier,
              tierHint: t.products.tierHint,
              tierLimit: t.products.tierLimit,
              term: t.products.termLabel,
              termMonths: t.products.termMonths,
              aboutYou: t.products.aboutYou,
              aboutYouHint: t.products.aboutYouHint,
              aboutProduct: t.products.aboutProduct,
              choose: t.products.choose,
              tiers: t.products.tiers,
              tierBlurbs: t.products.tierBlurbs,
              tierRanges,
              fields: t.products.fields,
              fieldOptions: t.products.fieldOptions,
            }}
          />
        </div>
      </div>
    </main>
  );
}
