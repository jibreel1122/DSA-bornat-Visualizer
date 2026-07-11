import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORIES, CATEGORY_MAP } from "@/lib/categories";
import { byCategory } from "@/lib/algorithms";
import { CompareShell } from "@/components/visualizer/compare-shell";
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
  return {
    title: `Compare — ${info.title}`,
    description: `Compare ${info.title.toLowerCase()} side by side on the same input.`,
  };
}

export default async function ComparePage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const info = CATEGORY_MAP[category as CategoryId];
  if (!info) notFound();
  // comparison needs at least two algorithms of the same family
  if (byCategory(info.id).length < 2) notFound();

  return <CompareShell category={info.id} />;
}
