"use client";

import { useActionState } from "react";
import {
  uploadApplicationDocumentAction,
  deleteApplicationDocumentAction,
} from "@/lib/actions/document-actions";
import type { FormState } from "@/lib/actions/auth-actions";
import { FileField } from "@/components/file-field";

export type DocItem = {
  key: string;
  required: boolean;
  name: string;
  hint: string;
  uploaded: { id: string; fileName: string; sizeBytes: number } | null;
};

export type DocLabels = {
  required: string;
  optional: string;
  upload: string;
  replace: string;
  remove: string;
  chooseFile: string;
  noFile: string;
  optimising: string;
  fileTooBig: string;
};

function readableSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function DocRow({
  applicationId,
  doc,
  labels,
}: {
  applicationId: string;
  doc: DocItem;
  labels: DocLabels;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    uploadApplicationDocumentAction,
    null
  );

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-fg">
            {doc.uploaded && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-[9px] text-white">
                ✓
              </span>
            )}
            {doc.name}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                doc.required ? "bg-ink-3 text-fg-muted" : "bg-ink-2 text-fg-muted"
              }`}
            >
              {doc.required ? labels.required : labels.optional}
            </span>
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{doc.hint}</p>
          {doc.uploaded && (
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
              <span className="font-medium text-fg">{doc.uploaded.fileName}</span>
              <span>{readableSize(doc.uploaded.sizeBytes)}</span>
            </p>
          )}
        </div>

        {doc.uploaded && (
          <form action={deleteApplicationDocumentAction}>
            <input type="hidden" name="docId" value={doc.uploaded.id} />
            <button className="rounded-full border border-line bg-ink-2 px-3 py-1 text-xs font-semibold text-fg-muted transition hover:border-red-300 hover:text-red-600">
              {labels.remove}
            </button>
          </form>
        )}
      </div>

      <form action={action} className="mt-3">
        <input type="hidden" name="applicationId" value={applicationId} />
        <input type="hidden" name="docKey" value={doc.key} />
        <FileField
          name="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          chooseLabel={labels.chooseFile}
          emptyLabel={labels.noFile}
          optimisingLabel={labels.optimising}
          tooBigLabel={labels.fileTooBig}
        />
        {state?.error && <p className="mt-1.5 text-xs text-red-600">{state.error}</p>}
        <button
          disabled={pending}
          className="mt-2 rounded-xl bg-brand-500 px-5 py-2 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {doc.uploaded ? labels.replace : labels.upload}
        </button>
      </form>
    </li>
  );
}

export function DocumentChecklist({
  applicationId,
  docs,
  labels,
}: {
  applicationId: string;
  docs: DocItem[];
  labels: DocLabels;
}) {
  return (
    <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-ink-1 shadow-sm">
      {docs.map((doc) => (
        <DocRow key={doc.key} applicationId={applicationId} doc={doc} labels={labels} />
      ))}
    </ul>
  );
}
