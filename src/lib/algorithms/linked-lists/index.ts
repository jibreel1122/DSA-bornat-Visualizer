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
  {
    slug: "doubly-linked-list",
    title: "Doubly Linked List",
    category: "linked-lists",
    difficulty: "Beginner",
    tags: ["linked list", "doubly linked", "pointers", "data structure"],
    summary: "Demonstrates a doubly linked list's core operations: insert at head/tail and delete, with two-way prev/next pointers.",
    renderer: "list",
  },
  {
    slug: "merge-two-sorted-lists",
    title: "Merge Two Sorted Lists",
    category: "linked-lists",
    difficulty: "Beginner",
    tags: ["linked list", "two pointers", "merge", "sorted"],
    summary: "Merges two sorted linked lists into one sorted list by repeatedly splicing the smaller head node.",
    renderer: "list",
  },
  {
    slug: "floyd-cycle-detection",
    title: "Floyd's Cycle Detection",
    category: "linked-lists",
    difficulty: "Intermediate",
    tags: ["linked list", "two pointers", "cycle", "tortoise & hare"],
    summary: "Detects a loop in a linked list with two pointers moving at different speeds, then finds the cycle's entry node.",
    renderer: "list",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "reverse-linked-list": () => import("./reverse-linked-list"),
  "doubly-linked-list": () => import("./doubly-linked-list"),
  "merge-two-sorted-lists": () => import("./merge-two-sorted-lists"),
  "floyd-cycle-detection": () => import("./floyd-cycle-detection"),
};
