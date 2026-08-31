import Link from "next/link";
import { db } from "@/lib/db";
import { AdminTicketReply } from "./reply-form";

export const metadata = { title: "Support tickets — Northstone Admin" };

// Admin surfaces stay in English by design — the client-facing side is the
// part that is translated.
const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  AWAITING_CLIENT: "Awaiting client",
  RESOLVED: "Resolved",
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-amber-400/10 text-amber-700 ring-amber-600/15",
  AWAITING_CLIENT: "bg-brand-500/12 text-brand-400 ring-accent-600/15",
  RESOLVED: "bg-pos/10 text-pos ring-emerald-600/15",
};

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string; status?: string }>;
}) {
  const { ticket: ticketParam, status: statusFilter } = await searchParams;

  const tickets = await db.supportTicket.findMany({
    where: statusFilter && STATUS_LABELS[statusFilter] ? { status: statusFilter } : {},
    orderBy: [{ unreadForAdmin: "desc" }, { lastMessageAt: "desc" }],
    take: 100,
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });

  const selected = ticketParam
    ? await db.supportTicket.findUnique({
        where: { id: ticketParam },
        include: {
          user: { select: { firstName: true, lastName: true, email: true, accountType: true } },
          messages: { orderBy: { createdAt: "asc" } },
        },
      })
    : null;

  // Opening a ticket in the console counts as reading it.
  if (selected?.unreadForAdmin) {
    await db.supportTicket.update({
      where: { id: selected.id },
      data: { unreadForAdmin: false },
    });
  }

  const stampFmt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Support tickets</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Requests raised by clients from their account. Every reply is emailed to them as a
        notification.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {[undefined, "OPEN", "AWAITING_CLIENT", "RESOLVED"].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/admin/tickets?status=${s}` : "/admin/tickets"}
            className={`rounded-xl border px-4 py-1.5 text-[13px] font-semibold transition ${
              statusFilter === s || (!statusFilter && !s)
                ? "border-navy-800 bg-brand-500 text-white"
                : "border-line bg-ink-1 text-fg hover:border-brand-500/40"
            }`}
          >
            {s ? STATUS_LABELS[s] : "All"}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        {/* Queue */}
        <div className="overflow-hidden rounded-2xl border border-line bg-ink-1">
          {tickets.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-fg-muted">No tickets.</p>
          ) : (
            tickets.map((ticket, i) => (
              <Link
                key={ticket.id}
                href={`/admin/tickets?ticket=${ticket.id}${
                  statusFilter ? `&status=${statusFilter}` : ""
                }`}
                className={`block px-4 py-3.5 transition hover:bg-ink-2 ${
                  i > 0 ? "border-t border-line-soft" : ""
                } ${selected?.id === ticket.id ? "bg-ink-2" : ""}`}
              >
                <div className="flex items-center gap-2">
                  {ticket.unreadForAdmin && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                  )}
                  <p className="truncate text-[13px] font-semibold text-fg">
                    {ticket.subject}
                  </p>
                </div>
                <p className="mt-0.5 truncate text-[12px] text-fg-muted">
                  {ticket.user.firstName} {ticket.user.lastName} · {ticket.category}
                </p>
                <p className="mt-1 text-[11px] tabular-nums text-fg-faint">
                  {ticket.reference} · {stampFmt.format(ticket.lastMessageAt)}
                </p>
              </Link>
            ))
          )}
        </div>

        {/* Thread */}
        <div>
          {!selected ? (
            <div className="rounded-2xl border border-dashed border-line bg-ink-1/60 px-6 py-16 text-center text-sm text-fg-muted">
              Select a ticket to read it.
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-ink-1 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold tracking-tight text-fg">
                    {selected.subject}
                  </h2>
                  <p className="mt-1 text-[13px] text-fg-muted">
                    {selected.user.firstName} {selected.user.lastName} · {selected.user.email} ·{" "}
                    {selected.user.accountType}
                  </p>
                  <p className="mt-0.5 text-[12px] tabular-nums text-fg-faint">
                    {selected.reference} · {selected.category} · opened{" "}
                    {stampFmt.format(selected.createdAt)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
                    STATUS_STYLES[selected.status] ?? STATUS_STYLES.OPEN
                  }`}
                >
                  {STATUS_LABELS[selected.status] ?? selected.status}
                </span>
              </div>

              <ul className="mt-5 space-y-3">
                {selected.messages.map((m) => {
                  const fromTeam = m.sender === "ADMIN";
                  return (
                    <li
                      key={m.id}
                      className={`rounded-xl border px-4 py-3 ${
                        fromTeam
                          ? "border-brand-500/25 bg-brand-500/12/50"
                          : "border-line bg-ink-2"
                      }`}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-[12px] font-semibold text-fg">{m.authorLabel}</p>
                        <time className="text-[11px] tabular-nums text-fg-muted">
                          {stampFmt.format(m.createdAt)}
                        </time>
                      </div>
                      <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-fg-muted">
                        {m.body}
                      </p>
                    </li>
                  );
                })}
              </ul>

              <AdminTicketReply ticketId={selected.id} currentStatus={selected.status} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
