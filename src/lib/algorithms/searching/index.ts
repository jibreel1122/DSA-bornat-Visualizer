import type { AlgorithmMeta } from "@/lib/engine/types";
import type { ModuleLoader } from "..";

export const metas: AlgorithmMeta[] = [
  {
    slug: "linear-search",
    title: "Linear Search",
    category: "searching",
    difficulty: "Beginner",
    tags: ["sequential", "unsorted ok", "O(n)"],
    summary: "Scans elements one by one until the target is found or the array ends — works on any array.",
    renderer: "array",
  },
  {
    slug: "binary-search",
    title: "Binary Search",
    category: "searching",
    difficulty: "Beginner",
    tags: ["divide & conquer", "sorted required", "O(log n)"],
    summary: "Repeatedly halves a sorted array, comparing the middle element to the target — O(log n) lookups.",
    renderer: "array",
  },
  {
    slug: "jump-search",
    title: "Jump Search",
    category: "searching",
    difficulty: "Beginner",
    tags: ["sorted required", "block search", "O(√n)"],
    summary: "Jumps ahead in fixed √n blocks on a sorted array, then scans the block that must contain the target.",
    renderer: "array",
  },
  {
    slug: "interpolation-search",
    title: "Interpolation Search",
    category: "searching",
    difficulty: "Intermediate",
    tags: ["sorted required", "uniform data", "O(log log n) avg"],
    summary: "Predicts the target's index by linear interpolation on value — near O(log log n) on uniformly distributed data.",
    renderer: "array",
  },
  {
    slug: "exponential-search",
    title: "Exponential Search",
    category: "searching",
    difficulty: "Intermediate",
    tags: ["sorted required", "unbounded", "O(log n)"],
    summary: "Doubles a range bound until it passes the target, then binary-searches that range — great for unbounded lists.",
    renderer: "array",
  },
  {
    slug: "ternary-search",
    title: "Ternary Search",
    category: "searching",
    difficulty: "Intermediate",
    tags: ["sorted required", "divide by 3", "O(log₃ n)"],
    summary: "Divides a sorted range into three parts with two midpoints, discarding two-thirds each step.",
    renderer: "array",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "linear-search": () => import("./linear-search"),
  "binary-search": () => import("./binary-search"),
  "jump-search": () => import("./jump-search"),
  "interpolation-search": () => import("./interpolation-search"),
  "exponential-search": () => import("./exponential-search"),
  "ternary-search": () => import("./ternary-search"),
};
