import type { AlgorithmMeta } from "@/lib/engine/types";
import type { ModuleLoader } from "..";

export const metas: AlgorithmMeta[] = [
  {
    slug: "stack-operations",
    title: "Stack (LIFO)",
    category: "stacks-queues",
    difficulty: "Beginner",
    tags: ["stack", "LIFO", "O(1) operations"],
    summary: "A last-in-first-out structure supporting push, pop, and peek — each in O(1).",
    renderer: "callstack",
  },
  {
    slug: "queue-operations",
    title: "Queue (FIFO)",
    category: "stacks-queues",
    difficulty: "Beginner",
    tags: ["queue", "FIFO", "O(1) operations"],
    summary: "A first-in-first-out structure supporting enqueue at the rear and dequeue from the front in O(1).",
    renderer: "list",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "stack-operations": () => import("./stack-operations"),
  "queue-operations": () => import("./queue-operations"),
};
