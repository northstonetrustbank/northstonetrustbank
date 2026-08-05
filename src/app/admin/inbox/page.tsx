import { AdminPageIntro } from "@/components/admin-page-intro";
import Link from "next/link";
import { listMessages, getMessage, MAILBOX_ADDRESSES } from "@/lib/mailbox";
import { ReplyForm } from "./reply-form";

// Live IMAP fetch on each request — never statically rendered.
export const dynamic = "force-dynamic";

const TABS = [
  { key: "info", label: "info@" },
  { key: "support", label: "support@" },
  { key: "accountmanager", label: "accountmanager@" },
];

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ box?: string; uid?: string }>;
}) {
  const { box: boxParam, uid } = await searchParams;
  const box = MAILBOX_ADDRESSES[boxParam ?? ""] ? (boxParam as string) : "info";

  let error: string | null = null;
  let messages: Awaited<ReturnType<typeof listMessages>> = [];
  let openMessage: Awaited<ReturnType<typeof getMessage>> = null;

  try {
    if (uid) {
      openMessage = await getMessage(box, Number(uid));
    }
    messages = await listMessages(box, 25);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not connect to the mailbox.";
  }

  const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div>
      <AdminPageIntro
        title="Email inbox"
        lead="Mail sent to your three company addresses, all in one place."
        steps={[
          "Pick a mailbox along the top to see what has come in.",
          "Click a message to read it.",
          "When you reply, it is sent from whichever address they wrote to.",
        ]}
      />

      {/* Mailbox tabs */}
      <div className="mt-5 flex gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/inbox?box=${tab.key}`}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              box === tab.key
                ? "bg-navy-800 text-white"
                : "bg-white text-navy-800 hover:bg-navy-50"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Couldn&apos;t load this mailbox: {error}
        </div>
      )}

      {/* Open message + reply */}
      {!error && openMessage && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <Link href={`/admin/inbox?box=${box}`} className="text-sm font-semibold text-accent-600 hover:text-accent-700">
            ← Back to inbox
          </Link>
          <h2 className="mt-3 text-lg font-semibold text-navy-900">{openMessage.subject}</h2>
          <p className="mt-1 text-sm text-gray-600">
            From{" "}
            <strong className="text-navy-800">
              {openMessage.fromName || openMessage.fromAddress}
            </strong>{" "}
            &lt;{openMessage.fromAddress}&gt;
            {openMessage.date ? ` · ${dateFmt.format(new Date(openMessage.date))}` : ""}
          </p>
          <div className="mt-4 whitespace-pre-line rounded-xl bg-navy-50/50 p-4 text-[15px] leading-relaxed text-gray-800">
            {openMessage.text || "(no text content)"}
          </div>
          <ReplyForm
            box={box}
            to={openMessage.fromAddress}
            subject={openMessage.subject.startsWith("Re:") ? openMessage.subject : `Re: ${openMessage.subject}`}
          />
        </div>
      )}

      {/* Message list */}
      {!error && !openMessage && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {messages.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-gray-500">This mailbox is empty.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {messages.map((m) => (
                <li key={m.uid}>
                  <Link
                    href={`/admin/inbox?box=${box}&uid=${m.uid}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-navy-50/50"
                  >
                    <div className="min-w-0">
                      <p className={`truncate text-sm ${m.seen ? "text-gray-700" : "font-bold text-navy-900"}`}>
                        {m.fromName || m.fromAddress}
                      </p>
                      <p className="truncate text-sm text-gray-600">{m.subject}</p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {m.date ? dateFmt.format(new Date(m.date)) : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
