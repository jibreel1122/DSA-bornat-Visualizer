"use client";

import { useLocale } from "@/lib/i18n";

/** Translated "N visualizations" count line rendered under a category's PageHeader. */
export function CategoryVisualizationCount({ count }: { count: number }) {
  const { t } = useLocale();
  return (
    <p className="mt-2 text-sm text-muted-foreground">
      {count} {count === 1 ? t("catalog.visualizationSingular") : t("catalog.visualizationPlural")}
    </p>
  );
}

/** Translated empty state shown when a category has no visualizations yet. */
export function CategoryEmptyState() {
  const { t } = useLocale();
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border py-24 text-center">
      <div>
        <p className="font-medium">{t("catalog.comingSoon")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("catalog.comingSoonDesc")}</p>
      </div>
    </div>
  );
}
