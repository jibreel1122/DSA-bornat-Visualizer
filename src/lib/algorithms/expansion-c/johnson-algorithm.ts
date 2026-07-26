import type { GraphFrame, Step } from "@/lib/engine/types";
import {
  addStep,
  createGraphModule,
  defaultNodes,
  edgeField,
  edgeKey,
  graphFrame,
  parseEdges,
  parseNodes,
  serializeEdges,
  vertexField,
  weightedAdjacency,
  type Edge,
  type GraphInput,
} from "./common";

const INF = Number.POSITIVE_INFINITY;
const fmt = (value: number) => value === INF ? "∞" : String(value);

function defaultWeighted(level: number, rng: { int(min: number, max: number): number }): GraphInput {
  const nodes = defaultNodes(level as 1 | 2 | 3 | 4 | 5);
  const edges: Edge[] = [];
  const seen = new Set<string>();
  const add = (from: string, to: string, weight: number) => {
    const key = `${from}>${to}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ from, to, weight });
  };
  for (let index = 1; index < nodes.length; index++) {
    add(nodes[rng.int(0, index - 1)], nodes[index], rng.int(-3, 9));
  }
  for (let index = 0; index + 2 < nodes.length; index += 2)
    add(nodes[index], nodes[index + 2], rng.int(1, 8));
  return { nodes, edges };
}

function generate(input: GraphInput): Step<GraphFrame>[] {
  const { nodes, edges } = input;
  const steps: Step<GraphFrame>[] = [];
  const h = Object.fromEntries(nodes.map((node) => [node, 0])) as Record<string, number>;
  let relaxations = 0;
  let changed = false;

  const potentialFrame = (active?: Edge, note?: string) => graphFrame(nodes, edges, {
    directed: true,
    weighted: true,
    nodeStates: active ? { [active.from]: "visited", [active.to]: "compare" } : {},
    edgeStates: active ? { [edgeKey(active.from, active.to)]: "active" } : {},
    annotations: Object.fromEntries(nodes.map((node) => [node, `h=${h[node]}`])),
    aux: [{ label: "Potentials", values: nodes.map((node) => `${node}:${h[node]}`) }],
    note,
  });

  addStep(
    steps,
    potentialFrame(undefined, "Equivalent super-source has a zero edge to every vertex"),
    "Initialize every Bellman-Ford potential to 0 using an implicit super-source.",
    "هيّئ كل جهد في بيلمان-فورد إلى 0 باستخدام مصدر فائق ضمني.",
    1,
    "initialize",
    { relaxations },
  );
  for (let pass = 1; pass <= nodes.length; pass++) {
    changed = false;
    for (const edge of edges) {
      relaxations++;
      const candidate = h[edge.from] + edge.weight!;
      if (candidate < h[edge.to]) {
        h[edge.to] = candidate;
        changed = true;
        addStep(
          steps,
          potentialFrame(edge, `Bellman-Ford pass ${pass}`),
          `Relax ${edge.from}→${edge.to}; h[${edge.to}] becomes ${candidate}.`,
          `خفف ${edge.from}→${edge.to}؛ تصبح h[${edge.to}] = ${candidate}.`,
          3,
          "potential-relax",
          { relaxations },
        );
      }
    }
    if (!changed) break;
    if (pass === nodes.length) {
      addStep(
        steps,
        potentialFrame(undefined, "A relaxation on pass |V| proves a negative cycle"),
        "A potential still improves after |V|−1 passes, so the graph has a negative cycle.",
        "ما زال جهد يتحسن بعد |V|−1 جولة، لذلك يحتوي الرسم دورة سالبة.",
        5,
        "complete",
        { relaxations },
      );
      return steps;
    }
  }

  const reweighted = edges.map((edge) => ({
    ...edge,
    weight: edge.weight! + h[edge.from] - h[edge.to],
  }));
  addStep(
    steps,
    graphFrame(nodes, reweighted, {
      directed: true,
      weighted: true,
      annotations: Object.fromEntries(nodes.map((node) => [node, `h=${h[node]}`])),
      aux: [{ label: "Reweighted edges", values: reweighted.map((edge) => `${edge.from}>${edge.to}:${edge.weight}`) }],
      note: "Every reweighted edge is non-negative",
    }),
    "Reweight each edge with w′(u,v)=w(u,v)+h[u]−h[v].",
    "أعد وزن كل حافة بالصيغة w′(u,v)=w(u,v)+h[u]−h[v].",
    6,
    "reweight",
    { relaxations },
  );

  const adj = weightedAdjacency(nodes, reweighted);
  const allDistances: Record<string, Record<string, number>> = {};
  let settled = 0;
  for (const source of nodes) {
    const dist = Object.fromEntries(nodes.map((node) => [node, INF])) as Record<string, number>;
    const done = new Set<string>();
    dist[source] = 0;
    addStep(
      steps,
      graphFrame(nodes, reweighted, {
        directed: true,
        weighted: true,
        nodeStates: { [source]: "active" },
        annotations: Object.fromEntries(nodes.map((node) => [node, fmt(dist[node])])),
        aux: [{ label: "Dijkstra source", values: [source] }],
      }),
      `Start Dijkstra on non-negative reweighted edges from ${source}.`,
      `ابدأ دايكسترا من ${source} على الحواف المعاد وزنها غير السالبة.`,
      7,
      "dijkstra-start",
      { relaxations, settled },
    );
    while (done.size < nodes.length) {
      const node = nodes
        .filter((candidate) => !done.has(candidate))
        .sort((a, b) => dist[a] - dist[b] || a.localeCompare(b))[0];
      if (!node || dist[node] === INF) break;
      done.add(node);
      settled++;
      addStep(
        steps,
        graphFrame(nodes, reweighted, {
          directed: true,
          weighted: true,
          nodeStates: Object.fromEntries(nodes.map((candidate) => [
            candidate,
            candidate === node ? "compare" : done.has(candidate) ? "visited" : "default",
          ])),
          annotations: Object.fromEntries(nodes.map((candidate) => [candidate, fmt(dist[candidate])])),
          aux: [{ label: "Dijkstra source", values: [source] }],
        }),
        `Settle ${node} at reweighted distance ${dist[node]}.`,
        `ثبّت ${node} عند المسافة المعاد وزنها ${dist[node]}.`,
        9,
        "settle",
        { relaxations, settled },
      );
      for (const edge of adj.get(node) ?? []) {
        relaxations++;
        if (dist[node] + edge.weight < dist[edge.to]) {
          dist[edge.to] = dist[node] + edge.weight;
          addStep(
            steps,
            graphFrame(nodes, reweighted, {
              directed: true,
              weighted: true,
              nodeStates: { [node]: "visited", [edge.to]: "active" },
              edgeStates: { [edgeKey(node, edge.to)]: "active" },
              annotations: Object.fromEntries(nodes.map((candidate) => [candidate, fmt(dist[candidate])])),
              aux: [{ label: "Dijkstra source", values: [source] }],
            }),
            `Relax ${node}→${edge.to}; d′[${edge.to}]=${dist[edge.to]}.`,
            `خفف ${node}→${edge.to}؛ d′[${edge.to}]=${dist[edge.to]}.`,
            10,
            "dijkstra-relax",
            { relaxations, settled },
          );
        }
      }
    }
    allDistances[source] = Object.fromEntries(nodes.map((target) => [
      target,
      dist[target] === INF ? INF : dist[target] - h[source] + h[target],
    ]));
  }

  addStep(
    steps,
    graphFrame(nodes, edges, {
      directed: true,
      weighted: true,
      nodeStates: Object.fromEntries(nodes.map((node) => [node, "found"])),
      aux: nodes.map((source) => ({
        label: `Distances from ${source}`,
        values: nodes.map((target) => `${target}:${fmt(allDistances[source][target])}`),
      })),
      note: "All-pairs shortest distances restored to original weights",
    }),
    "Restore original distances for every source-target pair.",
    "استعد المسافات الأصلية لكل زوج مصدر وهدف.",
    11,
    "complete",
    { relaxations, settled },
  );
  return steps;
}

const mod = createGraphModule<GraphInput>({
  slug: "johnson-algorithm",
  title: "Johnson's All-Pairs Shortest Paths",
  titleAr: "خوارزمية جونسون لأقصر المسارات بين كل الأزواج",
  difficulty: "Advanced",
  tags: ["graph", "shortest path", "Bellman-Ford", "Dijkstra"],
  tagsAr: ["رسم بياني", "أقصر مسار", "بيلمان-فورد", "دايكسترا"],
  summary: "Combines Bellman-Ford reweighting with one Dijkstra run per vertex and detects negative cycles.",
  summaryAr: "تجمع إعادة الوزن ببيلمان-فورد مع تشغيل دايكسترا من كل عقدة وتكتشف الدورات السالبة.",
  pseudocode: [
    "procedure Johnson(G)",
    "  add an implicit super-source with zero edges; initialize potentials",
    "  run Bellman-Ford relaxations to compute h",
    "  update a potential whenever an edge relaxes",
    "  if pass |V| still changes h, report a negative cycle",
    "  reweight every edge w′=w+h[u]−h[v]",
    "  for each source s",
    "    initialize Dijkstra on non-negative reweighted edges",
    "    settle the minimum tentative-distance vertex",
    "    relax each outgoing reweighted edge",
    "  restore d(u,v)=d′(u,v)−h[u]+h[v]",
    "  return the all-pairs distance matrix",
  ],
  complexity: { best: "O(VE + V(E+V) log V)", average: "O(VE + V(E+V) log V)", worst: "O(VE + V(E+V) log V)", space: "O(V + E)" },
  concept: "Vertex potentials remove negative edge weights without changing which paths are shortest.",
  conceptAr: "تزيل جهود العقد الأوزان السالبة دون تغيير المسارات الأقصر.",
  applications: ["Sparse all-pairs routing", "Network cost analysis", "Graphs with negative credits but no negative cycles"],
  applicationsAr: ["توجيه كل الأزواج في الرسوم المتناثرة", "تحليل كلفة الشبكات", "رسوم بائتمانات سالبة دون دورات سالبة"],
  caveats: ["Any negative cycle makes finite shortest paths undefined.", "The Dijkstra phase must use reweighted, not original, edges."],
  caveatsAr: ["أي دورة سالبة تجعل أقصر المسارات غير معرفة.", "يجب أن تستخدم دايكسترا الحواف المعاد وزنها."],
  inputFields: [vertexField, edgeField(true, true)],
  defaultInput: defaultWeighted,
  parseInput: (fields) => {
    const nodes = parseNodes(fields.nodes ?? "", 10);
    return { nodes, edges: parseEdges(fields.edges ?? "", nodes, { directed: true, weighted: true }) };
  },
  serializeInput: (input) => ({ nodes: input.nodes.join(", "), edges: serializeEdges(input.edges, true, true) }),
  generate,
  referencePython: `import heapq
def johnson(nodes, edges):
    h = {u: 0 for u in nodes}
    for _ in nodes:
        changed = False
        for u, v, w in edges:
            if h[u] + w < h[v]: h[v] = h[u] + w; changed = True
        if not changed: break
    else: raise ValueError("negative cycle")
    adj = {u: [] for u in nodes}
    for u, v, w in edges: adj[u].append((v, w + h[u] - h[v]))
    answer = {}
    for source in nodes:
        dist = {u: float("inf") for u in nodes}; dist[source] = 0; heap = [(0, source)]
        while heap:
            d, u = heapq.heappop(heap)
            if d != dist[u]: continue
            for v, w in adj[u]:
                if d + w < dist[v]: dist[v] = d + w; heapq.heappush(heap, (dist[v], v))
        answer[source] = {v: dist[v] - h[source] + h[v] for v in nodes}
    return answer`,
  referenceTypeScript: `function johnson(nodes: string[], edges: { from: string; to: string; weight: number }[]) {
  const h = Object.fromEntries(nodes.map(u => [u, 0]));
  for (let pass = 0; pass < nodes.length; pass++) {
    let changed = false;
    for (const e of edges) if (h[e.from] + e.weight < h[e.to]) { h[e.to] = h[e.from] + e.weight; changed = true; }
    if (!changed) break; if (pass === nodes.length - 1) throw new Error("negative cycle");
  }
  return h;
}`,
});

export default mod;
