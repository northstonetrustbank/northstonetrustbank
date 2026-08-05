import type { Dict } from "@/i18n";
import { formatMoney } from "@/lib/bank";
import { productsFor, themeForTier, type CardTheme, type ProductDef } from "@/lib/products";

// One place that decides how a product looks in every state, so the dashboard
// grid and the product page can never drift apart. Card products render a card
// face; everything else renders a photo tile.

export type ProductState = "APPLY" | "REVIEW" | "DECLINED" | "ACTIVE" | "CLOSED" | "DEPOSIT";
export type Tone = "ok" | "pending" | "bad" | "muted";

export type CardApp = {
  id: string;
  status: string;
  cardTier: string | null;
  approvedAmountCents: number | null;
  outstandingCents: number | null;
  frozen: boolean;
  cardNumber: string | null;
  cardExpiry: string | null;
  cardHolder: string | null;
  adminNote: string | null;
};

type Common = {
  def: ProductDef;
  title: string;
  body: string;
  state: ProductState;
  status: { label: string; tone: Tone } | null;
  valueLabel: string | null;
  value: string | null;
  href: string;
  cta: string;
};

export type ProductView =
  | (Common & {
      render: "card";
      theme: CardTheme;
      badge: string | null;
      holder: string | null;
      holderPlaceholder: string;
      number: string | null;
      expiry: string | null;
      placeholder: boolean;
    })
  | (Common & {
      render: "tile";
      art: string | null;
      placeholder: boolean;
    });

export function buildProductView({
  def,
  item,
  app,
  savingsOpen,
  savingsBalanceCents,
  savingsNumber,
  t,
  locale,
  currency,
  holderName,
}: {
  def: ProductDef;
  item: { title: string; body: string };
  app: CardApp | null;
  savingsOpen: boolean;
  savingsBalanceCents: number;
  savingsNumber?: string | null;
  t: Dict;
  locale: string;
  currency: string;
  holderName: string;
}): ProductView {
  const common = {
    def,
    title: item.title,
    body: item.body,
    href: `/product/${def.key}`,
    valueLabel: null as string | null,
    value: null as string | null,
  };
  const tile = { render: "tile" as const, art: def.art ?? null };

  // Deposits (commercial) — always available, no application.
  if (def.kind === "deposit") {
    return {
      ...common,
      ...tile,
      state: "DEPOSIT",
      status: null,
      placeholder: false,
      cta: t.bank.makeDeposit,
    };
  }

  // Savings — opened instantly, then it carries a real balance.
  if (def.kind === "savings") {
    if (!savingsOpen) {
      return { ...common, ...tile, state: "CLOSED", status: null, placeholder: true, cta: t.products.open };
    }
    return {
      ...common,
      ...tile,
      state: "ACTIVE",
      status: { label: t.products.activeBadge, tone: "ok" },
      placeholder: false,
      valueLabel: savingsNumber ?? t.products.balanceLabel,
      value: formatMoney(savingsBalanceCents, locale, currency),
      cta: t.products.viewDetails,
    };
  }

  // --- Applyable products ---
  const notYet = !app || app.status === "DECLINED";
  const declined = app?.status === "DECLINED";
  const inReview = app?.status === "SUBMITTED";

  if (notYet || inReview) {
    const state: ProductState = declined ? "DECLINED" : inReview ? "REVIEW" : "APPLY";
    const status = declined
      ? { label: t.products.declined, tone: "bad" as Tone }
      : inReview
        ? { label: t.products.underReview, tone: "pending" as Tone }
        : null;
    const cta = inReview
      ? t.products.viewDetails
      : declined
        ? t.products.reapply
        : t.products.apply;

    if (def.card) {
      return {
        ...common,
        render: "card",
        state,
        status,
        theme: "BLUE",
        badge: t.products.tiers.CLASSIC,
        holder: null,
        holderPlaceholder: t.products.yourName,
        number: null,
        expiry: null,
        placeholder: true,
        cta,
      };
    }
    return { ...common, ...tile, state, status, placeholder: true, cta };
  }

  // --- Approved and active ---
  const limit = app!.approvedAmountCents ?? 0;
  const owed = app!.outstandingCents ?? 0;
  const isRevolving = def.credit === "revolving";
  const isInstallment = def.credit === "installment";

  const valueLabel = isRevolving
    ? t.products.availableCredit
    : isInstallment
      ? t.products.outstandingLabel
      : limit
        ? t.products.limitLabel
        : null;
  const value = isRevolving
    ? formatMoney(Math.max(0, limit - owed), locale, currency)
    : isInstallment
      ? formatMoney(owed, locale, currency)
      : limit
        ? formatMoney(limit, locale, currency)
        : null;

  const status = app!.frozen
    ? { label: t.products.frozenBadge, tone: "bad" as Tone }
    : { label: t.products.activeBadge, tone: "ok" as Tone };

  if (def.card) {
    const tier = app!.cardTier;
    return {
      ...common,
      render: "card",
      state: "ACTIVE",
      status: app!.frozen ? status : null, // an active card speaks for itself
      theme: themeForTier(tier),
      badge: tier ? t.products.tiers[tier as keyof typeof t.products.tiers] ?? tier : null,
      holder: app!.cardHolder || holderName.toUpperCase(),
      holderPlaceholder: t.products.yourName,
      number: app!.cardNumber,
      expiry: app!.cardExpiry,
      placeholder: false,
      valueLabel,
      value,
      cta: t.products.viewDetails,
    };
  }

  return {
    ...common,
    ...tile,
    state: "ACTIVE",
    status,
    placeholder: false,
    valueLabel,
    value,
    cta: t.products.viewDetails,
  };
}

/** Latest application per product key for a client. */
export function latestByKey<T extends { productKey: string; createdAt: Date }>(apps: T[]) {
  const map = new Map<string, T>();
  for (const a of apps) {
    const prev = map.get(a.productKey);
    if (!prev || a.createdAt > prev.createdAt) map.set(a.productKey, a);
  }
  return map;
}

/** Product definitions + their localized labels, in dashboard order. */
export function productsWithLabels(t: Dict, accountType: string) {
  const defs = productsFor(accountType);
  const items = accountType === "COMMERCIAL" ? t.landing.commercial.items : t.landing.personal.items;
  return defs.map((def, i) => ({ def, item: items[i] ?? { title: def.key, body: "" } }));
}
