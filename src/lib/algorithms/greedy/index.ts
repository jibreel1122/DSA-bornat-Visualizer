import type { AlgorithmMeta } from "@/lib/engine/types";
import type { ModuleLoader } from "..";

export const metas: AlgorithmMeta[] = [
  {
    slug: "activity-selection",
    title: "Activity Selection",
    titleAr: "اختيار الأنشطة",
    category: "greedy",
    difficulty: "Beginner",
    tags: ["greedy", "interval scheduling", "sorting"],
    tagsAr: ["جشِع", "جدولة الفترات", "ترتيب"],
    summary: "Selects the maximum number of non-overlapping activities by always taking the one that finishes earliest.",
    summaryAr: "يختار أكبر عدد من الأنشطة غير المتداخلة بأخذ النشاط الذي ينتهي أولًا في كل مرة.",
    renderer: "table",
  },
  {
    slug: "fractional-knapsack",
    title: "Fractional Knapsack",
    titleAr: "حقيبة الظهر الكسرية",
    category: "greedy",
    difficulty: "Intermediate",
    tags: ["greedy", "optimization", "ratio", "knapsack"],
    tagsAr: ["جشِع", "تحسين", "نسبة", "حقيبة الظهر"],
    summary: "Maximizes value under a weight limit when items can be split, by greedily taking the highest value/weight ratio first.",
    summaryAr: "يعظّم القيمة ضمن حدّ وزن معيّن عندما يمكن تقسيم العناصر، بأخذ أعلى نسبة قيمة إلى وزن أولًا بأسلوب جشع.",
    renderer: "table",
  },
  {
    slug: "job-sequencing",
    title: "Job Sequencing with Deadlines",
    titleAr: "جدولة المهام بمواعيد نهائية",
    category: "greedy",
    difficulty: "Intermediate",
    tags: ["greedy", "scheduling", "deadlines", "profit"],
    tagsAr: ["جشِع", "جدولة", "مواعيد نهائية", "ربح"],
    summary: "Schedules unit-time jobs to maximize profit by taking the most profitable jobs first and placing them in the latest free slot before their deadline.",
    summaryAr: "يجدول مهامًا أحادية الوحدة الزمنية لتعظيم الربح بأخذ المهام الأعلى ربحًا أولًا ووضعها في آخر فتحة زمنية شاغرة قبل موعدها النهائي.",
    renderer: "table",
  },
  {
    slug: "huffman-coding",
    title: "Huffman Coding",
    titleAr: "ترميز هوفمان (Huffman)",
    category: "greedy",
    difficulty: "Advanced",
    tags: ["greedy", "compression", "prefix code", "binary tree"],
    tagsAr: ["جشِع", "ضغط", "شفرة بادئة", "شجرة ثنائية"],
    summary: "Builds an optimal prefix-free binary code by repeatedly merging the two lowest-frequency nodes into a tree.",
    summaryAr: "يبني شفرة ثنائية مثلى خالية من التطابق البادئ بدمج العقدتين الأقل تكرارًا معًا في شجرة بشكل متكرر.",
    renderer: "tree",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "activity-selection": () => import("./activity-selection"),
  "fractional-knapsack": () => import("./fractional-knapsack"),
  "job-sequencing": () => import("./job-sequencing"),
  "huffman-coding": () => import("./huffman-coding"),
};
