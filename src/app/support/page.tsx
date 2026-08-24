import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getDict, getLocale } from "@/i18n/server";
import { AppShell, Page } from "@/components/app-shell";
import { Icons, NavIcons } from "@/components/icons";
import { Card, EmptyState, SectionHead, StatusChip, Tabs, type Tone } from "@/components/ui";
import { SupportConsole } from "./support-console";
import { NewTicketForm } from "./new-ticket-form";

export const metadata = { title: "Support — Northstone Trust Bank" };

const INTL: Record<string, string> = { en: "en-US", fr: "fr-FR", de: "de-DE", es: "es-ES" };

const TABS = ["chat", "tickets", "new"] as const;
type Tab = (typeof TABS)[number];

function isTab(value: unknown): value is Tab {
  return typeof value === "string" && (TABS as readonly string[]).includes(value);
}

function statusTone(status: string): Tone {
  return status === "RESOLVED" ? "ok" : status === "AWAITING_CLIENT" ? "info" : "pending";
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");

  const t = await getDict();
  const locale = await getLocale();
  const { tab: tabParam } = await searchParams;
  const tab: Tab = isTab(tabParam) ? tabParam : "chat";

  const tickets = await db.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { lastMessageAt: "desc" },
  });

  const stampFmt = new Intl.DateTimeFormat(INTL[locale] ?? "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const tabLabels: Record<Tab, string> = {
    chat: t.tickets.tabChat,
    tickets: t.tickets.tabTickets,
    new: t.tickets.tabNew,
  };

  return (
    <AppShell user={user} active="support" title={t.tickets.title} subtitle={t.tickets.subtitle}>
      <Page className="space-y-5">
        <Tabs
          items={TABS.map((key) => ({
            key,
            href: `/support?tab=${key}`,
            label: tabLabels[key],
            active: key === tab,
            dot: key === "tickets" && tickets.some((x) => x.unreadForClient),
          }))}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0">
            {tab === "chat" && (
              <SupportConsole
                clientName={`${user.firstName} ${user.lastName}`.trim()}
                locale={INTL[locale] ?? "en-US"}
                labels={{
                  agent: t.chat.agent,
                  you: t.support.you,
                  placeholder: t.chat.placeholder,
                  send: t.chat.send,
                  waiting: t.support.waiting,
                  empty: t.support.empty,
                  today: t.chat.today,
                  yesterday: t.chat.yesterday,
                  online: t.chat.online,
                  signedInAs: t.support.signedInAs,
                  startTitle: t.support.startTitle,
                  startBody: t.support.startBody,
                  startPlaceholder: t.support.startPlaceholder,
                  startButton: t.support.startButton,
                  starting: t.chat.starting,
                }}
              />
            )}

            {tab === "tickets" &&
              (tickets.length === 0 ? (
                <EmptyState
                  title={t.tickets.empty}
                  body={t.tickets.emptyBody}
                  action={
                    <Link
                      href="/support?tab=new"
                      className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400"
                    >
                      {t.tickets.newTicket}
                    </Link>
                  }
                />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-line bg-ink-1">
                  {tickets.map((ticket, i) => (
                    <Link
                      key={ticket.id}
                      href={`/support/${ticket.id}`}
                      className={`flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-ink-2 ${
                        i > 0 ? "border-t border-line-soft" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                          {ticket.unreadForClient && (
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"
                              aria-hidden="true"
                            />
                          )}
                          <span className="truncate">{ticket.subject}</span>
                        </p>
                        <p className="tnum mt-0.5 truncate text-[12px] text-fg-muted">
                          {ticket.reference} ·{" "}
                          {t.tickets.categories[
                            ticket.category as keyof typeof t.tickets.categories
                          ] ?? ticket.category}{" "}
                          · {stampFmt.format(ticket.lastMessageAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusChip tone={statusTone(ticket.status)}>
                          {t.tickets.statuses[ticket.status as keyof typeof t.tickets.statuses] ??
                            ticket.status}
                        </StatusChip>
                        <NavIcons.chevronRight className="h-4 w-4 text-fg-faint" />
                      </div>
                    </Link>
                  ))}
                </div>
              ))}

            {tab === "new" && (
              <Card>
                <SectionHead title={t.tickets.newTicket} subtitle={t.tickets.newTicketBody} />
                <NewTicketForm
                  labels={{
                    category: t.tickets.categoryLabel,
                    subject: t.tickets.subjectLabel,
                    body: t.tickets.detailsLabel,
                    submit: t.tickets.submit,
                    submitting: t.tickets.submitting,
                    categories: t.tickets.categories,
                    choose: t.products.choose,
                  }}
                />
              </Card>
            )}
          </div>

          <aside className="space-y-4">
            <Card padded={false} className="p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/12 text-brand-400">
                <Icons.shield className="h-4 w-4" />
              </span>
              <p className="mt-3 text-[13px] font-semibold text-fg">
                {t.support.safetyTitle}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-fg-muted">{t.support.safetyBody}</p>
            </Card>

            <Card padded={false} className="p-5">
              <p className="text-[13px] font-semibold text-fg">{t.support.otherTitle}</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <a
                    href="mailto:support@northstonetrustbank.com"
                    className="break-words font-medium text-brand-400 hover:text-brand-400"
                  >
                    support@northstonetrustbank.com
                  </a>
                </li>
                <li>
                  <Link href="/faq" className="font-medium text-fg hover:text-brand-400">
                    {t.nav.faq}
                  </Link>
                </li>
                <li>
                  <Link href="/security" className="font-medium text-fg hover:text-brand-400">
                    {t.nav.security}
                  </Link>
                </li>
              </ul>
            </Card>

            <div className="rounded-2xl border border-line bg-ink-2 p-5">
              <p className="text-[13px] font-semibold text-fg">{t.support.hoursTitle}</p>
              <p className="mt-1 text-xs leading-relaxed text-fg-muted">{t.support.hoursBody}</p>
            </div>
          </aside>
        </div>
      </Page>
    </AppShell>
  );
}
