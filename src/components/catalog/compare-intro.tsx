"use client";

import { useLocale } from "@/lib/i18n";

/** Localized heading + lede for the /compare category picker. */
export function CompareIntro() {
  const { t } = useLocale();
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">{t("compare.indexTitle")}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">{t("compare.indexDesc")}</p>
    </div>
  );
}
