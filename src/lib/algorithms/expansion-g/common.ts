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

export type Edge = { from: string; to: string; weight: number };
export type GraphInput = {
  nodes: string[];
  edges: Edge[];
  start?: string;
  target?: string;
  left?: string[];
  iterations?: number;
  damping?: number;
  seed?: number;
};

export type GraphSpec = {
  slug: string;
  title: string;
  titleAr: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  summary: string;
  summaryAr: string;
  pseudocode: string[];
  directed: boolean;
  weighted: boolean;
  fields?: ("start" | "target" | "left" | "iterations" | "damping" | "seed")[];
  domain?: "binary" | "nonnegative" | "positive" | "any";
  defaultInput: (level: Level, rng: RNG) => GraphInput;
  generate: (input: GraphInput) => Step<GraphFrame>[];
};

export const vertexField: InputField = {
  key: "nodes",
  label: "Vertices",
  labelAr: "العُقد",
  placeholder: "A, B, C, D",
  help: "Comma-separated unique vertex names.",
  helpAr: "أسماء عُقد فريدة مفصولة بفواصل.",
  list: true,
};

export function edgeField(directed: boolean): InputField {
  return {
    key: "edges",
    label: "Weighted edges",
    labelAr: "الحواف الموزونة",
    placeholder: directed ? "A>B:3, B>C:1" : "A-B:3, B-C:1",
    help: `Use ${directed ? "A>B:3" : "A-B:3"}; weights are integers.`,
    helpAr: `استخدم الصيغة ${directed ? "A>B:3" : "A-B:3"}؛ الأوزان أعداد صحيحة.`,
    list: true,
  };
}

const EXTRA_FIELDS: Record<string, InputField> = {
  start: {
    key: "start",
    label: "Start/root",
    labelAr: "البداية/الجذر",
    placeholder: "A",
    help: "A vertex present in the graph.",
    helpAr: "عقدة موجودة في الرسم.",
  },
  target: {
    key: "target",
    label: "Target",
    labelAr: "الهدف",
    placeholder: "D",
    help: "A vertex present in the graph.",
    helpAr: "عقدة موجودة في الرسم.",
    search: true,
  },
  left: {
    key: "left",
    label: "Left partition",
    labelAr: "القسم الأيسر",
    placeholder: "A, B",
    help: "Vertices in the left bipartite partition.",
    helpAr: "عُقد القسم الأيسر في الرسم ثنائي التقسيم.",
    list: true,
  },
  iterations: {
    key: "iterations",
    label: "Iterations",
    labelAr: "التكرارات",
    placeholder: "12",
    help: "Integer from 1 to 50.",
    helpAr: "عدد صحيح من 1 إلى 50.",
  },
  damping: {
    key: "damping",
    label: "Damping",
    labelAr: "معامل التخميد",
    placeholder: "0.85",
    help: "A number greater than 0 and less than 1.",
    helpAr: "عدد أكبر من صفر وأقل من واحد.",
  },
  seed: {
    key: "seed",
    label: "Seed",
    labelAr: "البذرة",
    placeholder: "7",
    help: "Integer seed for reproducible contraction choices.",
    helpAr: "بذرة صحيحة لجعل اختيارات الدمج قابلة للتكرار.",
  },
};

export function parseNodes(text: string, maximum = 12): string[] {
  const nodes = text.split(/[,\s;]+/).map((value) => value.trim()).filter(Boolean);
  if (nodes.length === 0) throw new Error("Enter at least one vertex.");
  if (nodes.length > maximum) throw new Error(`Maximum ${maximum} vertices.`);
  if (nodes.some((node) => !/^[A-Za-z0-9_]+$/.test(node))) throw new Error("Use letters, digits, or underscores for vertices.");
  if (new Set(nodes).size !== nodes.length) throw new Error("Vertices must be unique.");
  return [...nodes].sort();
}

export function parseEdges(
  text: string,
  nodes: string[],
  directed: boolean,
  domain: GraphSpec["domain"] = "any",
): Edge[] {
  const expression = directed
    ? /^([A-Za-z0-9_]+)\s*>\s*([A-Za-z0-9_]+)\s*:\s*(-?\d+)$/
    : /^([A-Za-z0-9_]+)\s*-\s*([A-Za-z0-9_]+)\s*:\s*(-?\d+)$/;
  const seen = new Set<string>();
  return text.split(/[,\n;]+/).map((value) => value.trim()).filter(Boolean).map((value) => {
    const match = value.match(expression);
    if (!match) throw new Error(`Invalid edge "${value}".`);
    const [, from, to, rawWeight] = match;
    if (!nodes.includes(from) || !nodes.includes(to)) throw new Error(`Edge "${value}" references an unknown vertex.`);
    if (from === to) throw new Error("Self-loops are not supported by this visualizer.");
    const weight = Number(rawWeight);
    if (domain === "binary" && weight !== 0 && weight !== 1) throw new Error("Every weight must be 0 or 1.");
    if (domain === "nonnegative" && weight < 0) throw new Error("Weights must be nonnegative.");
    if (domain === "positive" && weight <= 0) throw new Error("Weights must be positive.");
    const key = directed ? `${from}>${to}` : [from, to].sort().join("-");
    if (seen.has(key)) throw new Error(`Duplicate edge "${value}".`);
    seen.add(key);
    return { from, to, weight };
  });
}

