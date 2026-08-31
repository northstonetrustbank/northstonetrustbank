"use client";

import { useActionState, useEffect, useState } from "react";
import { savePayeeAction } from "@/lib/actions/payee-actions";
import type { FormState } from "@/lib/actions/auth-actions";
import { fieldClass, labelClass } from "@/components/ui";

export type MethodOption = { key: string; label: string; eta: string };

type Labels = {
  addPayee: string;
  editPayee: string;
  payeeName: string;
  payeeNameHint: string;
  nickname: string;
  nicknameHint: string;
  kind: string;
  kindBiller: string;
  kindPerson: string;
  kindInternal: string;
  method: string;
  accountRef: string;
  accountRefInternal: string;
  institution: string;
  institutionHint: string;
  save: string;
  saving: string;
  saved: string;
  cancel: string;
};

export type PayeeDraft = {
  id: string;
  name: string;
  nickname: string | null;
  kind: string;
  methodKey: string | null;
  accountRef: string | null;
  institution: string | null;
};

export function PayeeForm({
  methods,
  labels,
  payee,
  onDone,
}: {
  methods: MethodOption[];
  labels: Labels;
  payee?: PayeeDraft;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(savePayeeAction, null);
  const [kind, setKind] = useState(payee?.kind ?? "BILLER");
  const internal = kind === "INTERNAL";

  // A saved payee closes the form; without this the client is left staring at a
  // filled-in form wondering whether it took. In an effect, not in render —
  // closing the form is a state change in the parent.
  const done = state?.ok;
  useEffect(() => {
    if (done && onDone) onDone();
  }, [done, onDone]);

  const KINDS = [
    { value: "BILLER", label: labels.kindBiller },
    { value: "PERSON", label: labels.kindPerson },
    { value: "INTERNAL", label: labels.kindInternal },
  ];

  return (
    <form action={formAction} className="space-y-5">
      {payee && <input type="hidden" name="payeeId" value={payee.id} />}
      <input type="hidden" name="kind" value={kind} />

      <fieldset>
        <legend className={labelClass}>{labels.kind}</legend>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              aria-pressed={kind === k.value}
              className={`rounded-lg border px-3.5 py-2 text-[13px] font-medium transition ${
                kind === k.value
                  ? "border-brand-500/60 bg-brand-500/12 text-fg"
                  : "border-line bg-ink-2 text-fg-muted hover:text-fg"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClass}>
          {labels.payeeName}
          <input
            name="name"
            type="text"
            required
            maxLength={80}
            defaultValue={payee?.name ?? ""}
            className={fieldClass}
          />
          <span className="mt-1.5 block text-xs font-normal text-fg-muted">
            {labels.payeeNameHint}
          </span>
        </label>
        <label className={labelClass}>
          {labels.nickname}
          <input
            name="nickname"
            type="text"
            maxLength={60}
            defaultValue={payee?.nickname ?? ""}
            className={fieldClass}
          />
          <span className="mt-1.5 block text-xs font-normal text-fg-muted">
            {labels.nicknameHint}
          </span>
        </label>
      </div>

      {!internal && (
        <label className={labelClass}>
          {labels.method}
          <select name="methodKey" defaultValue={payee?.methodKey ?? methods[0]?.key} className={fieldClass}>
            {methods.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label} — {m.eta}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClass}>
          {internal ? labels.accountRefInternal : labels.accountRef}
          <input
            name="accountRef"
            type="text"
            required
            maxLength={120}
            defaultValue={payee?.accountRef ?? ""}
            className={fieldClass}
          />
        </label>
        {!internal && (
          <label className={labelClass}>
            {labels.institution}
            <input
              name="institution"
              type="text"
              maxLength={80}
              defaultValue={payee?.institution ?? ""}
              className={fieldClass}
            />
            <span className="mt-1.5 block text-xs font-normal text-fg-muted">
              {labels.institutionHint}
            </span>
          </label>
        )}
      </div>

      {state?.error && (
        <p className="rounded-lg border border-neg/25 bg-neg/10 px-3.5 py-2.5 text-sm text-neg">
          {state.error}
        </p>
      )}

      <div className="flex gap-2.5">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
        >
          {pending ? labels.saving : labels.save}
        </button>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-xl border border-line bg-ink-2 px-5 py-2.5 text-sm font-medium text-fg-muted transition hover:text-fg"
          >
            {labels.cancel}
          </button>
        )}
      </div>
    </form>
  );
}
