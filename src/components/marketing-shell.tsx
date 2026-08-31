import Link from "next/link";
import { getDict, getLocale } from "@/i18n/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";

// Shared chrome for every public page, so the homepage and the marketing pages
// can never drift apart.

export async function MarketingHeader() {
  const t = await getDict();
  const locale = await getLocale();

  const links = [
    { href: "/#personal", label: t.nav.personal },
    { href: "/#commercial", label: t.nav.commercial },
    { href: "/security", label: t.nav.security },
    { href: "/about", label: t.nav.about },
    { href: "/faq", label: t.nav.faq },
    { href: "/contact", label: t.nav.contact },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-navy-900/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo onDark />
        <nav className="hidden items-center gap-7 text-sm font-medium text-navy-100 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher current={locale} variant="dark" />
          <Link
            href="/login"
            className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 sm:block"
          >
            {t.common.signIn}
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-accent-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600"
          >
            {t.common.openAccount}
          </Link>
        </div>
      </div>
    </header>
  );
}

export async function MarketingFooter() {
  const t = await getDict();

  return (
    <footer className="bg-navy-950 text-navy-200">
      {/* 12 columns so the contact column can be wider than the rest — the
          mailbox addresses are long enough to collide with Legal otherwise. */}
      <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-12 px-6 py-16 sm:grid-cols-2 lg:grid-cols-12">
        <div className="sm:col-span-2 lg:col-span-3">
          <Logo onDark href={null} />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-navy-300">
            {t.landing.footerTagline}
          </p>
        </div>

        <div className="lg:col-span-2">
          <p className="text-sm font-semibold text-white">{t.landing.footerCompany}</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/about" className="hover:text-white">{t.nav.about}</Link></li>
            <li><Link href="/security" className="hover:text-white">{t.nav.security}</Link></li>
            <li><Link href="/faq" className="hover:text-white">{t.nav.faq}</Link></li>
            <li><Link href="/contact" className="hover:text-white">{t.nav.contact}</Link></li>
          </ul>
        </div>

        <div className="lg:col-span-2">
          <p className="text-sm font-semibold text-white">{t.landing.footerProducts}</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/products/CREDIT_CARD" className="hover:text-white">{t.landing.personal.items[0].title}</Link></li>
            <li><Link href="/products/SAVINGS" className="hover:text-white">{t.landing.personal.items[1].title}</Link></li>
            <li><Link href="/products/PERSONAL_LOAN" className="hover:text-white">{t.landing.personal.items[2].title}</Link></li>
            <li><Link href="/products/MORTGAGE" className="hover:text-white">{t.landing.personal.items[3].title}</Link></li>
            <li><Link href="/products/SMALL_BUSINESS" className="hover:text-white">{t.landing.commercial.items[6].title}</Link></li>
          </ul>
        </div>

        <div className="lg:col-span-3">
          <p className="text-sm font-semibold text-white">{t.landing.footerContact}</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <a
                href="mailto:info@northstonetrustbank.com"
                className="block break-words hover:text-white"
              >
                info@northstonetrustbank.com
              </a>
            </li>
            <li>
              <a
                href="mailto:support@northstonetrustbank.com"
                className="block break-words hover:text-white"
              >
                support@northstonetrustbank.com
              </a>
            </li>
            <li><Link href="/login" className="hover:text-white">{t.common.signIn}</Link></li>
            <li><Link href="/signup" className="hover:text-white">{t.common.openAccount}</Link></li>
          </ul>
        </div>

        <div className="lg:col-span-2">
          <p className="text-sm font-semibold text-white">{t.landing.footerLegal}</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/legal/terms" className="hover:text-white">{t.legal.terms}</Link></li>
            <li><Link href="/legal/privacy" className="hover:text-white">{t.legal.privacy}</Link></li>
            <li><Link href="/legal/e-consent" className="hover:text-white">{t.legal.eConsent}</Link></li>
            <li><Link href="/legal/deposit-agreement" className="hover:text-white">{t.legal.depositAgreement}</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-xs text-navy-400 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} Northstone Trust Bank. {t.landing.footerRights}
          </span>
          <span className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-navy-500 text-[9px] font-bold">
              FDIC
            </span>
            {t.bank.fdic}
          </span>
        </div>
      </div>
    </footer>
  );
}

/** Standard page opening: eyebrow, title, lede, on the brand navy. */
export function PageHero({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <section className="border-b border-white/10 bg-navy-900">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-navy-300">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.12] tracking-tight text-white sm:text-5xl">
          {title}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-navy-100">{body}</p>
      </div>
    </section>
  );
}
