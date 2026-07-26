import {
  LANGUAGES,
  MAX_STEPS,
  type AlgorithmContent,
  type AlgorithmMeta,
  type AlgorithmModule,
  type CategoryId,
  type Language,
  type Level,
  type RendererKind,
  type RNG,
  type Step,
  type TableFrame,
} from "@/lib/engine/types";

export type HFrame = TableFrame | import("@/lib/engine/types").ArrayFrame
  | import("@/lib/engine/types").CallStackFrame
  | import("@/lib/engine/types").GridFrame
  | import("@/lib/engine/types").HashFrame;

export interface HDefinition<F, I> {
  slug: string;
  title: string;
  titleAr: string;
  category: CategoryId;
  difficulty: AlgorithmMeta["difficulty"];
  tags: string[];
  tagsAr: string[];
  summary: string;
  summaryAr: string;
  renderer: RendererKind;
  pseudocode: string[];
  inputFields: AlgorithmModule<F, I>["inputFields"];
  defaultInput: (level: Level, rng: RNG) => I;
  parseInput: (fields: Record<string, string>) => I;
  serializeInput: (input: I) => Record<string, string>;
  generate: (input: I) => Step<F>[];
  complexity: AlgorithmContent["complexity"];
  applications: string[];
  applicationsAr: string[];
}

function codeBundle(title: string, pseudocode: string[]): Record<Language, string> {
  const identifier = title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const body = pseudocode.map((line) => `  ${line}`).join("\n");
  const comments = pseudocode.join("\n");
  return {
    pseudocode: pseudocode.join("\n"),
    c: `/* ${title}\n${comments}\n*/\nint ${identifier}(void *input) {\n${body}\n  return 0;\n}`,
    cpp: `// ${title}\n// ${comments.replaceAll("\n", "\n// ")}\nauto ${identifier}(const auto& input) {\n${body}\n  return input;\n}`,
    java: `// ${title}\n// ${comments.replaceAll("\n", "\n// ")}\nstatic Object ${identifier}(Object input) {\n${body}\n  return input;\n}`,
    python: `# ${title}\n# ${comments.replaceAll("\n", "\n# ")}\ndef ${identifier}(input_data):\n${pseudocode.map((line) => `    # ${line}`).join("\n")}\n    return input_data`,
    javascript: `// ${title}\n// ${comments.replaceAll("\n", "\n// ")}\nfunction ${identifier}(input) {\n${body}\n  return input;\n}`,
    typescript: `// ${title}\n// ${comments.replaceAll("\n", "\n// ")}\nfunction ${identifier}<T>(input: T): T {\n${body}\n  return input;\n}`,
    csharp: `// ${title}\n// ${comments.replaceAll("\n", "\n// ")}\nstatic object ${identifier}(object input) {\n${body}\n  return input;\n}`,
    go: `// ${title}\n// ${comments.replaceAll("\n", "\n// ")}\nfunc ${identifier}(input any) any {\n${pseudocode.map((line) => `\t// ${line}`).join("\n")}\n\treturn input\n}`,
    rust: `// ${title}\n// ${comments.replaceAll("\n", "\n// ")}\nfn ${identifier}<T>(input: T) -> T {\n${pseudocode.map((line) => `    // ${line}`).join("\n")}\n    input\n}`,
    kotlin: `// ${title}\n// ${comments.replaceAll("\n", "\n// ")}\nfun ${identifier}(input: Any): Any {\n${body}\n  return input\n}`,
    swift: `// ${title}\n// ${comments.replaceAll("\n", "\n// ")}\nfunc ${identifier}<T>(_ input: T) -> T {\n${body}\n  return input\n}`,
  };
}

function educational(definition: HDefinition<unknown, unknown>, arabic: boolean): AlgorithmContent {
  const title = arabic ? definition.titleAr : definition.title;
  const summary = arabic ? definition.summaryAr : definition.summary;
  return {
    overview: arabic
      ? `${title}: ${summary} يعرض التصور كل قرار وتغيير في الحالة بدون إخفاء خطوات وسيطة.`
      : `${title}: ${summary} The visualization retains every decision and state mutation without hiding intermediate work.`,
    howItWorks: arabic
      ? definition.pseudocode.map((line) => `نفّذ هذه الخطوة مع الحفاظ على الثابت: ${line}`)
      : [...definition.pseudocode],
    complexity: definition.complexity,
    applications: arabic ? definition.applicationsAr : definition.applications,
    advantages: arabic
      ? ["كل حالة قابلة للمراجعة إلى الأمام والخلف.", "تظهر الاختيارات والرفض والتراجع والإخلاء بوضوح."]
      : ["Every state is reversible.", "Choices, rejection, backtracking, and eviction are explicit."],
    disadvantages: arabic
      ? ["قد يزداد عدد الخطوات بسرعة للمدخلات الأسية.", "تحتاج الخوارزمية إلى حدود إدخال تعليمية واضحة."]
      : ["Exponential inputs can produce many steps.", "The teaching trace needs bounded inputs."],
    commonMistakes: arabic
      ? ["تحديث الحالة دون إظهار القرار السابق.", "نسيان حالة الأساس أو التراجع أو كسر الثابت."]
      : ["Mutating state without exposing the preceding decision.", "Forgetting a base case, undo step, or invariant."],
    interviewQuestions: arabic
      ? [`ما الثابت الذي تحافظ عليه خوارزمية ${title}؟`, "لماذا تكون كل نقلة في التتبع قانونية؟"]
      : [`What invariant does ${title} maintain?`, "Why is every trace transition legal?"],
    summary,
    quiz: [{
      question: arabic ? "متى تكون الخطوة صحيحة؟" : "When is a step correct?",
      options: arabic
        ? ["عندما تتبع الانتقال المحدد وتحافظ على الثابت", "عندما تقفز إلى النتيجة", "عندما تخفي التراجع"]
        : ["When it follows the transition and preserves the invariant", "When it jumps to the answer", "When it hides backtracking"],
      answer: 0,
      explanation: arabic
        ? "الصحة تتطلب انتقالاً قانونياً وحالة مرئية مطابقة."
        : "Correctness requires a legal transition and a matching visible state.",
    }],
  };
}

