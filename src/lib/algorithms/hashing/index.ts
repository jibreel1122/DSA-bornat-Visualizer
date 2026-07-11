import type { AlgorithmMeta } from "@/lib/engine/types";
import type { ModuleLoader } from "..";

export const metas: AlgorithmMeta[] = [
  {
    slug: "hash-chaining",
    title: "Hash Table — Separate Chaining",
    titleAr: "جدول التجزئة — السلاسل المنفصلة",
    category: "hashing",
    difficulty: "Intermediate",
    tags: ["hash table", "chaining", "collision resolution", "O(1) average"],
    tagsAr: ["جدول تجزئة", "السلاسل المنفصلة", "حل التصادمات", "O(1) في المتوسط"],
    summary: "Resolves hash collisions by storing colliding keys in a per-bucket linked list.",
    summaryAr: "يحل تصادمات التجزئة بتخزين المفاتيح المتصادمة في قائمة مترابطة خاصة بكل دلو.",
    renderer: "hash",
  },
  {
    slug: "linear-probing",
    title: "Hash Table — Linear Probing",
    titleAr: "جدول التجزئة — السبر الخطي",
    category: "hashing",
    difficulty: "Intermediate",
    tags: ["hash table", "open addressing", "linear probing", "tombstones"],
    tagsAr: ["جدول تجزئة", "عنونة مفتوحة", "سبر خطي", "شواهد قبور"],
    summary: "Resolves collisions by scanning forward one slot at a time until a free cell is found — simple and cache-friendly, but prone to clustering.",
    summaryAr: "يحل التصادمات بالمسح إلى الأمام خانة واحدة في كل مرة حتى يُعثر على خانة حرة — أسلوب بسيط وودود مع ذاكرة التخزين المؤقت، لكنه عرضة للتكتل.",
    renderer: "hash",
  },
  {
    slug: "quadratic-probing",
    title: "Hash Table — Quadratic Probing",
    titleAr: "جدول التجزئة — السبر التربيعي",
    category: "hashing",
    difficulty: "Intermediate",
    tags: ["hash table", "open addressing", "quadratic probing", "clustering"],
    tagsAr: ["جدول تجزئة", "عنونة مفتوحة", "سبر تربيعي", "تكتل"],
    summary: "Resolves collisions with quadratically growing jumps (+1, +4, +9, …), breaking up the contiguous runs that plague linear probing.",
    summaryAr: "يحل التصادمات بقفزات متنامية تربيعيًا (+1، +4، +9، …)، ما يكسر السلاسل المتتالية التي يعاني منها السبر الخطي.",
    renderer: "hash",
  },
  {
    slug: "double-hashing",
    title: "Hash Table — Double Hashing",
    titleAr: "جدول التجزئة — التجزئة المزدوجة",
    category: "hashing",
    difficulty: "Advanced",
    tags: ["hash table", "open addressing", "double hashing", "collision resolution"],
    tagsAr: ["جدول تجزئة", "عنونة مفتوحة", "تجزئة مزدوجة", "حل التصادمات"],
    summary: "Uses a second hash function as the step size, so different keys sharing a home slot follow completely different probe paths — no clustering.",
    summaryAr: "يستخدم دالة تجزئة ثانية كحجم خطوة، بحيث تتبع المفاتيح المختلفة التي تتشارك خانة أصلية مسارات سبر مختلفة تمامًا — بلا تكتل.",
    renderer: "hash",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "hash-chaining": () => import("./hash-chaining"),
  "linear-probing": () => import("./linear-probing"),
  "quadratic-probing": () => import("./quadratic-probing"),
  "double-hashing": () => import("./double-hashing"),
};
