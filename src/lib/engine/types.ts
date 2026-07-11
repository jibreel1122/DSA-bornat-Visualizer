/**
 * Core engine contracts for the Bornat Data Structure Visualizer.
 *
 * Every algorithm is a self-contained module: metadata + educational content
 * + a pure `generate(input) => Step<Frame>[]` function. Frames are immutable
 * snapshots; the player simply moves a cursor through the step array, which
 * makes play/pause/scrub/prev/next/export trivially correct.
 */

// ---------------------------------------------------------------------------
// Languages
// ---------------------------------------------------------------------------

export type Language =
  | "pseudocode"
  | "c"
  | "cpp"
  | "java"
  | "python"
  | "javascript"
  | "typescript"
  | "csharp"
  | "go"
  | "rust"
  | "kotlin"
  | "swift";

export const LANGUAGES: { id: Language; label: string; ext: string; prism: string }[] = [
  { id: "pseudocode", label: "Pseudocode", ext: "txt", prism: "clike" },
  { id: "c", label: "C", ext: "c", prism: "c" },
  { id: "cpp", label: "C++", ext: "cpp", prism: "cpp" },
  { id: "java", label: "Java", ext: "java", prism: "java" },
  { id: "python", label: "Python", ext: "py", prism: "python" },
  { id: "javascript", label: "JavaScript", ext: "js", prism: "javascript" },
  { id: "typescript", label: "TypeScript", ext: "ts", prism: "typescript" },
  { id: "csharp", label: "C#", ext: "cs", prism: "csharp" },
  { id: "go", label: "Go", ext: "go", prism: "go" },
  { id: "rust", label: "Rust", ext: "rs", prism: "rust" },
  { id: "kotlin", label: "Kotlin", ext: "kt", prism: "kotlin" },
  { id: "swift", label: "Swift", ext: "swift", prism: "swift" },
];

// ---------------------------------------------------------------------------
// Difficulty levels (dataset size presets)
// ---------------------------------------------------------------------------

export type Level = 1 | 2 | 3 | 4 | 5;

export const LEVELS: { level: Level; label: string }[] = [
  { level: 1, label: "Very Easy" },
  { level: 2, label: "Easy" },
  { level: 3, label: "Medium" },
  { level: 4, label: "Hard" },
  { level: 5, label: "Expert" },
];

// ---------------------------------------------------------------------------
// Seeded RNG (implementation in random.ts)
// ---------------------------------------------------------------------------

