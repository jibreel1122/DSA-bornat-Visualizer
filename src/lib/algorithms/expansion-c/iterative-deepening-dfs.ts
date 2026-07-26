import type { GraphFrame, Step } from "@/lib/engine/types";
import {
  addStep,
  adjacency,
  createGraphModule,
  defaultNodes,
  edgeField,
  edgeKey,
  graphFrame,
  parseEdges,
  parseNodes,
  randomConnectedEdges,
  requireVertex,
  serializeEdges,
  startField,
  targetField,
  vertexField,
  type GraphInput,
} from "./common";

function generate(input: GraphInput): Step<GraphFrame>[] {
  const { nodes, edges } = input;
  const start = input.start!;
  const target = input.target!;
  const adj = adjacency(nodes, edges, true);
  const steps: Step<GraphFrame>[] = [];
  let visits = 0;
  let found: string[] | null = null;

  const depthLimited = (node: string, limit: number, path: string[]): boolean => {
    visits++;
    addStep(
      steps,
      graphFrame(nodes, edges, {
        directed: true,
        nodeStates: Object.fromEntries(nodes.map((candidate) => [
          candidate,
          candidate === node ? "compare" : path.includes(candidate) ? "active" : "default",
        ])),
        edgeStates: Object.fromEntries(path.slice(1).map((candidate, index) => [edgeKey(path[index], candidate), "sorted"])),
        aux: [
          { label: "Depth limit", values: [limit] },
          { label: "DFS path", values: path },
        ],
        note: `remaining depth = ${limit}`,
      }),
      `Visit ${node} with ${limit} levels remaining.`,
      `زُر ${node} مع بقاء ${limit} مستويات.`,
      4,
      "visit",
      { visits },
    );
    if (node === target) {
      found = [...path];
      return true;
    }
    if (limit === 0) return false;
    for (const neighbor of adj.get(node) ?? []) {
      if (path.includes(neighbor)) continue;
      path.push(neighbor);
      if (depthLimited(neighbor, limit - 1, path)) return true;
      path.pop();
      addStep(
        steps,
        graphFrame(nodes, edges, {
          directed: true,
          nodeStates: { [node]: "active", [neighbor]: "discarded" },
          aux: [{ label: "DFS path", values: path }],
          note: `Backtrack from ${neighbor}`,
        }),
        `${neighbor} did not reach the target within this limit; backtrack to ${node}.`,
        `لم تصل ${neighbor} إلى الهدف ضمن هذا الحد؛ ارجع إلى ${node}.`,
        7,
        "backtrack",
        { visits },
      );
    }
    return false;
  };

  for (let limit = 0; limit < nodes.length && !found; limit++) {
    addStep(
      steps,
      graphFrame(nodes, edges, {
        directed: true,
        nodeStates: { [start]: "active" },
        aux: [{ label: "Depth limit", values: [limit] }],
        note: `Start depth-limited DFS at limit ${limit}`,
      }),
      `Begin a fresh depth-limited DFS with limit ${limit}.`,
      `ابدأ DFS محدود العمق بحد ${limit}.`,
      2,
      "new-limit",
      { visits },
    );
    depthLimited(start, limit, [start]);
  }

  const readResult = (): string[] => found === null ? [] : [...found];
  const result = readResult();
  addStep(
    steps,
    graphFrame(nodes, edges, {
      directed: true,
      nodeStates: Object.fromEntries(nodes.map((node) => [node, result.includes(node) ? "found" : "discarded"])),
      edgeStates: Object.fromEntries(result.slice(1).map((node, index) => [edgeKey(result[index], node), "sorted"])),
      aux: [{ label: "Result path", values: result.length ? result : ["none"] }],
      note: result.length ? `Found at depth ${result.length - 1}` : "Target unreachable",
    }),
    result.length ? `Found ${target}: ${result.join(" → ")}.` : `${target} is unreachable from ${start}.`,
    result.length ? `وُجد ${target}: ${result.join(" ← ")}.` : `لا يمكن الوصول إلى ${target} من ${start}.`,
    8,
    "complete",
    { visits },
  );
  return steps;
}

