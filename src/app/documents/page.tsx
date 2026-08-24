import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { formatPeriod, statementPeriods } from "@/lib/statements";
import { productsWithLabels } from "@/lib/product-view";
import { getDict, getLocale } from "@/i18n/server";
import { AppShell, Page } from "@/components/app-shell";
import { Icons, NavIcons } from "@/components/icons";
import { EmptyState, SectionHead } from "@/components/ui";

export const metadata = { title: "Documents — Northstone Trust Bank" };

const INTL: Record<string, string> = { en: "en-US", fr: "fr-FR", de: "de-DE", es: "es-ES" };

/** Bytes as a short human size, e.g. "412 KB". */
function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isAdmin(user.role)) redirect("/admin");
  if (user.status === "PENDING") redirect("/onboarding");
  if (user.status !== "ACTIVE") redirect("/login");

  const t = await getDict();
  const locale = await getLocale();

  const [periods, uploads, identity] = await Promise.all([
    statementPeriods(user.id),
    db.applicationDocument.findMany({
      where: { application: { userId: user.id } },
      orderBy: { uploadedAt: "desc" },
      include: { application: { select: { productKey: true } } },
    }),
    // The client's own identity photos. They can always see what they sent us,
    // right up until the team purges them after review.
    db.kycDocument.findMany({
      where: { userId: user.id },
      orderBy: [{ uploadedAt: "asc" }],
    }),
  ]);

  const titles = new Map(
    productsWithLabels(t, user.accountType).map(({ def, item }) => [def.key, item.title])
  );

  const monthFmt = new Intl.DateTimeFormat(INTL[locale] ?? "en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const dateFmt = new Intl.DateTimeFormat(INTL[locale] ?? "en-US", { dateStyle: "medium" });

  const agreements = [
    { href: "/legal/deposit-agreement", label: t.legal.depositAgreement },
    { href: "/legal/terms", label: t.legal.terms },
    { href: "/legal/privacy", label: t.legal.privacy },
    { href: "/legal/e-consent", label: t.legal.eConsent },
  ];

  const identityPurged = identity.length === 0 && user.kycDocsDeletedAt !== null;
  const nothingYet = periods.length === 0 && uploads.length === 0;

  const sideLabel: Record<string, string> = {
    FRONT: t.onboarding.uploadFront,
    BACK: t.onboarding.uploadBack,
    SELFIE: t.onboarding.uploadSelfie,
  };

  return (
    <AppShell
      user={user}
      active="documents"
      title={t.documentsPage.title}
      subtitle={t.documentsPage.subtitle}
    >
      <Page className="space-y-8">
        {nothingYet && (
          <EmptyState title={t.documentsPage.empty} body={t.documentsPage.emptyBody} />
        )}

        {/* Monthly statements, derived from the ledger */}
        {periods.length > 0 && (
          <section>
            <SectionHead
              title={t.documentsPage.statements}
              subtitle={t.documentsPage.statementsBody}
              href="/statements"
              linkLabel={t.dashboard.viewAll}
            />
            <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-ink-1">
              {periods.slice(0, 12).map((p, i) => {
                const key = formatPeriod(p);
                const label = monthFmt.format(new Date(Date.UTC(p.year, p.month - 1, 1)));
                return (
                  <div
                    key={key}
                    className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${
                      i > 0 ? "border-t border-line-soft" : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-2 text-fg-muted">
                        <Icons.statement className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-fg">{label}</p>
                        <p className="text-[12px] text-fg-muted">{t.documentsPage.kindStatement}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={`/statements/${key}`}
                        className="rounded-xl border border-line bg-ink-2 px-4 py-1.5 text-[12px] font-semibold text-fg transition hover:border-brand-500/40"
                      >
                        {t.documentsPage.view}
                      </Link>
                      <a
                        href={`/api/statements/${key}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-ink-2 px-4 py-1.5 text-[12px] font-semibold text-fg transition hover:border-brand-500/40"
                      >
                        <NavIcons.download className="h-3.5 w-3.5" />
                        CSV
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* The identity document the account was opened with — listed only
            once something has actually been uploaded. */}
        {(identity.length > 0 || identityPurged) && (
          <section>
            <SectionHead
              title={t.documentsPage.identity}
              subtitle={t.documentsPage.identityBody}
            />
            {identityPurged ? (
              <p className="mt-4 rounded-2xl border border-line bg-ink-1 px-5 py-4 text-[13px] leading-relaxed text-fg-muted">
                {t.documentsPage.identityDeleted}
              </p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-ink-1">
                {identity.map((doc, i) => (
                  <div
                    key={doc.id}
                    className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${
                      i > 0 ? "border-t border-line-soft" : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-2 text-fg-muted">
                        <Icons.shield className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-fg">
                          {t.onboarding.docTypes[
                            doc.docType as keyof typeof t.onboarding.docTypes
                          ] ?? doc.docType}
                        </p>
                        <p className="tnum truncate text-[12px] text-fg-muted">
                          {sideLabel[doc.side] ?? doc.side} · {dateFmt.format(doc.uploadedAt)} ·{" "}
                          {fileSize(doc.sizeBytes)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`/api/files/kyc/${doc.storedName}`}
                      className="shrink-0 rounded-xl border border-line bg-ink-2 px-4 py-1.5 text-[12px] font-semibold text-fg transition hover:border-brand-500/40"
                    >
                      {t.documentsPage.open}
                    </a>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 px-1 text-[11px] text-fg-faint">{t.documentsPage.identityNote}</p>
          </section>
        )}

        {/* Paperwork the client sent us with an application */}
        {uploads.length > 0 && (
          <section>
            <SectionHead
              title={t.documentsPage.uploads}
              subtitle={t.documentsPage.uploadsBody}
            />
            <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-ink-1">
              {uploads.map((doc, i) => (
                <div
                  key={doc.id}
                  className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${
                    i > 0 ? "border-t border-line-soft" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-2 text-fg-muted">
                      <NavIcons.list className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-fg">
                        {t.docs.names[doc.docKey as keyof typeof t.docs.names] ?? doc.fileName}
                      </p>
                      <p className="tnum truncate text-[12px] text-fg-muted">
                        {titles.get(doc.application.productKey) ?? doc.application.productKey} ·{" "}
                        {dateFmt.format(doc.uploadedAt)} · {fileSize(doc.sizeBytes)}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`/api/files/application/${doc.storedName}`}
                    className="shrink-0 rounded-xl border border-line bg-ink-2 px-4 py-1.5 text-[12px] font-semibold text-fg transition hover:border-brand-500/40"
                  >
                    {t.documentsPage.open}
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Agreements that govern the account */}
        <section>
          <SectionHead title={t.documentsPage.agreements} subtitle={t.documentsPage.agreementsBody} />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {agreements.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-3 rounded-2xl border border-line bg-ink-1 px-5 py-4 transition hover:border-brand-500/40 hover:shadow-sm"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-2 text-fg-muted">
                  <Icons.shield className="h-[18px] w-[18px]" />
                </span>
                <span className="text-sm font-semibold text-fg">{a.label}</span>
                <NavIcons.chevronRight className="ml-auto h-4 w-4 text-fg-faint" />
              </Link>
            ))}
          </div>
        </section>
      </Page>
    </AppShell>
  );
}
