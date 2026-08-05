import Link from "next/link";
import { getDict } from "@/i18n/server";
import { MarketingFooter, MarketingHeader, PageHero } from "@/components/marketing-shell";
import { ChatLauncher } from "@/components/chat-launcher";

export const metadata = {
  title: "FAQ — Northstone Trust Bank",
  description:
    "How to open a Northstone account, what documents we need, how deposits and withdrawals work, and how cards, loans and statements are handled.",
};

export default async function FaqPage() {
  const t = await getDict();

  // Search engines read the questions and answers from this, which is why the
  // page is worth having as its own route rather than an accordion on the home
  // page.
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: t.faqPage.groups.flatMap((g) =>
      g.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      }))
    ),
  };

  return (
    <main className="flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <MarketingHeader />
      <PageHero eyebrow={t.faqPage.eyebrow} title={t.faqPage.title} body={t.faqPage.body} />

      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-14">
            {t.faqPage.groups.map((group) => (
              <section key={group.title}>
                <h2 className="text-xl font-semibold tracking-tight text-navy-900">
                  {group.title}
                </h2>
                <div className="mt-5 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  {group.items.map((item) => (
                    <details key={item.q} className="group px-6 py-1 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-semibold text-navy-900">
                        {item.q}
                        <span className="shrink-0 text-accent-500 transition group-open:rotate-45">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </span>
                      </summary>
                      <p className="pb-5 pr-8 text-[15px] leading-relaxed text-gray-600">
                        {item.a}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-gray-200 bg-navy-50/60 p-7">
              <h2 className="text-lg font-semibold text-navy-900">{t.faqPage.stillStuckTitle}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-gray-600">
                {t.faqPage.stillStuckBody}
              </p>
              <Link
                href="/contact"
                className="mt-5 block rounded-full bg-accent-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-accent-600"
              >
                {t.nav.contact}
              </Link>
              <Link
                href="/signup"
                className="mt-3 block rounded-full border border-gray-300 bg-white py-3 text-center text-sm font-semibold text-navy-800 transition hover:border-accent-500/40"
              >
                {t.common.openAccount}
              </Link>
            </div>
          </aside>
        </div>
      </div>

      <ChatLauncher />
      <MarketingFooter />
    </main>
  );
}
