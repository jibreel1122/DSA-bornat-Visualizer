"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AlgorithmMeta } from "@/lib/engine/types";
import { CATEGORY_MAP } from "@/lib/categories";
import { useFavorites } from "@/lib/hooks";
import { useLocale } from "@/lib/i18n";
import { DIFFICULTY_KEY } from "@/lib/i18n/difficulty";
import { cn } from "@/lib/utils";

const DIFFICULTY_VARIANT = {
  Beginner: "success",
  Intermediate: "warning",
  Advanced: "destructive",
} as const;

export function AlgorithmCard({ meta, index = 0 }: { meta: AlgorithmMeta; index?: number }) {
  const { isFavorite, toggle } = useFavorites();
  const { t, locale } = useLocale();
  const category = CATEGORY_MAP[meta.category];
  const fav = isFavorite(meta.slug);
  const ar = locale === "ar";
  const title = ar && meta.titleAr ? meta.titleAr : meta.title;
  const summary = ar && meta.summaryAr ? meta.summaryAr : meta.summary;
  const tags = ar && meta.tagsAr?.length === meta.tags.length ? meta.tagsAr : meta.tags;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.3) }}
    >
      <Card className="group relative h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg">
        <Link href={`/visualizer/${meta.slug}`} className="flex h-full flex-col p-5">
          <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", category.accent)} />
          <div className="mb-3 flex items-start justify-between gap-2">
            <span className={cn("grid size-9 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm", category.accent)}>
              <category.icon className="size-4.5" />
            </span>
            <button
              type="button"
              aria-label={fav ? t("catalog.removeFromFavorites") : t("catalog.addToFavorites")}
              aria-pressed={fav}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle(meta.slug);
              }}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-amber-500"
            >
              <Star className={cn("size-4", fav && "fill-amber-400 text-amber-400")} />
            </button>
          </div>
          <h3 className="font-semibold leading-tight tracking-tight transition-colors group-hover:text-primary">
            {title}
          </h3>
          <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-muted-foreground">{summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge variant={DIFFICULTY_VARIANT[meta.difficulty]}>{t(DIFFICULTY_KEY[meta.difficulty])}</Badge>
            {tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </Link>
      </Card>
    </motion.div>
  );
}
