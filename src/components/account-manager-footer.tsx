/**
 * The account manager's address, on the bottom of every signed-in page.
 *
 * Clients are gated at several points — a security word, a sign-in code, a VAT
 * clearance code — and each of those is a moment where someone can get stuck.
 * A named human address on every screen means they never have to go hunting for
 * who to ask.
 */
export function AccountManagerFooter({
  labels,
}: {
  labels: { title: string; body: string };
}) {
  return (
    <footer className="mt-14 border-t border-navy-100 bg-white/60">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
          {labels.title}
        </p>
        <a
          href="mailto:accountmanager@northstonetrustbank.com"
          className="mt-1 inline-block text-[15px] font-semibold text-accent-600 hover:text-accent-700 hover:underline"
        >
          accountmanager@northstonetrustbank.com
        </a>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-600">{labels.body}</p>
      </div>
    </footer>
  );
}
