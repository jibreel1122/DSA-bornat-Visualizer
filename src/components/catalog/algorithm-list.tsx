"use client";

import * as React from "react";
import { Search, Star, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AlgorithmMeta, AlgoDifficulty, CategoryId } from "@/lib/engine/types";
import { CATEGORIES, CATEGORY_MAP } from "@/lib/categories";
import { useFavorites } from "@/lib/hooks";
import { useLocale } from "@/lib/i18n";
import { DIFFICULTY_KEY } from "@/lib/i18n/difficulty";
import { cn } from "@/lib/utils";
import { AlgorithmCard } from "./algorithm-card";

const DIFFICULTIES: AlgoDifficulty[] = ["Beginner", "Intermediate", "Advanced"];

/** Shared filterable, groupable algorithm browser used by /algorithms and /data-structures. */
export function AlgorithmList({
  items,
  categories,
  showCategoryFilter = true,
}: {
  items: AlgorithmMeta[];
  /** category ids to include in the group headers + filter */
  categories: CategoryId[];
  showCategoryFilter?: boolean;
}) {
  const { favorites } = useFavorites();
  const { t } = useLocale();
  const [query, setQuery] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<AlgoDifficulty | "all">("all");
  const [category, setCategory] = React.useState<CategoryId | "all">("all");
  const [favFirst, setFavFirst] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((m) => {
      if (difficulty !== "all" && m.difficulty !== difficulty) return false;
      if (category !== "all" && m.category !== category) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q) ||
        m.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [items, query, difficulty, category]);

  const grouped = React.useMemo(() => {
    const favSet = new Set(favorites);
    const groups = categories
      .map((cid) => ({
        category: CATEGORY_MAP[cid],
        items: filtered
          .filter((m) => m.category === cid)
          .sort((a, b) => {
            if (favFirst) {
              const fa = favSet.has(a.slug) ? 0 : 1;
              const fb = favSet.has(b.slug) ? 0 : 1;
              if (fa !== fb) return fa - fb;
            }
            return a.title.localeCompare(b.title);
          }),
      }))
      .filter((g) => g.items.length > 0);
    return groups;
  }, [filtered, categories, favorites, favFirst]);

  const activeFilters = query || difficulty !== "all" || category !== "all" || favFirst;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("catalog.searchPlaceholder")}
            className="ps-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty((cur) => (cur === d ? "all" : d))}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                difficulty === d
                  ? "border-primary bg-primary/12 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent",
              )}
            >
              {t(DIFFICULTY_KEY[d])}
            </button>
          ))}
        </div>

        {showCategoryFilter && (
          <Select value={category} onValueChange={(v) => setCategory(v as CategoryId | "all")}>
            <SelectTrigger className="h-9 w-40 text-sm">
              <SelectValue placeholder={t("catalog.categoryFilter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("catalog.allCategories")}</SelectItem>
              {categories.map((cid) => (
                <SelectItem key={cid} value={cid}>
                  {CATEGORY_MAP[cid].short}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <button
          onClick={() => setFavFirst((f) => !f)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
            favFirst ? "border-amber-400 bg-amber-400/12 text-amber-500" : "border-border text-muted-foreground hover:bg-accent",
          )}
        >
          <Star className={cn("size-3.5", favFirst && "fill-amber-400 text-amber-400")} /> {t("catalog.favoritesFirst")}
        </button>

        {activeFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              setDifficulty("all");
              setCategory("all");
              setFavFirst(false);
            }}
          >
            <X /> {t("catalog.resetFilters")}
          </Button>
        )}
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? t("catalog.resultSingular") : t("catalog.resultPlural")}
      </p>

      {grouped.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border py-20 text-center">
          <p className="text-muted-foreground">{t("catalog.noMatches")}</p>
        </div>
      ) : (
        <div className="grid gap-10">
          {grouped.map((g) => (
            <section key={g.category.id}>
              <div className="mb-3 flex items-center gap-2">
                <span className={cn("grid size-7 place-items-center rounded-lg bg-gradient-to-br text-white", g.category.accent)}>
                  <g.category.icon className="size-4" />
                </span>
                <h2 className="text-lg font-semibold tracking-tight">{g.category.title}</h2>
                <span className="text-sm text-muted-foreground">({g.items.length})</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((m, i) => (
                  <AlgorithmCard key={m.slug} meta={m} index={i} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export { CATEGORIES };
