import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/bank";

/**
 * The admin home. Everything the bank's staff might need to do today, in the
 * order it needs doing, written so someone who has never used an admin panel
 * can work down the list without guessing.
 */

type Job = {
  count: number;
  href: string;
  title: string;
  blurb: string;
  cta: string;
};

export default async function AdminHomePage() {
  const user = await getSessionUser();

  const [
    newAccounts,
    deposits,
    withdrawals,
    applications,
    chats,
    activeClients,
    postedCredits,
    postedDebits,
  ] = await Promise.all([
    db.user.count({ where: { status: "PENDING", role: "CLIENT" } }),
    db.transaction.count({ where: { status: "PENDING", type: "DEPOSIT" } }),
    db.transaction.count({ where: { status: "PENDING", type: "WITHDRAWAL" } }),
    db.productApplication.count({ where: { status: "SUBMITTED" } }),
    db.chatConversation.count({ where: { unreadForAdmin: true } }),
    db.user.count({ where: { status: "ACTIVE", role: "CLIENT" } }),
    db.transaction.aggregate({
      _sum: { amountCents: true },
      where: { status: "POSTED", amountCents: { gt: 0 } },
    }),
    db.transaction.aggregate({
      _sum: { amountCents: true },
      where: { status: "POSTED", amountCents: { lt: 0 } },
    }),
  ]);

  const heldCents =
    (postedCredits._sum.amountCents ?? 0) + (postedDebits._sum.amountCents ?? 0);

  const jobs: Job[] = [
    {
      count: newAccounts,
      href: "/admin/review",
      title: "New account requests",
      blurb:
        "Someone has applied to open an account and sent their ID photos. Check the photos, then approve or decline.",
      cta: "Review them",
    },
    {
      count: deposits,
      href: "/admin/deposits",
      title: "Money being paid in",
      blurb:
        "A client says they have sent money in. Confirm it arrived in the real bank account, then approve it so their balance goes up.",
      cta: "Check deposits",
    },
    {
      count: withdrawals,
      href: "/admin/withdrawals",
      title: "Money being taken out",
      blurb:
        "A client has asked to withdraw. Send the money using their payout details, then mark it approved here.",
      cta: "Check withdrawals",
    },
    {
      count: applications,
      href: "/admin/applications",
      title: "Card and loan requests",
      blurb:
        "A client has applied for a card, loan, or other product. Decide the amount and approve, or decline.",
      cta: "Open requests",
    },
    {
      count: chats,
      href: "/admin/chat",
      title: "Someone is waiting in live chat",
      blurb: "A visitor or client has sent a message on the website and hasn't had a reply yet.",
      cta: "Reply now",
    },
  ];

  const todo = jobs.filter((j) => j.count > 0);
  const clear = jobs.filter((j) => j.count === 0);
  const totalJobs = todo.reduce((sum, j) => sum + j.count, 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-900">
        {greeting}
        {user?.firstName ? `, ${user.firstName}` : ""}.
      </h1>
      <p className="mt-1 text-[15px] text-gray-600">
        {totalJobs === 0
          ? "Nothing is waiting for you. Everything below is up to date."
          : `You have ${totalJobs} thing${totalJobs === 1 ? "" : "s"} to look at today.`}
      </p>

      {/* Headline numbers */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Clients with an open account
          </p>
          <p className="mt-1 text-3xl font-bold text-navy-900">{activeClients}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Total held across all client accounts
          </p>
          <p className="mt-1 text-3xl font-bold text-navy-900">{formatMoney(heldCents)}</p>
        </div>
      </div>

      {/* Things to do */}
      {todo.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
            Needs you now
          </h2>
          <div className="mt-4 space-y-3">
            {todo.map((j) => (
              <Link
                key={j.href}
                href={j.href}
                className="flex items-start gap-4 rounded-2xl border border-accent-200 bg-white p-5 shadow-sm transition hover:border-accent-500 hover:shadow-md"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-500 text-lg font-bold text-white">
                  {j.count}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-navy-900">{j.title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-gray-600">
                    {j.blurb}
                  </span>
                </span>
                <span className="shrink-0 self-center rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-white">
                  {j.cta}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Already clear */}
      {clear.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
            Nothing waiting here
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {clear.map((j) => (
              <Link
                key={j.href}
                href={j.href}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition hover:border-navy-300"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                  ✓
                </span>
                <span className="font-semibold text-navy-800">{j.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Everyday tasks that aren't a queue */}
      <section className="mt-10">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
          Other things you can do
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              href: "/admin/clients",
              title: "Look up a client",
              blurb: "See anyone's balance and history, or add and remove money by hand.",
            },
            {
              href: "/admin/messages",
              title: "Send a message to clients",
              blurb: "Email everyone, or one person, from info@, support@ or accountmanager@.",
            },
            {
              href: "/admin/inbox",
              title: "Read your email",
              blurb: "Mail sent to your three company addresses, with replies, without leaving here.",
            },
            {
              href: "/admin/methods",
              title: "Change how people pay in",
              blurb: "Turn payment options on or off and set the account details clients send money to.",
            },
            {
              href: "/admin/audit",
              title: "See everything that has happened",
              blurb: "A permanent record of every action taken, by staff and by clients.",
            },
            {
              href: "/account",
              title: "Change your password",
              blurb: "Update your own sign-in details and turn on two-step sign-in.",
            },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-xl border border-gray-200 bg-white p-4 transition hover:border-navy-300 hover:shadow-sm"
            >
              <p className="font-semibold text-navy-900">{l.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{l.blurb}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
