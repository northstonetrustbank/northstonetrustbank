import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Dict, type Locale } from "./index";
import { en } from "./en";
import { fr } from "./fr";
import { de } from "./de";
import { es } from "./es";

const dictionaries: Record<Locale, Dict> = { en, fr, de, es };

export const LOCALE_COOKIE = "ns_locale";

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const value = jar.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getDict(): Promise<Dict> {
  return dictionaries[await getLocale()];
}

export function dictFor(locale: string): Dict {
  return dictionaries[isLocale(locale) ? locale : DEFAULT_LOCALE];
}
