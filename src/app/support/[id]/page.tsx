import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { closeTicketAction } from "@/lib/actions/ticket-actions";
import { getDict, getLocale } from "@/i18n/server";
import { AppShell, Page } from "@/components/app-shell";
import { BackLink, Card, SectionHead, StatusChip, type Tone } from "@/components/ui";
import { TicketReplyForm } from "../reply-form";

export const metadata = { title: "Support ticket — Northstone Trust Bank" };

const INTL: Record<string, string> = { en: "en-US", fr: "fr-FR", de: "de-DE", es: "es-ES" };

function statusTone(status: string): Tone {
  return status === "RESOLVED" ? "ok" : status === "AWAITING_CLIENT" ? "info" : "pending";
}

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin/tickets");

  const { id } = await params;
  const t = await getDict();
  const locale = await getLocale();

  const ticket = await db.supportTicket.findFirst({
    where: { id, userId: user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) notFound();

  // Opening the thread is the client reading it.
  if (ticket.unreadForClient) {
    await db.supportTicket.update({
      where: { id: ticket.id },
      data: { unreadForClient: false },
    });
  }

  const stampFmt = new Intl.DateTimeFormat(INTL[locale] ?? "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <AppShell
      user={user}
      active="support"
      title={ticket.subject}
      subtitle={`${ticket.reference} · ${
        t.tickets.categories[ticket.category as keyof typeof t.tickets.categories] ??
        ticket.category
      }`}
    >
      <Page className="max-w-3xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackLink href="/support?tab=tickets">{t.tickets.allTickets}</BackLink>
          <StatusChip tone={statusTone(ticket.status)}>
            {t.tickets.statuses[ticket.status as keyof typeof t.tickets.statuses] ?? ticket.status}
          </StatusChip>
        </div>

        <Card>
          <ul className="space-y-4">
            {ticket.messages.map((m) => {
              const fromTeam = m.sender === "ADMIN";
              return (
                <li
                  key={m.id}
                  className={`rounded-xl border px-4 py-3.5 ${
                    fromTeam
                      ? "border-brand-500/25 bg-brand-500/12/50"
                      : "border-line bg-ink-1"
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[13px] font-semibold text-fg">
                      {fromTeam ? t.tickets.teamName : t.support.you}
                    </p>
                    <time className="tnum text-[11px] text-fg-muted">
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

          {ticket.status === "RESOLVED" ? (
            <p className="mt-5 rounded-xl border border-pos/25 bg-pos/10 px-4 py-3 text-[13px] text-pos">
              {t.tickets.resolvedNote}
            </p>
          ) : null}

          <SectionHead className="mt-6" title={t.tickets.reply} />
          <TicketReplyForm
            ticketId={ticket.id}
            labels={{
              placeholder: t.tickets.replyPlaceholder,
              send: t.tickets.sendReply,
              sending: t.tickets.sending,
            }}
          />

          {ticket.status !== "RESOLVED" && (
            <form action={closeTicketAction} className="mt-4">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <button
                type="submit"
                className="text-[13px] font-semibold text-fg-muted underline-offset-2 transition hover:text-fg hover:underline"
              >
                {t.tickets.markResolved}
              </button>
            </form>
          )}
        </Card>
      </Page>
    </AppShell>
  );
}
