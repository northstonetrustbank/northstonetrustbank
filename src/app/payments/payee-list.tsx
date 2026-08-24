"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { archivePayeeAction } from "@/lib/actions/payee-actions";
import { PayeeForm, type MethodOption, type PayeeDraft } from "./payee-form";

export type PayeeRow = PayeeDraft & {
  /** "Bank transfer · ••4821", or the bank's own name for internal payees. */
  route: string;
  lastPaid: string;
  initial: string;
  internal: boolean;
};

type Labels = React.ComponentProps<typeof PayeeForm>["labels"] & {
  payeesTitle: string;
  remove: string;
  removeConfirm: string;
  lastPaid: string;
  payThis: string;
  noPayeesTitle: string;
  noPayeesBody: string;
};

export function PayeeList({
  payees,
  methods,
  labels,
}: {
  payees: PayeeRow[];
  methods: MethodOption[];
  labels: Labels;
}) {
  // "new" while adding, a payee id while editing, null when neither.
  const [editing, setEditing] = useState<string | null>(null);
  const close = useCallback(() => setEditing(null), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[15px] font-semibold text-fg">{labels.payeesTitle}</h2>
        {editing !== "new" && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="rounded-lg border border-line bg-ink-2 px-3.5 py-2 text-[13px] font-medium text-fg transition hover:border-brand-500/50"
          >
            {labels.addPayee}
          </button>
        )}
      </div>

      {editing === "new" && (
        <div className="elev-1 rounded-2xl border border-line bg-ink-1 p-5 sm:p-6">
          <PayeeForm methods={methods} labels={labels} onDone={close} />
        </div>
      )}

      {payees.length === 0 && editing !== "new" ? (
        <div className="rounded-2xl border border-dashed border-line px-5 py-10 text-center">
          <p className="text-[15px] font-semibold text-fg">{labels.noPayeesTitle}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-fg-muted">{labels.noPayeesBody}</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {payees.map((p) => (
            <li
              key={p.id}
              className="elev-1 overflow-hidden rounded-2xl border border-line bg-ink-1"
            >
              <div className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
                <span
                  aria-hidden="true"
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                    p.internal ? "bg-pos/15 text-pos" : "bg-ink-3 text-fg-muted"
                  }`}
                >
                  {p.initial}
                </span>
                {/* min-w-0 so the truncate below has something to truncate against. */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-fg">
                    {p.name}
                    {p.nickname && (
                      <span className="font-normal text-fg-faint"> · {p.nickname}</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-fg-faint">{p.route}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Link
                    href={`/payments?payee=${p.id}`}
                    className="rounded-lg bg-brand-500/12 px-3 py-1.5 text-[13px] font-semibold text-brand-400 transition hover:bg-brand-500/20"
                  >
                    {labels.payThis}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEditing(editing === p.id ? null : p.id)}
                    aria-expanded={editing === p.id}
                    className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-fg-muted transition hover:text-fg"
                  >
                    {labels.editPayee}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-line-soft px-4 py-2.5 text-xs text-fg-faint sm:px-5">
                <span>
                  {labels.lastPaid}: {p.lastPaid}
                </span>
                <form action={archivePayeeAction}>
                  <input type="hidden" name="payeeId" value={p.id} />
                  <button
                    type="submit"
                    onClick={(e) => {
                      if (!confirm(labels.removeConfirm)) e.preventDefault();
                    }}
                    className="font-medium text-fg-faint transition hover:text-neg"
                  >
                    {labels.remove}
                  </button>
                </form>
              </div>

              {editing === p.id && (
                <div className="border-t border-line-soft bg-ink-1/60 px-4 py-5 sm:px-5">
                  <PayeeForm methods={methods} labels={labels} payee={p} onDone={close} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
