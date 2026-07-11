"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Clock, Search, Star } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ALGORITHMS, getMeta } from "@/lib/algorithms";
import { CATEGORIES, CATEGORY_MAP } from "@/lib/categories";
import { useFavorites, useHistory } from "@/lib/hooks";
import { useLocale } from "@/lib/i18n";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const { favorites } = useFavorites();
  const { history } = useHistory();
  const { t, locale } = useLocale();
  const arName = (m: { title: string; titleAr?: string }) =>
    locale === "ar" && m.titleAr ? m.titleAr : m.title;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const recent = history
    .map((h) => getMeta(h.slug))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .slice(0, 5);
  const favs = favorites
    .map((s) => getMeta(s))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] max-w-xl translate-y-0 gap-0 p-0 overflow-hidden">
        <DialogTitle className="sr-only">{t("cmdk.label")}</DialogTitle>
        <Command label={t("cmdk.label")} className="outline-none">
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Command.Input
              autoFocus
              placeholder={t("cmdk.placeholder")}
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-[50vh] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              {t("cmdk.noResults")}
            </Command.Empty>

            {favs.length > 0 && (
              <Command.Group
                heading={t("cmdk.favorites")}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {favs.map((m) => (
                  <Command.Item
                    key={`fav-${m.slug}`}
                    value={`fav ${m.title} ${m.titleAr ?? ""}`}
                    onSelect={() => go(`/visualizer/${m.slug}`)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-accent"
                  >
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    {arName(m)}
                    <span className="ms-auto text-xs text-muted-foreground">
                      {CATEGORY_MAP[m.category].short}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {recent.length > 0 && (
              <Command.Group
                heading={t("cmdk.recentlyViewed")}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {recent.map((m) => (
                  <Command.Item
                    key={`recent-${m.slug}`}
                    value={`recent ${m.title} ${m.titleAr ?? ""}`}
                    onSelect={() => go(`/visualizer/${m.slug}`)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-accent"
                  >
                    <Clock className="size-4 text-muted-foreground" />
                    {arName(m)}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group
              heading={t("cmdk.categories")}
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {CATEGORIES.map((c) => (
                <Command.Item
                  key={c.id}
                  value={`${c.title} ${c.id}`}
                  onSelect={() => go(`/${c.id}`)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-accent"
                >
                  <c.icon className="size-4 text-primary" />
                  {c.title}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group
              heading={t("cmdk.algorithms")}
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {ALGORITHMS.map((m) => (
                <Command.Item
                  key={m.slug}
                  value={`${m.title} ${m.titleAr ?? ""} ${m.tags.join(" ")} ${(m.tagsAr ?? []).join(" ")} ${m.category}`}
                  onSelect={() => go(`/visualizer/${m.slug}`)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-accent"
                >
                  {arName(m)}
                  <span className="ms-auto text-xs text-muted-foreground">
                    {CATEGORY_MAP[m.category].short}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
