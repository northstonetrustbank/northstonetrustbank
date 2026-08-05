import "server-only";
import { cookies } from "next/headers";
import { db } from "./db";
import { getSessionUser, isAdmin } from "./auth";

export const CHAT_COOKIE = "ns_chat";

/**
 * The conversation belonging to whoever is asking.
 *
 * An anonymous visitor is identified by the httpOnly cookie. A signed-in
 * client is identified by their account first, so their thread follows them to
 * another browser or device instead of being stranded with a lost cookie.
 */
export async function currentConversation() {
  const sessionUser = await getSessionUser();
  const client = sessionUser && !isAdmin(sessionUser.role) ? sessionUser : null;

  if (client) {
    const own = await db.chatConversation.findFirst({
      where: { userId: client.id },
      orderBy: { lastMessageAt: "desc" },
    });
    if (own) return own;
  }

  const jar = await cookies();
  const token = jar.get(CHAT_COOKIE)?.value;
  if (!token) return null;
  return db.chatConversation.findUnique({ where: { visitorToken: token } });
}
