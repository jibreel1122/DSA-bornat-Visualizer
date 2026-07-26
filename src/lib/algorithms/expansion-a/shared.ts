import type {
  AlgorithmContent,
  AlgorithmMeta,
  AlgorithmModule,
  ArrayFrame,
  AuxRow,
  CallStackFrame,
  CellState,
  Language,
  Level,
  RNG,
  Step,
  StringFrame,
  TableFrame,
} from "@/lib/engine/types";
import { randomArray, randomString } from "@/lib/engine/random";
import { parseNumberList } from "@/lib/utils";

export type NumberListInput = { values: number[] };
export type SearchInput = { values: number[]; target: number };
export type RankedInput = { values: number[]; k: number };
export type TextPatternInput = { text: string; pattern: string };

export interface LearningSpec {
  overview: string;
  overviewAr: string;
  how: string[];
  howAr: string[];
  complexity: AlgorithmContent["complexity"];
  applications: string[];
  applicationsAr: string[];
  advantages: string[];
  advantagesAr: string[];
  disadvantages: string[];
  disadvantagesAr: string[];
  mistakes: string[];
  mistakesAr: string[];
  questions: string[];
  questionsAr: string[];
  summary: string;
  summaryAr: string;
}

export function standardLearning(spec: {
  overview: string;
  overviewAr: string;
  how: string[];
  howAr: string[];
  complexity: AlgorithmContent["complexity"];
  summary: string;
  summaryAr: string;
  invariant: string;
  invariantAr: string;
}): ReturnType<typeof contentPair> {
  return contentPair({
    overview: spec.overview,
    overviewAr: spec.overviewAr,
    how: spec.how,
    howAr: spec.howAr,
    complexity: spec.complexity,
    applications: ["Algorithm study and trace inspection", "Inputs where its documented trade-offs are useful"],
    applicationsAr: ["دراسة الخوارزمية وفحص خطواتها", "المدخلات التي تناسبها خصائص هذه الخوارزمية"],
    advantages: [spec.invariant, `Its transitions expose why the ${spec.complexity.time.average} average bound arises.`],
    advantagesAr: [spec.invariantAr, `توضح انتقالاتها سبب حد الزمن المتوسط ${spec.complexity.time.average}.`],
    disadvantages: [`Worst-case time is ${spec.complexity.time.worst}.`, `Auxiliary space is ${spec.complexity.space}.`],
    disadvantagesAr: [`زمن أسوأ حالة هو ${spec.complexity.time.worst}.`, `المساحة الإضافية هي ${spec.complexity.space}.`],
    mistakes: ["Breaking the stated invariant between two steps", "Using an invalid boundary or stopping condition"],
    mistakesAr: ["كسر الخاصية الأساسية بين خطوتين", "استخدام حد أو شرط توقف غير صحيح"],
    questions: ["State and prove the loop invariant.", "Which input produces the worst case?"],
    questionsAr: ["اذكر خاصية الحلقة وأثبتها.", "ما المدخل الذي يسبب أسوأ حالة؟"],
    summary: spec.summary,
    summaryAr: spec.summaryAr,
  });
}

export function contentPair(spec: LearningSpec): {
  content: AlgorithmContent;
  contentAr: AlgorithmContent;
} {
  const quiz = [
    {
      question: "What must remain true after every visible step?",
      options: ["The named algorithm's invariant", "The input must already be sorted", "Every value must move", "No counters may change"],
      answer: 0,
      explanation: "Each frame is a snapshot of a legal transition, so the algorithm-specific invariant must still hold.",
    },
    {
      question: "What is the stated worst-case running time?",
      options: [spec.complexity.time.best, spec.complexity.time.average, spec.complexity.time.worst, spec.complexity.space],
      answer: 2,
      explanation: `The worst-case time for this implementation is ${spec.complexity.time.worst}.`,
    },
  ];
  const quizAr = [
    {
      question: "ما الشرط الذي يجب أن يبقى صحيحًا بعد كل خطوة مرئية؟",
      options: ["خاصية الخوارزمية المسماة", "أن تكون المدخلات مرتبة مسبقًا", "أن تتحرك كل قيمة", "ألا تتغير العدادات"],
      answer: 0,
      explanation: "كل إطار لقطة لانتقال قانوني، لذلك يجب أن تبقى خاصية الخوارزمية صحيحة.",
    },
    {
      question: "ما زمن التنفيذ في أسوأ حالة؟",
      options: [spec.complexity.time.best, spec.complexity.time.average, spec.complexity.time.worst, spec.complexity.space],
      answer: 2,
      explanation: `زمن أسوأ حالة في هذا التنفيذ هو ${spec.complexity.time.worst}.`,
    },
  ];
  return {
    content: {
      overview: spec.overview,
      howItWorks: spec.how,
      complexity: spec.complexity,
      applications: spec.applications,
      advantages: spec.advantages,
      disadvantages: spec.disadvantages,
      commonMistakes: spec.mistakes,
      interviewQuestions: spec.questions,
      summary: spec.summary,
      quiz,
    },
    contentAr: {
      overview: spec.overviewAr,
      howItWorks: spec.howAr,
      complexity: spec.complexity,
      applications: spec.applicationsAr,
      advantages: spec.advantagesAr,
      disadvantages: spec.disadvantagesAr,
      commonMistakes: spec.mistakesAr,
      interviewQuestions: spec.questionsAr,
      summary: spec.summaryAr,
      quiz: quizAr,
    },
  };
}

