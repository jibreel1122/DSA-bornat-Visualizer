import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORIES, CATEGORY_MAP } from "@/lib/categories";
import { byCategory } from "@/lib/algorithms";
import { AlgorithmCard } from "@/components/catalog/algorithm-card";
import { PageHeader } from "@/components/catalog/page-header";
import { CategoryVisualizationCount, CategoryEmptyState } from "@/components/catalog/category-chrome";
import type { CategoryId } from "@/lib/engine/types";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const info = CATEGORY_MAP[category as CategoryId];
  if (!info) return {};
  return { title: info.title, description: info.description };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const info = CATEGORY_MAP[category as CategoryId];
  if (!info) notFound();

  const items = byCategory(info.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader icon={info.icon} title={info.title} description={info.description} accent={info.accent}>
        <CategoryVisualizationCount count={items.length} />
      </PageHeader>

      {items.length === 0 ? (
        <CategoryEmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m, i) => (
            <AlgorithmCard key={m.slug} meta={m} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
