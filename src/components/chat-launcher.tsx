import { getDict, getLocale } from "@/i18n/server";
import { ChatWidget } from "./chat-widget";

const INTL: Record<string, string> = { en: "en-US", fr: "fr-FR", de: "de-DE", es: "es-ES" };

export async function ChatLauncher({ prefill }: { prefill?: { name?: string; email?: string } }) {
  const t = await getDict();
  const locale = await getLocale();
  return <ChatWidget labels={t.chat} locale={INTL[locale] ?? "en-US"} prefill={prefill} />;
}
