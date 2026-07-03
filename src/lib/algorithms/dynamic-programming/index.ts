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
  {
    slug: "longest-common-subsequence",
    title: "Longest Common Subsequence",
    category: "dynamic-programming",
    difficulty: "Intermediate",
    tags: ["dynamic programming", "strings", "tabulation", "subsequence"],
    summary: "Finds the longest subsequence common to two strings by filling a 2-D DP table, then tracing it back.",
    renderer: "table",
  },
  {
    slug: "edit-distance",
    title: "Edit Distance (Levenshtein)",
    category: "dynamic-programming",
    difficulty: "Intermediate",
    tags: ["dynamic programming", "strings", "levenshtein", "tabulation"],
    summary: "Computes the minimum number of insertions, deletions, and substitutions to transform one string into another.",
    renderer: "table",
  },
  {
    slug: "coin-change",
    title: "Coin Change (Minimum Coins)",
    category: "dynamic-programming",
    difficulty: "Intermediate",
    tags: ["dynamic programming", "unbounded knapsack", "optimization", "tabulation"],
    summary: "Finds the fewest coins that sum to a target amount, allowing each denomination to be reused any number of times.",
    renderer: "table",
  },
  {
    slug: "maximum-subarray",
    title: "Maximum Subarray (Kadane's)",
    category: "dynamic-programming",
    difficulty: "Beginner",
    tags: ["dynamic programming", "kadane", "array", "greedy dp"],
    summary: "Finds the contiguous subarray with the largest sum in a single linear pass using Kadane's algorithm.",
    renderer: "array",
  },
  {
    slug: "longest-increasing-subsequence",
    title: "Longest Increasing Subsequence",
    category: "dynamic-programming",
    difficulty: "Intermediate",
    tags: ["dynamic programming", "subsequence", "array", "LIS"],
    summary: "Finds the longest strictly increasing subsequence via an O(n²) DP, tracking predecessors to rebuild the chain.",
    renderer: "array",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "fibonacci-dp": () => import("./fibonacci-dp"),
  "knapsack-01": () => import("./knapsack-01"),
  "longest-common-subsequence": () => import("./longest-common-subsequence"),
  "edit-distance": () => import("./edit-distance"),
  "coin-change": () => import("./coin-change"),
  "maximum-subarray": () => import("./maximum-subarray"),
  "longest-increasing-subsequence": () => import("./longest-increasing-subsequence"),
};
