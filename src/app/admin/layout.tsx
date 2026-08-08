import Link from "next/link";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";
import { db } from "@/lib/db";
import { Logo } from "@/components/logo";
import { AdminLoginForm } from "./admin-login-form";

export const metadata = { title: "Admin — Northstone Trust Bank" };

/** The chrome-free shell used for signing in and for dead ends. */
function AdminGate({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-navy-950 px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo theme="dark" subtitle="Admin" href={null} />
        </div>
        <div className="rounded-2xl border border-navy-100 bg-white p-7 shadow-2xl shadow-navy-950/40">
          {children}
        </div>
      </div>
    </div>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  // Three distinct cases, deliberately not collapsed into one redirect. Sending
  // an unauthenticated visitor to /login used to be fine, but staff now sign in
  // here — and a signed-in admin whose account is not ACTIVE would otherwise
  // bounce between the form and this guard forever.
  if (!user) {
    return (
      <AdminGate>
        <h1 className="text-lg font-bold text-navy-900">Staff sign-in</h1>
        <p className="mt-1 mb-6 text-sm text-gray-600">
          This area is for Northstone staff. Clients sign in{" "}
          <Link href="/login" className="font-semibold text-accent-600 hover:underline">
            here
          </Link>
          .
        </p>
        <AdminLoginForm />
      </AdminGate>
    );
  }

  if (!isAdmin(user.role) || user.status !== "ACTIVE") {
    return (
      <AdminGate>
        <h1 className="text-lg font-bold text-navy-900">No access to this area</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          You are signed in as <strong>{user.username ?? user.email}</strong>, which
          cannot open the admin area. Sign out and use a staff account, or go to{" "}
          <Link href="/dashboard" className="font-semibold text-accent-600 hover:underline">
            your dashboard
          </Link>
          .
        </p>
        <form action={logoutAction} className="mt-6">
          <button className="w-full rounded-full border border-gray-300 py-2.5 text-sm font-semibold text-navy-800 transition hover:bg-navy-50">
            Sign out
          </button>
        </form>
      </AdminGate>
    );
  }

  const [pendingCount, depositCount, withdrawalCount, applicationCount, chatCount] = await Promise.all([
    db.user.count({ where: { status: "PENDING", role: "CLIENT" } }),
    db.transaction.count({ where: { status: "PENDING", type: "DEPOSIT" } }),
    db.transaction.count({ where: { status: "PENDING", type: { in: ["WITHDRAWAL", "SEND"] } } }),
    db.productApplication.count({ where: { status: "SUBMITTED" } }),
    db.chatConversation.count({ where: { unreadForAdmin: true } }),
  ]);

  // Grouped and written in plain language: the people running the bank are not
  // software people, and a flat list of ten nouns gave them nowhere to start.
  const navGroups: {
    heading: string;
    items: { href: string; label: string; badge?: number }[];
  }[] = [
    {
      heading: "Things to do",
      items: [
        { href: "/admin", label: "Home" },
        { href: "/admin/review", label: "New accounts", badge: pendingCount },
        { href: "/admin/deposits", label: "Money paid in", badge: depositCount },
        { href: "/admin/withdrawals", label: "Money taken out", badge: withdrawalCount },
        { href: "/admin/applications", label: "Card & loan requests", badge: applicationCount },
        { href: "/admin/chat", label: "Live chat", badge: chatCount },
      ],
    },
    {
      heading: "People",
      items: [
        { href: "/admin/clients", label: "Clients" },
        { href: "/admin/messages", label: "Send a message" },
        { href: "/admin/inbox", label: "Email inbox" },
      ],
    },
    {
      heading: "Settings",
      items: [
        { href: "/admin/methods", label: "Ways to pay in" },
        { href: "/admin/audit", label: "Activity log" },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-navy-50/50">
      <header className="border-b border-white/10 bg-navy-900">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
          <Logo theme="dark" href="/admin" subtitle="Admin" />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-navy-300 sm:block">
              {user.username ?? user.email}
            </span>
            <Link
              href="/account"
              className="rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Account
            </Link>
            <form action={logoutAction}>
              <button className="rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-10 px-6 py-10">
        <nav className="w-56 shrink-0 space-y-6">
          {navGroups.map((group) => (
            <div key={group.heading}>
              <p className="px-3.5 pb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
                {group.heading}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-between gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-navy-800 transition hover:bg-white hover:shadow-sm"
                  >
                    <span className="min-w-0">{item.label}</span>
                    {item.badge ? (
                      <span className="shrink-0 rounded-full bg-accent-500 px-2 py-0.5 text-xs font-bold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
