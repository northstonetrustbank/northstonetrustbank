import Link from "next/link";
import { getDict } from "@/i18n/server";
import { MarketingFooter, MarketingHeader, PageHero } from "@/components/marketing-shell";
import { Icons } from "@/components/icons";
import { ChatLauncher } from "@/components/chat-launcher";
import { ContactForm } from "./contact-form";

export const metadata = {
  title: "Contact — Northstone Trust Bank",
  description:
    "Reach Northstone Trust Bank by email, live chat, or from inside your account. A member of our team replies within one business day.",
};

export default async function ContactPage() {
  const t = await getDict();

  return (
    <main className="flex-1">
      <MarketingHeader />
      <PageHero eyebrow={t.contactPage.eyebrow} title={t.contactPage.title} body={t.contactPage.body} />

      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Form */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
            <h2 className="text-2xl font-semibold tracking-tight text-navy-900">
              {t.contactPage.formTitle}
            </h2>
            <p className="mt-2 text-[15px] text-gray-600">{t.contactPage.formBody}</p>
            <div className="mt-8">
              <ContactForm
                labels={{
                  name: t.contactPage.name,
                  email: t.contactPage.email,
                  topic: t.contactPage.topic,
                  topics: t.contactPage.topics,
                  message: t.contactPage.message,
                  send: t.contactPage.send,
                  sending: t.contactPage.sending,
                }}
              />
            </div>
          </div>

          {/* Channels */}
          <aside className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
                {t.contactPage.channelsTitle}
              </h2>
              <ul className="mt-4 space-y-4">
                {t.contactPage.channels.map((c) => (
                  <li
                    key={c.value}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <p className="text-[15px] font-semibold text-navy-900">{c.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-gray-600">{c.body}</p>
                    <a
                      href={`mailto:${c.value}`}
                      className="mt-3 block break-all text-sm font-semibold text-accent-600 hover:text-accent-700"
                    >
                      {c.value}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-navy-50/60 p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-accent-600">
                <Icons.phone className="h-5 w-5" />
              </span>
              <p className="mt-3 text-[15px] font-semibold text-navy-900">
                {t.contactPage.liveChatTitle}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                {t.contactPage.liveChatBody}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-[15px] font-semibold text-navy-900">
                {t.contactPage.signedInTitle}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                {t.contactPage.signedInBody}
              </p>
              <Link
                href="/login"
                className="mt-4 block rounded-full border border-gray-300 py-2.5 text-center text-sm font-semibold text-navy-800 transition hover:border-accent-500/40"
              >
                {t.contactPage.signedInCta}
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-gray-500">
                  {t.contactPage.locationTitle}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-navy-800">
                  {t.contactPage.locationBody}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-gray-500">
                  {t.contactPage.responseTitle}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-navy-800">
                  {t.contactPage.responseBody}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <ChatLauncher />
      <MarketingFooter />
    </main>
  );
}
