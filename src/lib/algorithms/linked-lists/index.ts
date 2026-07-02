import type { AlgorithmMeta } from "@/lib/engine/types";
import type { ModuleLoader } from "..";

export const metas: AlgorithmMeta[] = [
  {
    slug: "reverse-linked-list",
    title: "Reverse a Linked List",
    category: "linked-lists",
    difficulty: "Beginner",
    tags: ["linked list", "pointers", "in-place", "O(n)"],
    summary: "Reverses a singly linked list in place by flipping each node's next pointer using three pointers.",
    renderer: "list",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "reverse-linked-list": () => import("./reverse-linked-list"),
};
