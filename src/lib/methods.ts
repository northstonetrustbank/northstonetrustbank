// Catalog of supported money-movement methods. Admin enables and configures
// which ones appear (with a deposit route) from the admin dashboard.
export type MethodDef = {
  key: string;
  label: string;
  icon: string;
  /**
   * How long the money usually takes to arrive, as a client would say it.
   * A sensible default per rail; an admin can override it per method, and
   * their wording wins wherever it is set.
   */
  eta: string;
};

export const METHOD_CATALOG: MethodDef[] = [
  { key: "BANK", label: "Bank transfer", icon: "bank", eta: "1–3 business days" },
  { key: "ACH", label: "ACH transfer", icon: "ach", eta: "1–3 business days" },
  { key: "WIRE", label: "Wire transfer", icon: "wire", eta: "Same business day" },
  { key: "ZELLE", label: "Zelle", icon: "zelle", eta: "Minutes" },
  { key: "CASHAPP", label: "Cash App", icon: "cashapp", eta: "Minutes" },
  { key: "VENMO", label: "Venmo", icon: "venmo", eta: "Minutes" },
  { key: "PAYPAL", label: "PayPal", icon: "paypal", eta: "Minutes" },
  { key: "APPLE_PAY", label: "Apple Pay", icon: "applepay", eta: "Minutes" },
  { key: "CHECK", label: "Check", icon: "check", eta: "5–7 business days" },
  { key: "CASHIER", label: "Cashier's check", icon: "cashier", eta: "3–5 business days" },
  { key: "USDT", label: "USDT (Tether)", icon: "usdt", eta: "Network dependent" },
  { key: "BTC", label: "Bitcoin", icon: "btc", eta: "Network dependent" },
  // Admin sets a custom label, route and timing (e.g. Wise).
  { key: "OTHER", label: "Other", icon: "other", eta: "Varies" },
];

export function methodDef(key: string): MethodDef {
  return METHOD_CATALOG.find((m) => m.key === key) ?? { key, label: key, icon: "bank", eta: "" };
}

/** The admin's wording where they have set one, otherwise the rail's default. */
export function methodEta(key: string, override?: string | null) {
  const custom = override?.trim();
  return custom || methodDef(key).eta;
}

/**
 * Columns every deployment is guaranteed to have. `etaLabel` is deliberately
 * absent: it is read separately and guarded, so shipping the code before the
 * column exists cannot take a page down — which is exactly what it did once.
 */
export const METHOD_COLUMNS = {
  id: true,
  key: true,
  label: true,
  enabled: true,
  accountTypes: true,
  forDeposit: true,
  forWithdrawal: true,
  routeName: true,
  routeIdentifier: true,
  routeInstitution: true,
  routeInstructions: true,
  sortOrder: true,
} as const;

export function methodVisibleFor(accountTypes: string, userType: string) {
  return accountTypes === "ALL" || accountTypes === userType;
}
