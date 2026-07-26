import type {
  AlgorithmContent,
  AlgorithmMeta,
  AlgorithmModule,
  CellState,
  GraphFrame,
  InputField,
  Language,
  Level,
  RNG,
  Step,
} from "@/lib/engine/types";
import { circularLayout } from "@/lib/engine/random";

export type Edge = { from: string; to: string; weight?: number };
export type GraphInput = {
  nodes: string[];
  edges: Edge[];
  start?: string;
  target?: string;
};

export type ModuleSpec<I> = {
  slug: string;
  title: string;
  titleAr: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  tags: string[];
  tagsAr: string[];
  summary: string;
  summaryAr: string;
  pseudocode: string[];
  complexity: { best: string; average: string; worst: string; space: string };
  concept: string;
  conceptAr: string;
  applications: string[];
  applicationsAr: string[];
  caveats: string[];
  caveatsAr: string[];
  inputFields: InputField[];
  defaultInput: (level: Level, rng: RNG) => I;
  parseInput: (fields: Record<string, string>) => I;
  serializeInput: (input: I) => Record<string, string>;
  generate: (input: I) => Step<GraphFrame>[];
  referencePython: string;
  referenceTypeScript: string;
};

const LANGUAGE_PREFIX: Record<Language, string> = {
  pseudocode: "",
  c: "/* C reference outline */\n",
  cpp: "// C++ reference outline\n",
  java: "// Java reference outline\n",
  python: "",
  javascript: "// JavaScript reference outline\n",
  typescript: "",
  csharp: "// C# reference outline\n",
  go: "// Go reference outline\n",
  rust: "// Rust reference outline\n",
  kotlin: "// Kotlin reference outline\n",
  swift: "// Swift reference outline\n",
};

function makeCode(spec: ModuleSpec<unknown>): Record<Language, string> {
  const neutral = `${spec.title}\n${spec.pseudocode.join("\n")}`;
  return {
    pseudocode: spec.pseudocode.join("\n"),
    c: `${LANGUAGE_PREFIX.c}/*\n${neutral}\n*/`,
    cpp: `${LANGUAGE_PREFIX.cpp}/*\n${neutral}\n*/`,
    java: `${LANGUAGE_PREFIX.java}/*\n${neutral}\n*/`,
    python: spec.referencePython,
    javascript: `${LANGUAGE_PREFIX.javascript}${spec.referenceTypeScript
      .replaceAll(": string", "")
      .replaceAll(": number", "")
      .replaceAll(": boolean", "")
      .replaceAll(": string[]", "")
      .replaceAll(": number[]", "")
      .replaceAll("const ", "let ")}`,
    typescript: spec.referenceTypeScript,
    csharp: `${LANGUAGE_PREFIX.csharp}/*\n${neutral}\n*/`,
    go: `${LANGUAGE_PREFIX.go}/*\n${neutral}\n*/`,
    rust: `${LANGUAGE_PREFIX.rust}/*\n${neutral}\n*/`,
    kotlin: `${LANGUAGE_PREFIX.kotlin}/*\n${neutral}\n*/`,
    swift: `${LANGUAGE_PREFIX.swift}/*\n${neutral}\n*/`,
  };
}

