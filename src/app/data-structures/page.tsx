import type { Metadata } from "next";
import { Boxes } from "lucide-react";
import { ALGORITHMS } from "@/lib/algorithms";
import { CATEGORIES } from "@/lib/categories";
import { AlgorithmList } from "@/components/catalog/algorithm-list";
import { PageHeader } from "@/components/catalog/page-header";

export const metadata: Metadata = {
  title: "Data Structures",
  description: "Linked lists, stacks, queues, hash tables, trees, and heaps — visualized interactively.",
};

export default function DataStructuresPage() {
  const structureCategories = CATEGORIES.filter((c) => c.isStructure).map((c) => c.id);
  const items = ALGORITHMS.filter((m) => structureCategories.includes(m.category));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        icon={Boxes}
        title="Data Structures"
        description="Data structures organize data for efficient access and modification. Explore how linked lists, stacks, queues, hash tables, trees, and heaps store data and support their core operations — every insert, delete, and lookup animated step by step."
      />
      <AlgorithmList items={items} categories={structureCategories} />
    </div>
  );
}
