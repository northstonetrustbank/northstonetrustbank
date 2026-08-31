import {
  purgeApplicationDocumentsAction,
  requestApplicationDocumentsAction,
} from "@/lib/actions/document-actions";
import { docsFor, type ProductDef } from "@/lib/products";

// Where admins receive an application's paperwork: what was asked for, what
// arrived, what is still missing, and a way to ask for more. Admin-facing, so
// the labels are English.

const NAMES: Record<string, string> = {
  GOVERNMENT_ID: "Government ID",
  PROOF_OF_ADDRESS: "Proof of address",
  PROOF_OF_INCOME: "Proof of income",
  TAX_RETURNS: "Tax returns",
  EMPLOYMENT_LETTER: "Employment letter",
  BANK_STATEMENTS: "Bank statements",
  CREDIT_REPORT: "Credit report",
  GUARANTOR_DETAILS: "Guarantor details",
  COLLATERAL_DOCUMENTS: "Collateral documents",
  SALE_AGREEMENT: "Sale agreement",
  VALUATION_REPORT: "Valuation report",
  TITLE_DEED: "Title deed",
  PROOF_OF_DEPOSIT: "Proof of deposit",
  DEBT_DOCUMENTATION: "Existing loan statements",
  PROPERTY_INSURANCE: "Property insurance",
  MEDICAL_HISTORY: "Medical history",
  DOCTORS_REPORT: "Doctor's report",
  VEHICLE_REGISTRATION: "Vehicle registration",
  DRIVING_LICENCE: "Driving licence",
  VEHICLE_VALUATION: "Vehicle valuation",
  BUSINESS_REGISTRATION: "Business registration",
  BUSINESS_FINANCIALS: "Business financials",
};

export type AdminDoc = {
  id: string;
  docKey: string;
  fileName: string;
  storedName: string;
  sizeBytes: number;
};

export function ApplicationDocuments({
  applicationId,
  def,
  details,
  documents,
  docsNote,
  docsRequestedAt,
}: {
  applicationId: string;
  def: ProductDef | undefined;
  details: unknown;
  documents: AdminDoc[];
  docsNote: string | null;
  docsRequestedAt: Date | null;
}) {
  if (!def) return null;
  const required = docsFor(def, details);
  if (required.length === 0 && documents.length === 0) return null;

  const byKey = new Map(documents.map((d) => [d.docKey, d]));
  const missing = required.filter((r) => r.required && !byKey.has(r.key));
  const totalKb = Math.round(documents.reduce((n, d) => n + d.sizeBytes, 0) / 1024);

  return (
    <div className="mt-4 rounded-xl border border-line bg-ink-2/40 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-fg-muted">
          Supporting documents
        </p>
        <p className="text-xs text-fg-muted">
          {documents.length} of {required.length} received
          {documents.length > 0 ? ` · ${totalKb} KB` : ""}
          {missing.length > 0 ? ` · ${missing.length} required still missing` : ""}
        </p>
      </div>

      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {required.map((r) => {
          const doc = byKey.get(r.key);
          return (
            <li key={r.key} className="flex items-center gap-2 text-sm">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  doc ? "bg-pos/100" : r.required ? "bg-red-400" : "bg-gray-300"
                }`}
              />
              <span className="text-fg-muted">{NAMES[r.key] ?? r.key}</span>
              {doc ? (
                <a
                  href={`/api/files/application/${doc.storedName}`}
                  target="_blank"
                  className="truncate font-medium text-brand-400 hover:underline"
                >
                  {doc.fileName}
                </a>
              ) : (
                <span className={`text-xs ${r.required ? "text-red-600" : "text-fg-faint"}`}>
                  {r.required ? "missing" : "optional"}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {docsRequestedAt && (
        <p className="mt-3 rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-700">
          Extra documents requested {docsRequestedAt.toLocaleDateString()}
          {docsNote ? `: ${docsNote}` : ""}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-3">
        <form action={requestApplicationDocumentsAction} className="flex items-end gap-2">
          <input type="hidden" name="applicationId" value={applicationId} />
          <label className="block text-xs font-semibold text-fg-muted">
            Ask for another document
            <input
              name="note"
              placeholder="e.g. a second payslip"
              className="mt-1 block w-56 rounded-md border border-line bg-ink-2 px-3 py-2 text-sm"
            />
          </label>
          <button className="rounded-md border border-line px-4 py-2 text-sm font-bold text-fg-muted hover:bg-ink-2">
            Request
          </button>
        </form>

        {documents.length > 0 && (
          <form action={purgeApplicationDocumentsAction}>
            <input type="hidden" name="applicationId" value={applicationId} />
            <button className="rounded-md border border-neg/25 px-3 py-2 text-xs font-bold text-neg transition hover:bg-neg/10">
              Delete all after review
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
