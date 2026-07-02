import type { AlgorithmMeta } from "@/lib/engine/types";
import type { ModuleLoader } from "..";

export const metas: AlgorithmMeta[] = [
  {
    slug: "naive-pattern-matching",
    title: "Naive Pattern Matching",
    category: "strings",
    difficulty: "Beginner",
    tags: ["string matching", "brute force", "O(nm)"],
    summary: "Tries the pattern at every text position, comparing character by character — simple but O(nm).",
    renderer: "string",
  },
  {
    slug: "kmp",
    title: "Knuth–Morris–Pratt (KMP)",
    category: "strings",
    difficulty: "Advanced",
    tags: ["string matching", "failure function", "O(n+m)", "linear"],
    summary: "Precomputes a failure function so mismatches skip ahead without ever re-scanning text — O(n + m).",
    renderer: "string",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "naive-pattern-matching": () => import("./naive-pattern-matching"),
  kmp: () => import("./kmp"),
};