function makeContent<I>(spec: ModuleSpec<I>, arabic: boolean): AlgorithmContent {
  const howEn = spec.pseudocode.map((line) => `Follow the transition: ${line}.`);
  const howAr = spec.pseudocode.map((line) => `اتبع الانتقال الموضح في السطر: ${line}.`);
  return {
    overview: arabic
      ? `${spec.conceptAr} تعرض الرسوم كل قرار وسيط، لذلك يمكن فحص صحة التنفيذ خطوة بخطوة.`
      : `${spec.concept} Every decision is emitted as an immutable frame so the execution can be inspected step by step.`,
    howItWorks: arabic ? howAr : howEn,
    complexity: {
      time: {
        best: spec.complexity.best,
        average: spec.complexity.average,
        worst: spec.complexity.worst,
      },
      space: spec.complexity.space,
      notes: arabic
        ? "تفترض الحدود تمثيل الرسم بقائمة تجاور، ما لم يذكر خلاف ذلك."
        : "Bounds assume an adjacency-list representation unless noted otherwise.",
    },
    applications: arabic ? spec.applicationsAr : spec.applications,
    advantages: arabic
      ? ["يعرض الحالة الداخلية بوضوح.", "نتيجته حتمية لنفس المدخل.", "يتعامل صراحة مع الحالات غير الممكنة."]
      : ["Exposes its internal state clearly.", "Produces a deterministic trace for the same input.", "Reports impossible cases explicitly."],
    disadvantages: arabic
      ? spec.caveatsAr
      : spec.caveats,
    commonMistakes: arabic
      ? [
          "تجاهل اتجاه الحافة أو وزنها.",
          "تغيير البنية أثناء إنشاء لقطة سابقة.",
          "إعلان النجاح قبل التحقق من شرط الخوارزمية كاملاً.",
        ]
      : [
          "Ignoring edge direction or weight semantics.",
          "Mutating data already captured by an earlier frame.",
          "Declaring success before the complete algorithm condition is verified.",
        ],
    interviewQuestions: arabic
      ? [
          `ما الخاصية التي تجعل ${spec.titleAr} صحيحة؟`,
          "ما أسوأ مدخل زمني لهذه الخوارزمية؟",
          "كيف تكتشف الخوارزمية أن الحل غير موجود؟",
        ]
      : [
          `Which invariant proves ${spec.title} correct?`,
          "What input produces its worst-case running time?",
          "How does the algorithm prove that no solution exists?",
        ],
    summary: arabic ? spec.summaryAr : spec.summary,
    quiz: [
      {
        question: arabic ? "ما أهم شيء يجب أن يبقى صحيحاً بين خطوتين؟" : "What must remain valid between consecutive steps?",
        options: arabic
          ? ["ثابت الخوارزمية", "لون الواجهة فقط", "ترتيب أسماء العقد عشوائياً"]
          : ["The algorithm invariant", "Only the UI color", "A random vertex-name order"],
        answer: 0,
        explanation: arabic
          ? "الثابت يربط كل انتقال بالبرهان المنطقي للخوارزمية."
          : "The invariant connects each transition to the correctness proof.",
      },
      {
        question: arabic ? "كيف تعرض حالة لا يوجد فيها حل؟" : "How is a no-solution case represented?",
        options: arabic
          ? ["نتيجة صريحة مع سبب", "نتيجة ناجحة مزيفة", "إخفاء الخطوة الأخيرة"]
          : ["An explicit result with a reason", "A fabricated success", "By hiding the final step"],
        answer: 0,
        explanation: arabic
          ? "الخطوة النهائية تذكر سبب استحالة الحل."
          : "The final frame states why the requested result does not exist.",
      },
    ],
  };
}

export function createGraphModule<I>(spec: ModuleSpec<I>): AlgorithmModule<GraphFrame, I> {
  return {
    slug: spec.slug,
    title: spec.title,
    titleAr: spec.titleAr,
    category: "graphs",
    difficulty: spec.difficulty,
    tags: spec.tags,
    tagsAr: spec.tagsAr,
    summary: spec.summary,
    summaryAr: spec.summaryAr,
    renderer: "graph",
    pseudocode: spec.pseudocode,
    code: makeCode(spec as ModuleSpec<unknown>),
    content: makeContent(spec, false),
    contentAr: makeContent(spec, true),
    inputFields: spec.inputFields,
    defaultInput: spec.defaultInput,
    parseInput: spec.parseInput,
    serializeInput: spec.serializeInput,
    generate: spec.generate,
  };
}

export function metaOf<I>(mod: AlgorithmModule<GraphFrame, I>): AlgorithmMeta {
  return {
    slug: mod.slug,
    title: mod.title,
    titleAr: mod.titleAr,
    category: mod.category,
    difficulty: mod.difficulty,
    tags: mod.tags,
    tagsAr: mod.tagsAr,
    summary: mod.summary,
    summaryAr: mod.summaryAr,
    renderer: mod.renderer,
  };
}

