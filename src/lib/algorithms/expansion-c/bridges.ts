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
  type Edge,
  type GraphInput,
} from "./common";

function generate(input: GraphInput): Step<GraphFrame>[] {
  const { nodes, edges } = input;
  const adj = adjacency(nodes, edges, false);
  const discovery: Record<string, number> = {};
  const low: Record<string, number> = {};
  const parent: Record<string, string | null> = {};
  const bridges: Edge[] = [];
  const steps: Step<GraphFrame>[] = [];
  let time = 0;

  const states = (active?: string) => Object.fromEntries(nodes.map((node) => [
    node,
    node === active ? "compare" : discovery[node] ? "visited" : "default",
  ])) as GraphFrame["nodeStates"];
  const bridgeStates = () => Object.fromEntries(bridges.map((edge) => [edgeKey(edge.from, edge.to), "found" as const]));
  const snapshot = (active: string, description: string, descriptionAr: string, codeLine: number, phase: string) => {
    addStep(
      steps,
      graphFrame(nodes, edges, {
        directed: false,
        nodeStates: states(active),
        edgeStates: bridgeStates(),
        annotations: Object.fromEntries(nodes.map((node) => [
          node,
          discovery[node] ? `d=${discovery[node]}, low=${low[node]}` : "unseen",
        ])),
        aux: [{ label: "Bridges", values: bridges.map((edge) => `${edge.from}-${edge.to}`) }],
      }),
      description,
      descriptionAr,
      codeLine,
      phase,
      { discovered: time, bridges: bridges.length },
    );
  };

  const dfs = (node: string): void => {
    discovery[node] = low[node] = ++time;
    snapshot(node, `Discover ${node} with disc=low=${time}.`, `اكتشف ${node} مع disc=low=${time}.`, 3, "discover");
    for (const neighbor of adj.get(node) ?? []) {
      if (!discovery[neighbor]) {
        parent[neighbor] = node;
        snapshot(node, `Traverse DFS tree edge ${node}–${neighbor}.`, `اعبر حافة شجرة DFS ${node}–${neighbor}.`, 5, "tree-edge");
        dfs(neighbor);
        low[node] = Math.min(low[node], low[neighbor]);
        snapshot(node, `Propagate low[${neighbor}]=${low[neighbor]} to ${node}.`, `مرر low[${neighbor}]=${low[neighbor]} إلى ${node}.`, 7, "low-update");
        if (low[neighbor] > discovery[node]) {
          const original = edges.find((edge) =>
            (edge.from === node && edge.to === neighbor) || (edge.from === neighbor && edge.to === node))!;
          bridges.push(original);
          snapshot(node, `low[${neighbor}] > disc[${node}], so ${node}–${neighbor} is a bridge.`, `low[${neighbor}] > disc[${node}]، لذا ${node}–${neighbor} جسر.`, 9, "classify");
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
  const result = bridges.map((edge) => `${edge.from}-${edge.to}`).sort();
  addStep(
    steps,
    graphFrame(nodes, edges, {
      directed: false,
      nodeStates: states(),
      edgeStates: bridgeStates(),
      annotations: Object.fromEntries(nodes.map((node) => [node, `d=${discovery[node]}, low=${low[node]}`])),
      aux: [{ label: "Result", values: result.length ? result : ["none"] }],
      note: `${result.length} bridge(s)`,
    }),
    result.length ? `Bridges: ${result.join(", ")}.` : "The graph has no bridges.",
    result.length ? `الجسور: ${result.join("، ")}.` : "لا توجد جسور في الرسم.",
    11,
    "complete",
    { discovered: time, bridges: bridges.length },
  );
  return steps;
}

const mod = createGraphModule<GraphInput>({
  slug: "bridges",
  title: "Bridges (Tarjan Low-Link)",
  titleAr: "الجسور بخوارزمية تارجان",
  difficulty: "Advanced",
  tags: ["graph", "DFS", "low-link", "critical edge"],
  tagsAr: ["رسم بياني", "بحث بالعمق", "رابط منخفض", "حافة حرجة"],
  summary: "Finds edges whose removal increases the number of connected components.",
  summaryAr: "يجد الحواف التي يزيد حذفها عدد المكونات المتصلة.",
  pseudocode: [
    "procedure bridges(G)",
    "  start DFS in every unvisited component",
    "  assign discovery[u] = low[u] = next time",
    "  for each neighbor v of u",
    "    if v is unvisited, traverse tree edge u–v",
    "      recursively visit v",
    "      low[u] = min(low[u], low[v])",
    "      compare low[v] with discovery[u]",
    "      if low[v] > discovery[u], u–v is a bridge",
    "    else if v is not parent[u]",
    "      low[u] = min(low[u], discovery[v])",
    "  return all bridges",
  ],
  complexity: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)", space: "O(V)" },
  concept: "A DFS tree edge is a bridge exactly when its child subtree has no back edge to the parent or an ancestor.",
  conceptAr: "تكون حافة شجرة DFS جسراً عندما لا يملك فرع الابن حافة خلفية إلى الأب أو أحد أسلافه.",
  applications: ["Network resilience", "Road-network critical links", "Cluster decomposition"],
  applicationsAr: ["مرونة الشبكات", "الروابط الحرجة في الطرق", "تقسيم العناقيد"],
  caveats: ["Parallel edges need edge identities in a multigraph.", "The low-link condition is strict: low[v] > disc[u]."],
  caveatsAr: ["تحتاج الحواف المتوازية إلى معرفات في الرسم المتعدد.", "شرط low صارم: low[v] > disc[u]."],
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
  referencePython: `def bridges(adj):
    disc, low, parent, result = {}, {}, {}, []
    time = 0
    def dfs(u):
        nonlocal time
        time += 1; disc[u] = low[u] = time
        for v in sorted(adj[u]):
            if v not in disc:
                parent[v] = u; dfs(v); low[u] = min(low[u], low[v])
                if low[v] > disc[u]: result.append((u, v))
            elif v != parent.get(u): low[u] = min(low[u], disc[v])
    for u in sorted(adj):
        if u not in disc: parent[u] = None; dfs(u)
    return result`,
  referenceTypeScript: `function bridges(adj: Map<string, string[]>): string[][] {
  const disc = new Map<string, number>(), low = new Map<string, number>();
  const parent = new Map<string, string | null>(), result: string[][] = []; let time = 0;
  const dfs = (u: string) => {
    disc.set(u, ++time); low.set(u, time);
    for (const v of adj.get(u) ?? []) {
      if (!disc.has(v)) {
        parent.set(v, u); dfs(v); low.set(u, Math.min(low.get(u)!, low.get(v)!));
        if (low.get(v)! > disc.get(u)!) result.push([u, v]);
      } else if (v !== parent.get(u)) low.set(u, Math.min(low.get(u)!, disc.get(v)!));
    }
  };
  for (const u of adj.keys()) if (!disc.has(u)) { parent.set(u, null); dfs(u); }
  return result;
}`,
});

export default mod;
