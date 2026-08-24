import { db } from "@/lib/db";

export default async function AuditLogPage() {
  const entries = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-fg">Audit log</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Every significant action in the system, newest first. Entries are
        permanent and cannot be edited. Showing the latest 200.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-ink-1 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-2 text-xs uppercase tracking-wide text-fg-muted">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Who</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-navy-50 align-top">
                <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                  {e.createdAt.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-fg-muted">{e.actorLabel}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-ink-2 px-2 py-1 text-xs font-bold text-fg-muted">
                    {e.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-fg-muted">{e.details ?? "—"}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-fg-muted">
                  Nothing logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

