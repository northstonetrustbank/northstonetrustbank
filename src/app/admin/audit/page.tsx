import { AdminPageIntro } from "@/components/admin-page-intro";
import { db } from "@/lib/db";

export default async function AuditLogPage() {
  const entries = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <AdminPageIntro
        title="Activity log"
        lead="A permanent record of everything that has happened, newest first. Nothing here can be changed or deleted, by you or by anyone else. Showing the latest 200 entries."
      />

      <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-navy-50 text-xs uppercase tracking-wide text-navy-700">
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
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                  {e.createdAt.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-gray-700">{e.actorLabel}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-navy-50 px-2 py-1 text-xs font-bold text-navy-700">
                    {e.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{e.details ?? "—"}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
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

