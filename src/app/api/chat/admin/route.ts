import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth";

// Admin fetches a conversation's messages (and marks it read).
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const cid = new URL(req.url).searchParams.get("conversationId");
  if (!cid) return NextResponse.json({ error: "missing" }, { status: 400 });

  await db.chatConversation.update({ where: { id: cid }, data: { unreadForAdmin: false } }).catch(() => {});
  const convo = await db.chatConversation.findUnique({
    where: { id: cid },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!convo) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    status: convo.status,
    messages: convo.messages.map((m) => ({
      sender: m.sender,
      body: m.body,
      at: m.createdAt.toISOString(),
    })),
  });
}

// Admin replies to a conversation.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const data = await req.json().catch(() => null);
  const cid = String(data?.conversationId ?? "");
  const body = String(data?.body ?? "").trim().slice(0, 2000);
  if (!cid || !body) return NextResponse.json({ error: "missing" }, { status: 400 });

  await db.chatMessage.create({ data: { conversationId: cid, sender: "ADMIN", body } });
  await db.chatConversation.update({
    where: { id: cid },
    data: { lastMessageAt: new Date(), unreadForAdmin: false },
  });

  return NextResponse.json({ ok: true });
}
