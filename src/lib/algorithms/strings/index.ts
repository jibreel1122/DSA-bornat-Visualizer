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
  {
    slug: "rabin-karp",
    title: "Rabin-Karp String Matching",
    category: "strings",
    difficulty: "Intermediate",
    tags: ["string matching", "rolling hash", "hashing", "average O(n+m)"],
    summary: "Hashes each text window and only compares characters when hashes collide — average O(n + m).",
    renderer: "string",
  },
  {
    slug: "z-algorithm",
    title: "Z-Algorithm",
    category: "strings",
    difficulty: "Advanced",
    tags: ["string matching", "Z-array", "prefix matching", "linear"],
    summary: "Computes for every position the longest match with the string's own prefix (Z-array) in O(n), finding all pattern occurrences.",
    renderer: "string",
  },
  {
    slug: "boyer-moore",
    title: "Boyer-Moore (Bad Character Rule)",
    category: "strings",
    difficulty: "Advanced",
    tags: ["string matching", "bad character rule", "right-to-left", "sublinear"],
    summary: "Compares the pattern right-to-left and uses the bad-character rule to skip large chunks of text — often sublinear in practice.",
    renderer: "string",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "naive-pattern-matching": () => import("./naive-pattern-matching"),
  kmp: () => import("./kmp"),
  "rabin-karp": () => import("./rabin-karp"),
  "z-algorithm": () => import("./z-algorithm"),
  "boyer-moore": () => import("./boyer-moore"),
};