const mod = createGraphModule<GraphInput>({
  slug: "iterative-deepening-dfs",
  title: "Iterative Deepening Depth-First Search",
  titleAr: "البحث المتزايد عمقاً أولاً",
  difficulty: "Intermediate",
  tags: ["graph", "DFS", "depth limit", "uninformed search"],
  tagsAr: ["رسم بياني", "بحث بالعمق", "حد العمق", "بحث غير موجه"],
  summary: "Repeats depth-limited DFS with increasing limits to find a shallow target using DFS-sized memory.",
  summaryAr: "يكرر DFS محدود العمق بحدود متزايدة ليجد هدفاً قريباً بذاكرة شبيهة بـDFS.",
  pseudocode: [
    "procedure IDDFS(G, start, target)",
    "  for limit = 0 to |V|-1",
    "    start a fresh depth-limited DFS",
    "    DLS(node, remaining, currentPath)",
    "      visit node",
    "      if node is target, return the path",
    "      recursively try each neighbor when remaining > 0",
    "      remove the failed neighbor and backtrack",
    "  return unreachable",
  ],
  complexity: { best: "O(1)", average: "O(b^d)", worst: "O(b^d)", space: "O(d)" },
  concept: "IDDFS combines BFS's shallowest-solution guarantee with DFS's linear-depth memory.",
  conceptAr: "تجمع IDDFS ضمان الحل الأقل عمقاً في BFS مع ذاكرة DFS الخطية في العمق.",
  applications: ["Game-tree search", "Puzzle solving", "Unknown-depth state spaces"],
  applicationsAr: ["بحث أشجار الألعاب", "حل الألغاز", "فضاءات الحالات مجهولة العمق"],
  caveats: ["Repeatedly revisits shallow vertices.", "Path-cycle checks are required on cyclic graphs."],
  caveatsAr: ["يعيد زيارة العقد القريبة.", "يلزم منع دورات المسار في الرسوم الدورية."],
  inputFields: [vertexField, edgeField(true), startField, targetField],
  defaultInput: (level, rng) => {
    const nodes = defaultNodes(level);
    return { nodes, edges: randomConnectedEdges(nodes, rng, true), start: nodes[0], target: nodes.at(-1)! };
  },
  parseInput: (fields) => {
    const nodes = parseNodes(fields.nodes ?? "");
    return {
      nodes,
      edges: parseEdges(fields.edges ?? "", nodes, { directed: true }),
      start: requireVertex(nodes, fields.start, "Start"),
      target: requireVertex(nodes, fields.target, "Target"),
    };
  },
  serializeInput: (input) => ({
    nodes: input.nodes.join(", "),
    edges: serializeEdges(input.edges, true),
    start: input.start!,
    target: input.target!,
  }),
  generate,
  referencePython: `def iddfs(adj, start, target):
    def dls(u, limit, path):
        if u == target: return path
        if limit == 0: return None
        for v in sorted(adj[u]):
            if v not in path:
                result = dls(v, limit - 1, path + [v])
                if result: return result
    for limit in range(len(adj)):
        result = dls(start, limit, [start])
        if result: return result
    return None`,
  referenceTypeScript: `function iddfs(adj: Map<string, string[]>, start: string, target: string): string[] {
  const dls = (u: string, limit: number, path: string[]): string[] => {
    if (u === target) return path;
    if (limit === 0) return [];
    for (const v of adj.get(u) ?? []) {
      if (path.includes(v)) continue;
      const result = dls(v, limit - 1, [...path, v]);
      if (result.length) return result;
    }
    return [];
  };
  for (let limit = 0; limit < adj.size; limit++) {
    const result = dls(start, limit, [start]);
    if (result.length) return result;
  }
  return [];
}`,
});

export default mod;
