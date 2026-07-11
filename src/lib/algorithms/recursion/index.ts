import type { AlgorithmMeta } from "@/lib/engine/types";
import type { ModuleLoader } from "..";

export const metas: AlgorithmMeta[] = [
  {
    slug: "factorial",
    title: "Factorial (Recursion)",
    titleAr: "المضروب (عوديًا)",
    category: "recursion",
    difficulty: "Beginner",
    tags: ["recursion", "base case", "call stack"],
    tagsAr: ["العودية", "الحالة الأساسية", "مكدس الاستدعاءات"],
    summary: "Computes n! by recursion, showing the call stack winding up to the base case and unwinding with results.",
    summaryAr: "يحسب n! بالعودية، ويعرض مكدس الاستدعاءات وهو يتصاعد حتى الحالة الأساسية ثم يتراجع بالنتائج.",
    renderer: "callstack",
  },
  {
    slug: "tower-of-hanoi",
    title: "Tower of Hanoi",
    titleAr: "أبراج هانوي",
    category: "recursion",
    difficulty: "Intermediate",
    tags: ["recursion", "divide & conquer", "exponential"],
    tagsAr: ["العودية", "فرّق تسد", "أسي"],
    summary: "Moves a stack of disks between pegs one at a time, never placing a larger disk on a smaller one.",
    summaryAr: "ينقل كومة من الأقراص بين أقطاب، قرصًا واحدًا في كل مرة، دون وضع قرص أكبر فوق قرص أصغر منه.",
    renderer: "callstack",
  },
  {
    slug: "fibonacci-recursive",
    title: "Fibonacci (Naive Recursion)",
    titleAr: "فيبوناتشي (عودية ساذجة)",
    category: "recursion",
    difficulty: "Beginner",
    tags: ["recursion", "call stack", "exponential", "overlapping subproblems"],
    tagsAr: ["العودية", "مكدس الاستدعاءات", "أسي", "مسائل فرعية متداخلة"],
    summary: "Computes fib(n) = fib(n−1) + fib(n−2) directly by recursion — simple, but exponential because subproblems are solved again and again.",
    summaryAr: "يحسب fib(n) = fib(n−1) + fib(n−2) مباشرة بالعودية — بسيط، لكنه أسي لأن المسائل الفرعية تُحل مرارًا وتكرارًا.",
    renderer: "callstack",
  },
  {
    slug: "power-set",
    title: "Power Set (Subsets by Recursion)",
    titleAr: "مجموعة القوى (المجموعات الجزئية عوديًا)",
    category: "recursion",
    difficulty: "Intermediate",
    tags: ["recursion", "backtracking", "subsets", "combinatorics", "O(2^n)"],
    tagsAr: ["العودية", "التراجع", "مجموعات جزئية", "توافيقيات", "O(2^n)"],
    summary: "Generates every subset of a set by recursively branching into 'include this element' and 'exclude it' at each position.",
    summaryAr: "يولّد كل المجموعات الجزئية لمجموعة عبر التفرع عوديًا بين 'إدراج هذا العنصر' و'استبعاده' عند كل موضع.",
    renderer: "callstack",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  factorial: () => import("./factorial"),
  "tower-of-hanoi": () => import("./tower-of-hanoi"),
  "fibonacci-recursive": () => import("./fibonacci-recursive"),
  "power-set": () => import("./power-set"),
};
