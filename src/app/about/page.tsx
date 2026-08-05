import Image from "next/image";
import Link from "next/link";
import { getDict } from "@/i18n/server";
import { MarketingFooter, MarketingHeader, PageHero } from "@/components/marketing-shell";
import { Icons } from "@/components/icons";
import { ChatLauncher } from "@/components/chat-launcher";

export const metadata = {
  title: "About us — Northstone Trust Bank",
  description:
    "Northstone Trust Bank is a modern bank where every application is read by a person and every balance traces back to a transaction you can see.",
};

const commitmentIcons = [Icons.review, Icons.statement, Icons.shield, Icons.globe];

export default async function AboutPage() {
  const t = await getDict();

  return (
    <main className="flex-1">
      <MarketingHeader />
      <PageHero eyebrow={t.about.eyebrow} title={t.about.title} body={t.about.body} />

      {/* Story */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-navy-900">
              {t.about.storyTitle}
            </h2>
            <p className="mt-6 text-[17px] leading-relaxed text-gray-600">{t.about.storyBody1}</p>
            <p className="mt-4 text-[17px] leading-relaxed text-gray-600">{t.about.storyBody2}</p>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-xl shadow-navy-900/15">
            <Image
              src="/images/advisor-meeting.jpg"
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Commitments */}
      <section className="bg-navy-50/60">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight text-navy-900">
            {t.about.commitmentsTitle}
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {t.about.commitments.map((c, i) => {
              const Icon = commitmentIcons[i] ?? Icons.review;
              return (
                <div
                  key={c.title}
                  className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-navy-900">{c.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{c.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Append-only ledger */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div className="relative order-2 aspect-[4/3] overflow-hidden rounded-3xl shadow-xl shadow-navy-900/15 lg:order-1">
            <Image
              src="/images/lobby.jpg"
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl font-semibold tracking-tight text-navy-900">
              {t.about.ledgerTitle}
            </h2>
            <p className="mt-6 text-[17px] leading-relaxed text-gray-600">{t.about.ledgerBody}</p>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/images/team.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/85 to-navy-900/50" />
        <div className="relative mx-auto max-w-7xl px-6 py-28">
          <div className="max-w-xl">
            <h2 className="text-3xl font-semibold tracking-tight text-white">{t.about.teamTitle}</h2>
            <p className="mt-5 text-lg leading-relaxed text-navy-100">{t.about.teamBody}</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy-900">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-6 py-20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">{t.about.ctaTitle}</h2>
            <p className="mt-2 text-navy-200">{t.about.ctaBody}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-accent-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent-700/30 transition hover:bg-accent-600"
            >
              {t.common.openAccount}
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-white/25 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {t.nav.contact}
            </Link>
          </div>
        </div>
      </section>

      <ChatLauncher />
      <MarketingFooter />
    </main>
  );
}
