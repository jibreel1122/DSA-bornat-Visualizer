"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Clock, Search, Star } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ALGORITHMS, getMeta } from "@/lib/algorithms";
import { CATEGORIES, CATEGORY_MAP } from "@/lib/categories";
import { useFavorites, useHistory } from "@/lib/hooks";

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
        <DialogTitle className="sr-only">Global search</DialogTitle>
        <Command label="Global search" className="outline-none">
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Command.Input
              autoFocus
              placeholder="Search algorithms, structures, categories…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-[50vh] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {favs.length > 0 && (
              <Command.Group
                heading="Favorites"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {favs.map((m) => (
                  <Command.Item
                    key={`fav-${m.slug}`}
                    value={`fav ${m.title}`}
                    onSelect={() => go(`/visualizer/${m.slug}`)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-accent"
                  >
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    {m.title}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {CATEGORY_MAP[m.category].short}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {recent.length > 0 && (
              <Command.Group
                heading="Recently viewed"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {recent.map((m) => (
                  <Command.Item
                    key={`recent-${m.slug}`}
                    value={`recent ${m.title}`}
                    onSelect={() => go(`/visualizer/${m.slug}`)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-accent"
                  >
                    <Clock className="size-4 text-muted-foreground" />
                    {m.title}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group
              heading="Categories"
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
              heading="Algorithms"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {ALGORITHMS.map((m) => (
                <Command.Item
                  key={m.slug}
                  value={`${m.title} ${m.tags.join(" ")} ${m.category}`}
                  onSelect={() => go(`/visualizer/${m.slug}`)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-accent"
                >
                  {m.title}
                  <span className="ml-auto text-xs text-muted-foreground">
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
