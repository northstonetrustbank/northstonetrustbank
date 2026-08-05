import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";
import { db } from "@/lib/db";
import { Logo } from "@/components/logo";

export const metadata = { title: "Admin — Northstone Trust Bank" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user.role) || user.status !== "ACTIVE") {
    redirect("/login");
  }

  const [pendingCount, depositCount, withdrawalCount, applicationCount, chatCount] = await Promise.all([
    db.user.count({ where: { status: "PENDING", role: "CLIENT" } }),
    db.transaction.count({ where: { status: "PENDING", type: "DEPOSIT" } }),
    db.transaction.count({ where: { status: "PENDING", type: "WITHDRAWAL" } }),
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
            <span className="hidden text-sm text-navy-300 sm:block">{user.email}</span>
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