/**
 * Every language tab receives the complete algorithm-specific pseudocode.
 * Keeping the same canonical logic in every tab avoids a translated sample
 * silently disagreeing with the animated implementation.
 */
export function codeBundle(name: string, pseudocode: string[]): Record<Language, string> {
  const body = pseudocode.join("\n");
  return {
    pseudocode: body,
    c: `/* ${name} — canonical implementation steps\n${body}\n*/`,
    cpp: `/* ${name} — canonical implementation steps\n${body}\n*/`,
    java: `/* ${name} — canonical implementation steps\n${body}\n*/`,
    python: `# ${name} — canonical implementation steps\n${body}`,
    javascript: `/* ${name} — canonical implementation steps\n${body}\n*/`,
    typescript: `/* ${name} — canonical implementation steps\n${body}\n*/`,
    csharp: `/* ${name} — canonical implementation steps\n${body}\n*/`,
    go: `// ${name} — canonical implementation steps\n/*\n${body}\n*/`,
    rust: `/* ${name} — canonical implementation steps\n${body}\n*/`,
    kotlin: `/* ${name} — canonical implementation steps\n${body}\n*/`,
    swift: `/* ${name} — canonical implementation steps\n${body}\n*/`,
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

export function arrayFrame(
  values: readonly number[],
  states: Record<number, CellState> = {},
  aux?: AuxRow[],
  note?: string,
  range?: { from: number; to: number } | null,
  pointers?: { index: number; label: string }[],
): ArrayFrame {
  return {
    values: [...values],
    states: { ...states },
    aux: aux?.map((row) => ({ ...row, values: [...row.values], states: row.states ? { ...row.states } : undefined })),
    note,
    range,
    pointers: pointers?.map((pointer) => ({ ...pointer })),
  };
}

export function stringFrame(
  text: readonly string[],
  textStates: Record<number, CellState> = {},
  pattern?: readonly string[],
  patternStates: Record<number, CellState> = {},
  shift = 0,
  aux?: AuxRow[],
  note?: string,
): StringFrame {
  return {
    text: text.map((ch, index) => ({ ch, state: textStates[index] })),
    pattern: pattern?.map((ch, index) => ({ ch, state: patternStates[index] })),
    shift,
    aux: aux?.map((row) => ({ ...row, values: [...row.values], states: row.states ? { ...row.states } : undefined })),
    note,
  };
}

export function tableFrame(
  rowLabels: string[],
  colLabels: string[],
  rows: (string | number | null)[][],
  active?: { row: number; col: number },
  aux?: AuxRow[],
  note?: string,
): TableFrame {
  return {
    rowLabels: [...rowLabels],
    colLabels: [...colLabels],
    cells: rows.map((row, r) =>
      row.map((value, c) => ({ value, state: active?.row === r && active.col === c ? "active" : undefined })),
    ),
    aux,
    note,
  };
}

export function callStackFrame(
  stack: { id: string; label: string; detail?: string; state?: CellState }[],
  output: (string | number)[] = [],
  aux?: AuxRow[],
  note?: string,
): CallStackFrame {
  return {
    stack: stack.map((item) => ({ ...item })),
    output: [...output],
    aux,
    note,
  };
}

export function parseValues(fields: Record<string, string>, options?: { maxLen?: number; integer?: boolean; powerOfTwo?: boolean }): NumberListInput {
  const values = parseNumberList(fields.values ?? "", { maxLen: options?.maxLen ?? 32, min: -999, max: 999 });
  if (options?.integer !== false && values.some((value) => !Number.isInteger(value))) {
    throw new Error("All values must be integers.");
  }
  if (options?.powerOfTwo && (values.length & (values.length - 1)) !== 0) {
    throw new Error("Bitonic sort requires 2, 4, 8, 16, or 32 values.");
  }
  return { values };
}

export function parseSearch(fields: Record<string, string>, sorted = false): SearchInput {
  const { values } = parseValues(fields, { maxLen: 48 });
  const target = Number((fields.target ?? "").trim());
  if (!Number.isInteger(target)) throw new Error("Target must be an integer.");
  return { values: sorted ? [...values].sort((a, b) => a - b) : values, target };
}

export function parseRanked(fields: Record<string, string>): RankedInput {
  const { values } = parseValues(fields, { maxLen: 48 });
  const k = Number((fields.k ?? "").trim());
  if (!Number.isInteger(k) || k < 1 || k > values.length) {
    throw new Error(`k must be an integer from 1 to ${values.length}.`);
  }
  return { values, k };
}

export const listFields = [
  {
    key: "values",
    label: "Values",
    labelAr: "القيم",
    placeholder: "8, 3, 5, 1, 9",
    help: "Comma- or space-separated integers.",
    helpAr: "أعداد صحيحة مفصولة بفواصل أو مسافات.",
    list: true,
  },
];

export const searchFields = [
  ...listFields,
  {
    key: "target",
    label: "Target",
    labelAr: "الهدف",
    placeholder: "5",
    help: "Value to locate.",
    helpAr: "القيمة المطلوب إيجادها.",
    search: true,
  },
];

export function defaultValues(level: Level, rng: RNG): NumberListInput {
  return { values: randomArray(level, rng, { min: 0, max: 99 }) };
}

export function defaultSearch(level: Level, rng: RNG, sorted = false): SearchInput {
  const values = randomArray(level, rng, { min: 0, max: 99, sorted });
  const target = rng.next() < 0.75 ? rng.pick(values) : 101;
  return { values, target };
}

export function defaultRanked(level: Level, rng: RNG): RankedInput {
  const values = randomArray(level, rng, { min: 0, max: 99 });
  return { values, k: rng.int(1, values.length) };
}

export function defaultTextPattern(level: Level, rng: RNG): TextPatternInput {
  const text = randomString(level, rng, "abac");
  const chars = [...text];
  const length = Math.max(1, Math.min(4, Math.floor(chars.length / 3)));
  const start = rng.int(0, Math.max(0, chars.length - length));
  return { text, pattern: chars.slice(start, start + length).join("") };
}

export function parseTextPattern(fields: Record<string, string>): TextPatternInput {
  const text = fields.text ?? "";
  const pattern = fields.pattern ?? "";
  if ([...text].length < 1 || [...text].length > 100) throw new Error("Text must contain 1 to 100 characters.");
  if ([...pattern].length < 1 || [...pattern].length > 30) throw new Error("Pattern must contain 1 to 30 characters.");
  return { text, pattern };
}

export function pushArrayStep(
  steps: Step<ArrayFrame>[],
  values: readonly number[],
  description: string,
  descriptionAr: string,
  codeLine: number,
  counters: Record<string, number>,
  states: Record<number, CellState> = {},
  options?: {
    aux?: AuxRow[];
    note?: string;
    range?: { from: number; to: number } | null;
    pointers?: { index: number; label: string }[];
    phase?: string;
    why?: string;
    whyAr?: string;
  },
) {
  steps.push({
    frame: arrayFrame(values, states, options?.aux, options?.note, options?.range, options?.pointers),
    description,
    descriptionAr,
    codeLine,
    counters: { ...counters },
    phase: options?.phase,
    why: options?.why,
    whyAr: options?.whyAr,
  });
}

export function modulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

export function extendedGcd(a: number, b: number): { gcd: number; x: number; y: number } {
  let oldR = a;
  let r = b;
  let oldS = 1;
  let s = 0;
  let oldT = 0;
  let t = 1;
  while (r !== 0) {
    const q = Math.floor(oldR / r);
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
    [oldT, t] = [t, oldT - q * t];
  }
  return { gcd: Math.abs(oldR), x: oldS, y: oldT };
}

export function serializeValues(input: NumberListInput): Record<string, string> {
  return { values: input.values.join(", ") };
}

export function serializeSearch(input: SearchInput): Record<string, string> {
  return { values: input.values.join(", "), target: String(input.target) };
}

export function serializeRanked(input: RankedInput): Record<string, string> {
  return { values: input.values.join(", "), k: String(input.k) };
}

export function serializeTextPattern(input: TextPatternInput): Record<string, string> {
  return { text: input.text, pattern: input.pattern };
}
