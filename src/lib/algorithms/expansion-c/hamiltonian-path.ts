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
  serializeEdges,
  vertexField,
  type GraphInput,
} from "./common";

function generate(input: GraphInput): Step<GraphFrame>[] {
  const { nodes, edges } = input;
  const adj = adjacency(nodes, edges, false);
  const indexOf = new Map(nodes.map((node, index) => [node, index]));
  const failed = new Set<string>();
  const steps: Step<GraphFrame>[] = [];
  let statesTried = 0;
  let result: string[] = [];

  const trace = (path: string[], description: string, descriptionAr: string, codeLine: number, phase: string, rejected?: string) => {
    if (steps.length >= 4500) return;
    addStep(
      steps,
      graphFrame(nodes, edges, {
        directed: false,
        nodeStates: Object.fromEntries(nodes.map((node) => [
          node,
          node === rejected ? "discarded" : node === path.at(-1) ? "compare" : path.includes(node) ? "active" : "default",
        ])),
        edgeStates: Object.fromEntries(path.slice(1).map((node, index) => [edgeKey(path[index], node), "sorted"])),
        aux: [
          { label: "Current path", values: path },
          { label: "Visited count", values: [path.length, nodes.length] },
        ],
      }),
      description,
      descriptionAr,
      codeLine,
      phase,
      { statesTried },
    );
  };

  const search = (node: string, mask: number, path: string[]): boolean => {
    statesTried++;
    trace(path, `Try path ${path.join(" → ")}.`, `جرّب المسار ${path.join(" ← ")}.`, 4, "choose");
    if (path.length === nodes.length) {
      result = [...path];
      return true;
    }
    const key = `${node}:${mask}`;
    if (failed.has(key)) return false;
    for (const neighbor of adj.get(node) ?? []) {
      const bit = 1 << indexOf.get(neighbor)!;
      if ((mask & bit) !== 0) continue;
      path.push(neighbor);
      if (search(neighbor, mask | bit, path)) return true;
      path.pop();
      trace(path, `${neighbor} leads to a dead end; undo that choice.`, `${neighbor} تقود إلى طريق مسدود؛ تراجع عن الاختيار.`, 7, "backtrack", neighbor);
    }
    failed.add(key);
    return false;
  };

  for (const start of nodes) {
    const bit = 1 << indexOf.get(start)!;
    trace([start], `Start a candidate path at ${start}.`, `ابدأ مساراً مرشحاً عند ${start}.`, 2, "new-start");
    if (search(start, bit, [start])) break;
  }

  addStep(
    steps,
    graphFrame(nodes, edges, {
      directed: false,
      nodeStates: Object.fromEntries(nodes.map((node) => [node, result.includes(node) ? "found" : "discarded"])),
      edgeStates: Object.fromEntries(result.slice(1).map((node, index) => [edgeKey(result[index], node), "sorted"])),
      aux: [{ label: "Result path", values: result.length ? result : ["none"] }],
      note: result.length ? "Every vertex appears exactly once" : "No Hamiltonian path exists",
    }),
    result.length ? `Hamiltonian path: ${result.join(" → ")}.` : "Exhaustive memoized search proves that no Hamiltonian path exists.",
    result.length ? `مسار هاملتوني: ${result.join(" ← ")}.` : "يثبت البحث الشامل المحفوظ عدم وجود مسار هاملتوني.",
    9,
    "complete",
    { statesTried },
  );
  return steps;
}

const mod = createGraphModule<GraphInput>({
  slug: "hamiltonian-path",
  title: "Hamiltonian Path (Backtracking with Memoization)",
  titleAr: "المسار الهاملتوني بالتراجع والحفظ",
  difficulty: "Advanced",
  tags: ["graph", "Hamiltonian path", "backtracking", "bitmask"],
  tagsAr: ["رسم بياني", "مسار هاملتوني", "تراجع", "قناع بتات"],
  summary: "Searches for a path visiting every vertex exactly once and visualizes every choice and backtrack.",
  summaryAr: "يبحث عن مسار يزور كل عقدة مرة واحدة ويعرض كل اختيار وتراجع.",
  pseudocode: [
    "procedure hamiltonianPath(G)",
    "  try every vertex as a start",
    "  search(last, visitedMask, path)",
    "    record the current candidate path",
    "    if every vertex is visited, return success",
    "    try each unvisited neighbor of last",
    "      recurse after adding the neighbor",
    "      if it fails, remove the neighbor and backtrack",
    "    memoize the failed (last, visitedMask) state",
    "  return a path or no path",
  ],
  complexity: { best: "O(V)", average: "O(V²·2^V)", worst: "O(V²·2^V)", space: "O(V·2^V)" },
  concept: "A Hamiltonian path is a vertex-covering path; memoization prevents repeating the same endpoint and visited-set state.",
  conceptAr: "المسار الهاملتوني يغطي العقد، ويمنع الحفظ تكرار حالة الطرف ومجموعة العقد المزارة.",
  applications: ["Tour planning", "Genome assembly models", "Constraint and puzzle solving"],
  applicationsAr: ["تخطيط الجولات", "نماذج تجميع الجينوم", "حل القيود والألغاز"],
  caveats: ["The problem is NP-complete.", "A connected graph can still lack a Hamiltonian path."],
  caveatsAr: ["المسألة NP-complete.", "قد لا يملك الرسم المتصل مساراً هاملتونياً."],
  inputFields: [vertexField, edgeField(false)],
  defaultInput: (level, rng) => {
    const nodes = defaultNodes(level);
    return { nodes, edges: randomConnectedEdges(nodes, rng, false) };
  },
  parseInput: (fields) => {
    const nodes = parseNodes(fields.nodes ?? "", 9);
    return { nodes, edges: parseEdges(fields.edges ?? "", nodes, { directed: false }) };
  },
  serializeInput: (input) => ({ nodes: input.nodes.join(", "), edges: serializeEdges(input.edges, false) }),
  generate,
  referencePython: `from functools import lru_cache
def hamiltonian_path(adj):
    nodes = sorted(adj)
    @lru_cache(None)
    def search(u, visited):
        if visited == (1 << len(nodes)) - 1: return (u,)
        for v in adj[u]:
            bit = 1 << nodes.index(v)
            if not visited & bit:
                suffix = search(v, visited | bit)
                if suffix: return (u,) + suffix
    for u in nodes:
        result = search(u, 1 << nodes.index(u))
        if result: return list(result)
    return None`,
  referenceTypeScript: `function hamiltonianPath(adj: Map<string, string[]>): string[] {
  const nodes = [...adj.keys()], failed = new Set<string>();
  const search = (u: string, mask: number, path: string[]): string[] => {
    if (path.length === nodes.length) return path;
    const key = u + ":" + mask; if (failed.has(key)) return [];
    for (const v of adj.get(u) ?? []) {
      const bit = 1 << nodes.indexOf(v);
      if (!(mask & bit)) { const result = search(v, mask | bit, [...path, v]); if (result.length) return result; }
    }
    failed.add(key); return [];
  };
  for (const u of nodes) { const result = search(u, 1 << nodes.indexOf(u), [u]); if (result.length) return result; }
  return [];
}`,
});

export default mod;