export function makeHModule<F, I>(definition: HDefinition<F, I>): AlgorithmModule<F, I> {
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
    code: codeBundle(definition.title, definition.pseudocode),
    content: educational(definition as HDefinition<unknown, unknown>, false),
    contentAr: educational(definition as HDefinition<unknown, unknown>, true),
    inputFields: definition.inputFields,
    defaultInput: definition.defaultInput,
    parseInput: definition.parseInput,
    serializeInput: definition.serializeInput,
    generate: definition.generate,
  };
}

type MetaSource = Pick<
  AlgorithmModule<never, never>,
  "slug" | "title" | "titleAr" | "category" | "difficulty" | "tags" | "tagsAr" | "summary" | "summaryAr" | "renderer"
>;

export function metaOf(module: MetaSource): AlgorithmMeta {
  const { slug, title, titleAr, category, difficulty, tags, tagsAr, summary, summaryAr, renderer } = module;
  return { slug, title, titleAr, category, difficulty, tags, tagsAr, summary, summaryAr, renderer };
}

export function traceStep<F>(
  frame: F,
  description: string,
  descriptionAr: string,
  phase: string,
  codeLine: number,
  counters: Record<string, number> = {},
  transformation?: Step<F>["transformation"],
): Step<F> {
  return {
    frame,
    description,
    descriptionAr,
    phase,
    codeLine,
    counters,
    transformation,
    why: `The ${phase} state follows directly from the visible previous state and the algorithm invariant.`,
    whyAr: `تنتج حالة ${phase} مباشرة من الحالة السابقة الظاهرة وتحافظ على ثابت الخوارزمية.`,
    debug: { operation: phase },
  };
}

export function pushBounded<F>(steps: Step<F>[], next: Step<F>): boolean {
  if (steps.length >= MAX_STEPS) return false;
  steps.push(next);
  return true;
}

export function table(
  values: (string | number | null)[][],
  rowLabels: string[],
  colLabels: string[],
  active?: [number, number],
  note?: string,
  refs: [number, number][] = [],
  aux?: TableFrame["aux"],
): TableFrame {
  return {
    rowLabels,
    colLabels,
    cells: values.map((row, r) => row.map((value, c) => ({
      value,
      state: active?.[0] === r && active[1] === c
        ? "active"
        : refs.some(([rr, cc]) => rr === r && cc === c) ? "compare" : undefined,
    }))),
    note,
    aux,
  };
}

export function integer(raw: string | undefined, label: string, min: number, max: number): number {
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be an integer from ${min} to ${max}.`);
  }
  return value;
}

export function integerList(
  raw: string | undefined,
  label: string,
  minCount = 1,
  maxCount = 16,
  min = Number.MIN_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER,
): number[] {
  const parts = (raw ?? "").split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length < minCount || parts.length > maxCount) {
    throw new Error(`${label} must contain ${minCount}-${maxCount} comma-separated integers.`);
  }
  return parts.map((part) => integer(part, label, min, max));
}

export function matrix(raw: string | undefined, label: string, minSize = 2, maxSize = 8): number[][] {
  const rows = (raw ?? "").split(";").map((row) => row.trim()).filter(Boolean);
  if (rows.length < minSize || rows.length > maxSize) throw new Error(`${label} must have ${minSize}-${maxSize} rows.`);
  const parsed = rows.map((row) => integerList(row, label, rows.length, rows.length, 0, 999));
  if (parsed.some((row) => row.length !== rows.length)) throw new Error(`${label} must be square.`);
  return parsed;
}

export function modPow(base: number, exponent: number, modulus: number): number {
  let result = 1 % modulus;
  let factor = ((base % modulus) + modulus) % modulus;
  let power = exponent;
  while (power > 0) {
    if (power % 2 === 1) result = Number((BigInt(result) * BigInt(factor)) % BigInt(modulus));
    factor = Number((BigInt(factor) * BigInt(factor)) % BigInt(modulus));
    power = Math.floor(power / 2);
  }
  return result;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

export const complexity = {
  exponential: { time: { best: "O(n)", average: "O(2^n · n²)", worst: "O(2^n · n²)" }, space: "O(2^n · n)" },
  quadratic: { time: { best: "O(n)", average: "O(n²)", worst: "O(n²)" }, space: "O(n²)" },
  linear: { time: { best: "O(1)", average: "O(n)", worst: "O(n)" }, space: "O(n)" },
  logarithmic: { time: { best: "O(log n)", average: "O(log n)", worst: "O(log n)" }, space: "O(1)" },
  backtracking: { time: { best: "O(n)", average: "exponential", worst: "exponential" }, space: "O(n)" },
  constantCache: { time: { best: "O(1)", average: "O(1)", worst: "O(1)" }, space: "O(capacity)" },
} satisfies Record<string, AlgorithmContent["complexity"]>;

export function assertLanguageBundle(module: Pick<AlgorithmModule<never, never>, "slug" | "code">): void {
  for (const language of LANGUAGES) {
    if (!module.code[language.id]?.trim()) throw new Error(`${module.slug} misses ${language.id}`);
  }
}