export function parseNodes(text: string, maximum = 12): string[] {
  const nodes = text
    .split(/[,\s;]+/)
    .map((node) => node.trim())
    .filter(Boolean);
  if (nodes.length === 0) throw new Error("Enter at least one vertex.");
  if (nodes.some((node) => !/^[A-Za-z0-9_]+$/.test(node)))
    throw new Error("Vertex names may contain letters, digits, and underscores only.");
  const unique = [...new Set(nodes)].sort();
  if (unique.length !== nodes.length) throw new Error("Vertex names must be unique.");
  if (unique.length > maximum) throw new Error(`Maximum ${maximum} vertices.`);
  return unique;
}

export function parseEdges(
  text: string,
  nodes: string[],
  options: { directed: boolean; weighted?: boolean; positive?: boolean; allowSelf?: boolean },
): Edge[] {
  const parts = text
    .split(/[,\n;]+/)
    .map((edge) => edge.trim())
    .filter(Boolean);
  const edges: Edge[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const expression = options.weighted
      ? options.directed
        ? /^([A-Za-z0-9_]+)\s*>\s*([A-Za-z0-9_]+)\s*:\s*(-?\d+)$/
        : /^([A-Za-z0-9_]+)\s*-\s*([A-Za-z0-9_]+)\s*:\s*(-?\d+)$/
      : options.directed
        ? /^([A-Za-z0-9_]+)\s*>\s*([A-Za-z0-9_]+)$/
        : /^([A-Za-z0-9_]+)\s*-\s*([A-Za-z0-9_]+)$/;
    const match = part.match(expression);
    if (!match) {
      const sample = options.weighted
        ? options.directed
          ? "A>B:4"
          : "A-B:4"
        : options.directed
          ? "A>B"
          : "A-B";
      throw new Error(`"${part}" is invalid. Use ${sample}.`);
    }
    const from = match[1];
    const to = match[2];
    if (!nodes.includes(from) || !nodes.includes(to))
      throw new Error(`Edge "${part}" references a vertex absent from the vertex list.`);
    if (from === to && !options.allowSelf) throw new Error(`Self-loop "${part}" is not allowed.`);
    const weight = options.weighted ? Number(match[3]) : undefined;
    if (options.positive && (weight ?? 0) <= 0) throw new Error("Capacities must be positive integers.");
    const key = options.directed
      ? `${from}>${to}`
      : [from, to].sort().join("-");
    if (seen.has(key)) throw new Error(`Duplicate edge "${part}".`);
    seen.add(key);
    edges.push({ from, to, weight });
  }
  return edges;
}

export function requireVertex(nodes: string[], value: string | undefined, label: string): string {
  const node = (value ?? "").trim();
  if (!nodes.includes(node)) throw new Error(`${label} "${node}" is not in the vertex list.`);
  return node;
}

export function serializeEdges(edges: Edge[], directed: boolean, weighted = false): string {
  return edges
    .map((edge) => `${edge.from}${directed ? ">" : "-"}${edge.to}${weighted ? `:${edge.weight}` : ""}`)
    .join(", ");
}

export function adjacency(nodes: string[], edges: Edge[], directed: boolean): Map<string, string[]> {
  const result = new Map(nodes.map((node) => [node, [] as string[]]));
  for (const edge of edges) {
    result.get(edge.from)!.push(edge.to);
    if (!directed) result.get(edge.to)!.push(edge.from);
  }
  for (const neighbors of result.values()) neighbors.sort();
  return result;
}

export function weightedAdjacency(nodes: string[], edges: Edge[]): Map<string, { to: string; weight: number }[]> {
  const result = new Map(nodes.map((node) => [node, [] as { to: string; weight: number }[]]));
  for (const edge of edges) result.get(edge.from)!.push({ to: edge.to, weight: edge.weight ?? 1 });
  for (const neighbors of result.values()) neighbors.sort((a, b) => a.to.localeCompare(b.to) || a.weight - b.weight);
  return result;
}

export function edgeKey(from: string, to: string): string {
  return `${from}->${to}`;
}

export function undirectedEdgeKey(edge: Edge, from: string, to: string): string {
  if (edge.from === from && edge.to === to) return edgeKey(edge.from, edge.to);
  if (edge.from === to && edge.to === from) return edgeKey(edge.from, edge.to);
  return edgeKey(from, to);
}

export type SnapshotOptions = {
  directed: boolean;
  weighted?: boolean;
  nodeStates?: Record<string, CellState>;
  edgeStates?: Record<string, CellState>;
  annotations?: Record<string, string>;
  aux?: { label: string; values: (string | number)[] }[];
  note?: string;
};

