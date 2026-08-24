import { db } from "@/lib/db";
import { formatMoney } from "@/lib/bank";
import {
  blockAccountAction,
  unblockAccountAction,
  adjustBalanceAction,
  creditWelcomeBonusAction,
  deleteKycDocumentsAction,
} from "@/lib/actions/admin-actions";

const SIDE_LABELS: Record<string, string> = {
  FRONT: "Front",
  BACK: "Back",
  SELFIE: "Selfie",
};

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-pos/12 text-pos",
  PENDING: "bg-amber-400/12 text-amber-300",
  BLOCKED: "bg-neg/12 text-neg",
  REJECTED: "bg-ink-3 text-fg-muted",
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

  // Which clients have already been paid the welcome bonus — one lookup for
  // the whole page, so the button can hide itself once it has been used.
  const bonusRows = await db.transaction.findMany({
    where: { type: "BONUS" },
    select: { account: { select: { userId: true } } },
  });
  const bonusPaid = new Set(bonusRows.map((r) => r.account.userId));

  return (
    <div>
      <h1 className="text-xl font-bold text-fg">Clients</h1>
      <p className="mt-1 text-sm text-fg-muted">
        All client accounts. Credit for interest or bonuses, debit for
        withdrawals or fees — every adjustment requires a reason, is emailed to
        the client, and lands in the audit log.
      </p>

      <div className="mt-6 space-y-4">
        {clients.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line bg-ink-1 p-10 text-center text-sm text-fg-muted">
            No clients yet.
          </div>
        )}
        {clients.map((u) => {
          const checking = u.accounts.find((a) => a.kind === "CHECKING");
          const balance = u.accounts.reduce((sum, a) => sum + (balanceByAccount.get(a.id) ?? 0), 0);
          return (
            <div key={u.id} className="rounded-2xl border border-line bg-ink-1 p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-fg">
                    {u.firstName} {u.lastName}
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        u.accountType === "COMMERCIAL"
                          ? "bg-navy-100 text-fg-muted"
                          : "bg-brand-500/12 text-brand-400"
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
                  <p className="text-sm text-fg-muted">
                    {u.email} · {u.phone}
                    {checking ? ` · ${checking.number}` : ""}
                    {u.accounts.some((a) => a.kind === "SAVINGS") ? " · +Savings" : ""}
                  </p>
                  {u.statusReason && (
                    <p className="mt-1 text-xs text-fg-muted">{u.statusReason}</p>
                  )}
                  {u.kycDocuments.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-fg-muted">Identity files:</span>
                      {u.kycDocuments.map((d) => (
                        <a
                          key={d.id}
                          href={`/api/files/kyc/${d.storedName}`}
                          target="_blank"
                          className="text-brand-400 hover:underline"
                        >
                          {SIDE_LABELS[d.side] ?? d.side}
                        </a>
                      ))}
                      <span className="text-fg-faint">
                        {Math.round(u.kycDocuments.reduce((s, d) => s + d.sizeBytes, 0) / 1024)} KB
                      </span>
                      <form action={deleteKycDocumentsAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <button className="rounded-md border border-neg/25 px-2 py-0.5 font-bold text-neg transition hover:bg-neg/10">
                          Delete files
                        </button>
                      </form>
                    </div>
                  )}
                  {u.kycDocuments.length === 0 && u.kycDocsDeletedAt && (
                    <p className="mt-2 text-xs text-fg-faint">
                      Identity files deleted {u.kycDocsDeletedAt.toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
                    Balance
                  </p>
                  <p className="text-xl font-semibold tracking-tight text-fg">
                    {u.accounts.length ? formatMoney(balance, "en", checking?.currency ?? u.currency) : "—"}
                  </p>
                </div>
              </div>

              {u.status === "ACTIVE" && (
                <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-navy-50 pt-4">
                  <form action={adjustBalanceAction} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <label className="block text-xs font-semibold text-fg-muted">
                      Action
                      <select
                        name="direction"
                        className="mt-1 block rounded-md border border-line bg-ink-1 px-2 py-2 text-sm"
                      >
                        <option value="CREDIT">Credit (interest/bonus)</option>
                        <option value="DEBIT">Debit (withdrawal/fee)</option>
                      </select>
                    </label>
                    <label className="block text-xs font-semibold text-fg-muted">
                      Amount (USD)
                      <input
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="0.00"
                        className="mt-1 block w-28 rounded-md border border-line bg-ink-2 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-fg-muted">
                      Reason (emailed to client)
                      <input
                        name="reason"
                        required
                        placeholder="e.g. Interest for July"
                        className="mt-1 block w-52 rounded-md border border-line bg-ink-2 px-3 py-2 text-sm"
                      />
                    </label>
                    <button className="rounded-md bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-400">
                      Apply
                    </button>
                  </form>

                  {!bonusPaid.has(u.id) && (
                    <form action={creditWelcomeBonusAction}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button
                        title="Credits the advertised $175 new-client welcome bonus, once per client"
                        className="rounded-md border border-accent-300 px-3 py-2 text-xs font-bold text-brand-400 hover:bg-brand-500/12"
                      >
                        Pay welcome bonus
                      </button>
                    </form>
                  )}

                  <form action={blockAccountAction} className="flex items-end gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <input
                      name="reason"
                      placeholder="Block reason"
                      className="w-36 rounded-md border border-line bg-ink-2 px-2 py-2 text-xs"
                    />
                    <button className="rounded-md border border-red-300 px-3 py-2 text-xs font-bold text-neg hover:bg-neg/10">
                      Block
                    </button>
                  </form>
                </div>
              )}

              {u.status === "BLOCKED" && (
                <div className="mt-4 border-t border-navy-50 pt-4">
                  <form action={unblockAccountAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button className="rounded-md border border-green-300 px-4 py-2 text-xs font-bold text-pos hover:bg-pos/10">
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
