"use client";

import { useActionState, useState } from "react";
import { submitKycAction, type FormState } from "@/lib/actions/auth-actions";
import { FileField } from "@/components/file-field";

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

export function KycStep({
  title,
  body,
  docTypeLabel,
  docTypes,
  uploadHint,
  frontLabel,
  backLabel,
  selfieLabel,
  selfieHint,
  passportNote,
  submitLabel,
  submittingLabel,
  chooseFileLabel,
  noFileLabel,
  optimisingLabel,
  tooBigLabel,
}: {
  title: string;
  body: string;
  docTypeLabel: string;
  docTypes: Record<string, string>;
  uploadHint: string;
  frontLabel: string;
  backLabel: string;
  selfieLabel: string;
  selfieHint: string;
  passportNote: string;
  submitLabel: string;
  submittingLabel: string;
  chooseFileLabel: string;
  noFileLabel: string;
  optimisingLabel: string;
  tooBigLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    submitKycAction,
    null
  );
  const [docType, setDocType] = useState(Object.keys(docTypes)[0] ?? "GOVERNMENT_ID");
  const isPassport = docType === "PASSPORT";

  return (
    <div>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/12 text-2xl">
        🪪
      </div>
      <h1 className="mt-5 text-center text-xl font-semibold tracking-tight text-fg">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-center text-[15px] leading-relaxed text-fg-muted">
        {body}
      </p>

      <form action={formAction} className="mx-auto mt-8 max-w-md space-y-5">
        <label className="block text-[13px] font-semibold text-fg">
          {docTypeLabel}
          <select
            name="docType"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="mt-1.5 w-full cursor-pointer rounded-lg border border-line bg-ink-1 px-3.5 py-2.5 text-[15px] text-fg transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          >
            {Object.entries(docTypes).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="block text-[13px] font-semibold text-fg">
          {frontLabel}
          <FileField
            name="documentFront"
            accept={ACCEPT}
            chooseLabel={chooseFileLabel}
            emptyLabel={noFileLabel}
            optimisingLabel={optimisingLabel}
            tooBigLabel={tooBigLabel}
          />
        </div>

        {isPassport ? (
          <p className="rounded-lg border border-line bg-ink-2 px-3.5 py-2.5 text-xs font-normal text-fg-muted">
            {passportNote}
          </p>
        ) : (
          <div className="block text-[13px] font-semibold text-fg">
            {backLabel}
            <FileField
              name="documentBack"
              accept={ACCEPT}
              chooseLabel={chooseFileLabel}
              emptyLabel={noFileLabel}
              optimisingLabel={optimisingLabel}
              tooBigLabel={tooBigLabel}
            />
          </div>
        )}

        <div className="block text-[13px] font-semibold text-fg">
          {selfieLabel}
          <FileField
            name="documentSelfie"
            accept={ACCEPT}
            chooseLabel={chooseFileLabel}
            emptyLabel={noFileLabel}
            optimisingLabel={optimisingLabel}
            tooBigLabel={tooBigLabel}
          />
          <span className="mt-1.5 block text-xs font-normal text-fg-muted">{selfieHint}</span>
        </div>

        <p className="text-xs font-normal text-fg-muted">{uploadHint}</p>

        {state?.error && (
          <p className="rounded-lg border border-neg/25 bg-neg/10 px-3.5 py-2.5 text-sm text-neg">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-400 disabled:opacity-60"
        >
          {pending ? submittingLabel : submitLabel}
        </button>
      </form>
    </div>
  );
}
