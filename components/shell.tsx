import { connection } from "next/server";
import { Dock } from "@/components/dock";
import { I18nProvider } from "@/components/i18n-provider";
import { Pwa } from "@/components/pwa";
import { messages } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export async function Shell({ children }: { children: React.ReactNode }) {
  await connection();

  const locale = await getLocale();

  return (
    <I18nProvider locale={locale} messages={messages[locale]}>
      <Dock />
      {children}
      <Pwa />
    </I18nProvider>
  );
}