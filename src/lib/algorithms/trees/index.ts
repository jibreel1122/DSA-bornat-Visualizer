import type { AlgorithmMeta } from "@/lib/engine/types";
import type { ModuleLoader } from "..";

export const metas: AlgorithmMeta[] = [
  {
    slug: "binary-tree-traversals",
    title: "Binary Tree Traversals",
    category: "trees",
    difficulty: "Beginner",
    tags: ["tree", "DFS", "BFS", "traversal"],
    summary: "Visits every node in in-order, pre-order, post-order, or level-order — the four canonical traversals.",
    renderer: "tree",
  },
  {
    slug: "binary-search-tree",
    title: "Binary Search Tree",
    category: "trees",
    difficulty: "Intermediate",
    tags: ["tree", "ordered", "insert/search/delete"],
    summary: "An ordered tree where left < node < right, giving O(h) search, insertion, and deletion.",
    renderer: "tree",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "binary-tree-traversals": () => import("./binary-tree-traversals"),
  "binary-search-tree": () => import("./binary-search-tree"),
};
