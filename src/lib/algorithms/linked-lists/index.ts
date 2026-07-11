import type { AlgorithmMeta } from "@/lib/engine/types";
import type { ModuleLoader } from "..";

export const metas: AlgorithmMeta[] = [
  {
    slug: "reverse-linked-list",
    title: "Reverse a Linked List",
    titleAr: "عكس قائمة مترابطة",
    category: "linked-lists",
    difficulty: "Beginner",
    tags: ["linked list", "pointers", "in-place", "O(n)"],
    tagsAr: ["قائمة مترابطة", "مؤشرات", "في المكان", "O(n)"],
    summary: "Reverses a singly linked list in place by flipping each node's next pointer using three pointers.",
    summaryAr: "تعكس قائمة مترابطة أحادية الاتجاه في المكان بقلب مؤشر next لكل عقدة باستخدام ثلاثة مؤشرات.",
    renderer: "list",
  },
  {
    slug: "doubly-linked-list",
    title: "Doubly Linked List",
    titleAr: "القائمة المترابطة المزدوجة",
    category: "linked-lists",
    difficulty: "Beginner",
    tags: ["linked list", "doubly linked", "pointers", "data structure"],
    tagsAr: ["قائمة مترابطة", "مزدوجة الارتباط", "مؤشرات", "هيكل بيانات"],
    summary: "Demonstrates a doubly linked list's core operations: insert at head/tail and delete, with two-way prev/next pointers.",
    summaryAr: "توضّح العمليات الأساسية للقائمة المترابطة المزدوجة: الإدراج عند الرأس/الذيل والحذف، باستخدام مؤشرَي prev وnext ثنائيَي الاتجاه.",
    renderer: "list",
  },
  {
    slug: "merge-two-sorted-lists",
    title: "Merge Two Sorted Lists",
    titleAr: "دمج قائمتين مرتبتين",
    category: "linked-lists",
    difficulty: "Beginner",
    tags: ["linked list", "two pointers", "merge", "sorted"],
    tagsAr: ["قائمة مترابطة", "مؤشران", "دمج", "مرتبة"],
    summary: "Merges two sorted linked lists into one sorted list by repeatedly splicing the smaller head node.",
    summaryAr: "تدمج قائمتين مترابطتين مرتبتين في قائمة واحدة مرتبة بوصل العقدة الأصغر من الرأسين تكرارًا.",
    renderer: "list",
  },
  {
    slug: "floyd-cycle-detection",
    title: "Floyd's Cycle Detection",
    titleAr: "كشف الدورات لفلويد (Floyd)",
    category: "linked-lists",
    difficulty: "Intermediate",
    tags: ["linked list", "two pointers", "cycle", "tortoise & hare"],
    tagsAr: ["قائمة مترابطة", "مؤشران", "دورة", "السلحفاة والأرنب"],
    summary: "Detects a loop in a linked list with two pointers moving at different speeds, then finds the cycle's entry node.",
    summaryAr: "تكشف عن حلقة في قائمة مترابطة باستخدام مؤشرين يتحركان بسرعتين مختلفتين، ثم تجد عقدة دخول الدورة.",
    renderer: "list",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "reverse-linked-list": () => import("./reverse-linked-list"),
  "doubly-linked-list": () => import("./doubly-linked-list"),
  "merge-two-sorted-lists": () => import("./merge-two-sorted-lists"),
  "floyd-cycle-detection": () => import("./floyd-cycle-detection"),
};
