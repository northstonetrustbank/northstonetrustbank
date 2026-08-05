import { AdminPageIntro } from "@/components/admin-page-intro";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/bank";
import { methodDef } from "@/lib/methods";
import {
  approveWithdrawalAction,
  rejectWithdrawalAction,
} from "@/lib/actions/admin-actions";

export default async function WithdrawalsQueuePage() {
  const pending = await db.transaction.findMany({
    where: { status: "PENDING", type: "WITHDRAWAL" },
    include: { account: { include: { user: true } } },
    orderBy: { createdAt: "asc" },
  });

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
