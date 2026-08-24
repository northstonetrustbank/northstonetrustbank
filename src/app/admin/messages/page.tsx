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
      <h1 className="text-xl font-bold text-fg">Messages &amp; notifications</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Send an email and/or an in-app notification to one client, everyone, or a
        specific group. Write in plain text — we wrap it in the Northstone branded
        template automatically.
      </p>

      <ComposeForm
        clients={clients.map((c) => ({
          email: c.email,
          name: `${c.firstName} ${c.lastName}`,
        }))}
      />

      <h2 className="mt-12 text-sm font-bold uppercase tracking-wide text-fg-muted">
        Recently sent
      </h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-ink-1 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-2 text-xs uppercase tracking-wide text-fg-muted">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">By</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((e) => (
              <tr key={e.id} className="border-t border-navy-50">
                <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                  {e.createdAt.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-fg-muted">{e.actorLabel}</td>
                <td className="px-4 py-3 text-fg-muted">{e.details}</td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-fg-muted">
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
