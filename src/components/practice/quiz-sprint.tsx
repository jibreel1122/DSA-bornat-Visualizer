"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Lightbulb, RotateCcw, Trophy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/categories";
import { byCategory, loadAlgorithm } from "@/lib/algorithms";
import type { CategoryId, QuizQuestion } from "@/lib/engine/types";
import { createRNG, randomSeed } from "@/lib/engine/random";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";

interface LoadedQ extends QuizQuestion {
  source: string;
  category: CategoryId;
  slug: string;
}

const MAX_Q = 10;

export function QuizSprint({ onRecord }: { onRecord: (categoryId: CategoryId, correct: boolean, slug: string) => void }) {
  const { t } = useLocale();
  const [category, setCategory] = React.useState<CategoryId | "all">("all");
  const [phase, setPhase] = React.useState<"idle" | "loading" | "playing" | "done">("idle");
  const [questions, setQuestions] = React.useState<LoadedQ[]>([]);
  const [index, setIndex] = React.useState(0);
  const [picked, setPicked] = React.useState<number | null>(null);
  const [score, setScore] = React.useState(0);
  const [hintUsed, setHintUsed] = React.useState(false);
  const [showHint, setShowHint] = React.useState(false);

  const start = async () => {
    setPhase("loading");
    const cats = category === "all" ? CATEGORIES.map((c) => c.id) : [category];
    const metas = cats.flatMap((c) => byCategory(c));
    const rng = createRNG(randomSeed());
    const pool: LoadedQ[] = [];
    // load lazily; cap module loads to keep it snappy
    const shuffledMetas = rng.shuffle(metas);
    for (const meta of shuffledMetas) {
      if (pool.length >= MAX_Q * 3) break;
      const mod = await loadAlgorithm(meta.slug);
      if (!mod) continue;
      for (const q of mod.content.quiz) {
        pool.push({ ...q, source: meta.title, category: meta.category, slug: meta.slug });
      }
    }
    const chosen = rng.shuffle(pool).slice(0, MAX_Q);
    if (chosen.length === 0) {
      setPhase("idle");
      return;
    }
    setQuestions(chosen);
    setIndex(0);
    setScore(0);
    setPicked(null);
    setHintUsed(false);
    setShowHint(false);
    setPhase("playing");
  };

  const q = questions[index];

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const correct = i === q.answer;
    if (correct) setScore((s) => s + (hintUsed ? 0.5 : 1));
    onRecord(q.category, correct, q.slug);
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setPhase("done");
    } else {
      setIndex((i) => i + 1);
      setPicked(null);
      setHintUsed(false);
      setShowHint(false);
    }
  };

  if (phase === "idle" || phase === "loading") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <Trophy className="size-10 text-amber-400" />
          <h3 className="text-lg font-semibold">{t("quiz.title")}</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t("quiz.descriptionPrefix")} {MAX_Q} {t("quiz.descriptionSuffix")}
          </p>
          <div className="flex items-center gap-2">
            <Select value={category} onValueChange={(v) => setCategory(v as CategoryId | "all")}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("quiz.allCategories")}</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.short}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={start} disabled={phase === "loading"}>
              {phase === "loading" ? t("practice.loading") : t("practice.start")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === "done") {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
            <Trophy className="size-12 text-amber-400" />
          </motion.div>
          <div className="text-3xl font-bold">
            {score} / {questions.length}
          </div>
          <p className="text-sm text-muted-foreground">
            {pct >= 80 ? t("quiz.outstanding") : pct >= 50 ? t("quiz.solidWork") : t("quiz.reviewRetry")}
          </p>
          <Button onClick={start} variant="secondary">
            <RotateCcw /> {t("quiz.newSprint")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-5">
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("quiz.question")} {index + 1} {t("quiz.of")} {questions.length}</span>
          <span>{t("quiz.score")}: {score}</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={index} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="mb-1 text-xs font-medium text-primary">{q.source}</div>
            <h3 className="mb-4 font-medium">{q.question}</h3>
            <div className="grid gap-2">
              {q.options.map((opt, i) => {
                const isAnswer = i === q.answer;
                const isPicked = i === picked;
                return (
                  <button
                    key={i}
                    onClick={() => pick(i)}
                    disabled={picked !== null}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-start text-sm transition-all",
                      picked === null && "cursor-pointer hover:border-primary/50 hover:bg-accent",
                      picked !== null && isAnswer && "border-emerald-500/60 bg-emerald-500/10",
                      picked !== null && isPicked && !isAnswer && "border-rose-500/60 bg-rose-500/10",
                      picked !== null && !isPicked && !isAnswer && "opacity-50",
                    )}
                  >
                    {opt}
                    {picked !== null && isAnswer && <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />}
                    {picked !== null && isPicked && !isAnswer && <XCircle className="size-4 shrink-0 text-rose-500" />}
                  </button>
                );
              })}
            </div>

            {picked === null && (
              <div className="mt-4">
                {showHint ? (
                  <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                    {q.explanation.split(".")[0]}.
                  </p>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowHint(true);
                      setHintUsed(true);
                    }}
                  >
                    <Lightbulb /> {t("quiz.showHint")}
                  </Button>
                )}
              </div>
            )}

            {picked !== null && (
              <>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
                  {q.explanation}
                </motion.div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={next}>{index + 1 >= questions.length ? t("practice.finish") : t("practice.next")}</Button>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
