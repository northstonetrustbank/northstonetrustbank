import { getDict } from "@/i18n/server";

/**
 * The account manager's address, on the bottom of every signed-in page.
 *
 * Clients are gated at several points — a security word, a sign-in code, a VAT
 * clearance code — and each of those is a moment where someone can get stuck.
 * A named human address on every screen means they never have to go hunting for
 * who to ask.
 *
 * It reads its own copy rather than taking props, so the app shell can drop it
 * in once and every page inherits it.
 */
export async function AccountManagerFooter() {
  const t = await getDict();

  return (
    <footer className="mt-14 border-t border-line">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-fg-faint">
          {t.bank.managerTitle}
        </p>
        <a
          href="mailto:accountmanager@northstonetrustbank.com"
          className="mt-1 inline-block text-[15px] font-semibold text-brand-500 transition hover:text-brand-400 hover:underline"
        >
          accountmanager@northstonetrustbank.com
        </a>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-fg-muted">
          {t.bank.managerBody}
        </p>
      </div>
    </footer>
  );
}
