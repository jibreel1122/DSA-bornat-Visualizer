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
  {
    slug: "level-order-traversal",
    title: "Level-Order Traversal (BFS)",
    category: "trees",
    difficulty: "Beginner",
    tags: ["tree", "bfs", "queue", "traversal"],
    summary: "Visits a binary tree breadth-first, level by level, using a FIFO queue to process nodes in order.",
    renderer: "tree",
  },
  {
    slug: "min-heap",
    title: "Min-Heap (Binary Heap)",
    category: "trees",
    difficulty: "Intermediate",
    tags: ["heap", "priority queue", "complete tree", "sift"],
    summary: "Builds a binary min-heap via sift-up insertions and removes the minimum with sift-down, all in an array.",
    renderer: "tree",
  },
  {
    slug: "trie",
    title: "Trie (Prefix Tree)",
    category: "trees",
    difficulty: "Intermediate",
    tags: ["trie", "prefix tree", "strings", "dictionary"],
    summary: "Stores a set of strings in a prefix tree, sharing common prefixes; supports fast insert and lookup by walking edges.",
    renderer: "tree",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "binary-tree-traversals": () => import("./binary-tree-traversals"),
  "binary-search-tree": () => import("./binary-search-tree"),
  "level-order-traversal": () => import("./level-order-traversal"),
  "min-heap": () => import("./min-heap"),
  "trie": () => import("./trie"),
};
