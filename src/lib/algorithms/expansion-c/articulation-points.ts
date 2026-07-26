import type { GraphFrame, Step } from "@/lib/engine/types";
import {
  addStep,
  adjacency,
  createGraphModule,
  defaultNodes,
  edgeField,
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
  const discovery: Record<string, number> = {};
  const low: Record<string, number> = {};
  const parent: Record<string, string | null> = {};
  const points = new Set<string>();
  const steps: Step<GraphFrame>[] = [];
  let time = 0;

  const snapshot = (node: string, description: string, descriptionAr: string, codeLine: number, phase: string) => {
    addStep(
      steps,
      graphFrame(nodes, edges, {
        directed: false,
        nodeStates: Object.fromEntries(nodes.map((candidate) => [
          candidate,
          points.has(candidate) ? "found" : candidate === node ? "compare" : discovery[candidate] ? "visited" : "default",
        ])),
        annotations: Object.fromEntries(nodes.map((candidate) => [
          candidate,
          discovery[candidate] ? `d=${discovery[candidate]}, low=${low[candidate]}` : "unseen",
        ])),
        aux: [
          { label: "Articulation points", values: [...points].sort() },
          { label: "DFS time", values: [time] },
        ],
      }),
      description,
      descriptionAr,
      codeLine,
      phase,
      { discovered: time },
    );
  };

  const dfs = (node: string): void => {
    discovery[node] = low[node] = ++time;
    let children = 0;
    snapshot(node, `Discover ${node}: disc=${time}, low=${time}.`, `اكتشف ${node}: disc=${time} وlow=${time}.`, 3, "discover");
    for (const neighbor of adj.get(node) ?? []) {
      if (!discovery[neighbor]) {
        parent[neighbor] = node;
        children++;
        snapshot(node, `Use ${node}–${neighbor} as a DFS tree edge.`, `استخدم ${node}–${neighbor} كحافة شجرة DFS.`, 5, "tree-edge");
        dfs(neighbor);
        low[node] = Math.min(low[node], low[neighbor]);
        snapshot(node, `Return from ${neighbor}; low[${node}] becomes ${low[node]}.`, `عُد من ${neighbor}؛ تصبح low[${node}] = ${low[node]}.`, 7, "low-update");
        const rootCut = parent[node] == null && children > 1;
        const nonRootCut = parent[node] != null && low[neighbor] >= discovery[node];
        if (rootCut || nonRootCut) {
          points.add(node);
          snapshot(
            node,
            rootCut
              ? `${node} is a DFS root with ${children} child subtrees, so it is an articulation point.`
              : `low[${neighbor}] ≥ disc[${node}], so removing ${node} separates that subtree.`,
            rootCut
              ? `${node} جذر DFS وله ${children} فروع، لذا فهو نقطة فصل.`
              : `low[${neighbor}] ≥ disc[${node}]، لذا حذف ${node} يفصل ذلك الفرع.`,
            9,
            "classify",
          );
        }
      } else if (neighbor !== parent[node]) {
        low[node] = Math.min(low[node], discovery[neighbor]);
        snapshot(node, `Back edge ${node}–${neighbor} lowers low[${node}] to ${low[node]}.`, `الحافة الخلفية ${node}–${neighbor} تخفض low[${node}] إلى ${low[node]}.`, 11, "back-edge");
      }
    }
  };

  for (const node of nodes) {
    if (!discovery[node]) {
      parent[node] = null;
      snapshot(node, `Start a DFS component at ${node}.`, `ابدأ مكوّن DFS عند ${node}.`, 1, "component");
      dfs(node);
    }
  }

  addStep(
    steps,
    graphFrame(nodes, edges, {
      directed: false,
      nodeStates: Object.fromEntries(nodes.map((node) => [node, points.has(node) ? "found" : "visited"])),
      annotations: Object.fromEntries(nodes.map((node) => [node, `d=${discovery[node]}, low=${low[node]}`])),
      aux: [{ label: "Result", values: points.size ? [...points].sort() : ["none"] }],
      note: `${points.size} articulation point(s)`,
    }),
    points.size ? `Articulation points: ${[...points].sort().join(", ")}.` : "The graph has no articulation points.",
    points.size ? `نقاط الفصل: ${[...points].sort().join("، ")}.` : "لا توجد نقاط فصل في الرسم.",
    11,
    "complete",
    { discovered: time },
  );
  return steps;
}

