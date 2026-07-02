import type { AlgorithmMeta } from "@/lib/engine/types";
import type { ModuleLoader } from "..";

export const metas: AlgorithmMeta[] = [
  {
    slug: "bubble-sort",
    title: "Bubble Sort",
    category: "sorting",
    difficulty: "Beginner",
    tags: ["comparison sort", "stable", "in-place", "quadratic"],
    summary: "Repeatedly swaps adjacent out-of-order elements, bubbling the largest to the end each pass.",
    renderer: "array",
  },
  {
    slug: "selection-sort",
    title: "Selection Sort",
    category: "sorting",
    difficulty: "Beginner",
    tags: ["comparison sort", "in-place", "quadratic", "few swaps"],
    summary: "Repeatedly selects the smallest remaining element and moves it to the front, using at most n−1 swaps.",
    renderer: "array",
  },
  {
    slug: "insertion-sort",
    title: "Insertion Sort",
    category: "sorting",
    difficulty: "Beginner",
    tags: ["comparison sort", "stable", "in-place", "adaptive"],
    summary: "Builds a sorted prefix one element at a time, shifting larger elements right to open a slot for each key.",
    renderer: "array",
  },
  {
    slug: "merge-sort",
    title: "Merge Sort",
    category: "sorting",
    difficulty: "Intermediate",
    tags: ["divide & conquer", "stable", "O(n log n)", "not in-place"],
    summary: "Recursively splits the array in half, sorts each half, then merges them — guaranteed O(n log n).",
    renderer: "array",
  },
  {
    slug: "quick-sort",
    title: "Quick Sort",
    category: "sorting",
    difficulty: "Intermediate",
    tags: ["divide & conquer", "in-place", "unstable", "O(n log n) avg"],
    summary: "Partitions around a pivot so smaller elements go left and larger go right, then recurses on each side.",
    renderer: "array",
  },
  {
    slug: "heap-sort",
    title: "Heap Sort",
    category: "sorting",
    difficulty: "Intermediate",
    tags: ["heap", "in-place", "unstable", "O(n log n)"],
    summary: "Builds a max-heap in the array, then repeatedly swaps the root maximum to the end and re-heapifies.",
    renderer: "array",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "bubble-sort": () => import("./bubble-sort"),
  "selection-sort": () => import("./selection-sort"),
  "insertion-sort": () => import("./insertion-sort"),
  "merge-sort": () => import("./merge-sort"),
  "quick-sort": () => import("./quick-sort"),
  "heap-sort": () => import("./heap-sort"),
};
