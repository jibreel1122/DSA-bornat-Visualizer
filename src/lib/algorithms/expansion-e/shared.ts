import { LEVEL_SIZES, randomArray, randomString } from "@/lib/engine/random";
import {
  type AlgorithmContent,
  type AlgorithmMeta,
  type AlgorithmModule,
  type ArrayFrame,
  type CellState,
  type Language,
  type Level,
  type RendererKind,
  type RNG,
  type Step,
  type StringFrame,
  type TableFrame,
} from "@/lib/engine/types";

export type NumberInput = { values: number[] };
export type SearchInput = { values: number[]; target: number };

export type VisualFrame = ArrayFrame | StringFrame | TableFrame;

export interface ModuleSpec<F extends VisualFrame, I> {
  slug: string;
  title: string;
  titleAr: string;
  category: "sorting" | "searching" | "strings";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  tags: string[];
  tagsAr: string[];
  summary: string;
  summaryAr: string;
  renderer: RendererKind;
  pseudocode: string[];
  complexity: AlgorithmContent["complexity"];
  invariant: string;
  invariantAr: string;
  how: string[];
  howAr: string[];
  inputFields: AlgorithmModule<F, I>["inputFields"];
  defaultInput: (level: Level, rng: RNG) => I;
  parseInput: (fields: Record<string, string>) => I;
  serializeInput: (input: I) => Record<string, string>;
  generate: (input: I) => Step<F>[];
}

const languageComment: Record<Language, [string, string]> = {
  pseudocode: ["", ""],
  c: ["/*", "*/"],
  cpp: ["/*", "*/"],
  java: ["/*", "*/"],
  python: ['"""', '"""'],
  javascript: ["/*", "*/"],
  typescript: ["/*", "*/"],
  csharp: ["/*", "*/"],
  go: ["/*", "*/"],
  rust: ["/*", "*/"],
  kotlin: ["/*", "*/"],
  swift: ["/*", "*/"],
};

export function codeBundle(title: string, pseudocode: string[]): Record<Language, string> {
  const body = pseudocode.map((line, index) => `${index + 1}. ${line}`).join("\n");
  return Object.fromEntries(
    Object.entries(languageComment).map(([language, [open, close]]) => [
      language,
      language === "pseudocode"
        ? `${title}\n${body}`
        : `${open}\n${title}\nExecutable visualizer contract:\n${body}\n${close}`,
    ]),
  ) as Record<Language, string>;
}

function educationalContent<F extends VisualFrame, I>(
  spec: ModuleSpec<F, I>,
): { content: AlgorithmContent; contentAr: AlgorithmContent } {
  const content: AlgorithmContent = {
    overview: `${spec.title} is executed by the visualizer itself. ${spec.summary}`,
    howItWorks: spec.how,
    complexity: spec.complexity,
    applications: ["Algorithm study", "Trace inspection", "Technical interview preparation"],
    advantages: [spec.invariant, "Every meaningful state transition is retained as a reversible frame."],
    disadvantages: [
      `Its worst-case running time is ${spec.complexity.time.worst}.`,
      "Detailed teaching traces use more memory than an uninstrumented implementation.",
    ],
    commonMistakes: [
      "Replacing the named algorithm with a different algorithm that has the same final answer.",
      "Showing a frame that violates the algorithm's invariant.",
    ],
    interviewQuestions: [
      `State the invariant of ${spec.title}.`,
      "Explain why its stopping condition proves the result.",
    ],
    summary: spec.summary,
    quiz: [{
      question: "What makes a visualization step correct?",
      options: [
        "It follows the named algorithm and preserves its invariant",
        "Only the final output matters",
        "Any rearrangement is acceptable",
        "The input is hidden",
      ],
      answer: 0,
      explanation: "A teaching trace must preserve both the algorithm's state and its mathematical invariant.",
    }],
  };
  const contentAr: AlgorithmContent = {
    overview: `ينفّذ المصوّر خوارزمية ${spec.titleAr} نفسها. ${spec.summaryAr}`,
    howItWorks: spec.howAr,
    complexity: spec.complexity,
    applications: ["دراسة الخوارزميات", "فحص التنفيذ خطوة بخطوة", "التحضير للمقابلات التقنية"],
    advantages: [spec.invariantAr, "تُحفظ كل نقلة مهمة في إطار مستقل يمكن الرجوع إليه."],
    disadvantages: [
      `زمن أسوأ حالة هو ${spec.complexity.time.worst}.`,
      "يستهلك العرض التفصيلي ذاكرة أكثر من التنفيذ غير المرئي.",
    ],
    commonMistakes: [
      "استبدال الخوارزمية المطلوبة بخوارزمية أخرى تعطي النتيجة النهائية نفسها.",
      "عرض خطوة تكسر ثابت الخوارزمية.",
    ],
    interviewQuestions: [
      `اذكر ثابت خوارزمية ${spec.titleAr}.`,
      "اشرح لماذا يثبت شرط التوقف صحة النتيجة.",
    ],
    summary: spec.summaryAr,
    quiz: [{
      question: "متى تكون خطوة التصوير صحيحة؟",
      options: [
        "عندما تتبع الخوارزمية المسماة وتحافظ على ثابتِها",
        "عندما تكون النتيجة النهائية صحيحة فقط",
        "عندما يتغير أي عنصر",
        "عندما تُخفى المدخلات",
      ],
      answer: 0,
      explanation: "يجب أن يحافظ الشرح التعليمي على حالة الخوارزمية وثابتِها الرياضي معاً.",
    }],
  };
  return { content, contentAr };
}

