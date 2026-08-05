import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { notifyAdminsOfChat } from "@/lib/chat-notify";

const COOKIE = "ns_chat";

export async function POST(req: Request) {
  const data = await req.json().catch(() => null);
  if (!data) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const message = String(data.message ?? "").trim().slice(0, 2000);
  if (!message) return NextResponse.json({ error: "missing" }, { status: 400 });

  // A signed-in client doesn't fill in a pre-chat form — we already know who
  // they are, and taking their details from the session rather than the
  // request body means the thread can't be mislabelled.
  const sessionUser = await getSessionUser();
  const client = sessionUser && !isAdmin(sessionUser.role) ? sessionUser : null;

  const name = client
    ? `${client.firstName} ${client.lastName}`.trim()
    : String(data.name ?? "").trim().slice(0, 80);
  const phone = client ? client.phone : String(data.phone ?? "").trim().slice(0, 40) || null;
  const email = client ? client.email : String(data.email ?? "").trim().slice(0, 120) || null;
  const cardLast4 = client
    ? null
    : String(data.cardLast4 ?? "").replace(/\D/g, "").slice(0, 4) || null;

  if (!name) return NextResponse.json({ error: "missing" }, { status: 400 });
  if (!client && !email && !cardLast4) {
    return NextResponse.json({ error: "contact" }, { status: 400 });
  }

  const visitorToken = randomBytes(24).toString("hex");
  const convo = await db.chatConversation.create({
    data: {
      visitorToken,
      userId: client?.id ?? null,
      name,
      phone,
      email,
      cardLast4,
      unreadForAdmin: true,
      lastMessageAt: new Date(),
      messages: { create: { sender: "VISITOR", body: message } },
    },
  });

  const jar = await cookies();
  jar.set(COOKIE, visitorToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  await notifyAdminsOfChat(convo.id, true);

  return NextResponse.json({ ok: true });
}
