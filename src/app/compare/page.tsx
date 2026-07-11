import type { Metadata } from "next";
import Link from "next/link";
import { GitCompareArrows } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { byCategory } from "@/lib/algorithms";
import { CompareIntro } from "@/components/catalog/compare-intro";

export const metadata: Metadata = {
  title: "Compare Algorithms",
  description: "Run two or more algorithms of the same family side by side on identical input.",
};

export default function CompareIndexPage() {
  const categories = CATEGORIES.filter((c) => byCategory(c.id).length >= 2);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md">
          <GitCompareArrows className="size-5.5" />
        </span>
        <CompareIntro />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/compare/${c.id}`}
            className="group flex items-center gap-3 rounded-2xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-accent"
          >
            <span className={`grid size-11 place-items-center rounded-xl bg-gradient-to-br text-white ${c.accent}`}>
              <c.icon className="size-5.5" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold tracking-tight">{c.short}</p>
              <p className="text-sm text-muted-foreground">{byCategory(c.id).length} algorithms</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
