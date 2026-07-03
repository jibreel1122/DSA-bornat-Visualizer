import type { AlgorithmMeta } from "@/lib/engine/types";
import type { ModuleLoader } from "..";

export const metas: AlgorithmMeta[] = [
  {
    slug: "activity-selection",
    title: "Activity Selection",
    category: "greedy",
    difficulty: "Beginner",
    tags: ["greedy", "interval scheduling", "sorting"],
    summary: "Selects the maximum number of non-overlapping activities by always taking the one that finishes earliest.",
    renderer: "table",
  },
  {
    slug: "fractional-knapsack",
    title: "Fractional Knapsack",
    category: "greedy",
    difficulty: "Intermediate",
    tags: ["greedy", "optimization", "ratio", "knapsack"],
    summary: "Maximizes value under a weight limit when items can be split, by greedily taking the highest value/weight ratio first.",
    renderer: "table",
  },
  {
    slug: "job-sequencing",
    title: "Job Sequencing with Deadlines",
    category: "greedy",
    difficulty: "Intermediate",
    tags: ["greedy", "scheduling", "deadlines", "profit"],
    summary: "Schedules unit-time jobs to maximize profit by taking the most profitable jobs first and placing them in the latest free slot before their deadline.",
    renderer: "table",
  },
  {
    slug: "huffman-coding",
    title: "Huffman Coding",
    category: "greedy",
    difficulty: "Advanced",
    tags: ["greedy", "compression", "prefix code", "binary tree"],
    summary: "Builds an optimal prefix-free binary code by repeatedly merging the two lowest-frequency nodes into a tree.",
    renderer: "tree",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "activity-selection": () => import("./activity-selection"),
  "fractional-knapsack": () => import("./fractional-knapsack"),
  "job-sequencing": () => import("./job-sequencing"),
  "huffman-coding": () => import("./huffman-coding"),
};
