/**
 * Ticket vocabulary shared by the client form, the server actions and the
 * admin console. It lives outside the actions file because a "use server"
 * module may only export async functions.
 */
export const TICKET_CATEGORIES = [
  "ACCOUNT",
  "TRANSACTION",
  "CARD",
  "LOAN",
  "SECURITY",
  "OTHER",
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export function isTicketCategory(value: unknown): value is TicketCategory {
  return typeof value === "string" && (TICKET_CATEGORIES as readonly string[]).includes(value);
}

export const TICKET_STATUSES = ["OPEN", "AWAITING_CLIENT", "RESOLVED"] as const;
