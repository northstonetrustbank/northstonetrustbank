import { formatMoney } from "@/lib/bank";
import { fieldsFor, type ProductDef } from "@/lib/products";

// Renders an application's answers for admins, using the product's own field
// definitions so a new question shows up here without extra work. Admin-facing,
// so the labels are English.

const LABELS: Record<string, string> = {
  employmentStatus: "Employment",
  employer: "Employer",
  annualIncome: "Annual income",
  housingStatus: "Housing",
  purpose: "Purpose",
  propertyType: "Property type",
  propertyPrice: "Property price",
  downPayment: "Deposit",
  propertyLocation: "Location",
  coverType: "Cover",
  coveredPeople: "People covered",
  businessName: "Business",
  yearsTrading: "Years trading",
  annualRevenue: "Annual revenue",
  destinationCountry: "Destination",
  beneficiaryName: "Beneficiary",
};

function humanizeValue(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function ApplicationDetails({
  def,
  details,
  currency,
}: {
  def: ProductDef | undefined;
  details: unknown;
  currency: string;
}) {
  if (!def || !details || typeof details !== "object") return null;
  const values = details as Record<string, unknown>;
  const fields = fieldsFor(def).filter((f) => values[f.name] !== undefined && values[f.name] !== "");
  if (fields.length === 0) return null;

  return (
    <dl className="mt-3 grid gap-x-6 gap-y-2 rounded-xl bg-navy-50/60 p-4 text-sm sm:grid-cols-2">
      {fields.map((f) => {
        const raw = values[f.name];
        const value =
          f.kind === "money" && typeof raw === "number"
            ? formatMoney(raw, "en", currency)
            : f.kind === "select" && typeof raw === "string"
              ? humanizeValue(raw)
              : String(raw);
        return (
          <div key={f.name} className="flex justify-between gap-3 border-b border-white/70 pb-1.5">
            <dt className="text-gray-500">{LABELS[f.name] ?? f.name}</dt>
            <dd className="text-right font-semibold text-navy-800">{value}</dd>
          </div>
        );
      })}
    </dl>
  );
}