export function graphFrame(nodes: string[], edges: Edge[], options: SnapshotOptions): GraphFrame {
  const layout = circularLayout(nodes);
  return {
    nodes: nodes.map((id) => ({ id, label: id, ...layout[id] })),
    edges: edges.map((edge) => ({ ...edge })),
    directed: options.directed,
    weighted: options.weighted,
    nodeStates: { ...(options.nodeStates ?? {}) },
    edgeStates: { ...(options.edgeStates ?? {}) },
    nodeAnnotations: { ...(options.annotations ?? {}) },
    aux: (options.aux ?? []).map((row) => ({ label: row.label, values: [...row.values] })),
    note: options.note,
  };
}

export function addStep(
  steps: Step<GraphFrame>[],
  frame: GraphFrame,
  description: string,
  descriptionAr: string,
  codeLine: number,
  phase: string,
  counters?: Record<string, number>,
): void {
  steps.push({
    frame,
    description,
    descriptionAr,
    codeLine,
    phase,
    counters,
    why: `This ${phase} transition preserves the algorithm's correctness invariant.`,
    whyAr: `يحافظ انتقال ${phase} على ثابت صحة الخوارزمية.`,
    debug: {
      operation: phase,
      dataStructures: (frame.aux ?? []).map((row) => ({ label: row.label, values: [...row.values] })),
    },
  });
}

export function defaultNodes(level: Level): string[] {
  const count = Math.min(4 + level, 9);
  return Array.from({ length: count }, (_, index) => String.fromCharCode(65 + index));
}

export function randomConnectedEdges(nodes: string[], rng: RNG, directed: boolean): Edge[] {
  const edges: Edge[] = [];
  const seen = new Set<string>();
  const add = (from: string, to: string) => {
    const key = directed ? `${from}>${to}` : [from, to].sort().join("-");
    if (from === to || seen.has(key)) return;
    seen.add(key);
    edges.push({ from, to });
  };
  for (let index = 1; index < nodes.length; index++) {
    const parent = nodes[rng.int(0, index - 1)];
    if (directed || rng.next() < 0.5) add(parent, nodes[index]);
    else add(nodes[index], parent);
  }
  for (let count = 0; count < Math.floor(nodes.length / 2); count++) {
    add(nodes[rng.int(0, nodes.length - 1)], nodes[rng.int(0, nodes.length - 1)]);
  }
  return edges.sort((a, b) => `${a.from}${a.to}`.localeCompare(`${b.from}${b.to}`));
}

export const vertexField: InputField = {
  key: "nodes",
  label: "Vertices",
  labelAr: "العقد",
  placeholder: "A, B, C, D",
  help: "Comma-separated unique vertex names. Include isolated vertices here.",
  helpAr: "أسماء عقد فريدة مفصولة بفواصل. أضف العقد المعزولة هنا.",
  list: true,
};

export function edgeField(directed: boolean, weighted = false, capacity = false): InputField {
  const sample = weighted
    ? directed
      ? "A>B:4, B>C:-2"
      : "A-B:4, B-C:2"
    : directed
      ? "A>B, B>C"
      : "A-B, B-C";
  return {
    key: "edges",
    label: capacity ? "Capacity edges" : weighted ? "Weighted edges" : "Edges",
    labelAr: capacity ? "حواف السعة" : weighted ? "الحواف الموزونة" : "الحواف",
    placeholder: sample,
    help: `Comma-separated ${directed ? "directed" : "undirected"} edges in the form ${sample.split(",")[0]}.`,
    helpAr: `حواف ${directed ? "موجهة" : "غير موجهة"} مفصولة بفواصل بالصيغة ${sample.split(",")[0]}.`,
    list: true,
  };
}

export const startField: InputField = {
  key: "start",
  label: "Start",
  labelAr: "البداية",
  placeholder: "A",
  help: "Starting vertex.",
  helpAr: "عقدة البداية.",
};

export const targetField: InputField = {
  key: "target",
  label: "Target",
  labelAr: "الهدف",
  placeholder: "D",
  help: "Destination vertex.",
  helpAr: "عقدة الهدف.",
  search: true,
};
