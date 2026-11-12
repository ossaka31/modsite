"use client";

import { createContext, use } from "react";
import { messages as dictionary, type Locale } from "@/lib/i18n";

type Pack = (typeof dictionary)[Locale];

const LocaleContext = createContext<{ locale: Locale; t: Pack } | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Pack;
  children: React.ReactNode;
}) {
  return <LocaleContext value={{ locale, t: messages }}>{children}</LocaleContext>;
}

export function useI18n() {
  const value = use(LocaleContext);
  if (!value) {
    throw new Error("Locale missing");
  }
  return value;
}
