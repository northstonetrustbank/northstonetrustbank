"use client";

import { useActionState, useState } from "react";
import { payBillAction } from "@/lib/actions/payee-actions";
import type { FormState } from "@/lib/actions/auth-actions";
import { fieldClass, labelClass } from "@/components/ui";

export type PayOption = {
  id: string;
  label: string;
  /** "Bank transfer · ••4821" — what the money rides on. */
  route: string;
  /** Empty for internal payees, which arrive at once. */
  eta: string;
  internal: boolean;
  initial: string;
};

type Labels = {
  choosePayee: string;
  amount: string;
  memo: string;
  memoHint: string;
  securityWord: string;
  submit: string;
  submitting: string;
  instantNote: string;
  reviewNote: string;
  arrives: string;
  available: string;
};

export function PayForm({
  payees,
  preselect,
  available,
  labels,
}: {
  payees: PayOption[];
  preselect?: string;
  available: string;
  labels: Labels;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(payBillAction, null);
  const [selected, setSelected] = useState(
    () => payees.find((p) => p.id === preselect)?.id ?? payees[0]?.id ?? ""
  );
  const payee = payees.find((p) => p.id === selected);

  return (
    <form action={formAction} className="space-y-6">
      <fieldset>
        <legend className={labelClass}>{labels.choosePayee}</legend>
        {/* Radio cards rather than a <select>: the route and the timing have to
            be readable before the choice is made, not after. */}
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          {payees.map((p) => {
            const active = p.id === selected;
            return (
              <label
                key={p.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition ${
                  active
                    ? "elev-1 border-brand-500/60 bg-ink-2"
                    : "border-line bg-ink-1/60 hover:border-line hover:bg-ink-2/60"
                }`}
              >
                <input
                  type="radio"
                  name="payeeId"
                  value={p.id}
                  checked={active}
                  onChange={() => setSelected(p.id)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${
                    active ? "bg-brand-500 text-white" : "bg-ink-3 text-fg-muted"
                  }`}
                >
                  {p.initial}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-fg">{p.label}</span>
                  <span className="block truncate text-xs text-fg-faint">{p.route}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClass}>
          {labels.amount}
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            className={fieldClass}
          />
          <span className="mt-1.5 block text-xs font-normal text-fg-muted">
            {labels.available} {available}
          </span>
        </label>
        <label className={labelClass}>
          {labels.securityWord}
          <input name="securityWord" type="password" required className={fieldClass} />
        </label>
      </div>

      <label className={labelClass}>
        {labels.memo}
        <input name="memo" type="text" maxLength={140} className={fieldClass} />
        <span className="mt-1.5 block text-xs font-normal text-fg-muted">{labels.memoHint}</span>
      </label>

      {payee && (
        <p className="flex items-start gap-2.5 rounded-xl border border-line-soft bg-ink-1/60 px-3.5 py-3 text-[13px] text-fg-muted">
          <span
            aria-hidden="true"
            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
              payee.internal ? "bg-pos" : "bg-brand-400"
            }`}
          />
          <span>
            {payee.internal ? labels.instantNote : labels.reviewNote}
            {!payee.internal && payee.eta && (
              <>
                {" "}
                <span className="text-fg">
                  {labels.arrives}: {payee.eta}.
                </span>
              </>
            )}
          </span>
        </p>
      )}

      {state?.error && (
        <p className="rounded-lg border border-neg/25 bg-neg/10 px-3.5 py-2.5 text-sm text-neg">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !payee}
        className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
      >
        {pending ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
