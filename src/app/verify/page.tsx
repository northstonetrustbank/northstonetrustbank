import Link from "next/link";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getDict } from "@/i18n/server";

export const metadata = { title: "Verify email — Northstone Trust Bank" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = await getDict();
  const { token } = await searchParams;

  let heading = t.verifyPage.invalidTitle;
  let message = t.verifyPage.invalidBody;
  let ok = false;

  if (token) {
    const record = await db.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.purpose !== "EMAIL_VERIFY") {
      // defaults already set
    } else if (record.usedAt || record.user.emailVerified) {
      ok = true;
      heading = t.verifyPage.alreadyTitle;
      message = t.verifyPage.alreadyBody;
    } else if (record.expiresAt < new Date()) {
      heading = t.verifyPage.expiredTitle;
      message = t.verifyPage.expiredBody;
    } else {
      await db.$transaction([
        db.verificationToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        }),
        db.user.update({
          where: { id: record.userId },
          data: { emailVerified: true },
        }),
      ]);
      await audit({
        actorId: record.userId,
        actorLabel: record.user.email,
        action: "EMAIL_VERIFIED",
        targetType: "USER",
        targetId: record.userId,
      });
      ok = true;
      heading = t.verifyPage.successTitle;
      message = t.verifyPage.successBody;
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-ink-2 px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-ink-1 p-10 text-center shadow-sm">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
            ok ? "bg-pos/12 text-pos" : "bg-neg/12 text-neg"
          }`}
        >
          {ok ? "✓" : "!"}
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-fg">{heading}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">{message}</p>
        <Link
          href={ok ? "/onboarding" : "/login"}
          className="mt-7 inline-block rounded-xl bg-brand-500 px-7 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          {ok ? t.verifyPage.continue : t.common.signIn}
        </Link>
      </div>
    </main>
  );
}
