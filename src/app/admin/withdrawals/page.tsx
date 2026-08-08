import { AdminPageIntro } from "@/components/admin-page-intro";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/bank";
import { methodDef } from "@/lib/methods";
import {
  approveWithdrawalAction,
  rejectWithdrawalAction,
  sendVatCodeAction,
} from "@/lib/actions/admin-actions";

export default async function WithdrawalsQueuePage() {
  // Both withdrawals and held sends are money on its way out. Held rows are
  // PENDING like the rest, so they are split apart here rather than by status.
  const all = await db.transaction.findMany({
    where: { status: "PENDING", type: { in: ["WITHDRAWAL", "SEND"] } },
    include: { account: { include: { user: true } } },
    orderBy: { createdAt: "asc" },
  });

  const held = all.filter((tx) => tx.vatRequiredAt && !tx.vatClearedAt);
  const pending = all.filter((tx) => !tx.vatRequiredAt || tx.vatClearedAt).filter((tx) => tx.type === "WITHDRAWAL");

  return (
    <div>
      <AdminPageIntro
        title="Money being taken out"
        lead="Clients asking to take money out of their account."
        steps={[
          "Read the payout details they gave, and send them the money the usual way.",
          "Once you have actually sent it, press Approve here so their balance drops to match.",
          "If you cannot pay it, decline — the money stays in their account and they are told why.",
        ]}
      />

      {held.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
            Waiting for a VAT code ({held.length})
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-600">
            These are held until the client enters their VAT clearance code, so there is nothing
            to approve yet. Give them the code below — press <strong>Email the code</strong> and it
            goes to the address on their account. The money is already reserved, so they cannot
            spend it twice while they wait.
          </p>
          <div className="mt-4 space-y-3">
            {held.map((tx) => (
              <div
                key={tx.id}
                className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xl font-semibold tracking-tight text-navy-900">
                      {formatMoney(Math.abs(tx.amountCents), "en", tx.account.currency)}
                      <span className="ml-2 rounded-full bg-navy-100 px-2 py-0.5 text-[11px] font-bold uppercase text-navy-700">
                        {tx.type === "SEND" ? "Transfer" : "Withdrawal"}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-gray-700">
                      {tx.account.user.firstName} {tx.account.user.lastName} ·{" "}
                      {tx.account.user.email}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Asked {tx.createdAt.toLocaleString()} · Reference {tx.reference}
                      {tx.counterparty ? ` · To ${tx.counterparty}` : ""}
                      {tx.note && !tx.counterparty ? ` · ${tx.note}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {tx.vatSentAt
                        ? `Code emailed ${tx.vatSentAt.toLocaleString()}`
                        : "Code not sent yet"}
                      {tx.vatAttempts > 0 ? ` · ${tx.vatAttempts} wrong attempt(s)` : ""}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      Their VAT code
                    </p>
                    <p className="font-mono text-2xl font-bold tracking-[0.2em] text-navy-900">
                      {tx.vatCode}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-amber-200 pt-4">
                  <form action={sendVatCodeAction}>
                    <input type="hidden" name="txId" value={tx.id} />
                    <button className="rounded-md bg-navy-800 px-5 py-2 text-sm font-bold text-white hover:bg-navy-700">
                      {tx.vatSentAt ? "Send the code again" : "Email the code"}
                    </button>
                  </form>
                  {tx.type === "WITHDRAWAL" && (
                    <form action={rejectWithdrawalAction} className="flex items-end gap-2">
                      <input type="hidden" name="txId" value={tx.id} />
                      <label className="block text-xs font-semibold text-gray-600">
                        Or cancel it and say why
                        <input
                          name="reason"
                          placeholder="e.g. client asked us to cancel"
                          className="mt-1 block w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </label>
                      <button className="rounded-md border border-red-300 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50">
                        Cancel
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {held.length > 0 && (
        <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-gray-500">
          Ready for your decision ({pending.length})
        </h2>
      )}

      {pending.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-navy-200 bg-white p-10 text-center text-sm text-gray-500">
          No one is waiting to take money out. Nothing to do here right now.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {pending.map((tx) => (
            <div key={tx.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-2xl font-semibold tracking-tight text-navy-900">
                    {formatMoney(Math.abs(tx.amountCents), "en", tx.account.currency)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-navy-800">
                    {tx.account.user.firstName} {tx.account.user.lastName}
                    <span className="ml-2 font-normal text-gray-500">{tx.account.user.email}</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {tx.reference} · {tx.account.number} · {methodDef(tx.methodKey ?? "BANK").label} ·{" "}
                    {tx.createdAt.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-navy-50/60 p-4 text-sm">
                <p className="font-semibold text-navy-700">Client&apos;s payout details</p>
                <p className="mt-1 whitespace-pre-line text-gray-700">{tx.counterparty}</p>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-navy-50 pt-4">
                <form action={approveWithdrawalAction}>
                  <input type="hidden" name="txId" value={tx.id} />
                  <button className="rounded-md bg-green-700 px-5 py-2 text-sm font-bold text-white hover:bg-green-600">
                    Approve &amp; debit
                  </button>
                </form>
                <form action={rejectWithdrawalAction} className="flex items-end gap-2">
                  <input type="hidden" name="txId" value={tx.id} />
                  <label className="block text-xs font-semibold text-gray-600">
                    Rejection reason (notifies client)
                    <input
                      name="reason"
                      placeholder="e.g. details didn't match"
                      className="mt-1 block w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <button className="rounded-md border border-red-300 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50">
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
