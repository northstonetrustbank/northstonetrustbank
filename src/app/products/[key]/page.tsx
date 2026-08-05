import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, getLocale } from "@/i18n/server";
import { MarketingFooter, MarketingHeader, PageHero } from "@/components/marketing-shell";
import { BankCard } from "@/components/bank-card";
import { ProductArt } from "@/components/product-art";
import { Icons } from "@/components/icons";
import { ChatLauncher } from "@/components/chat-launcher";
import { formatMoneyWhole } from "@/lib/bank";
import {
  CARD_TIERS,
  PERSONAL_PRODUCTS,
  COMMERCIAL_PRODUCTS,
  TIER_LIMITS,
  themeForTier,
  type ProductDef,
} from "@/lib/products";
import { fill } from "@/i18n";

// One public page per product, generated from the same catalogue the app uses,
// so a product can never exist in the dashboard but be missing from the site.

const ALL: { def: ProductDef; commercial: boolean; index: number }[] = [
  ...PERSONAL_PRODUCTS.map((def, index) => ({ def, commercial: false, index })),
  ...COMMERCIAL_PRODUCTS.map((def, index) => ({ def, commercial: true, index })),
];

export function generateStaticParams() {
  return ALL.map(({ def }) => ({ key: def.key }));
}

function findProduct(key: string) {
  return ALL.find((p) => p.def.key === key);
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const found = findProduct(key);
  if (!found) return { title: "Northstone Trust Bank" };
  const t = await getDict();
  const items = found.commercial ? t.landing.commercial.items : t.landing.personal.items;
  const item = items[found.index];
  return {
    title: `${item?.title ?? key} — Northstone Trust Bank`,
    description: item?.body,
  };
}

export default async function PublicProductPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const found = findProduct(key);
  if (!found) notFound();

  const t = await getDict();
  const locale = await getLocale();
  const { def, commercial, index } = found;

  const items = commercial ? t.landing.commercial.items : t.landing.personal.items;
  const item = items[index] ?? { title: def.key, body: "" };
  const siblings = (commercial ? COMMERCIAL_PRODUCTS : PERSONAL_PRODUCTS)
    .map((d, i) => ({ def: d, item: items[i] }))
    .filter((s) => s.def.key !== def.key)
    .slice(0, 4);

  const tierRange = (tier: (typeof CARD_TIERS)[number]) => {
    const { min, max } = TIER_LIMITS[tier];
    const minLabel = formatMoneyWhole(min, locale, "USD");
    return max === null
      ? fill(t.products.tierFrom, { min: minLabel })
      : fill(t.products.tierRange, { min: minLabel, max: formatMoneyWhole(max, locale, "USD") });
  };

  // Highlights are drawn from what the product actually does in the app.
  const highlights: { title: string; body: string }[] = [];
  if (def.card) {
    highlights.push(
      { title: t.products.showDetails, body: t.products.cardNotIssued },
      { title: t.products.freezeCard, body: t.products.frozenNote },
      { title: t.products.availableCredit, body: t.products.tierHint }
    );
  } else if (def.credit === "installment") {
    highlights.push(
      { title: t.products.disbursedNote, body: t.products.verifyNote },
      { title: t.products.pay, body: t.products.outstandingLabel },
      { title: t.products.activity, body: t.products.appliedOn.replace("{date}", "") }
    );
  }

  return (
    <main className="flex-1">
      <MarketingHeader />
      <PageHero eyebrow={t.productPage.eyebrow} title={item.title} body={item.body} />

      {/* Artwork + call to action */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div className="mx-auto w-full max-w-md">
            {def.card ? (
              <BankCard
                theme={themeForTier("PLATINUM")}
                productName={item.title}
                badge={t.products.tiers.PLATINUM}
                holder="YOUR NAME"
                placeholder
              />
            ) : (
              <ProductArt art={def.art ?? "vault"} className="w-full rounded-2xl shadow-xl" />
            )}
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-navy-900">
              {t.productPage.howTitle}
            </h2>
            <ol className="mt-8 space-y-6">
              {t.productPage.how.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-50 text-sm font-bold text-accent-600">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-navy-900">{step.title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-gray-600">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-accent-500 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600"
              >
                {t.productPage.openCta}
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-gray-300 px-7 py-3.5 text-sm font-semibold text-navy-800 transition hover:border-accent-500/40"
              >
                {t.common.signIn}
              </Link>
            </div>
            <p className="mt-3 text-sm text-gray-500">{t.productPage.signedInNote}</p>
          </div>
        </div>
      </section>

      {/* Card tiers */}
      {def.card && (
        <section className="bg-navy-50/60">
          <div className="mx-auto max-w-7xl px-6 py-24">
            <h2 className="text-3xl font-semibold tracking-tight text-navy-900">
              {t.productPage.tiersTitle}
            </h2>
            <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-gray-600">
              {t.productPage.tiersBody}
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {CARD_TIERS.map((tier) => (
                <div key={tier} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <BankCard
                    theme={themeForTier(tier)}
                    productName={item.title}
                    badge={t.products.tiers[tier]}
                    holder="YOUR NAME"
                    placeholder
                  />
                  <div className="px-1 pb-1 pt-4">
                    <p className="text-[15px] font-semibold text-navy-900">
                      {t.products.tiers[tier]}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-gray-600">
                      {t.products.tierBlurbs[tier]}
                    </p>
                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-navy-700">
                      {t.productPage.limitLabel}: {tierRange(tier)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Highlights */}
      {highlights.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight text-navy-900">
            {t.productPage.highlightsTitle}
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {highlights.map((h) => (
              <div key={h.title} className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                  <Icons.shield className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-navy-900">{h.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{h.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Other products */}
      <section className="bg-navy-50/60">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="text-xl font-semibold tracking-tight text-navy-900">
            {t.productPage.otherTitle}
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {siblings.map((s) => (
              <Link
                key={s.def.key}
                href={`/products/${s.def.key}`}
                className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-accent-500/40 hover:shadow-md"
              >
                <div className="overflow-hidden rounded-xl">
                  {s.def.card ? (
                    <BankCard
                      theme="BLUE"
                      productName={s.item?.title ?? s.def.key}
                      badge={t.products.tiers.CLASSIC}
                      placeholder
                    />
                  ) : (
                    <ProductArt art={s.def.art ?? "vault"} className="w-full" />
                  )}
                </div>
                <p className="mt-4 text-[15px] font-semibold text-navy-900">
                  {s.item?.title ?? s.def.key}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ChatLauncher />
      <MarketingFooter />
    </main>
  );
}