export function serializeEdges(edges: Edge[], directed: boolean): string {
  return edges.map((edge) => `${edge.from}${directed ? ">" : "-"}${edge.to}:${edge.weight}`).join(", ");
}

function codeFor(spec: GraphSpec): Record<Language, string> {
  const body = spec.pseudocode.join("\n");
  const named = `${spec.title}\n${body}`;
  return {
    pseudocode: body,
    c: `/* C reference: ${named} */`,
    cpp: `// C++ reference\n/* ${named} */`,
    java: `// Java reference\n/* ${named} */`,
    python: `# Python reference\n# ${named.replaceAll("\n", "\n# ")}`,
    javascript: `// JavaScript reference\n/* ${named} */`,
    typescript: `// TypeScript reference\n/* ${named} */`,
    csharp: `// C# reference\n/* ${named} */`,
    go: `// Go reference\n/* ${named} */`,
    rust: `// Rust reference\n/* ${named} */`,
    kotlin: `// Kotlin reference\n/* ${named} */`,
    swift: `// Swift reference\n/* ${named} */`,
  };
}

function content(spec: GraphSpec, ar: boolean): AlgorithmContent {
  return {
    overview: ar
      ? `${spec.summaryAr} تعرض كل لقطة قراراً حقيقياً من الخوارزمية ويمكن الرجوع إليه.`
      : `${spec.summary} Every frame records a real algorithm transition and is reversible.`,
    howItWorks: spec.pseudocode.map((line) => ar ? `نفّذ الخطوة: ${line}` : `Execute: ${line}`),
    complexity: {
      time: { best: "Depends on graph structure", average: "See algorithm trace", worst: "See algorithm definition" },
      space: "O(V + E)",
      notes: ar ? "تتضمن اللقطات البنى المساعدة المستخدمة فعلياً." : "Frames expose the actual auxiliary structures.",
    },
    applications: ar ? ["تحليل الشبكات", "المسارات والتحسين", "تعلم الخوارزميات"] : ["Network analysis", "Routing and optimization", "Algorithm education"],
    advantages: ar ? ["خطوات حتمية", "حالات فشل صريحة", "دعم للعقد المعزولة"] : ["Deterministic steps", "Explicit failure states", "Supports isolated vertices"],
    disadvantages: ar ? ["قد يزداد عدد الخطوات في الرسوم الكثيفة"] : ["Dense graphs can produce many frames"],
    commonMistakes: ar
      ? ["خلط اتجاه الحافة", "تجاهل مجال الأوزان", "اعتبار نتيجة جزئية نهائية"]
      : ["Reversing an edge", "Ignoring the weight domain", "Treating a partial result as final"],
    interviewQuestions: ar
      ? ["ما الثابت الذي يثبت صحة الخوارزمية؟", "كيف تتعامل مع رسم غير متصل؟"]
      : ["Which invariant proves correctness?", "How is a disconnected graph handled?"],
    summary: ar ? spec.summaryAr : spec.summary,
    quiz: [{
      question: ar ? "ما الذي يجب أن يبقى صحيحاً بين لقطتين؟" : "What must remain true between frames?",
      options: ar ? ["ثابت الخوارزمية", "لون العقدة فقط", "ترتيب عشوائي"] : ["The algorithm invariant", "Only node color", "A random order"],
      answer: 0,
      explanation: ar ? "الثابت يبرر كل انتقال." : "The invariant justifies every transition.",
    }],
  };
}

export function graphFrame(
  input: GraphInput,
  directed: boolean,
  options: {
    states?: Record<string, CellState>;
    edgeStates?: Record<string, CellState>;
    annotations?: Record<string, string>;
    aux?: { label: string; values: (string | number)[] }[];
    note?: string;
  } = {},
): GraphFrame {
  const layout = circularLayout(input.nodes);
  return {
    nodes: input.nodes.map((id) => ({ id, label: id, ...layout[id] })),
    edges: input.edges.map((edge) => ({ ...edge })),
    directed,
    weighted: true,
    nodeStates: { ...(options.states ?? {}) },
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
    why: `The ${phase} transition preserves the algorithm invariant.`,
    whyAr: `تحافظ خطوة ${phase} على ثابت صحة الخوارزمية.`,
    debug: {
      operation: phase,
      dataStructures: (frame.aux ?? []).map((row) => ({ label: row.label, values: [...row.values] })),
    },
  });
}

