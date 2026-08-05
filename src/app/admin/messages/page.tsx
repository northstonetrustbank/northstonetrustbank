import { AdminPageIntro } from "@/components/admin-page-intro";
import { db } from "@/lib/db";
import { ComposeForm } from "./compose-form";

export default async function MessagesPage() {
  const [recent, clients] = await Promise.all([
    db.auditLog.findMany({
      where: { action: "BROADCAST_SENT" },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    db.user.findMany({
      where: { role: "CLIENT" },
      select: { email: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return (
    <div>
      <AdminPageIntro
        title="Send a message to clients"
        lead="Email your clients, and show a notice inside their account."
        steps={[
          "Choose who it goes to: everyone, a group, or one person.",
          "Pick which address it comes from — info@, support@ or accountmanager@.",
          "Write it in plain words. The Northstone letterhead is added for you.",
        ]}
      />

      <ComposeForm
        clients={clients.map((c) => ({
          email: c.email,
          name: `${c.firstName} ${c.lastName}`,
        }))}
      />

      <h2 className="mt-12 text-sm font-bold uppercase tracking-wide text-gray-500">
        Recently sent
      </h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-navy-50 text-xs uppercase tracking-wide text-navy-700">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">By</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((e) => (
              <tr key={e.id} className="border-t border-navy-50">
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                  {e.createdAt.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-gray-700">{e.actorLabel}</td>
                <td className="px-4 py-3 text-gray-600">{e.details}</td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                  Nothing sent yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
