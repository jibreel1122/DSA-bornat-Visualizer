import {
  LANGUAGES,
  type AlgorithmContent,
  type AlgorithmMeta,
  type AlgorithmModule,
  type CellState,
  type Language,
  type Level,
  type RNG,
  type Step,
  type TreeFrame,
  type TreeNodeF,
} from "@/lib/engine/types";

export interface TreeDefinition<I> {
  slug: string;
  title: string;
  titleAr: string;
  difficulty: AlgorithmMeta["difficulty"];
  tags: string[];
  tagsAr: string[];
  summary: string;
  summaryAr: string;
  overview: string;
  overviewAr: string;
  pseudocode: string[];
  complexity: AlgorithmContent["complexity"];
  applications: string[];
  applicationsAr: string[];
  inputFields: AlgorithmModule<TreeFrame, I>["inputFields"];
  defaultInput: (level: Level, rng: RNG) => I;
  parseInput: (fields: Record<string, string>) => I;
  serializeInput: (input: I) => Record<string, string>;
  generate: (input: I) => Step<TreeFrame>[];
}

const languageComments: Record<Language, string> = {
  pseudocode: "",
  c: "/* C reference */",
  cpp: "// C++ reference",
  java: "// Java reference",
  python: "# Python reference",
  javascript: "// JavaScript reference",
  typescript: "// TypeScript reference",
  csharp: "// C# reference",
  go: "// Go reference",
  rust: "// Rust reference",
  kotlin: "// Kotlin reference",
  swift: "// Swift reference",
};

function codeSamples(title: string, pseudocode: string[]): Record<Language, string> {
  const body = pseudocode.map((line, index) => `${index + 1}. ${line}`).join("\n");
  return Object.fromEntries(
    LANGUAGES.map(({ id }) => [id, `${languageComments[id]}\n${title}\n${body}`.trim()]),
  ) as Record<Language, string>;
}

function englishContent(definition: TreeDefinition<unknown>): AlgorithmContent {
  return {
    overview: definition.overview,
    howItWorks: definition.pseudocode,
    complexity: definition.complexity,
    applications: definition.applications,
    advantages: [
      "The visualization separates decisions from structural mutations.",
      "Every frame is immutable, so rotations, splits, threads, and decomposition choices are reversible.",
      "Annotations expose the invariant maintained by each node.",
    ],
    disadvantages: [
      "The additional metadata can increase memory use.",
      "Performance depends on the structure's assumptions and workload.",
    ],
    commonMistakes: [
      "Changing links before recording the pre-transformation state.",
      "Forgetting to update augmented metadata after a structural change.",
      "Treating a temporary traversal thread as a permanent tree edge.",
    ],
    interviewQuestions: [
      `State the invariant maintained by ${definition.title}.`,
      "Which operations change the shape, and why are those changes legal?",
      "Give the worst-case time and space complexity.",
    ],
    summary: definition.summary,
    quiz: [
      {
        question: `What must remain valid after each ${definition.title} step?`,
        options: ["The defining tree invariant", "Only insertion order", "Every node has two children", "No metadata changes"],
        answer: 0,
        explanation: "A correct step preserves the structure's defining invariant and updates all dependent metadata.",
      },
    ],
  };
}

function arabicContent(definition: TreeDefinition<unknown>): AlgorithmContent {
  return {
    overview: definition.overviewAr,
    howItWorks: [
      "ابدأ من البنية الحالية وحدد العقدة أو النطاق النشط.",
      "اعرض القرار قبل تغيير الروابط أو البيانات المساعدة.",
      "نفّذ التحويل البنيوي في خطوة مستقلة قابلة للرجوع.",
      "تحقق من الخاصية الأساسية ثم تابع حتى النتيجة.",
    ],
    complexity: definition.complexity,
    applications: definition.applicationsAr,
    advantages: [
      "يفصل العرض بين اتخاذ القرار وتغيير البنية.",
      "كل خطوة مستقلة وقابلة للرجوع إلى الخلف.",
      "توضح التعليقات الخاصية المحفوظة في كل عقدة.",
    ],
    disadvantages: [
      "قد تحتاج البيانات المساعدة إلى مساحة إضافية.",
      "يعتمد الأداء على افتراضات البنية ونمط الاستخدام.",
    ],
    commonMistakes: [
      "تغيير الروابط من دون عرض الحالة السابقة.",
      "نسيان تحديث الحجم أو الارتفاع أو بيانات النطاق.",
      "اعتبار الرابط المؤقت في العبور رابطاً دائماً.",
    ],
    interviewQuestions: [
      `ما الخاصية التي تحافظ عليها ${definition.titleAr}؟`,
      "ما العمليات التي تغيّر شكل الشجرة، ولماذا تكون صحيحة؟",
      "ما تعقيد الزمن والمساحة في أسوأ حالة؟",
    ],
    summary: definition.summaryAr,
    quiz: [
      {
        question: `ما الذي يجب أن يبقى صحيحاً بعد كل خطوة في ${definition.titleAr}؟`,
        options: ["خاصية الشجرة الأساسية", "ترتيب الإدخال فقط", "وجود طفلين لكل عقدة", "عدم تغيير البيانات المساعدة"],
        answer: 0,
        explanation: "تحافظ الخطوة الصحيحة على خاصية البنية وتحدّث كل البيانات التابعة لها.",
      },
    ],
  };
}

