"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, RotateCcw, Trophy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { QuizQuestion } from "@/lib/engine/types";
import { useLocalStorage } from "@/lib/hooks";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface QuizRecord {
  best: number;
  attempts: number;
  total: number;
}

/** Multiple-choice quiz with scoring; best score persists for practice mastery. */
export function QuizPanel({ slug, quiz }: { slug: string; quiz: QuizQuestion[] }) {
  const { t } = useLocale();
  const [record, setRecord] = useLocalStorage<QuizRecord>(`bdsv:quiz:${slug}`, {
    best: 0,
    attempts: 0,
    total: quiz.length,
  });
  const [index, setIndex] = React.useState(0);
  const [picked, setPicked] = React.useState<number | null>(null);
  const [score, setScore] = React.useState(0);
  const [done, setDone] = React.useState(false);

  const q = quiz[index];

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answer) setScore((s) => s + 1);
  };

  const nextQ = () => {
    if (index + 1 >= quiz.length) {
      const final = score;
      setRecord((r) => ({
        best: Math.max(r.best, final),
        attempts: r.attempts + 1,
        total: quiz.length,
      }));
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setPicked(null);
    }
  };

  const restart = () => {
    setIndex(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  };

  if (quiz.length === 0) return null;

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Trophy className="size-10 text-amber-400" />
          <div className="text-2xl font-bold">
            {score} / {quiz.length}
          </div>
          <p className="text-sm text-muted-foreground">
            {score === quiz.length
              ? t("shell.quizPerfectScore")
              : score >= quiz.length / 2
                ? t("shell.quizNiceWork")
                : t("shell.quizKeepPracticing")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("shell.quizBestAttempts", {
              best: Math.max(record.best, score),
              total: quiz.length,
              attempts: record.attempts,
            })}
          </p>
          <Button onClick={restart} variant="secondary">
            <RotateCcw /> {t("shell.tryAgain")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-5">
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("shell.quizQuestionOf", { current: index + 1, total: quiz.length })}</span>
          <span>{t("shell.quizScoreLabel", { score })}</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
          >
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
                      "flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-left text-sm transition-all",
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
            {picked !== null && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground"
              >
                {q.explanation}
              </motion.div>
            )}
            {picked !== null && (
              <div className="mt-4 flex justify-end">
                <Button onClick={nextQ}>
                  {index + 1 >= quiz.length ? t("shell.quizFinish") : t("shell.quizNextQuestion")}
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
