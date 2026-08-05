import { AdminPageIntro } from "@/components/admin-page-intro";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/bank";
import {
  verifyDepositAction,
  rejectDepositAction,
  requestProofAction,
} from "@/lib/actions/admin-actions";

export default async function DepositsQueuePage() {
  const pending = await db.transaction.findMany({
    where: { status: "PENDING", type: "DEPOSIT" },
    include: { account: { include: { user: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <AdminPageIntro
        title="Money being paid in"
        lead="Clients telling you they have sent money to the bank."
        steps={[
          "Check your real bank account first and confirm the money actually arrived.",
          "Only then press Approve — that is what adds the money to their balance.",
          "They get a receipt showing their new balance. If it never arrived, decline it.",
        ]}
      />

      {pending.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-navy-200 bg-white p-10 text-center text-sm text-gray-500">
          No one has paid money in that needs checking. Nothing to do here right now.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {pending.map((tx) => (
            <div key={tx.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-2xl font-semibold tracking-tight text-navy-900">
                    {formatMoney(tx.amountCents, "en", tx.account.currency)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-navy-800">
                    {tx.account.user.firstName} {tx.account.user.lastName}
                    <span className="ml-2 font-normal text-gray-500">
                      {tx.account.user.email}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {tx.reference} · {tx.account.number} ·{" "}
                    {tx.createdAt.toLocaleString()}
                    {tx.note ? ` · "${tx.note}"` : ""}
                  </p>
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-navy-700">Proof</p>
                  {tx.proofStoredName ? (
                    <a
                      href={`/api/files/deposit/${tx.proofStoredName}`}
                      target="_blank"
                      className="text-accent-600 hover:underline"
                    >
                      {tx.proofFileName}
                    </a>
                  ) : (
                    <p className="text-gray-500">None attached</p>
                  )}
                  {tx.proofRequestedAt && (
                    <p className="mt-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                      Proof requested {tx.proofRequestedAt.toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-navy-50 pt-4">
                <form action={verifyDepositAction}>
                  <input type="hidden" name="txId" value={tx.id} />
                  <button className="rounded-md bg-green-700 px-5 py-2 text-sm font-bold text-white hover:bg-green-600">
                    Verify &amp; credit
                  </button>
                </form>
                {!tx.proofRequestedAt && (
                  <form action={requestProofAction}>
                    <input type="hidden" name="txId" value={tx.id} />
                    <button className="rounded-md border border-amber-400 px-4 py-2 text-sm font-bold text-amber-700 hover:bg-amber-50">
                      Request proof
                    </button>
                  </form>
                )}
                <form action={rejectDepositAction} className="flex items-end gap-2">
                  <input type="hidden" name="txId" value={tx.id} />
                  <label className="block text-xs font-semibold text-gray-600">
                    Rejection reason (emailed to client)
                    <input
                      name="reason"
                      placeholder="e.g. no matching transfer found"
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
