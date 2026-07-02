"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Lightbulb, RotateCcw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrayView } from "@/components/visualizer/renderers/array-view";
import { ALGORITHMS, loadAlgorithm } from "@/lib/algorithms";
import type { AlgorithmModule, ArrayFrame, Step } from "@/lib/engine/types";
import { createRNG, randomSeed } from "@/lib/engine/random";
import { cn } from "@/lib/utils";

const ROUNDS = 5;

interface Challenge {
  frame: ArrayFrame;
  hint: string;
  options: number[][];
  answer: number;
  source: string;
}

function arraysEqual(a: number[], b: number[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Build one challenge from a random array-renderer algorithm. */
async function buildChallenge(): Promise<Challenge | null> {
  const rng = createRNG(randomSeed());
  const arrayMetas = ALGORITHMS.filter((m) => m.renderer === "array");
  if (arrayMetas.length === 0) return null;
  const meta = rng.pick(arrayMetas);
  const mod = (await loadAlgorithm(meta.slug)) as AlgorithmModule<ArrayFrame> | null;
  if (!mod) return null;

  const input = mod.defaultInput(2, rng);
  const steps = mod.generate(input) as Step<ArrayFrame>[];
  // find an index where the values array changes on the next step
  const changeIndices: number[] = [];
  for (let i = 0; i < steps.length - 1; i++) {
    if (!arraysEqual(steps[i].frame.values, steps[i + 1].frame.values)) changeIndices.push(i);
  }
  if (changeIndices.length === 0) return null;
  const i = rng.pick(changeIndices);
  const current = steps[i].frame;
  const nextValues = steps[i + 1].frame.values;

  // distractors: swap a random adjacent pair, reverse a pair, keep unchanged
  const mutate = (fn: (a: number[]) => number[]) => fn([...nextValues]);
  const swapAdj = () => {
    const a = [...nextValues];
    const j = rng.int(0, a.length - 2);
    [a[j], a[j + 1]] = [a[j + 1], a[j]];
    return a;
  };
  const swapRandom = () => {
    const a = [...nextValues];
    const j = rng.int(0, a.length - 1);
    let k = rng.int(0, a.length - 1);
    if (k === j) k = (k + 1) % a.length;
    [a[j], a[k]] = [a[k], a[j]];
    return a;
  };

  const candidates = [nextValues, swapAdj(), swapRandom(), mutate((a) => a)];
  // dedupe distractors against the answer where possible
  const seen = new Set<string>();
  const options: number[][] = [];
  for (const c of candidates) {
    const key = c.join(",");
    if (seen.has(key) && c !== nextValues) continue;
    seen.add(key);
    options.push(c);
  }
  while (options.length < 4) options.push(swapRandom());

  const shuffled = rng.shuffle(options.slice(0, 4));
  const answer = shuffled.findIndex((o) => arraysEqual(o, nextValues));

  return {
    frame: current,
    hint: steps[i].description,
    options: shuffled,
    answer: answer < 0 ? 0 : answer,
    source: meta.title,
  };
}

export function PredictStep({ onRecord }: { onRecord: (categoryId: string, correct: boolean) => void }) {
  const [phase, setPhase] = React.useState<"idle" | "loading" | "playing" | "done">("idle");
  const [challenge, setChallenge] = React.useState<Challenge | null>(null);
  const [round, setRound] = React.useState(0);
  const [score, setScore] = React.useState(0);
  const [picked, setPicked] = React.useState<number | null>(null);
  const [showHint, setShowHint] = React.useState(false);

  const load = async () => {
    setPhase("loading");
    let c: Challenge | null = null;
    for (let tries = 0; tries < 8 && !c; tries++) c = await buildChallenge();
    if (!c) {
      setPhase("idle");
      return;
    }
    setChallenge(c);
    setPicked(null);
    setShowHint(false);
    setPhase("playing");
  };

  const startSession = () => {
    setRound(0);
    setScore(0);
    void load();
  };

  const pick = (i: number) => {
    if (picked !== null || !challenge) return;
    setPicked(i);
    const correct = i === challenge.answer;
    if (correct) setScore((s) => s + 1);
    onRecord("sorting", correct);
  };

  const next = () => {
    if (round + 1 >= ROUNDS) {
      setPhase("done");
    } else {
      setRound((r) => r + 1);
      void load();
    }
  };

  if (phase === "idle" || phase === "loading") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <Target className="size-10 text-primary" />
          <h3 className="text-lg font-semibold">Predict the Step</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            You&apos;ll see an array mid-algorithm. Predict which state comes <em>next</em>. {ROUNDS} rounds
            per session.
          </p>
          <Button onClick={startSession} disabled={phase === "loading"}>
            {phase === "loading" ? "Loading…" : "Start"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === "done") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
            <Target className="size-12 text-primary" />
          </motion.div>
          <div className="text-3xl font-bold">{score} / {ROUNDS}</div>
          <p className="text-sm text-muted-foreground">
            {score >= 4 ? "Sharp eye!" : score >= 2 ? "Getting there." : "Watch a few visualizations and retry."}
          </p>
          <Button onClick={startSession} variant="secondary">
            <RotateCcw /> Play again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!challenge) return null;

  return (
    <Card>
      <CardContent className="py-5">
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>Round {round + 1} of {ROUNDS}</span>
          <span className="font-medium text-primary">{challenge.source}</span>
          <span>Score: {score}</span>
        </div>

        <div className="mb-4 h-48 overflow-hidden rounded-xl border border-border bg-background/40">
          <ArrayView frame={challenge.frame} />
        </div>

        <p className="mb-3 text-center text-sm font-medium">Which array state comes next?</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {challenge.options.map((opt, i) => {
            const isAnswer = i === challenge.answer;
            const isPicked = i === picked;
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={picked !== null}
                className={cn(
                  "flex flex-wrap gap-1 rounded-xl border border-border p-2.5 font-mono text-xs transition-all",
                  picked === null && "cursor-pointer hover:border-primary/50 hover:bg-accent",
                  picked !== null && isAnswer && "border-emerald-500/60 bg-emerald-500/10",
                  picked !== null && isPicked && !isAnswer && "border-rose-500/60 bg-rose-500/10",
                  picked !== null && !isPicked && !isAnswer && "opacity-50",
                )}
              >
                {opt.map((v, j) => (
                  <span key={j} className="rounded bg-muted px-1.5 py-0.5 tabular-nums">
                    {v}
                  </span>
                ))}
              </button>
            );
          })}
        </div>

        {picked === null && (
          <div className="mt-4">
            {showHint ? (
              <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">{challenge.hint}</p>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setShowHint(true)}>
                <Lightbulb /> Show hint
              </Button>
            )}
          </div>
        )}

        {picked !== null && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{challenge.hint}</span>
            <Button onClick={next}>{round + 1 >= ROUNDS ? "Finish" : "Next"}</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
