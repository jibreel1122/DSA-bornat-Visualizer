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
];

export const loaders: Record<string, ModuleLoader> = {
  bfs: () => import("./bfs"),
};
