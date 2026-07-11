"use client";

import * as React from "react";
import { Dices, Eraser, ListMinus, ListPlus, Pencil, Plus, Redo2, Search, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { byCategory, loadAlgorithm } from "@/lib/algorithms";
import { CATEGORY_MAP } from "@/lib/categories";
import { LEVELS, type AlgorithmMeta, type AlgorithmModule, type CategoryId, type Level } from "@/lib/engine/types";
import { listFieldKeyOf, searchFieldKeyOf, type LiveInput } from "@/lib/engine/use-live-input";
import { useLocale } from "@/lib/i18n";
import { useCompareSession, type CompareSession } from "./compare-session";
import { VisualizerShell } from "./visualizer-shell";
import { EditPromptButton, ValuePromptButton } from "./value-prompt-button";

const MAX_PANELS = 4;
const LEVEL_LABEL_KEYS = {
  1: "shell.level1",
  2: "shell.level2",
  3: "shell.level3",
  4: "shell.level4",
  5: "shell.level5",
} as const;

/** Side-by-side comparison of same-category algorithms sharing one live input (synced) or driven independently. */
export function CompareShell({ category }: { category: CategoryId }) {
  const { t, locale } = useLocale();
  const info = CATEGORY_MAP[category];
  const options = React.useMemo(() => byCategory(category), [category]);

  const arName = React.useCallback(
    (m: AlgorithmMeta) => (locale === "ar" && m.titleAr ? m.titleAr : m.title),
    [locale],
  );

  // selected slugs (2..MAX_PANELS); default to the first two of the category
  const [slugs, setSlugs] = React.useState<string[]>(() =>
    options.slice(0, 2).map((m) => m.slug),
  );
  const [modules, setModules] = React.useState<Record<string, AlgorithmModule>>({});

  // lazily load each selected module
  React.useEffect(() => {
    let alive = true;
    for (const slug of slugs) {
      if (modules[slug]) continue;
      loadAlgorithm(slug).then((m) => {
        if (alive && m) setModules((prev) => (prev[slug] ? prev : { ...prev, [slug]: m }));
      });
    }
    return () => {
      alive = false;
    };
  }, [slugs, modules]);

  const referenceModule = modules[slugs[0]];
  const session = useCompareSession(referenceModule);

  const listFieldKey = referenceModule ? listFieldKeyOf(referenceModule) : undefined;
  const searchFieldKey = referenceModule ? searchFieldKeyOf(referenceModule) : undefined;

  const allLoaded = slugs.every((s) => modules[s]);

  // Seed every panel with identical data once, whenever we (re)enter synced mode
  // with a fully-loaded set of panels — verifies "same starting data" and keeps
  // a mode switch from leaving the panels on divergent inputs.
  const lastSyncKey = React.useRef<string>("");
  React.useEffect(() => {
    if (session.mode !== "synced" || !allLoaded) return;
    const key = `${slugs.join("|")}@${session.level}`;
    if (lastSyncKey.current === key) return;
    lastSyncKey.current = key;
    // let panels register their live inputs first
    const id = window.setTimeout(() => session.syncDataset(session.level), 0);
    return () => window.clearTimeout(id);
  }, [session, slugs, allLoaded]);

  const setSlugAt = (index: number, slug: string) => {
    setSlugs((prev) => prev.map((s, i) => (i === index ? slug : s)));
    lastSyncKey.current = ""; // force a re-sync for the new module
  };

  const addPanel = () => {
    if (slugs.length >= MAX_PANELS) return;
    const next = options.find((m) => !slugs.includes(m.slug)) ?? options[0];
    setSlugs((prev) => [...prev, next.slug]);
    lastSyncKey.current = "";
  };

  const removePanel = () => {
    if (slugs.length <= 2) return;
    session.unregister(slugs.length - 1);
    setSlugs((prev) => prev.slice(0, -1));
    lastSyncKey.current = "";
  };

  const synced = session.mode === "synced";

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className={`grid size-9 place-items-center rounded-xl bg-gradient-to-br text-white ${info.accent}`}>
          <info.icon className="size-5" />
        </span>
        <div className="me-auto">
          <h1 className="text-xl font-bold tracking-tight">{t("compare.title", { category: info.short })}</h1>
          <p className="text-sm text-muted-foreground">{t("compare.subtitle")}</p>
        </div>

        {/* synced / independent toggle */}
        <div className="flex items-center rounded-lg border border-border p-0.5 text-xs">
          {(["synced", "independent"] as const).map((m) => (
            <button
              key={m}
              onClick={() => session.setMode(m)}
              className={`rounded-md px-2.5 py-1.5 font-medium transition-colors ${
                session.mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(m === "synced" ? "compare.synced" : "compare.independent")}
            </button>
          ))}
        </div>
      </div>

      {/* algorithm pickers */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {slugs.map((slug, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">{i + 1}</span>
            <Select value={slug} onValueChange={(v) => setSlugAt(i, v)}>
              <SelectTrigger className="h-9 w-56 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((m) => (
                  <SelectItem key={m.slug} value={m.slug}>
                    {arName(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        {slugs.length < MAX_PANELS && options.length > slugs.length && (
          <Button variant="outline" size="sm" onClick={addPanel}>
            <Plus /> {t("compare.addPanel")}
          </Button>
        )}
        {slugs.length > 2 && (
          <Button variant="ghost" size="sm" onClick={removePanel}>
            <X /> {t("compare.removePanel")}
          </Button>
        )}
      </div>

      {/* shared control bar (synced mode) */}
      {synced && referenceModule && (
        <SharedBar
          session={session}
          listFieldKey={listFieldKey}
          searchFieldKey={searchFieldKey}
        />
      )}

      {/* panel grid */}
      <div className={`grid gap-4 ${slugs.length >= 3 ? "xl:grid-cols-2" : "lg:grid-cols-2"}`}>
        {slugs.map((slug, i) => {
          const mod = modules[slug];
          return (
            <div key={`${i}-${slug}`} className="min-w-0">
              {mod ? (
                <VisualizerShell
                  module={mod}
                  showBuilderBar={!synced}
                  onLiveReady={synced ? session.register(i) : undefined}
                />
              ) : (
                <Card className="grid h-96 place-items-center text-sm text-muted-foreground">
                  {t("compare.loading")}
                </Card>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SharedBar({
  session,
  listFieldKey,
  searchFieldKey,
}: {
  session: CompareSession;
  listFieldKey: string | undefined;
  searchFieldKey: string | undefined;
}) {
  const { t } = useLocale();
  const run = (fn: (live: LiveInput) => void) => session.broadcast(fn);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2">
      <span className="me-1 text-xs font-medium text-primary">{t("compare.sharedControls")}</span>

      <Select value={String(session.level)} onValueChange={(v) => session.changeLevel(Number(v) as Level)}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LEVELS.map((l) => (
            <SelectItem key={l.level} value={String(l.level)}>
              {t(LEVEL_LABEL_KEYS[l.level])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="secondary" size="sm" onClick={() => session.syncDataset(session.level)}>
        <Dices /> {t("shell.random")}
      </Button>

      {(listFieldKey || searchFieldKey) && (
        <div className="flex items-center gap-1.5 rounded-lg border border-primary/25 bg-background/60 p-1">
          {listFieldKey && (
            <ValuePromptButton
              icon={<ListPlus />}
              label={t("shell.insertValue")}
              placeholder={t("shell.placeholderExample")}
              confirmLabel={t("shell.confirmInsert")}
              onSubmit={(v) => run((l) => l.insertValue(v))}
              emphasized
            />
          )}
          {listFieldKey && (
            <ValuePromptButton
              icon={<ListMinus />}
              label={t("shell.deleteValue")}
              placeholder={t("shell.placeholderExample")}
              confirmLabel={t("shell.confirmDelete")}
              onSubmit={(v) => run((l) => l.removeValue(v))}
              emphasized
            />
          )}
          {listFieldKey && (
            <EditPromptButton
              icon={<Pencil />}
              label={t("shell.editValue")}
              oldPlaceholder={t("shell.placeholderCurrentValue")}
              newPlaceholder={t("shell.placeholderNewValue")}
              confirmLabel={t("shell.confirmEdit")}
              onSubmit={(o, n) => run((l) => l.editValue(o, n))}
            />
          )}
          {searchFieldKey && (
            <ValuePromptButton
              icon={<Search />}
              label={t("shell.searchValue")}
              placeholder={t("shell.placeholderExample")}
              confirmLabel={t("shell.confirmSearch")}
              onSubmit={(v) => run((l) => l.searchValue(v))}
              emphasized
            />
          )}
        </div>
      )}

      <Button variant="ghost" size="sm" onClick={() => run((l) => l.clearInput())}>
        <Eraser /> {t("shell.clearValues")}
      </Button>

      <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />

      <Button variant="ghost" size="sm" onClick={() => run((l) => l.undo())}>
        <Undo2 /> {t("shell.undo")}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => run((l) => l.redo())}>
        <Redo2 /> {t("shell.redo")}
      </Button>
    </div>
  );
}
