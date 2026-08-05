import { AdminPageIntro } from "@/components/admin-page-intro";
import { db } from "@/lib/db";
import { METHOD_CATALOG } from "@/lib/methods";
import { PaymentIcon } from "@/components/payment-icons";
import { saveMethodAction } from "@/lib/actions/method-actions";

const inputClass =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-navy-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20";

export default async function MethodsPage() {
  const existing = await db.depositMethod.findMany();
  const byKey = new Map(existing.map((m) => [m.key, m]));

  return (
    <div>
      <AdminPageIntro
        title="Ways clients can pay in and out"
        lead="Which payment options clients see, and the account details they send money to."
        steps={[
          "Turn a method on to show it to clients. Turn it off to hide it.",
          "Fill in the account details clients should send money to. Check these carefully — money sent to the wrong details cannot be recovered.",
          "Choose who sees it: personal clients, business clients, or everyone.",
        ]}
      />

      <div className="mt-6 space-y-4">
        {METHOD_CATALOG.map((def) => {
          const m = byKey.get(def.key);
          return (
            <form
              key={def.key}
              action={saveMethodAction}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <input type="hidden" name="key" value={def.key} />
              <div className="flex items-center gap-3">
                <span className="text-navy-700">
                  <PaymentIcon icon={def.icon} className="h-7 w-7" />
                </span>
                <input
                  name="label"
                  defaultValue={m?.label ?? def.label}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm font-semibold text-navy-900"
                />
                <span
                  className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    m?.enabled ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {m?.enabled ? "Enabled" : "Off"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-semibold text-gray-600">
                  Visible to
                  <select name="accountTypes" defaultValue={m?.accountTypes ?? "ALL"} className={inputClass}>
                    <option value="ALL">All accounts</option>
                    <option value="PERSONAL">Personal only</option>
                    <option value="COMMERCIAL">Business only</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-gray-600">
                  Route name
                  <input name="routeName" defaultValue={m?.routeName ?? ""} placeholder="Account name" className={inputClass} />
                </label>
                <label className="text-xs font-semibold text-gray-600">
                  Account / tag / address
                  <input name="routeIdentifier" defaultValue={m?.routeIdentifier ?? ""} className={inputClass} />
                </label>
                <label className="text-xs font-semibold text-gray-600">
                  Institution
                  <input name="routeInstitution" defaultValue={m?.routeInstitution ?? ""} className={inputClass} />
                </label>
                <label className="text-xs font-semibold text-gray-600 sm:col-span-2">
                  Instructions (shown to client)
                  <input name="routeInstructions" defaultValue={m?.routeInstructions ?? ""} className={inputClass} />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-navy-50 pt-4 text-sm text-navy-800">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="enabled" defaultChecked={m?.enabled ?? false} className="h-4 w-4" />
                  Enabled
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="forDeposit" defaultChecked={m?.forDeposit ?? true} className="h-4 w-4" />
                  Deposits
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="forWithdrawal" defaultChecked={m?.forWithdrawal ?? true} className="h-4 w-4" />
                  Withdrawals
                </label>
                <button className="ml-auto rounded-full bg-navy-800 px-5 py-2 text-sm font-bold text-white transition hover:bg-navy-700">
                  Save
                </button>
              </div>
            </form>
          );
        })}
      </div>
    </div>
  );
}
