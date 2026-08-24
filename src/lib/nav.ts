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
    { key: "documents", href: "/documents", icon: "statement", label: t.appnav.documents },
    { key: "security", href: "/account/security", icon: "shield", label: t.appnav.security },
    { key: "support", href: "/support", icon: "chat", label: t.appnav.support },
  ];
}

/** Sits below the divider in the sidebar — settings and sign-out live there. */
export function secondaryNav(t: Dict): NavItem[] {
  return [{ key: "account", href: "/account", icon: "gear", label: t.appnav.settings }];
}