function parseNumber(raw: string | undefined, name: string, min: number, max: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${name} must be between ${min} and ${max}.`);
  return value;
}

export function createGraphModule(spec: GraphSpec): AlgorithmModule<GraphFrame, GraphInput> {
  const extras = spec.fields ?? [];
  return {
    slug: spec.slug,
    title: spec.title,
    titleAr: spec.titleAr,
    category: "graphs",
    difficulty: spec.difficulty,
    tags: ["graph", spec.title, "visualization"],
    tagsAr: ["رسم بياني", spec.titleAr, "تصوّر"],
    summary: spec.summary,
    summaryAr: spec.summaryAr,
    renderer: "graph",
    pseudocode: spec.pseudocode,
    code: codeFor(spec),
    content: content(spec, false),
    contentAr: content(spec, true),
    inputFields: [vertexField, edgeField(spec.directed), ...extras.map((field) => EXTRA_FIELDS[field])],
    defaultInput: spec.defaultInput,
    parseInput: (fields) => {
      const nodes = parseNodes(fields.nodes ?? "");
      const input: GraphInput = {
        nodes,
        edges: parseEdges(fields.edges ?? "", nodes, spec.directed, spec.domain),
      };
      if (extras.includes("start")) {
        if (!nodes.includes(fields.start)) throw new Error("Start/root must be a graph vertex.");
        input.start = fields.start;
      }
      if (extras.includes("target")) {
        if (!nodes.includes(fields.target)) throw new Error("Target must be a graph vertex.");
        input.target = fields.target;
      }
      if (extras.includes("left")) {
        input.left = parseNodes(fields.left ?? "", nodes.length);
        if (input.left.some((node) => !nodes.includes(node))) throw new Error("Left partition contains an unknown vertex.");
        if (input.left.length === nodes.length) throw new Error("Both bipartite partitions must be nonempty.");
      }
      if (extras.includes("iterations")) input.iterations = Math.floor(parseNumber(fields.iterations, "Iterations", 1, 50));
      if (extras.includes("damping")) input.damping = parseNumber(fields.damping, "Damping", Number.EPSILON, 1 - Number.EPSILON);
      if (extras.includes("seed")) input.seed = Math.floor(parseNumber(fields.seed, "Seed", 0, 2_147_483_647));
      return input;
    },
    serializeInput: (input) => {
      const fields: Record<string, string> = {
        nodes: input.nodes.join(", "),
        edges: serializeEdges(input.edges, spec.directed),
      };
      for (const extra of extras) {
        const value = input[extra];
        fields[extra] = Array.isArray(value) ? value.join(", ") : String(value ?? "");
      }
      return fields;
    },
    generate: spec.generate,
  };
}

export function metaOf(module: AlgorithmModule<GraphFrame, GraphInput>): AlgorithmMeta {
  const { slug, title, titleAr, category, difficulty, tags, tagsAr, summary, summaryAr, renderer } = module;
  return { slug, title, titleAr, category, difficulty, tags, tagsAr, summary, summaryAr, renderer };
}

export function edgeKey(from: string, to: string): string {
  return `${from}->${to}`;
}

export function adjacency(input: GraphInput, directed: boolean): Map<string, { to: string; weight: number; key: string }[]> {
  const result = new Map(input.nodes.map((node) => [node, [] as { to: string; weight: number; key: string }[]]));
  for (const edge of input.edges) {
    result.get(edge.from)!.push({ to: edge.to, weight: edge.weight, key: edgeKey(edge.from, edge.to) });
    if (!directed) result.get(edge.to)!.push({ to: edge.from, weight: edge.weight, key: edgeKey(edge.from, edge.to) });
  }
  for (const list of result.values()) list.sort((a, b) => a.to.localeCompare(b.to) || a.weight - b.weight);
  return result;
}

export function defaultNodes(level: Level): string[] {
  return Array.from({ length: Math.min(3 + level, 8) }, (_, index) => String.fromCharCode(65 + index));
}

export function defaultWeighted(
  level: Level,
  rng: RNG,
  directed: boolean,
  domain: "binary" | "nonnegative" | "positive" | "any" = "positive",
): GraphInput {
  const nodes = defaultNodes(level);
  const edges: Edge[] = [];
  const seen = new Set<string>();
  const add = (from: string, to: string, weight: number) => {
    const key = directed ? `${from}>${to}` : [from, to].sort().join("-");
    if (from === to || seen.has(key)) return;
    seen.add(key);
    edges.push({ from, to, weight });
  };
  for (let index = 1; index < nodes.length; index++) {
    const parent = nodes[rng.int(0, index - 1)];
    const weight = domain === "binary" ? rng.int(0, 1) : domain === "any" ? rng.int(-2, 8) : rng.int(domain === "positive" ? 1 : 0, 9);
    add(parent, nodes[index], weight);
  }
  for (let count = 0; count < Math.floor(nodes.length / 2); count++) {
    const weight = domain === "binary" ? rng.int(0, 1) : domain === "any" ? rng.int(-2, 8) : rng.int(domain === "positive" ? 1 : 0, 9);
    add(nodes[rng.int(0, nodes.length - 1)], nodes[rng.int(0, nodes.length - 1)], weight);
  }
  edges.sort((a, b) => `${a.from}${a.to}`.localeCompare(`${b.from}${b.to}`));
  return { nodes, edges, start: nodes[0], target: nodes.at(-1) };
}
