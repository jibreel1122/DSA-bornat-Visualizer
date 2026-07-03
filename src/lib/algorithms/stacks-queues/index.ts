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
  {
    slug: "balanced-parentheses",
    title: "Balanced Parentheses",
    category: "stacks-queues",
    difficulty: "Beginner",
    tags: ["stack", "matching", "validation", "brackets"],
    summary: "Uses a stack to verify that every opening bracket has a correctly ordered matching closing bracket.",
    renderer: "callstack",
  },
  {
    slug: "min-stack",
    title: "Min-Stack (O(1) minimum)",
    category: "stacks-queues",
    difficulty: "Intermediate",
    tags: ["stack", "design", "O(1)", "auxiliary"],
    summary: "A stack that also returns its minimum in O(1) by caching a running minimum with every pushed value.",
    renderer: "callstack",
  },
  {
    slug: "circular-queue",
    title: "Circular Queue (Ring Buffer)",
    category: "stacks-queues",
    difficulty: "Intermediate",
    tags: ["queue", "ring buffer", "modulo", "fixed capacity"],
    summary: "A fixed-size queue whose front and rear indices wrap around with modulo arithmetic, reusing freed slots.",
    renderer: "array",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "stack-operations": () => import("./stack-operations"),
  "queue-operations": () => import("./queue-operations"),
  "balanced-parentheses": () => import("./balanced-parentheses"),
  "min-stack": () => import("./min-stack"),
  "circular-queue": () => import("./circular-queue"),
};
