"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  Braces,
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lightbulb,
  MessageSquareQuote,
  NotebookPen,
  Star,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/input";
import type { AlgorithmMeta, AlgorithmModule } from "@/lib/engine/types";
import { loadAlgorithm } from "@/lib/algorithms";
import { CATEGORY_MAP } from "@/lib/categories";
import { useFavorites, useHistory, useNotes } from "@/lib/hooks";
import { useLocale } from "@/lib/i18n";
import { DIFFICULTY_KEY } from "@/lib/i18n/difficulty";
import { cn } from "@/lib/utils";
import { VisualizerShell } from "./visualizer-shell";
import { CodeViewer } from "./code-viewer";
import { QuizPanel } from "./quiz-panel";

export function AlgorithmPage({ meta }: { meta: AlgorithmMeta }) {
  const [module, setModule] = React.useState<AlgorithmModule | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [initialFields, setInitialFields] = React.useState<Record<string, string> | undefined>();
  const { isFavorite, toggle } = useFavorites();
  const { record } = useHistory();
  const { t, locale } = useLocale();
  const category = CATEGORY_MAP[meta.category];
  const ar = locale === "ar";
  const content = ar && module?.contentAr ? module.contentAr : module?.content;
  const title = ar && meta.titleAr ? meta.titleAr : meta.title;
  const summary = ar && meta.summaryAr ? meta.summaryAr : meta.summary;
  const tags = ar && meta.tagsAr?.length === meta.tags.length ? meta.tagsAr : meta.tags;

  React.useEffect(() => {
    let alive = true;
    // deep-link support: /visualizer/<slug>?input=<url-encoded JSON fields>
    try {
      const q = new URLSearchParams(window.location.search).get("input");
      if (q) setInitialFields(JSON.parse(q) as Record<string, string>);
    } catch {
      // malformed deep link — ignore
    }
    loadAlgorithm(meta.slug)
      .then((m) => {
        if (!alive) return;
        if (m) setModule(m);
        else setFailed(true);
      })
      .catch(() => alive && setFailed(true));
    record(meta.slug);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.slug]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* breadcrumbs + header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
          <Link href={`/${meta.category}`} className="transition-colors hover:text-foreground">
            {category.title}
          </Link>
          {/* Breadcrumbs point toward the current page: choose the logical arrow explicitly, never CSS-mirror it. */}
          {ar ? <ChevronLeft className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          <span className="text-foreground">{title}</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {title}
              {ar && meta.titleAr && (
                <span className="ms-3 align-middle text-base font-normal text-muted-foreground" dir="ltr">
                  {meta.title}
                </span>
              )}
            </h1>
            <p className="mt-1.5 max-w-2xl text-muted-foreground">{summary}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Badge>{t(DIFFICULTY_KEY[meta.difficulty])}</Badge>
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggle(meta.slug)}
            aria-pressed={isFavorite(meta.slug)}
          >
            <Star
              className={cn(isFavorite(meta.slug) && "fill-amber-400 text-amber-400")}
            />
            {isFavorite(meta.slug) ? t("algo.favorited") : t("algo.favorite")}
          </Button>
        </div>
      </div>

      {/* visualizer */}
      {module ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <VisualizerShell module={module} initialFields={initialFields} />
        </motion.div>
      ) : (
        <Card className="grid h-[560px] place-items-center">
          <div className="text-center text-sm text-muted-foreground">
            {failed ? t("algo.loadFailed") : t("algo.loading")}
          </div>
        </Card>
      )}

      {/* educational content */}
      {module && content && (
        <Tabs defaultValue="theory" className="mt-8">
          <TabsList className="flex h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="theory"><BookOpen /> {t("algo.tabTheory")}</TabsTrigger>
            <TabsTrigger value="code"><Braces /> {t("algo.tabCode")}</TabsTrigger>
            <TabsTrigger value="applications"><Lightbulb /> {t("algo.tabApplications")}</TabsTrigger>
            <TabsTrigger value="interview"><MessageSquareQuote /> {t("algo.tabInterview")}</TabsTrigger>
            <TabsTrigger value="quiz"><BrainCircuit /> {t("algo.tabQuiz")}</TabsTrigger>
            <TabsTrigger value="notes"><NotebookPen /> {t("algo.tabNotes")}</TabsTrigger>
          </TabsList>

          <TabsContent value="theory" className="mt-4 grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("algo.overview")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm leading-relaxed text-foreground/90">
                {content.overview.split(/\n\n+/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("algo.howItWorks")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="grid gap-2.5 text-sm">
                  {content.howItWorks.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/12 font-mono text-xs font-semibold text-primary">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{s}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="size-4 text-primary" /> {t("algo.complexity")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <ComplexityStat label={t("algo.best")} value={content.complexity.time.best} />
                  <ComplexityStat label={t("algo.average")} value={content.complexity.time.average} />
                  <ComplexityStat label={t("algo.worst")} value={content.complexity.time.worst} />
                  <ComplexityStat label={t("algo.space")} value={content.complexity.space} />
                </div>
                {content.complexity.notes && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {content.complexity.notes}
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" /> {t("algo.advantages")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-2 text-sm">
                    {content.advantages.map((a, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="size-4 text-rose-500" /> {t("algo.disadvantages")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-2 text-sm">
                    {content.disadvantages.map((d, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-500" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-500" /> {t("algo.commonMistakes")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2 text-sm">
                  {content.commonMistakes.map((m, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" />
                      {m}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-primary/25 bg-primary/[0.04]">
              <CardHeader>
                <CardTitle>{t("algo.summary")}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed">
                {content.summary}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="code" className="mt-4">
            <CodeViewer code={module.code} slug={module.slug} />
          </TabsContent>

          <TabsContent value="applications" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("algo.realWorldApplications")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2.5 text-sm">
                  {content.applications.map((a, i) => (
                    <li key={i} className="flex gap-3">
                      <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
                      {a}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interview" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("algo.interviewQuestions")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="grid gap-3 text-sm">
                  {content.interviewQuestions.map((q, i) => (
                    <li key={i} className="flex gap-3 rounded-xl border border-border p-3">
                      <span className="font-mono text-xs font-semibold text-primary">Q{i + 1}</span>
                      {q}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quiz" className="mt-4">
            <QuizPanel slug={module.slug} quiz={content.quiz} />
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <NotesPanel slug={module.slug} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ComplexityStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 px-3 py-2.5 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-semibold text-primary">{value}</div>
    </div>
  );
}

function NotesPanel({ slug }: { slug: string }) {
  const { notes, setNotes, loaded } = useNotes(slug);
  const { t } = useLocale();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("algo.notesTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={loaded ? t("algo.notesPlaceholder") : t("algo.loading")}
          className="min-h-[180px]"
        />
      </CardContent>
    </Card>
  );
}
