import Link from "next/link";
import { db } from "@/lib/db";
import { logoutAction } from "@/lib/actions/auth-actions";
import { getDict, getLocale } from "@/i18n/server";
import { primaryNav, secondaryNav, type NavItem, type NavKey } from "@/lib/nav";
import { AccountManagerFooter } from "./account-manager-footer";
import { Icons, NavIcons } from "@/components/icons";
import { Logo } from "@/components/logo";
import { LanguageChoices, LanguageSwitcher } from "@/components/language-switcher";
import { NotificationCenter } from "@/components/notification-center";
import { MobileDrawer } from "@/components/mobile-drawer";
import { BackLink } from "@/components/ui";

type ShellUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  locale: string;
};

/**
 * Renders a nav icon by name. The icon is invoked as a plain function rather
 * than bound to a variable and used as a component, which would create a new
 * component type on every render.
 */
function navIcon(name: string, className: string) {
  const draw = NavIcons[name] ?? Icons[name] ?? NavIcons.home;
  return draw({ className });
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition ${
        active
          ? "elev-1 bg-ink-2 text-fg"
          : "text-fg-muted hover:bg-ink-1 hover:text-fg"
      }`}
    >
      {navIcon(
        item.icon,
        `h-[18px] w-[18px] shrink-0 ${active ? "text-brand-400" : "text-fg-faint"}`
      )}
      <span className="truncate">{item.label}</span>
          </Link>
  );
}

/** The nav column — shared verbatim by the desktop sidebar and the drawer. */
function NavColumn({
  primary,
  secondary,
  active,
  signOutLabel,
}: {
  primary: NavItem[];
  secondary: NavItem[];
  active: NavKey;
  signOutLabel: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {primary.map((item) => (
          <NavLink key={item.key} item={item} active={item.key === active} />
        ))}
      </nav>
      <div className="mt-4 space-y-0.5 border-t border-line-soft px-3 pt-4">
        {secondary.map((item) => (
          <NavLink key={item.key} item={item} active={item.key === active} />
        ))}
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-fg-muted transition hover:bg-ink-1 hover:text-fg"
          >
            <NavIcons.logout className="h-[18px] w-[18px] shrink-0 text-fg-faint" />
            {signOutLabel}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * The frame every signed-in page renders inside: a persistent sidebar on
 * desktop, a drawer plus a tab bar on phones, and a header carrying the page
 * title, notifications and the language switcher.
 */
export async function AppShell({
  user,
  active,
  title,
  subtitle,
  actions,
  children,
}: {
  user: ShellUser;
  active: NavKey;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = await getDict();
  const locale = await getLocale();
  const primary = primaryNav(t);
  const secondary = secondaryNav(t);
  const tabs = primary.filter((i) => i.onTabBar);

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const dateFmt = new Intl.DateTimeFormat(
    { en: "en-US", fr: "fr-FR", de: "de-DE", es: "es-ES" }[locale],
    { dateStyle: "medium" }
  );

  const notifItems = notifications.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    unread: n.readAt === null,
    time: dateFmt.format(n.createdAt),
  }));

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="scheme-dark flex min-h-screen w-full bg-ink-0 text-fg">
      {/* Desktop sidebar */}
      <aside className="hidden w-[248px] shrink-0 border-r border-line-soft lg:flex lg:flex-col">
        <div className="px-5 py-5">
          <Logo theme="light" href="/dashboard" />
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <NavColumn
            primary={primary}
            secondary={secondary}
            active={active}
            signOutLabel={t.common.signOut}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-line-soft bg-ink-0/85 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <MobileDrawer openLabel={t.appnav.openMenu} closeLabel={t.appnav.closeMenu}>
              <div className="px-2 pb-2">
                <Logo theme="light" href="/dashboard" />
              </div>
              <div className="mt-4">
                <NavColumn
                  primary={primary}
                  secondary={secondary}
                  active={active}
                  signOutLabel={t.common.signOut}
                />
              </div>
              <div className="mt-4 border-t border-line-soft px-6 pt-4 sm:hidden">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-faint">
                  {t.common.language}
                </p>
                <LanguageChoices current={locale} />
              </div>
            </MobileDrawer>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-semibold tracking-tight text-fg sm:text-base">
                {title}
              </h1>
              {subtitle && (
                <p className="truncate text-xs text-fg-faint sm:text-[13px]">{subtitle}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {actions}
              <NotificationCenter
                items={notifItems}
                labels={{ title: t.notif.title, empty: t.notif.empty, dismiss: t.notif.dismiss }}
              />
              <span className="hidden sm:block">
                <LanguageSwitcher current={locale} variant="light" />
              </span>
              <Link
                href="/account"
                title={`${user.firstName} ${user.lastName}`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/15 text-[12px] font-semibold text-brand-400 transition hover:bg-brand-500/25"
              >
                {initials}
              </Link>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 pb-28 lg:pb-0">
          {children}
          <AccountManagerFooter />
        </main>
      </div>

      {/* Mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line-soft bg-ink-0/90 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch">
          {tabs.map((item) => {
            const on = item.key === active;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-1 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2.5 text-[11px] font-medium transition ${
                  on ? "text-brand-400" : "text-fg-faint"
                }`}
              >
                {navIcon(item.icon, "h-5 w-5")}
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/** Standard content padding — keeps every page in the shell aligned. */
export function Page({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-5xl px-5 py-6 sm:px-8 ${className}`}>{children}</div>;
}

/**
 * A bare frame for pages an admin can also reach — /account and its security
 * page. Admins have their own navigation under /admin, so dropping them into
 * the client sidebar would be confusing; this gives them the same content with
 * a plain header and a way back.
 */
export async function PlainShell({
  title,
  subtitle,
  backHref,
  children,
}: {
  title: string;
  subtitle?: string;
  backHref: string;
  children: React.ReactNode;
}) {
  const t = await getDict();
  const locale = await getLocale();

  return (
    <main className="scheme-dark flex min-h-screen flex-1 flex-col bg-ink-0 text-fg">
      <header className="border-b border-line-soft">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Logo theme="light" href={backHref} />
          <div className="flex items-center gap-3">
            <LanguageSwitcher current={locale} variant="light" />
            <form action={logoutAction}>
              <button className="rounded-xl px-4 py-2 text-sm font-semibold text-fg-muted transition hover:bg-ink-2 hover:text-fg">
                {t.common.signOut}
              </button>
            </form>
          </div>
        </div>
      </header>
      <Page>
        <BackLink href={backHref}>{t.bank.back}</BackLink>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-fg">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </Page>
    </main>
  );
}
