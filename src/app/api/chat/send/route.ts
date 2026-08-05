import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentConversation } from "@/lib/chat";
import { notifyAdminsOfChat } from "@/lib/chat-notify";

export async function POST(req: Request) {
  const convo = await currentConversation();
  if (!convo) return NextResponse.json({ error: "no session" }, { status: 401 });

  const data = await req.json().catch(() => null);
  const body = String(data?.body ?? "").trim().slice(0, 2000);
  if (!body) return NextResponse.json({ error: "empty" }, { status: 400 });

  await db.chatMessage.create({ data: { conversationId: convo.id, sender: "VISITOR", body } });
  await db.chatConversation.update({
    where: { id: convo.id },
    data: { unreadForAdmin: true, lastMessageAt: new Date(), status: "OPEN" },
  });

  await notifyAdminsOfChat(convo.id, false);

  return NextResponse.json({ ok: true });
}
