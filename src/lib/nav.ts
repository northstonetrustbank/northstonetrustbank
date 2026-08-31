import type { Dict } from "@/i18n";

/**
 * The signed-in navigation. One definition drives the desktop sidebar, the
 * mobile drawer and the mobile tab bar, so a route can never appear in one
 * and be missing from another.
 */
export type NavKey =
  | "dashboard"
  | "accounts"
  | "activity"
  | "transfers"
  | "payments"
  | "cards"
  | "loans"
  | "grants"
  | "taxRefund"
  | "documents"
  | "security"
  | "support"
  | "account";

export type NavItem = {
  key: NavKey;
  href: string;
  /** Name of an entry in NavIcons / Icons. */
  icon: string;
  label: string;
  /** Shown in the mobile tab bar along the bottom of the screen. */
  onTabBar?: boolean;
};

export function primaryNav(t: Dict): NavItem[] {
  return [
    { key: "dashboard", href: "/dashboard", icon: "home", label: t.appnav.dashboard, onTabBar: true },
    { key: "accounts", href: "/accounts", icon: "wallet", label: t.appnav.accounts, onTabBar: true },
    { key: "transfers", href: "/transfers", icon: "swap", label: t.appnav.transfers, onTabBar: true },
    { key: "activity", href: "/activity", icon: "list", label: t.appnav.activity, onTabBar: true },
    { key: "payments", href: "/payments", icon: "bill", label: t.appnav.payments },
    { key: "cards", href: "/cards", icon: "card", label: t.appnav.cards },
    { key: "loans", href: "/loans", icon: "lending", label: t.appnav.loans },
    { key: "grants", href: "/grants", icon: "gift", label: t.appnav.grants },
    { key: "taxRefund", href: "/tax-refund", icon: "receipt", label: t.appnav.taxRefund },
    { key: "documents", href: "/documents", icon: "statement", label: t.appnav.documents },
    { key: "security", href: "/account/security", icon: "shield", label: t.appnav.security },
    { key: "support", href: "/support", icon: "chat", label: t.appnav.support },
  ];
}

/**
 * The sidebar in labelled groups. Eleven flat entries read as a list to be
 * scanned; four short groups read as a place with rooms in it, and it gives
 * new services somewhere obvious to land.
 *
 * The tab bar and the drawer still come from primaryNav, so a route cannot
 * appear in one and be missing from another.
 */
export type NavGroup = { key: string; label: string; items: NavItem[] };

export function navGroups(t: Dict): NavGroup[] {
  const byKey = Object.fromEntries(primaryNav(t).map((i) => [i.key, i])) as Record<NavKey, NavItem>;
  const pick = (...keys: NavKey[]) => keys.map((k) => byKey[k]).filter(Boolean);

  return [
    { key: "main", label: t.appnav.groupMain, items: pick("dashboard", "accounts", "activity") },
    { key: "money", label: t.appnav.groupMoney, items: pick("transfers", "payments") },
    { key: "services", label: t.appnav.groupServices, items: pick("cards", "loans", "grants", "taxRefund") },
    {
      key: "account",
      label: t.appnav.groupAccount,
      items: [...pick("documents", "security", "support"), ...secondaryNav(t)],
    },
  ];
}

/** Sits below the divider in the sidebar — settings and sign-out live there. */
export function secondaryNav(t: Dict): NavItem[] {
  return [{ key: "account", href: "/account", icon: "gear", label: t.appnav.settings }];
}
