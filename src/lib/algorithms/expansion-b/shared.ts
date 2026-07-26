import type {
  AlgorithmContent,
  AlgorithmMeta,
  AlgorithmModule,
  CategoryId,
  Language,
  Level,
  RNG,
} from "@/lib/engine/types";

export type NumberInput = { values: number[] };

export interface ModuleDefinition<F, I> {
  slug: string;
  title: string;
  titleAr: string;
  category: CategoryId;
  difficulty: AlgorithmMeta["difficulty"];
  tags: string[];
  tagsAr: string[];
  summary: string;
  summaryAr: string;
  renderer: AlgorithmMeta["renderer"];
  pseudocode: string[];
  pseudocodeAr: string[];
  overview: string;
  overviewAr: string;
  complexity: AlgorithmContent["complexity"];
  applications: string[];
  applicationsAr: string[];
  inputFields: AlgorithmModule<F, I>["inputFields"];
  defaultInput: (level: Level, rng: RNG) => I;
  parseInput: (fields: Record<string, string>) => I;
  serializeInput: (input: I) => Record<string, string>;
  generate: (input: I) => AlgorithmModule<F, I>["generate"] extends (input: I) => infer R ? R : never;
}

const languagePrefixes: Record<Language, string> = {
  pseudocode: "",
  c: "/* C */\n",
  cpp: "// C++\n",
  java: "// Java\n",
  python: "# Python\n",
  javascript: "// JavaScript\n",
  typescript: "// TypeScript\n",
  csharp: "// C#\n",
  go: "// Go\n",
  rust: "// Rust\n",
  kotlin: "// Kotlin\n",
  swift: "// Swift\n",
};

function codeSamples(title: string, pseudocode: string[]): Record<Language, string> {
  const body = pseudocode.join("\n");
  return Object.fromEntries(
    Object.entries(languagePrefixes).map(([language, prefix]) => [
      language,
      `${prefix}${title}\n${body}`,
    ]),
  ) as Record<Language, string>;
}

function content(
  definition: Pick<
    ModuleDefinition<unknown, unknown>,
    "title" | "overview" | "complexity" | "applications" | "pseudocode"
  >,
): AlgorithmContent {
  return {
    overview: definition.overview,
    howItWorks: definition.pseudocode.slice(1),
    complexity: definition.complexity,
    applications: definition.applications,
    advantages: [
      `${definition.title} exposes its structural decisions explicitly.`,
      "Every mutation is represented by an immutable, reversible frame.",
      "The trace highlights the active nodes, slots, pointers, or comparisons.",
    ],
    disadvantages: [
      "The structure has workload-specific trade-offs and is not universally optimal.",
      "Incorrect boundary, pointer, or balancing logic can silently violate its invariant.",
    ],
    commonMistakes: [
      "Skipping the intermediate state before a pointer, probe, split, swap, or rotation.",
      "Updating values without updating the structure's invariant.",
      "Ignoring empty input, duplicate keys, overflow, or unsuccessful lookup.",
    ],
    interviewQuestions: [
      `State the invariant maintained by ${definition.title}.`,
      "Explain the worst-case time and space complexity.",
      "Walk through one mutation and justify every intermediate state.",
    ],
    summary: definition.overview,
    quiz: [
      {
        question: `What must remain true after each ${definition.title} operation?`,
        options: ["Its defining invariant", "Input order only", "Every node is a leaf", "No memory is used"],
        answer: 0,
        explanation: "Correct operations preserve the defining structural invariant.",
      },
    ],
  };
}

function contentAr(
  definition: Pick<
    ModuleDefinition<unknown, unknown>,
    "titleAr" | "overviewAr" | "complexity" | "applicationsAr" | "pseudocodeAr"
  >,
): AlgorithmContent {
  return {
    overview: definition.overviewAr,
    howItWorks: definition.pseudocodeAr.slice(1),
    complexity: definition.complexity,
    applications: definition.applicationsAr,
    advantages: [
      `يعرض ${definition.titleAr} القرارات البنيوية بوضوح.`,
      "تُمثَّل كل عملية تغيير بخطوة مستقلة قابلة للرجوع.",
      "يبرز الشرح العقد أو الخانات أو المؤشرات أو المقارنات النشطة.",
    ],
    disadvantages: [
      "له مفاضلات تعتمد على نوع الاستخدام ولا يناسب كل الحالات.",
      "قد يؤدي خطأ في الحدود أو المؤشرات أو الموازنة إلى كسر الخاصية البنيوية.",
    ],
    commonMistakes: [
      "تجاوز الحالة الوسيطة قبل تغيير مؤشر أو فحص خانة أو انقسام أو تبديل أو دوران.",
      "تغيير القيم من دون الحفاظ على خاصية البنية.",
      "إهمال الإدخال الفارغ أو المفاتيح المكررة أو الامتلاء أو البحث غير الناجح.",
    ],
    interviewQuestions: [
      `ما الخاصية التي يحافظ عليها ${definition.titleAr}؟`,
      "اشرح تعقيد الزمن والمساحة في أسوأ حالة.",
      "تتبّع عملية تغيير واحدة وبرّر كل خطوة وسيطة.",
    ],
    summary: definition.overviewAr,
    quiz: [
      {
        question: `ما الذي يجب أن يبقى صحيحاً بعد كل عملية في ${definition.titleAr}؟`,
        options: ["الخاصية البنيوية الأساسية", "ترتيب الإدخال فقط", "كل عقدة ورقة", "عدم استخدام ذاكرة"],
        answer: 0,
        explanation: "تحافظ العملية الصحيحة على الخاصية البنيوية التي تعرّف هيكل البيانات.",
      },
    ],
  };
}

