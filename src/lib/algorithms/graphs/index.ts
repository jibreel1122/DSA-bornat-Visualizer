import type { AlgorithmMeta } from "@/lib/engine/types";
import type { ModuleLoader } from "..";

export const metas: AlgorithmMeta[] = [
  {
    slug: "bfs",
    title: "Breadth-First Search (BFS)",
    category: "graphs",
    difficulty: "Beginner",
    tags: ["traversal", "queue", "shortest path (unweighted)", "level order"],
    summary: "Explores a graph level by level from a source using a queue — the basis of unweighted shortest paths.",
    renderer: "graph",
  },
  {
    slug: "dfs",
    title: "Depth-First Search (DFS)",
    category: "graphs",
    difficulty: "Beginner",
    tags: ["traversal", "stack", "recursion", "backtracking"],
    summary: "Explores each branch as deeply as possible before backtracking — the basis of many graph algorithms.",
    renderer: "graph",
  },
  {
    slug: "dijkstra",
    title: "Dijkstra's Shortest Path",
    category: "graphs",
    difficulty: "Advanced",
    tags: ["shortest path", "greedy", "priority queue", "weighted"],
    summary: "Finds shortest paths from a source in a non-negative weighted graph by always settling the closest frontier node.",
    renderer: "graph",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  bfs: () => import("./bfs"),
  dfs: () => import("./dfs"),
  dijkstra: () => import("./dijkstra"),
};
