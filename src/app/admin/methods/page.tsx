import { db } from "@/lib/db";
import { METHOD_CATALOG, METHOD_COLUMNS } from "@/lib/methods";
import { methodEtaOverrides } from "@/lib/method-eta";
import { PaymentIcon } from "@/components/payment-icons";
import { saveMethodAction } from "@/lib/actions/method-actions";

const inputClass =
  "mt-1 w-full rounded-md border border-line bg-ink-2 px-3 py-2 text-sm text-fg focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";

export default async function MethodsPage() {
  const existing = await db.depositMethod.findMany({ select: METHOD_COLUMNS });
  const etas = await methodEtaOverrides();
  const byKey = new Map(existing.map((m) => [m.key, m]));

  return (
    <div>
      <h1 className="text-xl font-bold text-fg">Deposit &amp; withdrawal methods</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Enable the methods clients can use, choose who sees each one, and set the
        deposit route (where clients send funds). Enabled methods appear on the
        client deposit and withdrawal screens.
      </p>

      <div className="mt-6 space-y-4">
        {METHOD_CATALOG.map((def) => {
          const m = byKey.get(def.key);
          return (
            <form
              key={def.key}
              action={saveMethodAction}
              className="rounded-2xl border border-line bg-ink-1 p-5 shadow-sm"
            >
              <input type="hidden" name="key" value={def.key} />
              <div className="flex items-center gap-3">
                <span className="text-fg-muted">
                  <PaymentIcon icon={def.icon} className="h-7 w-7" />
                </span>
                <input
                  name="label"
                  defaultValue={m?.label ?? def.label}
                  className="rounded-md border border-line bg-ink-2 px-2 py-1 text-sm font-semibold text-fg"
                />
                <span className="ml-auto flex items-center gap-2">
                  {/* Enabled is not the same as visible. A method restricted to
                      one account type is invisible to everyone else, which is
                      the usual reason a client reports "missing" methods. */}
                  {m?.enabled && m.accountTypes !== "ALL" && (
                    <span className="rounded-full bg-amber-400/12 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                      {m.accountTypes === "PERSONAL" ? "Personal only" : "Business only"}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      m?.enabled ? "bg-pos/12 text-pos" : "bg-ink-3 text-fg-muted"
                    }`}
                  >
                    {m?.enabled ? "Enabled" : "Off"}
                  </span>
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-semibold text-fg-muted">
                  Visible to
                  <select name="accountTypes" defaultValue={m?.accountTypes ?? "ALL"} className={inputClass}>
                    <option value="ALL">All accounts</option>
                    <option value="PERSONAL">Personal only</option>
                    <option value="COMMERCIAL">Business only</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-fg-muted">
                  How long it takes
                  <input
                    name="etaLabel"
                    defaultValue={etas[def.key] ?? ""}
                    placeholder={def.eta}
                    className={inputClass}
                  />
                </label>
                <label className="text-xs font-semibold text-fg-muted">
                  Route name
                  <input name="routeName" defaultValue={m?.routeName ?? ""} placeholder="Account name" className={inputClass} />
                </label>
                <label className="text-xs font-semibold text-fg-muted">
                  Account / tag / address
                  <input name="routeIdentifier" defaultValue={m?.routeIdentifier ?? ""} className={inputClass} />
                </label>
                <label className="text-xs font-semibold text-fg-muted">
                  Institution
                  <input name="routeInstitution" defaultValue={m?.routeInstitution ?? ""} className={inputClass} />
                </label>
                <label className="text-xs font-semibold text-fg-muted sm:col-span-2">
                  Instructions (shown to client)
                  <input name="routeInstructions" defaultValue={m?.routeInstructions ?? ""} className={inputClass} />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-navy-50 pt-4 text-sm text-fg">
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
                <button className="ml-auto rounded-xl bg-brand-500 px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-600">
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
