import "server-only";

import { cookies, headers } from "next/headers";
import { messages, type Locale } from "@/lib/i18n";

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const saved = jar.get("locale")?.value;
  if (saved === "en" || saved === "tr") return saved;

  const accept = (await headers()).get("accept-language")?.toLowerCase() ?? "";
  return accept.includes("tr") ? "tr" : "en";
}

export async function text() {
  return messages[await getLocale()];
}