export function makeModule<F, I>(definition: ModuleDefinition<F, I>): AlgorithmModule<F, I> {
  return {
    slug: definition.slug,
    title: definition.title,
    titleAr: definition.titleAr,
    category: definition.category,
    difficulty: definition.difficulty,
    tags: definition.tags,
    tagsAr: definition.tagsAr,
    summary: definition.summary,
    summaryAr: definition.summaryAr,
    renderer: definition.renderer,
    pseudocode: definition.pseudocode,
    code: codeSamples(definition.title, definition.pseudocode),
    content: content(definition as ModuleDefinition<unknown, unknown>),
    contentAr: contentAr(definition as ModuleDefinition<unknown, unknown>),
    inputFields: definition.inputFields,
    defaultInput: definition.defaultInput,
    parseInput: definition.parseInput,
    serializeInput: definition.serializeInput,
    generate: definition.generate,
  };
}

export function metaOf(module: Pick<AlgorithmModule<never, never>, "slug" | "title" | "titleAr" | "category" | "difficulty" | "tags" | "tagsAr" | "summary" | "summaryAr" | "renderer">): AlgorithmMeta {
  return {
    slug: module.slug,
    title: module.title,
    titleAr: module.titleAr,
    category: module.category,
    difficulty: module.difficulty,
    tags: module.tags,
    tagsAr: module.tagsAr,
    summary: module.summary,
    summaryAr: module.summaryAr,
    renderer: module.renderer,
  };
}

export function parseIntegerList(raw: string, label = "values"): number[] {
  const tokens = raw.split(",").map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0) throw new Error(`Enter at least one ${label} item.`);
  if (tokens.length > 24) throw new Error(`Use at most 24 ${label} items.`);
  return tokens.map((token) => {
    const value = Number(token);
    if (!Number.isSafeInteger(value)) throw new Error(`"${token}" is not a valid integer.`);
    return value;
  });
}

export function unique(values: number[]): number[] {
  return [...new Set(values)];
}

export function randomUnique(level: Level, rng: RNG, maximum = 9): number[] {
  const size = Math.min(maximum, 3 + level);
  const values = new Set<number>();
  while (values.size < size) values.add(rng.int(1, 99));
  return [...values];
}

export function parsePairList(raw: string, separator = ":"): [number, number][] {
  const tokens = raw.split(",").map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0) throw new Error("Enter at least one pair.");
  if (tokens.length > 20) throw new Error("Use at most 20 pairs.");
  return tokens.map((token) => {
    const parts = token.split(separator).map((part) => part.trim());
    if (parts.length !== 2) throw new Error(`"${token}" must contain two integers separated by "${separator}".`);
    const pair = parts.map(Number);
    if (!pair.every(Number.isSafeInteger)) throw new Error(`"${token}" contains an invalid integer.`);
    return [pair[0], pair[1]];
  });
}

export function numberField(label = "Values", labelAr = "القيم") {
  return {
    key: "values",
    label,
    labelAr,
    placeholder: "8, 3, 12, 5",
    help: "Comma-separated integers.",
    helpAr: "أعداد صحيحة مفصولة بفواصل.",
    list: true,
  };
}

export const complexities = {
  linear: {
    time: { best: "O(1)", average: "O(n)", worst: "O(n)" },
    space: "O(n)",
  },
  logarithmic: {
    time: { best: "O(1)", average: "O(log n)", worst: "O(log n)" },
    space: "O(n)",
  },
  hashExpected: {
    time: { best: "O(1)", average: "O(1)", worst: "O(n)" },
    space: "O(n)",
  },
} satisfies Record<string, AlgorithmContent["complexity"]>;
