"use client";

import * as React from "react";
import { useLocalStorage } from "@/lib/hooks";
import en from "./en.json";
import ar from "./ar.json";

export type Locale = "en" | "ar";
export type DictKey = keyof typeof en;

const DICTS: Record<Locale, Record<DictKey, string>> = { en, ar };

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: DictKey) => string;
}

const LocaleContext = React.createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (key) => en[key],
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useLocalStorage<Locale>("bdsv:locale", "en");

  React.useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const t = React.useCallback((key: DictKey) => DICTS[locale][key] ?? DICTS.en[key], [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  return React.useContext(LocaleContext);
}