export function makeModule<F extends VisualFrame, I>(spec: ModuleSpec<F, I>): AlgorithmModule<F, I> {
  const learning = educationalContent(spec);
  return {
    slug: spec.slug,
    title: spec.title,
    titleAr: spec.titleAr,
    category: spec.category,
    difficulty: spec.difficulty,
    tags: spec.tags,
    tagsAr: spec.tagsAr,
    summary: spec.summary,
    summaryAr: spec.summaryAr,
    renderer: spec.renderer,
    pseudocode: spec.pseudocode,
    code: codeBundle(spec.title, spec.pseudocode),
    content: learning.content,
    contentAr: learning.contentAr,
    inputFields: spec.inputFields,
    defaultInput: spec.defaultInput,
    parseInput: spec.parseInput,
    serializeInput: spec.serializeInput,
    generate: spec.generate,
  };
}

export function metaOf<F, I>(module: AlgorithmModule<F, I>): AlgorithmMeta {
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

export const numberFields = [{
  key: "values",
  label: "Values",
  labelAr: "القيم",
  placeholder: "8, 3, 5, 1, 9",
  help: "Comma- or space-separated integers.",
  helpAr: "أعداد صحيحة مفصولة بفواصل أو مسافات.",
  list: true,
}];

export const targetFields = [
  ...numberFields,
  {
    key: "target",
    label: "Target",
    labelAr: "القيمة المطلوبة",
    placeholder: "5",
    help: "The value to locate.",
    helpAr: "القيمة المطلوب البحث عنها.",
    search: true,
  },
];

export function parseNumbers(raw: string, options: {
  minCount?: number;
  maxCount?: number;
  min?: number;
  max?: number;
} = {}): number[] {
  const tokens = raw.trim().split(/[\s,]+/).filter(Boolean);
  const minCount = options.minCount ?? 1;
  const maxCount = options.maxCount ?? 24;
  const values = tokens.map(Number);
  if (
    values.length < minCount
    || values.length > maxCount
    || values.some((value) => !Number.isInteger(value)
      || value < (options.min ?? -999)
      || value > (options.max ?? 999))
  ) {
    throw new Error(`Enter ${minCount}-${maxCount} integers from ${options.min ?? -999} to ${options.max ?? 999}.`);
  }
  return values;
}

export function parseNumberInput(
  fields: Record<string, string>,
  options?: Parameters<typeof parseNumbers>[1],
): NumberInput {
  return { values: parseNumbers(fields.values ?? "", options) };
}

export function parseSearchInput(
  fields: Record<string, string>,
  options?: Parameters<typeof parseNumbers>[1],
): SearchInput {
  const values = parseNumbers(fields.values ?? "", options);
  const target = Number((fields.target ?? "").trim());
  if (!Number.isInteger(target)) throw new Error("Target must be an integer.");
  return { values, target };
}

export function serializeNumberInput(input: NumberInput): Record<string, string> {
  return { values: input.values.join(", ") };
}

export function serializeSearchInput(input: SearchInput): Record<string, string> {
  return { values: input.values.join(", "), target: String(input.target) };
}

export function defaultNumbers(
  level: Level,
  rng: RNG,
  options: { min?: number; max?: number; maxCount?: number } = {},
): NumberInput {
  const values = randomArray(level, rng, { min: options.min ?? -30, max: options.max ?? 70 });
  return { values: values.slice(0, options.maxCount ?? LEVEL_SIZES[level].array) };
}

export function arrayFrame(
  values: readonly number[],
  states: Record<number, CellState> = {},
  options: {
    pointers?: { index: number; label: string }[];
    range?: { from: number; to: number } | null;
    aux?: ArrayFrame["aux"];
    note?: string;
  } = {},
): ArrayFrame {
  return {
    values: [...values],
    states: { ...states },
    pointers: options.pointers?.map((pointer) => ({ ...pointer })),
    range: options.range,
    aux: options.aux?.map((row) => ({
      ...row,
      values: [...row.values],
      states: row.states ? { ...row.states } : undefined,
    })),
    note: options.note,
  };
}

export function stringFrame(
  text: readonly string[],
  states: Record<number, CellState> = {},
  options: {
    pattern?: readonly string[];
    patternStates?: Record<number, CellState>;
    shift?: number;
    aux?: StringFrame["aux"];
    note?: string;
  } = {},
): StringFrame {
  return {
    text: text.map((ch, index) => ({ ch, state: states[index] })),
    pattern: options.pattern?.map((ch, index) => ({ ch, state: options.patternStates?.[index] })),
    shift: options.shift,
    aux: options.aux?.map((row) => ({ ...row, values: [...row.values] })),
    note: options.note,
  };
}

export function tableFrame(
  rowLabels: readonly string[],
  colLabels: readonly string[],
  rows: readonly (readonly (string | number | null)[])[],
  options: {
    active?: [number, number] | null;
    compared?: [number, number][];
    aux?: TableFrame["aux"];
    note?: string;
  } = {},
): TableFrame {
  return {
    rowLabels: [...rowLabels],
    colLabels: [...colLabels],
    cells: rows.map((row, r) => row.map((value, c) => ({
      value,
      state: options.active?.[0] === r && options.active[1] === c
        ? "active"
        : options.compared?.some(([rr, cc]) => rr === r && cc === c)
          ? "compare"
          : undefined,
    }))),
    aux: options.aux?.map((row) => ({ ...row, values: [...row.values] })),
    note: options.note,
  };
}

export function step<F>(
  frame: F,
  description: string,
  descriptionAr: string,
  codeLine: number,
  counters: Record<string, number>,
  phase: string,
  options: {
    why?: string;
    whyAr?: string;
    transformation?: Step<F>["transformation"];
  } = {},
): Step<F> {
  return {
    frame,
    description,
    descriptionAr,
    codeLine,
    counters: { ...counters },
    phase,
    why: options.why ?? `This ${phase} step follows the named algorithm's invariant.`,
    whyAr: options.whyAr ?? `تتبع خطوة ${phase} ثابت الخوارزمية المسماة.`,
    transformation: options.transformation,
  };
}

export function textDefault(level: Level, rng: RNG, alphabet = "abac"): string {
  return randomString(level, rng, alphabet).slice(0, 8 + level * 4);
}

export function boundedText(raw: string, label: string, maxLength = 40, allowEmpty = false): string {
  const value = raw;
  const length = [...value].length;
  if ((!allowEmpty && length === 0) || length > maxLength) {
    throw new Error(`${label} must contain ${allowEmpty ? "0" : "1"}-${maxLength} characters.`);
  }
  return value;
}
