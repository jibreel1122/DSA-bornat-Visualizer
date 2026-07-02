"use client";

import * as React from "react";
import { Brain, Flame, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/catalog/page-header";
import { CATEGORIES } from "@/lib/categories";
import { useLocalStorage } from "@/lib/hooks";
import { QuizSprint } from "./quiz-sprint";
import { PredictStep } from "./predict-step";

export interface PracticeStats {
  /** per category id: attempted + correct counts */
  byCategory: Record<string, { attempted: number; correct: number }>;
  streak: number;
}

const EMPTY_STATS: PracticeStats = { byCategory: {}, streak: 0 };

export function masteryLabel(correct: number): { label: string; color: string } {
  if (correct >= 50) return { label: "Master", color: "text-fuchsia-500" };
  if (correct >= 25) return { label: "Skilled", color: "text-emerald-500" };
  if (correct >= 10) return { label: "Learner", color: "text-sky-500" };
  return { label: "Novice", color: "text-muted-foreground" };
}

export function PracticeClient() {
  const [stats, setStats] = useLocalStorage<PracticeStats>("bdsv:practice", EMPTY_STATS);

  const record = React.useCallback(
    (categoryId: string, correct: boolean) => {
      setStats((s) => {
        const cur = s.byCategory[categoryId] ?? { attempted: 0, correct: 0 };
        return {
          byCategory: {
            ...s.byCategory,
            [categoryId]: {
              attempted: cur.attempted + 1,
              correct: cur.correct + (correct ? 1 : 0),
            },
          },
          streak: correct ? s.streak + 1 : 0,
        };
      });
    },
    [setStats],
  );

  const totalCorrect = Object.values(stats.byCategory).reduce((s, c) => s + c.correct, 0);
  const totalAttempted = Object.values(stats.byCategory).reduce((s, c) => s + c.attempted, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        icon={Target}
        title="Practice mode"
        description="Sharpen your understanding with quiz sprints and step-prediction challenges. Your accuracy builds toward mastery in each category."
      />

      {/* stats header */}
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="size-4" /> Overall accuracy
          </div>
          <div className="mt-1 text-2xl font-bold">
            {totalAttempted === 0 ? "—" : `${Math.round((totalCorrect / totalAttempted) * 100)}%`}
          </div>
          <div className="text-xs text-muted-foreground">
            {totalCorrect} correct of {totalAttempted}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Flame className="size-4 text-amber-500" /> Current streak
          </div>
          <div className="mt-1 text-2xl font-bold">{stats.streak}</div>
          <div className="text-xs text-muted-foreground">consecutive correct</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="size-4" /> Categories mastered
          </div>
          <div className="mt-1 text-2xl font-bold">
            {Object.values(stats.byCategory).filter((c) => c.correct >= 50).length}
            <span className="text-base font-normal text-muted-foreground"> / {CATEGORIES.length}</span>
          </div>
          <div className="text-xs text-muted-foreground">50+ correct = Master</div>
        </Card>
      </div>

      <Tabs defaultValue="quiz">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="quiz">
            <Brain /> Quiz Sprint
          </TabsTrigger>
          <TabsTrigger value="predict">
            <Target /> Predict the Step
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quiz" className="mt-6">
          <QuizSprint onRecord={record} />
        </TabsContent>
        <TabsContent value="predict" className="mt-6">
          <PredictStep onRecord={record} />
        </TabsContent>
      </Tabs>

      {/* mastery breakdown */}
      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Mastery by category</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const cur = stats.byCategory[c.id] ?? { attempted: 0, correct: 0 };
            const mastery = masteryLabel(cur.correct);
            const pct = Math.min(100, (cur.correct / 50) * 100);
            return (
              <Card key={c.id} className="p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <c.icon className="size-4 text-primary" /> {c.short}
                  </span>
                  <span className={`text-xs font-semibold ${mastery.color}`}>{mastery.label}</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full gradient-bg transition-all" style={{ width: `${pct}%` }} />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
