"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale } from "@/i18n";
import { LOCALE_COOKIE } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) return;
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // Remember the preference on the account so emails use it too.
  const user = await getSessionUser();
  if (user) {
    await db.user.update({ where: { id: user.id }, data: { locale } });
  }

  revalidatePath("/", "layout");
}
