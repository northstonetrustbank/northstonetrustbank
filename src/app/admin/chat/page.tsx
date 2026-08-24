import Link from "next/link";
import { db } from "@/lib/db";
import { AdminChatConsole } from "./console";

export const dynamic = "force-dynamic";

export default async function AdminChatPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const conversations = await db.chatConversation.findMany({
    orderBy: { lastMessageAt: "desc" },
    take: 60,
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const selected = c ? conversations.find((x) => x.id === c) : null;

  return (
    <div>
      <h1 className="text-xl font-bold text-fg">Live chat</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Visitor conversations. Open one to read the details they shared and reply
        in real time.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Conversation list */}
        <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-line bg-ink-1 shadow-sm">
          {conversations.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-fg-muted">No conversations yet.</p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <Link
                    href={`/admin/chat?c=${conv.id}`}
                    className={`block px-5 py-4 transition hover:bg-ink-2 ${
                      selected?.id === conv.id ? "bg-ink-2" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-fg">{conv.name}</p>
                      {conv.unreadForAdmin && (
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500" />
                      )}
                    </div>
                    <p className="truncate text-xs text-fg-muted">
                      {conv.messages[0]?.body ?? ""}
                    </p>
                    <p className="mt-0.5 text-[11px] text-fg-faint">
                      {conv.email ?? (conv.cardLast4 ? `card •••• ${conv.cardLast4}` : conv.phone ?? "")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Console */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="rounded-2xl border border-line bg-ink-1 shadow-sm">
              <div className="border-b border-line bg-ink-2 px-5 py-4">
                <p className="font-semibold text-fg">{selected.name}</p>
                <p className="text-xs text-fg-muted">
                  {[
                    selected.email,
                    selected.phone,
                    selected.cardLast4 ? `card •••• ${selected.cardLast4}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <AdminChatConsole conversationId={selected.id} />
            </div>
          ) : (
            <div className="flex h-full min-h-[16rem] items-center justify-center rounded-2xl border border-dashed border-line bg-ink-1 p-10 text-center text-sm text-fg-muted">
              Select a conversation to read and reply.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
