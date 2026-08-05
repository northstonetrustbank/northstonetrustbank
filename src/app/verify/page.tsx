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
    <main className="flex flex-1 items-center justify-center bg-navy-50/50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
            ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {ok ? "✓" : "!"}
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-navy-900">{heading}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-600">{message}</p>
        <Link
          href={ok ? "/onboarding" : "/login"}
          className="mt-7 inline-block rounded-full bg-accent-500 px-7 py-3 text-sm font-semibold text-white transition hover:bg-accent-600"
        >
          {ok ? t.verifyPage.continue : t.common.signIn}
        </Link>
      </div>
    </main>
  );
}