export interface RNG {
  /** float in [0, 1) */
  next(): number;
  /** integer in [min, max] inclusive */
  int(min: number, max: number): number;
  pick<T>(arr: readonly T[]): T;
  /** returns a new shuffled copy */
  shuffle<T>(arr: readonly T[]): T[];
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export interface Step<F = unknown> {
  /** Immutable snapshot of the structure at this moment. Never mutate frames. */
  frame: F;
  /** One-line narration shown under the canvas. */
  description: string;
  /** Arabic narration; shown instead of `description` under the Arabic locale. */
  descriptionAr?: string;
  /** 0-based line index into `pseudocode` to highlight. */
  codeLine?: number;
  /** Counters at this step — usually CUMULATIVE (e.g. { comparisons: 3, swaps: 1 }),
   *  but some are live gauges that can fall (e.g. recursion depth, live item count). */
  counters?: Record<string, number>;
}

/** Hard cap on generated steps; generators must stop and note truncation. */
export const MAX_STEPS = 5000;

// ---------------------------------------------------------------------------
// Educational content
// ---------------------------------------------------------------------------

export interface QuizQuestion {
  question: string;
  options: string[];
  /** index into options */
  answer: number;
  explanation: string;
}

export interface Complexity {
  time: { best: string; average: string; worst: string };
  space: string;
  notes?: string;
}

export interface AlgorithmContent {
  /** Plain-text paragraphs separated by blank lines. */
  overview: string;
  howItWorks: string[];
  complexity: Complexity;
  applications: string[];
  advantages: string[];
  disadvantages: string[];
  commonMistakes: string[];
  interviewQuestions: string[];
  summary: string;
  quiz: QuizQuestion[];
}

// ---------------------------------------------------------------------------
// Categories & renderers
// ---------------------------------------------------------------------------

export type CategoryId =
  | "sorting"
  | "searching"
  | "linked-lists"
  | "stacks-queues"
  | "hashing"
  | "trees"
  | "graphs"
  | "dynamic-programming"
  | "greedy"
  | "backtracking"
  | "recursion"
  | "strings"
  | "mathematics";

export type RendererKind =
  | "array"
  | "list"
  | "tree"
  | "graph"
  | "grid"
  | "table"
  | "callstack"
  | "string"
  | "hash";

// ---------------------------------------------------------------------------
// Frame contracts — one per renderer kind
// ---------------------------------------------------------------------------

export type CellState =
  | "default"
  | "active"
  | "compare"
  | "swap"
  | "sorted"
  | "pivot"
  | "found"
  | "discarded"
  | "visited"
  | "special";

export interface AuxRow {
  label: string;
  values: (string | number)[];
  states?: Record<number, CellState>;
}

export interface ArrayFrame {
  values: number[];
  /** index -> state */
  states?: Record<number, CellState>;
  pointers?: { index: number; label: string }[];
  /** active window, e.g. binary search range */
  range?: { from: number; to: number } | null;
  aux?: AuxRow[];
  note?: string;
}

export interface ListNodeF {
  id: string;
  value: string | number;
}
export interface ListFrame {
  /** nodes in left-to-right visual order */
  nodes: ListNodeF[];
  links: { from: string; to: string; kind?: "next" | "prev" | "loop" }[];
  pointers?: { nodeId: string | null; label: string }[];
  states?: Record<string, CellState>;
  doubly?: boolean;
  circular?: boolean;
  aux?: AuxRow[];
  note?: string;
}

export interface TreeNodeF {
  id: string;
  value: string | number;
  left?: string | null;
  right?: string | null;
  /** n-ary children (tries, heaps drawn as trees, B-trees) — overrides left/right */
  children?: (string | null)[];
  color?: "red" | "black";
  /** small superscript annotation, e.g. height or balance factor */
  extra?: string;
}
export interface TreeFrame {
  nodes: Record<string, TreeNodeF>;
  rootId: string | null;
  states?: Record<string, CellState>;
  aux?: AuxRow[];
  note?: string;
}

export interface GraphNodeF {
  id: string;
  label: string;
  /** normalized layout coords in [0,1]; renderer scales to canvas */
  x?: number;
  y?: number;
}
export interface GraphEdgeF {
  from: string;
  to: string;
  weight?: number;
}
export interface GraphFrame {
  nodes: GraphNodeF[];
  edges: GraphEdgeF[];
  directed?: boolean;
  weighted?: boolean;
  nodeStates?: Record<string, CellState>;
  /** key: `${from}->${to}` */
  edgeStates?: Record<string, CellState>;
  /** extra text under node label, e.g. dist: { A: "0", B: "∞" } */
  nodeAnnotations?: Record<string, string>;
  aux?: AuxRow[];
  note?: string;
}

export interface GridCellF {
  value?: string | number;
  state?: CellState;
}
export interface GridFrame {
  rows: number;
  cols: number;
  cells: GridCellF[][];
  aux?: AuxRow[];
  note?: string;
}

export interface TableFrame {
  rowLabels: string[];
  colLabels: string[];
  cells: { value: string | number | null; state?: CellState }[][];
  aux?: AuxRow[];
  note?: string;
}

export interface CallStackItem {
  id: string;
  label: string;
  detail?: string;
  state?: CellState;
}
export interface CallStackFrame {
  /** bottom of stack first */
  stack: CallStackItem[];
  output?: (string | number)[];
  aux?: AuxRow[];
  note?: string;
}

export interface StringFrame {
  text: { ch: string; state?: CellState }[];
  pattern?: { ch: string; state?: CellState }[];
  /** pattern offset relative to text start */
  shift?: number;
  aux?: AuxRow[];
  note?: string;
}

export interface HashBucketF {
  index: number;
  items: { key: string; state?: CellState }[];
  state?: CellState;
}
export interface HashFrame {
  buckets: HashBucketF[];
  /** true → chaining (multi-item buckets); false → open addressing */
  chained: boolean;
  aux?: AuxRow[];
  note?: string;
}

/** Maps renderer kind to its frame type (for documentation purposes). */
export type FrameOf<R extends RendererKind> = R extends "array"
  ? ArrayFrame
  : R extends "list"
    ? ListFrame
    : R extends "tree"
      ? TreeFrame
      : R extends "graph"
        ? GraphFrame
        : R extends "grid"
          ? GridFrame
          : R extends "table"
            ? TableFrame
            : R extends "callstack"
              ? CallStackFrame
              : R extends "string"
                ? StringFrame
                : R extends "hash"
                  ? HashFrame
                  : never;

// ---------------------------------------------------------------------------
// Algorithm module
// ---------------------------------------------------------------------------

export interface InputField {
  key: string;
  label: string;
  placeholder: string;
  help?: string;
  /** This field holds a comma-separated collection the live builder can insert/delete/edit into. */
  list?: boolean;
  /** This field is what the live "Search" action sets before re-generating. */
  search?: boolean;
}

export type AlgoDifficulty = "Beginner" | "Intermediate" | "Advanced";

export interface AlgorithmModule<F = unknown, I = unknown> {
  slug: string;
  title: string;
  /** Arabic title; shown instead of `title` under the Arabic locale. */
  titleAr?: string;
  category: CategoryId;
  difficulty: AlgoDifficulty;
  tags: string[];
  /** Arabic tags, index-aligned with `tags`. */
  tagsAr?: string[];
  /** one-liner for cards and search results */
  summary: string;
  /** Arabic summary; shown instead of `summary` under the Arabic locale. */
  summaryAr?: string;
  renderer: RendererKind;
  pseudocode: string[];
  code: Record<Language, string>;
  content: AlgorithmContent;
  /** Full Arabic educational content; used instead of `content` under the Arabic locale. */
  contentAr?: AlgorithmContent;
  inputFields: InputField[];
  defaultInput: (level: Level, rng: RNG) => I;
  /** Throws Error with a user-friendly message on invalid input. */
  parseInput: (fields: Record<string, string>) => I;
  serializeInput: (input: I) => Record<string, string>;
  generate: (input: I) => Step<F>[];
}

/** Lightweight metadata used by nav/search/category pages (no content). */
export interface AlgorithmMeta {
  slug: string;
  title: string;
  /** Arabic title; shown instead of `title` under the Arabic locale. */
  titleAr?: string;
  category: CategoryId;
  difficulty: AlgoDifficulty;
  tags: string[];
  /** Arabic tags, index-aligned with `tags`. */
  tagsAr?: string[];
  summary: string;
  /** Arabic summary; shown instead of `summary` under the Arabic locale. */
  summaryAr?: string;
  renderer: RendererKind;
}
