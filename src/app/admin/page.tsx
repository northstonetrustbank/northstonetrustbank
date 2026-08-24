import { db } from "@/lib/db";
import {
  approveAccountAction,
  rejectAccountAction,
  deleteKycDocumentsAction,
} from "@/lib/actions/admin-actions";

const DOC_LABELS: Record<string, string> = {
  GOVERNMENT_ID: "National ID card",
  DRIVERS_LICENSE: "Driver's licence",
  PASSPORT: "Passport",
};

const SIDE_LABELS: Record<string, string> = {
  FRONT: "Front",
  BACK: "Back",
  SELFIE: "Selfie with document",
};

const SIDE_ORDER = ["FRONT", "BACK", "SELFIE"];

export default async function ReviewQueuePage() {
  const pending = await db.user.findMany({
    where: { status: "PENDING", role: "CLIENT" },
    include: { kycDocuments: true },
    orderBy: { createdAt: "asc" },
  });

  // Documents purged after review still count as submitted, so an applicant
  // doesn't fall back into "awaiting steps" once their files are deleted.
  const hasDocs = (u: (typeof pending)[number]) =>
    u.kycDocuments.length > 0 || u.kycDocsDeletedAt !== null;
  const ready = pending.filter((u) => u.emailVerified && hasDocs(u));
  const waiting = pending.filter((u) => !u.emailVerified || !hasDocs(u));

  return (
    <div>
      <h1 className="text-xl font-bold text-fg">Account review queue</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Applications with a verified email and an identity document, ready for a
        decision.
      </p>

      {ready.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-ink-1 p-10 text-center text-sm text-fg-muted">
          No applications ready for review.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {ready.map((u) => (
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
                  </p>
                  <p className="text-sm text-fg-muted">{u.email}</p>
                  <p className="text-sm text-fg-muted">{u.phone}</p>
                  <p className="mt-1 text-xs text-fg-muted">
                    Applied {u.createdAt.toLocaleString()} &middot;{" "}
                    <span className="text-pos">email verified</span>
                    {" · language: "}
                    {u.locale.toUpperCase()}
                  </p>
                </div>
                <div className="min-w-[16rem] text-sm">
                  <p className="font-semibold text-fg-muted">
                    Identity documents
                    {u.kycDocuments.length > 0 && (
                      <span className="ml-2 font-normal text-fg-faint">
                        {DOC_LABELS[u.kycDocuments[0].docType] ?? u.kycDocuments[0].docType} ·{" "}
                        {Math.round(
                          u.kycDocuments.reduce((s, d) => s + d.sizeBytes, 0) / 1024
                        )}{" "}
                        KB total
                      </span>
                    )}
                  </p>
                  {u.kycDocuments.length === 0 ? (
                    <p className="mt-1 text-xs text-fg-muted">
                      {u.kycDocsDeletedAt
                        ? `Deleted after review on ${u.kycDocsDeletedAt.toLocaleDateString()}`
                        : "None uploaded"}
                    </p>
                  ) : (
                    <>
                      <ul className="mt-1 space-y-1">
                        {[...u.kycDocuments]
                          .sort(
                            (a, b) => SIDE_ORDER.indexOf(a.side) - SIDE_ORDER.indexOf(b.side)
                          )
                          .map((d) => (
                            <li key={d.id} className="flex items-center gap-2">
                              <a
                                href={`/api/files/kyc/${d.storedName}`}
                                target="_blank"
                                className="text-brand-400 hover:underline"
                              >
                                {SIDE_LABELS[d.side] ?? d.side}
                              </a>
                              <span className="text-xs text-fg-faint">
                                {Math.round(d.sizeBytes / 1024)} KB
                              </span>
                              <form action={deleteKycDocumentsAction} className="ml-auto">
                                <input type="hidden" name="userId" value={u.id} />
                                <input type="hidden" name="docId" value={d.id} />
                                <button
                                  title="Delete this file permanently"
                                  className="rounded px-1.5 text-xs font-bold text-fg-faint transition hover:bg-neg/10 hover:text-red-600"
                                >
                                  ✕
                                </button>
                              </form>
                            </li>
                          ))}
                      </ul>
                      <form action={deleteKycDocumentsAction} className="mt-2">
                        <input type="hidden" name="userId" value={u.id} />
                        <button className="rounded-md border border-neg/25 px-2.5 py-1 text-xs font-bold text-neg transition hover:bg-neg/10">
                          Delete all after review
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-navy-50 pt-4">
                <form action={approveAccountAction}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button className="rounded-md bg-green-700 px-5 py-2 text-sm font-bold text-white hover:bg-green-600">
                    Approve account
                  </button>
                </form>
                <form action={rejectAccountAction} className="flex items-end gap-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <label className="block text-xs font-semibold text-fg-muted">
                    Rejection reason (emailed to applicant)
                    <input
                      name="reason"
                      placeholder="e.g. document unreadable"
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

      {waiting.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-bold uppercase tracking-wide text-fg-muted">
            Awaiting applicant steps ({waiting.length})
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            These applicants signed up but haven&apos;t finished email
            verification or document upload yet. No action needed.
          </p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-ink-1 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-2 text-xs uppercase tracking-wide text-fg-muted">
                <tr>
                  <th className="px-4 py-3">Applicant</th>
                  <th className="px-4 py-3">Signed up</th>
                  <th className="px-4 py-3">Missing step</th>
                </tr>
              </thead>
              <tbody>
                {waiting.map((u) => (
                  <tr key={u.id} className="border-t border-navy-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-fg">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-fg-muted">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-fg-muted">
                      {u.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-amber-400/12 px-2.5 py-1 text-xs font-bold text-amber-300">
                        {!u.emailVerified ? "Email verification" : "Identity document"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
