import { AdminPageIntro } from "@/components/admin-page-intro";
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
      <AdminPageIntro
        title="Live chat"
        lead="Messages from people using the website. Pick a conversation to read what they shared and reply to them. A blue dot means they are still waiting for an answer."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Conversation list */}
        <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          {conversations.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-500">Nobody has started a chat yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <Link
                    href={`/admin/chat?c=${conv.id}`}
                    className={`block px-5 py-4 transition hover:bg-navy-50/50 ${
                      selected?.id === conv.id ? "bg-navy-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-navy-900">{conv.name}</p>
                      {conv.unreadForAdmin && (
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent-500" />
                      )}
                    </div>
                    <p className="truncate text-xs text-gray-500">
                      {conv.messages[0]?.body ?? ""}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400">
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
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-4">
                <p className="font-semibold text-navy-900">{selected.name}</p>
                <p className="text-xs text-gray-500">
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
            <div className="flex h-full min-h-[16rem] items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-white p-10 text-center text-sm text-gray-500">
              Select a conversation to read and reply.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