export function makeTreeModule<I>(definition: TreeDefinition<I>): AlgorithmModule<TreeFrame, I> {
  return {
    slug: definition.slug,
    title: definition.title,
    titleAr: definition.titleAr,
    category: "trees",
    difficulty: definition.difficulty,
    tags: definition.tags,
    tagsAr: definition.tagsAr,
    summary: definition.summary,
    summaryAr: definition.summaryAr,
    renderer: "tree",
    pseudocode: definition.pseudocode,
    code: codeSamples(definition.title, definition.pseudocode),
    content: englishContent(definition as TreeDefinition<unknown>),
    contentAr: arabicContent(definition as TreeDefinition<unknown>),
    inputFields: definition.inputFields,
    defaultInput: definition.defaultInput,
    parseInput: definition.parseInput,
    serializeInput: definition.serializeInput,
    generate: definition.generate,
  };
}

export function metaOf(module: AlgorithmModule<TreeFrame, unknown>): AlgorithmMeta {
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

export function parseIntegers(raw: string, maximum = 31, unique = false): number[] {
  const tokens = raw.split(",").map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0) throw new Error("Enter at least one integer.");
  if (tokens.length > maximum) throw new Error(`Use at most ${maximum} integers.`);
  const values = tokens.map((token) => {
    const value = Number(token);
    if (!Number.isSafeInteger(value)) throw new Error(`"${token}" is not a valid integer.`);
    return value;
  });
  if (unique && new Set(values).size !== values.length) throw new Error("Values must be unique.");
  return values;
}

export function parseWords(raw: string, maximum = 20): string[] {
  const words = raw.split(",").map((word) => word.trim()).filter(Boolean);
  if (words.length === 0) throw new Error("Enter at least one non-empty value.");
  if (words.length > maximum) throw new Error(`Use at most ${maximum} values.`);
  if (words.some((word) => [...word].length > 30)) throw new Error("Each value must contain at most 30 characters.");
  return words;
}

export function integerField(key = "values", label = "Values", labelAr = "القيم") {
  return {
    key,
    label,
    labelAr,
    placeholder: "40, 20, 60, 10, 30",
    help: "Comma-separated integers.",
    helpAr: "أعداد صحيحة مفصولة بفواصل.",
    list: true,
  };
}

export function randomUnique(level: Level, rng: RNG, limit = 10): number[] {
  const size = Math.min(limit, 3 + level);
  const values = new Set<number>();
  while (values.size < size) values.add(rng.int(1, 99));
  return [...values];
}

export function cloneFrame(
  nodes: Record<string, TreeNodeF>,
  rootId: string | null,
  states: Record<string, CellState> = {},
  aux: TreeFrame["aux"] = [],
  note?: string,
): TreeFrame {
  return {
    nodes: Object.fromEntries(
      Object.entries(nodes).map(([id, node]) => [
        id,
        { ...node, children: node.children ? [...node.children] : undefined },
      ]),
    ),
    rootId,
    states: { ...states },
    aux: aux?.map((row) => ({ ...row, values: [...row.values], states: row.states ? { ...row.states } : undefined })),
    note,
  };
}

export function step(
  frame: TreeFrame,
  description: string,
  descriptionAr: string,
  codeLine: number,
  phase: string,
  counters: Record<string, number> = {},
  transformation?: Step<TreeFrame>["transformation"],
): Step<TreeFrame> {
  return {
    frame,
    description,
    descriptionAr,
    codeLine,
    phase,
    counters,
    transformation,
    why: "This transition records one legal algorithmic decision or structural mutation.",
    whyAr: "تسجل هذه الخطوة قراراً خوارزمياً أو تغييراً بنيوياً صحيحاً واحداً.",
  };
}

export const logarithmicComplexity: AlgorithmContent["complexity"] = {
  time: { best: "O(log n)", average: "O(log n)", worst: "O(log n)" },
  space: "O(n)",
};

export const linearComplexity: AlgorithmContent["complexity"] = {
  time: { best: "O(n)", average: "O(n)", worst: "O(n)" },
  space: "O(n)",
};
