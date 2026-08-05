// Catalog of supported money-movement methods. Admin enables and configures
// which ones appear (with a deposit route) from the admin dashboard.
export type MethodDef = { key: string; label: string; icon: string };

export const METHOD_CATALOG: MethodDef[] = [
  { key: "BANK", label: "Bank transfer", icon: "bank" },
  { key: "ACH", label: "ACH transfer", icon: "ach" },
  { key: "WIRE", label: "Wire transfer", icon: "wire" },
  { key: "ZELLE", label: "Zelle", icon: "zelle" },
  { key: "CASHAPP", label: "Cash App", icon: "cashapp" },
  { key: "VENMO", label: "Venmo", icon: "venmo" },
  { key: "PAYPAL", label: "PayPal", icon: "paypal" },
  { key: "APPLE_PAY", label: "Apple Pay", icon: "applepay" },
  { key: "CHECK", label: "Check", icon: "check" },
  { key: "CASHIER", label: "Cashier's check", icon: "cashier" },
  { key: "USDT", label: "USDT (Tether)", icon: "usdt" },
  { key: "BTC", label: "Bitcoin", icon: "btc" },
  { key: "OTHER", label: "Other", icon: "other" }, // admin sets a custom label + route (e.g. Wise)
];

export function methodDef(key: string): MethodDef {
  return METHOD_CATALOG.find((m) => m.key === key) ?? { key, label: key, icon: "bank" };
}

export function methodVisibleFor(accountTypes: string, userType: string) {
  return accountTypes === "ALL" || accountTypes === userType;
}
