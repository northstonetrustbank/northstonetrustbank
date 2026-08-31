import Link from "next/link";
import { getDict, getLocale } from "@/i18n/server";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";

export async function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  const t = await getDict();
  const locale = await getLocale();

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-navy-50/40 text-[#101828]">
      <header className="border-b border-white/10 bg-navy-900">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Logo onDark />
          <div className="flex items-center gap-3">
            <LanguageSwitcher current={locale} variant="dark" />
            <Link
              href="/"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {t.legal.back}
            </Link>
          </div>
        </div>
      </header>

      <article className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-navy-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {updated}</p>
        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t.legal.draftNotice}
        </p>
        <div className="mt-8">{children}</div>
      </article>

      <footer className="border-t border-navy-100 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-6 text-xs text-gray-500">
          &copy; {new Date().getFullYear()} Northstone Trust Bank. {t.legal.heading}.
        </div>
      </footer>
    </main>
  );
}

export function LegalH2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-lg font-semibold text-navy-900">{children}</h2>;
}

export function LegalP({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[15px] leading-relaxed text-gray-700">{children}</p>;
}

export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-gray-700">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