const mod = createGraphModule<GraphInput>({
  slug: "articulation-points",
  title: "Articulation Points (Tarjan Low-Link)",
  titleAr: "نقاط الفصل بخوارزمية تارجان",
  difficulty: "Advanced",
  tags: ["graph", "DFS", "low-link", "connectivity"],
  tagsAr: ["رسم بياني", "بحث بالعمق", "رابط منخفض", "اتصال"],
  summary: "Finds vertices whose removal increases the number of connected components.",
  summaryAr: "يجد العقد التي يزيد حذفها عدد المكونات المتصلة.",
  pseudocode: [
    "procedure articulationPoints(G)",
    "  start DFS in every unvisited component",
    "  assign discovery[u] = low[u] = next time",
    "  for each neighbor v of u",
    "    if v is unvisited, make u–v a DFS tree edge",
    "      recursively visit v",
    "      low[u] = min(low[u], low[v])",
    "      test the root and non-root articulation conditions",
    "      add u when its condition is true",
    "    else if v is not parent[u]",
    "      low[u] = min(low[u], discovery[v])",
    "  return all articulation points",
  ],
  complexity: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)", space: "O(V)" },
  concept: "Low-link values reveal whether a DFS subtree can reconnect above its parent without using that parent.",
  conceptAr: "تكشف قيم low ما إذا كان فرع DFS يستطيع العودة فوق الأب من دون المرور به.",
  applications: ["Network vulnerability analysis", "Single points of failure", "Biconnected-component decomposition"],
  applicationsAr: ["تحليل هشاشة الشبكات", "نقاط الفشل المفردة", "تقسيم المكونات ثنائية الاتصال"],
  caveats: ["The root uses a different condition from non-root vertices.", "The algorithm is for undirected graphs."],
  caveatsAr: ["للجذر شرط مختلف عن بقية العقد.", "الخوارزمية للرسوم غير الموجهة."],
  inputFields: [vertexField, edgeField(false)],
  defaultInput: (level, rng) => {
    const nodes = defaultNodes(level);
    return { nodes, edges: randomConnectedEdges(nodes, rng, false) };
  },
  parseInput: (fields) => {
    const nodes = parseNodes(fields.nodes ?? "");
    return { nodes, edges: parseEdges(fields.edges ?? "", nodes, { directed: false }) };
  },
  serializeInput: (input) => ({ nodes: input.nodes.join(", "), edges: serializeEdges(input.edges, false) }),
  generate,
  referencePython: `def articulation_points(adj):
    disc, low, parent, cuts = {}, {}, {}, set()
    time = 0
    def dfs(u):
        nonlocal time
        time += 1; disc[u] = low[u] = time; children = 0
        for v in sorted(adj[u]):
            if v not in disc:
                parent[v] = u; children += 1; dfs(v)
                low[u] = min(low[u], low[v])
                if parent.get(u) is None and children > 1: cuts.add(u)
                if parent.get(u) is not None and low[v] >= disc[u]: cuts.add(u)
            elif v != parent.get(u): low[u] = min(low[u], disc[v])
    for u in sorted(adj):
        if u not in disc: parent[u] = None; dfs(u)
    return cuts`,
  referenceTypeScript: `function articulationPoints(adj: Map<string, string[]>): Set<string> {
  const disc = new Map<string, number>(), low = new Map<string, number>(), cuts = new Set<string>();
  const parent = new Map<string, string | null>(); let time = 0;
  const dfs = (u: string) => {
    disc.set(u, ++time); low.set(u, time); let children = 0;
    for (const v of adj.get(u) ?? []) {
      if (!disc.has(v)) {
        parent.set(v, u); children++; dfs(v); low.set(u, Math.min(low.get(u)!, low.get(v)!));
        if (parent.get(u) == null && children > 1) cuts.add(u);
        if (parent.get(u) != null && low.get(v)! >= disc.get(u)!) cuts.add(u);
      } else if (v !== parent.get(u)) low.set(u, Math.min(low.get(u)!, disc.get(v)!));
    }
  };
  for (const u of adj.keys()) if (!disc.has(u)) { parent.set(u, null); dfs(u); }
  return cuts;
}`,
});

export default mod;
