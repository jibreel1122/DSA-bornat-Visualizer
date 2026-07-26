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
  const color: Record<string, 0 | 1> = {};
  const queue: string[] = [];
  const steps: Step<GraphFrame>[] = [];
  let checked = 0;
  let conflict: [string, string] | null = null;

  const snapshot = (description: string, descriptionAr: string, codeLine: number, phase: string, active?: string) => {
    addStep(
      steps,
      graphFrame(nodes, edges, {
        directed: false,
        nodeStates: Object.fromEntries(nodes.map((node) => [
          node,
          conflict?.includes(node) ? "swap" : node === active ? "compare" : color[node] === 0 ? "active" : color[node] === 1 ? "special" : "default",
        ])),
        edgeStates: conflict ? { [edgeKey(conflict[0], conflict[1])]: "swap" } : {},
        annotations: Object.fromEntries(nodes.map((node) => [node, color[node] === undefined ? "uncolored" : `side ${color[node]}`])),
        aux: [
          { label: "Queue", values: queue },
          { label: "Left side", values: nodes.filter((node) => color[node] === 0) },
          { label: "Right side", values: nodes.filter((node) => color[node] === 1) },
        ],
      }),
      description,
      descriptionAr,
      codeLine,
      phase,
      { edgesChecked: checked },
    );
  };

  for (const root of nodes) {
    if (color[root] !== undefined) continue;
    color[root] = 0;
    queue.push(root);
    snapshot(`Start a new component: color ${root} with side 0.`, `ابدأ مكوّناً جديداً: لوّن ${root} بالجانب 0.`, 2, "component", root);
    while (queue.length && !conflict) {
      const node = queue.shift()!;
      snapshot(`Dequeue ${node} and inspect its neighbors.`, `أخرج ${node} وافحص جيرانها.`, 4, "dequeue", node);
      for (const neighbor of adj.get(node) ?? []) {
        checked++;
        if (color[neighbor] === undefined) {
          color[neighbor] = color[node] === 0 ? 1 : 0;
          queue.push(neighbor);
          snapshot(`Color ${neighbor} with the opposite side ${color[neighbor]}.`, `لوّن ${neighbor} بالجانب المقابل ${color[neighbor]}.`, 6, "color", neighbor);
        } else if (color[neighbor] === color[node]) {
          conflict = [node, neighbor];
          snapshot(`Conflict: ${node} and ${neighbor} share side ${color[node]}.`, `تعارض: ${node} و${neighbor} في الجانب نفسه ${color[node]}.`, 8, "conflict", node);
          break;
        } else {
          snapshot(`Edge ${node}–${neighbor} joins opposite sides, so it is valid.`, `الحافة ${node}–${neighbor} تصل جانبين مختلفين، فهي صحيحة.`, 7, "check-edge", neighbor);
        }
      }
    }
    if (conflict) break;
  }

  const bipartite = conflict === null;
  addStep(
    steps,
    graphFrame(nodes, edges, {
      directed: false,
      nodeStates: Object.fromEntries(nodes.map((node) => [
        node,
        conflict?.includes(node) ? "swap" : color[node] === 0 ? "active" : "special",
      ])),
      annotations: Object.fromEntries(nodes.map((node) => [node, `side ${color[node] ?? "?"}`])),
      aux: [
        { label: "Result", values: [bipartite ? "bipartite" : "not bipartite"] },
        { label: "Conflict edge", values: conflict ?? ["none"] },
      ],
      note: bipartite ? "A valid 2-coloring exists" : "No 2-coloring exists",
    }),
    bipartite ? "Every edge crosses the two sides; the graph is bipartite." : `The conflict ${conflict!.join("–")} proves the graph is not bipartite.`,
    bipartite ? "كل حافة تعبر بين الجانبين؛ الرسم ثنائي التقسيم." : `يثبت التعارض ${conflict!.join("–")} أن الرسم ليس ثنائي التقسيم.`,
    9,
    "complete",
    { edgesChecked: checked },
  );
  return steps;
}

const mod = createGraphModule<GraphInput>({
  slug: "bipartite-check",
  title: "Bipartite Graph Check",
  titleAr: "فحص الرسم ثنائي التقسيم",
  difficulty: "Intermediate",
  tags: ["graph", "BFS", "two-coloring", "odd cycle"],
  tagsAr: ["رسم بياني", "بحث بالعرض", "تلوين بلونين", "دورة فردية"],
  summary: "Two-colors every component and reports the first edge whose endpoints require the same color.",
  summaryAr: "يلوّن كل مكوّن بلونين ويبلغ عن أول حافة يضطر طرفاها إلى اللون نفسه.",
  pseudocode: [
    "procedure isBipartite(G)",
    "  for every uncolored component root",
    "    color root 0 and enqueue it",
    "    while queue is not empty",
    "      dequeue u",
    "      color every uncolored neighbor opposite to u",
    "      verify every already-colored neighbor has the opposite color",
    "      if an edge has equal endpoint colors, report conflict",
    "  continue with disconnected components",
    "  return true when no conflict exists",
  ],
  complexity: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)", space: "O(V)" },
  concept: "A graph is bipartite exactly when it can be two-colored, equivalently when it has no odd cycle.",
  conceptAr: "يكون الرسم ثنائي التقسيم إذا أمكن تلوينه بلونين، أي إذا لم يحتو دورة فردية.",
  applications: ["Matching problems", "Conflict-free scheduling", "Odd-cycle detection"],
  applicationsAr: ["مسائل المطابقة", "الجدولة دون تعارض", "اكتشاف الدورات الفردية"],
  caveats: ["Every disconnected component must be checked.", "A self-loop immediately violates bipartiteness."],
  caveatsAr: ["يجب فحص كل مكوّن منفصل.", "الحلقة الذاتية تنفي الثنائية فوراً."],
  inputFields: [vertexField, edgeField(false)],
  defaultInput: (level, rng) => {
    const nodes = defaultNodes(level);
    const edges = randomConnectedEdges(nodes, rng, false).filter((edge) =>
      (nodes.indexOf(edge.from) + nodes.indexOf(edge.to)) % 2 === 1);
    return { nodes, edges };
  },
  parseInput: (fields) => {
    const nodes = parseNodes(fields.nodes ?? "");
    return { nodes, edges: parseEdges(fields.edges ?? "", nodes, { directed: false, allowSelf: true }) };
  },
  serializeInput: (input) => ({ nodes: input.nodes.join(", "), edges: serializeEdges(input.edges, false) }),
  generate,
  referencePython: `from collections import deque
def is_bipartite(adj):
    color = {}
    for root in sorted(adj):
        if root in color: continue
        color[root] = 0; queue = deque([root])
        while queue:
            u = queue.popleft()
            for v in sorted(adj[u]):
                if v not in color: color[v] = 1 - color[u]; queue.append(v)
                elif color[v] == color[u]: return False, color
    return True, color`,
  referenceTypeScript: `function isBipartite(adj: Map<string, string[]>): boolean {
  const color = new Map<string, number>();
  for (const root of adj.keys()) {
    if (color.has(root)) continue;
    color.set(root, 0); const queue = [root];
    while (queue.length) {
      const u = queue.shift()!;
      for (const v of adj.get(u) ?? []) {
        if (!color.has(v)) { color.set(v, 1 - color.get(u)!); queue.push(v); }
        else if (color.get(v) === color.get(u)) return false;
      }
    }
  }
  return true;
}`,
});

export default mod;
