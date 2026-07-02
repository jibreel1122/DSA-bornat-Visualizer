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
];

export const loaders: Record<string, ModuleLoader> = {
  "hash-chaining": () => import("./hash-chaining"),
};
