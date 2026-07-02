import type { AlgorithmMeta } from "@/lib/engine/types";
import type { ModuleLoader } from "..";

export const metas: AlgorithmMeta[] = [
  {
    slug: "fibonacci-dp",
    title: "Fibonacci — Memoization",
    category: "dynamic-programming",
    difficulty: "Beginner",
    tags: ["dynamic programming", "memoization", "top-down", "overlapping subproblems"],
    summary: "Computes Fibonacci with top-down memoization, caching each subproblem so it's solved only once.",
    renderer: "callstack",
  },
  {
    slug: "knapsack-01",
    title: "0/1 Knapsack",
    category: "dynamic-programming",
    difficulty: "Intermediate",
    tags: ["dynamic programming", "tabulation", "optimization", "NP-hard (pseudo-poly)"],
    summary: "Maximizes value under a weight limit where each item is taken whole or not at all, via a DP table.",
    renderer: "table",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "fibonacci-dp": () => import("./fibonacci-dp"),
  "knapsack-01": () => import("./knapsack-01"),
};
