"use client";

import Link from "next/link";
import { GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CategoryId } from "@/lib/engine/types";
import { useLocale } from "@/lib/i18n";

/** "Compare these side by side" link shown under a category header when it has 2+ algorithms. */
export function CompareCta({ category }: { category: CategoryId }) {
  const { t } = useLocale();
  return (
    <Button asChild variant="outline" size="sm" className="mt-3">
      <Link href={`/compare/${category}`}>
        <GitCompareArrows /> {t("compare.cta")}
      </Link>
    </Button>
  );
}
