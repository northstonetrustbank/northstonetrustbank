import { AdminPageIntro } from "@/components/admin-page-intro";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/bank";
import {
  blockAccountAction,
  unblockAccountAction,
  adjustBalanceAction,
  deleteKycDocumentsAction,
} from "@/lib/actions/admin-actions";

const SIDE_LABELS: Record<string, string> = {
  FRONT: "Front",
  BACK: "Back",
  SELFIE: "Selfie",
};

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PENDING: "bg-amber-100 text-amber-800",
  BLOCKED: "bg-red-100 text-red-800",
  REJECTED: "bg-gray-200 text-gray-600",
};

export default async function ClientsPage() {
  const clients = await db.user.findMany({
    where: { role: "CLIENT" },
    include: { accounts: true, kycDocuments: true },
    orderBy: { createdAt: "desc" },
  });

  // One query for all balances: sum POSTED amounts per account.
  const sums = await db.transaction.groupBy({
    by: ["accountId"],
    where: { status: "POSTED" },
    _sum: { amountCents: true },
  });
  const balanceByAccount = new Map(sums.map((s) => [s.accountId, s._sum.amountCents ?? 0]));

  return (
    <div>
      <AdminPageIntro
        title="Clients"
        lead="Everyone who banks with Northstone."
        steps={[
          "Find a person to see their balance, their accounts and everything they have done.",
          "Use Add money for interest or a bonus, and Take money out for a fee or a payout.",
          "Every change needs a reason, is emailed to the client, and is recorded permanently.",
        ]}
      />

      <div className="mt-6 space-y-4">
        {clients.length === 0 && (
          <div className="rounded-2xl border border-dashed border-navy-200 bg-white p-10 text-center text-sm text-gray-500">
            No one has an open account yet. Approved sign-ups will show up here.
          </div>
        )}
        {clients.map((u) => {
          const checking = u.accounts.find((a) => a.kind === "CHECKING");
          const balance = u.accounts.reduce((sum, a) => sum + (balanceByAccount.get(a.id) ?? 0), 0);
          return (
            <div key={u.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-navy-800">
                    {u.firstName} {u.lastName}
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        u.accountType === "COMMERCIAL"
                          ? "bg-navy-100 text-navy-700"
                          : "bg-accent-50 text-accent-700"
                      }`}
                    >
                      {u.accountType === "COMMERCIAL" ? "Business" : "Personal"}
                    </span>
                    <span
                      className={`ml-2 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusStyles[u.status] ?? ""}`}
                    >
                      {u.status}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600">
                    {u.email} · {u.phone}
                    {checking ? ` · ${checking.number}` : ""}
                    {u.accounts.some((a) => a.kind === "SAVINGS") ? " · +Savings" : ""}
                  </p>
                  {u.statusReason && (
                    <p className="mt-1 text-xs text-gray-500">{u.statusReason}</p>
                  )}
                  {u.kycDocuments.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-navy-700">Identity files:</span>
                      {u.kycDocuments.map((d) => (
                        <a
                          key={d.id}
                          href={`/api/files/kyc/${d.storedName}`}
                          target="_blank"
                          className="text-accent-600 hover:underline"
                        >
                          {SIDE_LABELS[d.side] ?? d.side}
                        </a>
                      ))}
                      <span className="text-gray-400">
                        {Math.round(u.kycDocuments.reduce((s, d) => s + d.sizeBytes, 0) / 1024)} KB
                      </span>
                      <form action={deleteKycDocumentsAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <button className="rounded-md border border-red-200 px-2 py-0.5 font-bold text-red-700 transition hover:bg-red-50">
                          Delete files
                        </button>
                      </form>
                    </div>
                  )}
                  {u.kycDocuments.length === 0 && u.kycDocsDeletedAt && (
                    <p className="mt-2 text-xs text-gray-400">
                      Identity files deleted {u.kycDocsDeletedAt.toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Balance
                  </p>
                  <p className="text-xl font-semibold tracking-tight text-navy-900">
                    {u.accounts.length ? formatMoney(balance, "en", checking?.currency ?? u.currency) : "—"}
                  </p>
                </div>
              </div>

              {u.status === "ACTIVE" && (
                <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-navy-50 pt-4">
                  <form action={adjustBalanceAction} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <label className="block text-xs font-semibold text-gray-600">
                      Action
                      <select
                        name="direction"
                        className="mt-1 block rounded-md border border-gray-300 bg-white px-2 py-2 text-sm"
                      >
                        <option value="CREDIT">Add money (interest or bonus)</option>
                        <option value="DEBIT">Take money out (fee or payout)</option>
                      </select>
                    </label>
                    <label className="block text-xs font-semibold text-gray-600">
                      Amount (USD)
                      <input
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="0.00"
                        className="mt-1 block w-28 rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-gray-600">
                      Reason (emailed to client)
                      <input
                        name="reason"
                        required
                        placeholder="e.g. Interest for July"
                        className="mt-1 block w-52 rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <button className="rounded-md bg-navy-800 px-4 py-2 text-sm font-bold text-white hover:bg-navy-700">
                      Apply
                    </button>
                  </form>

                  <form action={blockAccountAction} className="flex items-end gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <input
                      name="reason"
                      placeholder="Block reason"
                      className="w-36 rounded-md border border-gray-300 px-2 py-2 text-xs"
                    />
                    <button className="rounded-md border border-red-300 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">
                      Block
                    </button>
                  </form>
                </div>
              )}

              {u.status === "BLOCKED" && (
                <div className="mt-4 border-t border-navy-50 pt-4">
                  <form action={unblockAccountAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button className="rounded-md border border-green-300 px-4 py-2 text-xs font-bold text-green-700 hover:bg-green-50">
                      Unblock
                    </button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
