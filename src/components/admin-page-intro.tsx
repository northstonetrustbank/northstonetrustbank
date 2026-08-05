/**
 * Every admin screen opens with the same three things: what this page is, what
 * it is for, and the steps to work through it. The bank's staff are not
 * software people — the guidance is part of the product, not decoration.
 */
export function AdminPageIntro({
  title,
  lead,
  steps,
}: {
  title: string;
  lead: string;
  steps?: string[];
}) {
  return (
    <div>
      <h1 className="text-xl font-bold text-navy-800">{title}</h1>
      <p className="mt-1 text-sm text-gray-600">{lead}</p>
      {steps && steps.length > 0 && (
        <ol className="mt-4 space-y-1.5 rounded-xl border border-accent-100 bg-accent-50/60 p-4 text-sm text-navy-800">
          {steps.map((s, i) => (
            <li key={s} className="flex gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-500 text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <span className="leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
