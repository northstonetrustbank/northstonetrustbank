import { db } from "@/lib/db";
import { formatMoney } from "@/lib/bank";
import { methodDef } from "@/lib/methods";
import {
  approveWithdrawalAction,
  rejectWithdrawalAction,
  sendVatCodeAction,
} from "@/lib/actions/admin-actions";

export default async function WithdrawalsQueuePage() {
  const all = await db.transaction.findMany({
    where: { status: "PENDING", type: { in: ["WITHDRAWAL", "SEND"] } },
    include: { account: { include: { user: true } } },
    orderBy: { createdAt: "asc" },
  });

  const held = all.filter((tx) => tx.vatRequiredAt && !tx.vatClearedAt);
  const pending = all
    .filter((tx) => !tx.vatRequiredAt || tx.vatClearedAt)
    .filter((tx) => tx.type === "WITHDRAWAL");

  return (
    <div>
      <h1 className="text-xl font-bold text-fg">Withdrawal requests</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Pending withdrawals. Approving debits the client&apos;s balance and emails a
        receipt — pay out the funds externally using the client&apos;s details below.
      </p>

      {held.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-fg-faint">
            Waiting for a VAT code ({held.length})
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-fg-muted">
            These are held until the client enters their VAT clearance code, so there is
            nothing to approve yet. Press <strong>Email the code</strong> and it goes to the
            address on their account. The money is already reserved, so they cannot spend it
            twice while they wait.
          </p>
          <div className="mt-4 space-y-3">
            {held.map((tx) => (
              <div key={tx.id} className="rounded-2xl border border-gold/30 bg-gold/5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="tnum text-xl font-semibold tracking-tight text-fg">
                      {formatMoney(Math.abs(tx.amountCents), "en", tx.account.currency)}
                      <span className="ml-2 rounded-full bg-ink-2 px-2 py-0.5 text-[11px] font-bold uppercase text-fg-muted">
                        {tx.type === "SEND" ? "Transfer" : "Withdrawal"}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-fg-muted">
                      {tx.account.user.firstName} {tx.account.user.lastName} ·{" "}
                      {tx.account.user.email}
                    </p>
                    <p className="mt-0.5 text-xs text-fg-faint">
                      Asked {tx.createdAt.toLocaleString()} · Reference {tx.reference}
                      {tx.counterparty ? ` · To ${tx.counterparty}` : ""}
                      {tx.note && !tx.counterparty ? ` · ${tx.note}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-fg-faint">
                      {tx.vatSentAt
                        ? `Code emailed ${tx.vatSentAt.toLocaleString()}`
                        : "Code not sent yet"}
                      {tx.vatAttempts > 0 ? ` · ${tx.vatAttempts} wrong attempt(s)` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-fg-faint">
                      Their VAT code
                    </p>
                    <p className="tnum font-mono text-2xl font-bold tracking-[0.2em] text-fg">
                      {tx.vatCode}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-gold/25 pt-4">
                  <form action={sendVatCodeAction}>
                    <input type="hidden" name="txId" value={tx.id} />
                    <button className="rounded-md bg-brand-500 px-5 py-2 text-sm font-bold text-white hover:bg-brand-600">
                      {tx.vatSentAt ? "Send the code again" : "Email the code"}
                    </button>
                  </form>
                  {tx.type === "WITHDRAWAL" && (
                    <form action={rejectWithdrawalAction} className="flex items-end gap-2">
                      <input type="hidden" name="txId" value={tx.id} />
                      <label className="block text-xs font-semibold text-fg-muted">
                        Or cancel it and say why
                        <input
                          name="reason"
                          placeholder="e.g. client asked us to cancel"
                          className="mt-1 block w-64 rounded-md border border-line bg-ink-2 px-3 py-2 text-sm text-fg"
                        />
                      </label>
                      <button className="rounded-md border border-neg/40 px-4 py-2 text-sm font-bold text-neg hover:bg-neg/10">
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
        <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-fg-faint">
          Ready for your decision ({pending.length})
        </h2>
      )}

      {pending.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-ink-1 p-10 text-center text-sm text-fg-muted">
          No withdrawal requests waiting.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {pending.map((tx) => (
            <div key={tx.id} className="rounded-2xl border border-line bg-ink-1 p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-2xl font-semibold tracking-tight text-fg">
                    {formatMoney(Math.abs(tx.amountCents), "en", tx.account.currency)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-fg">
                    {tx.account.user.firstName} {tx.account.user.lastName}
                    <span className="ml-2 font-normal text-fg-muted">{tx.account.user.email}</span>
                  </p>
                  <p className="mt-1 text-xs text-fg-muted">
                    {tx.reference} · {tx.account.number} · {methodDef(tx.methodKey ?? "BANK").label} ·{" "}
                    {tx.createdAt.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-ink-2 p-4 text-sm">
                <p className="font-semibold text-fg-muted">Client&apos;s payout details</p>
                <p className="mt-1 whitespace-pre-line text-fg-muted">{tx.counterparty}</p>
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
                  <label className="block text-xs font-semibold text-fg-muted">
                    Rejection reason (notifies client)
                    <input
                      name="reason"
                      placeholder="e.g. details didn't match"
                      className="mt-1 block w-64 rounded-md border border-line bg-ink-2 px-3 py-2 text-sm"
                    />
                  </label>
                  <button className="rounded-md border border-red-300 px-4 py-2 text-sm font-bold text-neg hover:bg-neg/10">
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
