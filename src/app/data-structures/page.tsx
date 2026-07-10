"use client";

import { Boxes } from "lucide-react";
import { ALGORITHMS } from "@/lib/algorithms";
import { CATEGORIES } from "@/lib/categories";
import { AlgorithmList } from "@/components/catalog/algorithm-list";
import { PageHeader } from "@/components/catalog/page-header";
import { useLocale } from "@/lib/i18n";

export default function DataStructuresPage() {
  const { t } = useLocale();
  const structureCategories = CATEGORIES.filter((c) => c.isStructure).map((c) => c.id);
  const items = ALGORITHMS.filter((m) => structureCategories.includes(m.category));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        icon={Boxes}
        title={t("pages.dataStructuresTitle")}
        description={t("pages.dataStructuresDesc")}
      />
      <AlgorithmList items={items} categories={structureCategories} />
    </div>
  );
}
