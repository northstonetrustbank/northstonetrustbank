import Image from "next/image";
import Link from "next/link";
import { getDict } from "@/i18n/server";
import { MarketingFooter, MarketingHeader, PageHero } from "@/components/marketing-shell";
import { Icons } from "@/components/icons";
import { ChatLauncher } from "@/components/chat-launcher";

export const metadata = {
  title: "Fraud protection — Northstone Trust Bank",
  description:
    "How the Northstone Forensic Financial Investigation Unit prevents fraud, investigates it when it happens, and pursues recovery of your money.",
};

const preventIcons = [Icons.review, Icons.shield, Icons.statement, Icons.card];

export default async function SecurityPage() {
  const t = await getDict();

  return (
    <main className="flex-1 bg-white text-[#101828]">
      <MarketingHeader />
      <PageHero
        eyebrow={t.securityPage.eyebrow}
        title={t.securityPage.title}
        body={t.securityPage.body}
      />

      {/* Prevention */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-navy-900">
            {t.securityPage.preventTitle}
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-gray-600">
            {t.securityPage.preventBody}
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {t.securityPage.prevent.map((p, i) => {
            const Icon = preventIcons[i] ?? Icons.shield;
            return (
              <div key={p.title} className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-navy-900">{p.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{p.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Investigation process */}
      <section className="bg-navy-900">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="grid gap-14 lg:grid-cols-[minmax(0,380px)_1fr]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-white">
                {t.securityPage.investigateTitle}
              </h2>
              <p className="mt-4 text-[17px] leading-relaxed text-navy-100">
                {t.securityPage.investigateBody}
              </p>
              <div className="relative mt-8 hidden aspect-[4/3] overflow-hidden rounded-2xl lg:block">
                <Image
                  src="/images/forensic.webp"
                  alt=""
                  fill
                  sizes="380px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 to-transparent" />
              </div>
            </div>

            <ol className="relative space-y-8 border-l border-white/15 pl-8">
              {t.securityPage.steps.map((s, i) => (
                <li key={s.title} className="relative">
                  <span className="absolute -left-[41px] flex h-8 w-8 items-center justify-center rounded-full bg-accent-500 text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-semibold text-white">{s.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-navy-200">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Urgent action */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-3xl border-2 border-accent-500/30 bg-accent-50/60 p-8 sm:p-12">
          <div className="flex flex-wrap items-start gap-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white">
              <Icons.shield className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-semibold tracking-tight text-navy-900">
                {t.securityPage.urgentTitle}
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-navy-800">
                {t.securityPage.urgentBody}
              </p>
              <ol className="mt-6 space-y-3">
                {t.securityPage.urgentSteps.map((step, i) => (
                  <li key={step} className="flex gap-3 text-[15px] text-navy-900">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-accent-600">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <Link
                href="/contact"
                className="mt-7 inline-block rounded-xl bg-accent-500 px-7 py-3 text-sm font-semibold text-white transition hover:bg-accent-600"
              >
                {t.nav.contact}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Self-protection */}
      <section className="bg-navy-50/60">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight text-navy-900">
            {t.securityPage.protectTitle}
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.securityPage.protect.map((p) => (
              <div key={p.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-[15px] font-semibold text-navy-900">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy-900">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-6 py-20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              {t.securityPage.ctaTitle}
            </h2>
            <p className="mt-2 text-navy-200">{t.securityPage.ctaBody}</p>
          </div>
          <Link
            href="/contact"
            className="rounded-xl bg-accent-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent-700/30 transition hover:bg-accent-600"
          >
            {t.nav.contact}
          </Link>
        </div>
      </section>

      <ChatLauncher />
      <MarketingFooter />
    </main>
  );
}
