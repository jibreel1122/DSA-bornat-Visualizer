import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { ALGORITHMS } from "@/lib/algorithms";
import { CATEGORIES } from "@/lib/categories";
import { AlgorithmList } from "@/components/catalog/algorithm-list";
import { PageHeader } from "@/components/catalog/page-header";

export const metadata: Metadata = {
  title: "All Algorithms",
  description: "Browse and search every algorithm and data structure visualization.",
};

export default function AlgorithmsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        icon={Sparkles}
        title="All Visualizations"
        description="Every algorithm and data structure in one place. Search by name or tag, filter by difficulty, and star your favorites."
      />
      <AlgorithmList items={ALGORITHMS} categories={CATEGORIES.map((c) => c.id)} />
    </div>
  );
}
