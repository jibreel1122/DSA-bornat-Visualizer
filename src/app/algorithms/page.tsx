"use client";

import { Sparkles } from "lucide-react";
import { ALGORITHMS } from "@/lib/algorithms";
import { CATEGORIES } from "@/lib/categories";
import { AlgorithmList } from "@/components/catalog/algorithm-list";
import { PageHeader } from "@/components/catalog/page-header";
import { useLocale } from "@/lib/i18n";

export default function AlgorithmsPage() {
  const { t } = useLocale();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        icon={Sparkles}
        title={t("pages.allVisualizationsTitle")}
        description={t("pages.allVisualizationsDesc")}
      />
      <AlgorithmList items={ALGORITHMS} categories={CATEGORIES.map((c) => c.id)} />
    </div>
  );
}
