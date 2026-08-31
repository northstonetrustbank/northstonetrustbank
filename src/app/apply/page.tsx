import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
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
import { AppShell, Page } from "@/components/app-shell";
import { BackLink } from "@/components/ui";
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
  // A shared "About you" question is dropped when the product already asks it
  // (home improvement asks housing status, and so do the shared fields) — no
  // client should answer the same question twice.
  const productFieldNames = new Set((def.fields ?? []).map((f) => f.name));
  const sharedFields = SHARED_FIELDS.filter((f) => !productFieldNames.has(f.name));

  // The currency prefix for money inputs, taken from the client's currency.
  const currencySymbol = formatMoney(0, locale, user.currency).replace(/[\d.,\s]/g, "");

  // A typical ask, shown as an editable placeholder in the amount field. It is
  // NOT a minimum — nothing in code enforces it; it just saves most people
  // typing, and they can change it to anything.
  const amountPlaceholder =
    def.amount && def.terms?.typicalCents
      ? formatMoneyWhole(def.terms.typicalCents, locale, user.currency).replace(/[^\d.,]/g, "")
      : "";

  // Applications belong to whichever hub the product itself lives in.
  const activeNav = def.card ? "cards" : def.credit ? "loans" : "accounts";

  return (
    <AppShell
      user={user}
      active={activeNav}
      title={fill(t.products.applyTitle, { product: label?.title ?? type! })}
      subtitle={label?.body}
    >
      <Page className={def.card ? "max-w-3xl" : "max-w-lg"}>
        <BackLink href={`/product/${def.key}`}>{t.bank.back}</BackLink>
        <div className="mt-4 rounded-2xl border border-line bg-ink-1 p-9 shadow-sm">
          <p className="rounded-lg border border-line bg-ink-2 px-4 py-3 text-sm text-fg-muted">
            {t.products.verifyNote}
          </p>
          <ApplyForm
            productKey={type!}
            productName={label?.title ?? type!}
            showAmount={!!def.amount}
            amountPlaceholder={amountPlaceholder}
            showTerm={!!def.term}
            showTiers={!!def.card}
            holderName={`${user.firstName} ${user.lastName}`.trim()}
            currencySymbol={currencySymbol}
            sharedFields={sharedFields}
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
      </Page>
    </AppShell>
  );
}
