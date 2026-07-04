import type { AlgorithmMeta } from "@/lib/engine/types";
import type { ModuleLoader } from "..";

export const metas: AlgorithmMeta[] = [
  {
    slug: "hash-chaining",
    title: "Hash Table — Separate Chaining",
    category: "hashing",
    difficulty: "Intermediate",
    tags: ["hash table", "chaining", "collision resolution", "O(1) average"],
    summary: "Resolves hash collisions by storing colliding keys in a per-bucket linked list.",
    renderer: "hash",
  },
  {
    slug: "linear-probing",
    title: "Hash Table — Linear Probing",
    category: "hashing",
    difficulty: "Intermediate",
    tags: ["hash table", "open addressing", "linear probing", "tombstones"],
    summary: "Resolves collisions by scanning forward one slot at a time until a free cell is found — simple and cache-friendly, but prone to clustering.",
    renderer: "hash",
  },
  {
    slug: "quadratic-probing",
    title: "Hash Table — Quadratic Probing",
    category: "hashing",
    difficulty: "Intermediate",
    tags: ["hash table", "open addressing", "quadratic probing", "clustering"],
    summary: "Resolves collisions with quadratically growing jumps (+1, +4, +9, …), breaking up the contiguous runs that plague linear probing.",
    renderer: "hash",
  },
  {
    slug: "double-hashing",
    title: "Hash Table — Double Hashing",
    category: "hashing",
    difficulty: "Advanced",
    tags: ["hash table", "open addressing", "double hashing", "collision resolution"],
    summary: "Uses a second hash function as the step size, so different keys sharing a home slot follow completely different probe paths — no clustering.",
    renderer: "hash",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "hash-chaining": () => import("./hash-chaining"),
  "linear-probing": () => import("./linear-probing"),
  "quadratic-probing": () => import("./quadratic-probing"),
  "double-hashing": () => import("./double-hashing"),
};
