import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentConversation } from "@/lib/chat";

export async function GET() {
  const convo = await currentConversation();
  if (!convo) return NextResponse.json({ conversation: null, messages: [] });

  const messages = await db.chatMessage.findMany({
    where: { conversationId: convo.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    conversation: { status: convo.status, startedAt: convo.createdAt.toISOString() },
    messages: messages.map((m) => ({
      sender: m.sender,
      body: m.body,
      at: m.createdAt.toISOString(),
    })),
  });
}
