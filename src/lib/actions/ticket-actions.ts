"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getDict } from "@/i18n/server";
import { notifyNewTicket } from "@/lib/ticket-notify";
import { isTicketCategory, TICKET_STATUSES } from "@/lib/tickets";
import type { FormState } from "./auth-actions";

const MAX_SUBJECT = 120;
const MAX_BODY = 4000;

/** Reference the client quotes back to us, e.g. NS-S-9F2A41C8. */
function newTicketReference() {
  return `NS-S-${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function requireClient() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "CLIENT") redirect("/admin");
  return user;
}

// ---------- client: open a ticket ----------

export async function createTicketAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const t = await getDict();
  const user = await requireClient();

  const category = String(formData.get("category") ?? "");
  const subject = String(formData.get("subject") ?? "").trim().slice(0, MAX_SUBJECT);
  const body = String(formData.get("body") ?? "").trim().slice(0, MAX_BODY);

  if (!isTicketCategory(category) || !subject || !body) {
    return { error: t.tickets.incomplete };
  }

  const ticket = await db.supportTicket.create({
    data: {
      userId: user.id,
      reference: newTicketReference(),
      category,
      subject,
      messages: {
        create: {
          sender: "CLIENT",
          authorLabel: `${user.firstName} ${user.lastName}`.trim(),
          body,
        },
      },
    },
  });

  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: "TICKET_OPENED",
    targetType: "TICKET",
    targetId: ticket.reference,
    details: `${category}: ${subject}`,
  });

  // Support is told by email; a failure there must not lose the ticket.
  await notifyNewTicket(ticket.reference, category, subject, user.email);

  revalidatePath("/support");
  redirect(`/support/${ticket.id}`);
}

// ---------- client: reply on their own ticket ----------

export async function replyToTicketAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const t = await getDict();
  const user = await requireClient();

  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, MAX_BODY);
  if (!body) return { error: t.tickets.incomplete };

  const ticket = await db.supportTicket.findFirst({
    where: { id: ticketId, userId: user.id },
  });
  if (!ticket) return { error: t.tickets.notFound };

  await db.$transaction([
    db.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        sender: "CLIENT",
        authorLabel: `${user.firstName} ${user.lastName}`.trim(),
        body,
      },
    }),
    db.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: ticket.status === "RESOLVED" ? "OPEN" : ticket.status,
        unreadForAdmin: true,
        unreadForClient: false,
        lastMessageAt: new Date(),
      },
    }),
  ]);

  await notifyNewTicket(ticket.reference, ticket.category, ticket.subject, user.email);

  revalidatePath(`/support/${ticket.id}`);
  revalidatePath("/support");
  return { ok: t.tickets.replySent };
}

// ---------- client: mark their own ticket resolved ----------

export async function closeTicketAction(formData: FormData) {
  const user = await requireClient();
  const ticketId = String(formData.get("ticketId") ?? "");

  const ticket = await db.supportTicket.findFirst({
    where: { id: ticketId, userId: user.id },
  });
  if (!ticket) return;

  await db.supportTicket.update({
    where: { id: ticket.id },
    data: { status: "RESOLVED", unreadForAdmin: true },
  });

  revalidatePath(`/support/${ticket.id}`);
  revalidatePath("/support");
}

// ---------- admin: reply and set status ----------

export async function adminReplyTicketAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const t = await getDict();
  const admin = await getSessionUser();
  if (!admin || !isAdmin(admin.role)) redirect("/login");

  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, MAX_BODY);
  const status = String(formData.get("status") ?? "");
  if (!body) return { error: t.tickets.incomplete };

  const ticket = await db.supportTicket.findUnique({
    where: { id: ticketId },
    include: { user: true },
  });
  if (!ticket) return { error: t.tickets.notFound };

  const nextStatus = (TICKET_STATUSES as readonly string[]).includes(status)
    ? status
    : "AWAITING_CLIENT";

  await db.$transaction([
    db.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        sender: "ADMIN",
        authorLabel: t.tickets.teamName,
        body,
      },
    }),
    db.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: nextStatus,
        unreadForAdmin: false,
        unreadForClient: true,
        lastMessageAt: new Date(),
      },
    }),
    // The client sees it in their notification bell as well as in the thread.
    db.notification.create({
      data: {
        userId: ticket.userId,
        title: `${t.tickets.replyNotificationTitle} · ${ticket.reference}`,
        body: ticket.subject,
      },
    }),
  ]);

  await audit({
    actorId: admin.id,
    actorLabel: admin.email,
    action: "TICKET_REPLIED",
    targetType: "TICKET",
    targetId: ticket.reference,
    details: `Replied to ${ticket.user.email} (${nextStatus})`,
  });

  revalidatePath("/admin/tickets");
  return { ok: t.tickets.replySent };
}

/** Opening a ticket in the admin console clears its unread flag. */
export async function markTicketReadAction(ticketId: string) {
  const admin = await getSessionUser();
  if (!admin || !isAdmin(admin.role)) return;
  await db.supportTicket.updateMany({
    where: { id: ticketId, unreadForAdmin: true },
    data: { unreadForAdmin: false },
  });
}
