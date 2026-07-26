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
  requireVertex,
  serializeEdges,
  startField,
  vertexField,
  weightedAdjacency,
  type Edge,
  type GraphInput,
} from "./common";

const INF = Number.POSITIVE_INFINITY;
const fmt = (value: number) => value === INF ? "∞" : String(value);

function generate(input: GraphInput): Step<GraphFrame>[] {
  const { nodes, edges } = input;
  const start = input.start!;
  const adj = weightedAdjacency(nodes, edges);
  const dist = Object.fromEntries(nodes.map((node) => [node, INF])) as Record<string, number>;
  const inQueue = new Set<string>([start]);
  const enqueueCount = Object.fromEntries(nodes.map((node) => [node, 0])) as Record<string, number>;
  const predecessor: Record<string, string | null> = Object.fromEntries(nodes.map((node) => [node, null]));
  const queue = [start];
  const steps: Step<GraphFrame>[] = [];
  let relaxations = 0;
  let negativeCycleAt: string | null = null;
  dist[start] = 0;
  enqueueCount[start] = 1;

  const snapshot = (description: string, descriptionAr: string, codeLine: number, phase: string, active?: string, edge?: Edge) => {
    addStep(
      steps,
      graphFrame(nodes, edges, {
        directed: true,
        weighted: true,
        nodeStates: Object.fromEntries(nodes.map((node) => [
          node,
          node === negativeCycleAt ? "swap" : node === active ? "compare" : inQueue.has(node) ? "active" : dist[node] < INF ? "visited" : "default",
        ])),
        edgeStates: edge ? { [edgeKey(edge.from, edge.to)]: "active" } : {},
        annotations: Object.fromEntries(nodes.map((node) => [node, fmt(dist[node])])),
        aux: [
          { label: "Queue", values: queue },
          { label: "Enqueue counts", values: nodes.map((node) => `${node}:${enqueueCount[node]}`) },
        ],
      }),
      description,
      descriptionAr,
      codeLine,
      phase,
      { relaxations, enqueues: Object.values(enqueueCount).reduce((sum, value) => sum + value, 0) },
    );
  };

  snapshot(`Set dist[${start}]=0 and enqueue the source.`, `اجعل dist[${start}]=0 وأدخل المصدر في الطابور.`, 1, "initialize", start);
  while (queue.length && !negativeCycleAt) {
    const node = queue.shift()!;
    inQueue.delete(node);
    snapshot(`Dequeue ${node}; scan its outgoing edges.`, `أخرج ${node}؛ وافحص حواف خروجها.`, 3, "dequeue", node);
    for (const candidate of adj.get(node) ?? []) {
      relaxations++;
      const original = edges.find((edge) => edge.from === node && edge.to === candidate.to)!;
      if (dist[node] + candidate.weight < dist[candidate.to]) {
        dist[candidate.to] = dist[node] + candidate.weight;
        predecessor[candidate.to] = node;
        snapshot(
          `Relax ${node}→${candidate.to}; dist[${candidate.to}]=${dist[candidate.to]}.`,
          `خفف ${node}→${candidate.to}؛ dist[${candidate.to}]=${dist[candidate.to]}.`,
          5,
          "relax",
          candidate.to,
          original,
        );
        if (!inQueue.has(candidate.to)) {
          queue.push(candidate.to);
          inQueue.add(candidate.to);
          enqueueCount[candidate.to]++;
          snapshot(`Enqueue ${candidate.to} because its distance changed.`, `أدخل ${candidate.to} لأن مسافتها تغيرت.`, 7, "enqueue", candidate.to);
          if (enqueueCount[candidate.to] >= nodes.length) {
            negativeCycleAt = candidate.to;
            snapshot(
              `${candidate.to} was enqueued ${enqueueCount[candidate.to]} times; a reachable negative cycle exists.`,
              `أُدخلت ${candidate.to} ${enqueueCount[candidate.to]} مرات؛ توجد دورة سالبة قابلة للوصول.`,
              8,
              "negative-cycle",
              candidate.to,
            );
            break;
          }
        }
      }
    }
  }

  addStep(
    steps,
    graphFrame(nodes, edges, {
      directed: true,
      weighted: true,
      nodeStates: Object.fromEntries(nodes.map((node) => [
        node,
        node === negativeCycleAt ? "swap" : dist[node] < INF ? "found" : "discarded",
      ])),
      annotations: Object.fromEntries(nodes.map((node) => [node, fmt(dist[node])])),
      edgeStates: Object.fromEntries(nodes
        .filter((node) => predecessor[node])
        .map((node) => [edgeKey(predecessor[node]!, node), "sorted"])),
      aux: [
        { label: "Result", values: [negativeCycleAt ? "negative cycle" : "shortest distances"] },
        { label: "Distances", values: nodes.map((node) => `${node}:${fmt(dist[node])}`) },
      ],
      note: negativeCycleAt ? "Shortest distances are undefined" : `SPFA from ${start}`,
    }),
    negativeCycleAt ? "A reachable negative cycle makes shortest distances undefined." : `Shortest distances from ${start} are complete.`,
    negativeCycleAt ? "دورة سالبة قابلة للوصول تجعل أقصر المسافات غير معرفة." : `اكتملت أقصر المسافات من ${start}.`,
    9,
    "complete",
    { relaxations, enqueues: Object.values(enqueueCount).reduce((sum, value) => sum + value, 0) },
  );
  return steps;
}

const mod = createGraphModule<GraphInput>({
  slug: "spfa",
  title: "Shortest Path Faster Algorithm (SPFA)",
  titleAr: "خوارزمية أقصر مسار الأسرع SPFA",
  difficulty: "Advanced",
  tags: ["graph", "shortest path", "queue", "negative weights"],
  tagsAr: ["رسم بياني", "أقصر مسار", "طابور", "أوزان سالبة"],
  summary: "Queue-optimizes Bellman-Ford by rescanning only vertices whose distances improve.",
  summaryAr: "تحسّن بيلمان-فورد بطابور يعيد فحص العقد التي تتحسن مسافاتها فقط.",
  pseudocode: [
    "procedure SPFA(G, source)",
    "  set source distance 0 and enqueue source",
    "  while the queue is nonempty",
    "    dequeue u and mark it outside the queue",
    "    for each outgoing edge u→v",
    "      relax v when dist[u]+w is smaller",
    "      if v is outside the queue",
    "        enqueue v and increment its enqueue count",
    "        if v was enqueued |V| times, report a negative cycle",
    "  return distances or negative-cycle failure",
  ],
  complexity: { best: "O(E)", average: "Often O(E)", worst: "O(VE)", space: "O(V)" },
  concept: "SPFA preserves Bellman-Ford relaxation correctness while avoiding scans from unchanged vertices.",
  conceptAr: "تحافظ SPFA على صحة تخفيف بيلمان-فورد وتتجنب الفحص من العقد التي لم تتغير.",
  applications: ["Sparse graphs with negative edges", "Difference constraints", "Educational relaxation traces"],
  applicationsAr: ["رسوم متناثرة بحواف سالبة", "قيود الفروق", "تعليم عمليات التخفيف"],
  caveats: ["Adversarial graphs reach Bellman-Ford's O(VE) time.", "Only negative cycles reachable from the source are relevant."],
  caveatsAr: ["تصل الرسوم السيئة إلى زمن O(VE).", "تهم فقط الدورات السالبة القابلة للوصول من المصدر."],
  inputFields: [vertexField, edgeField(true, true), startField],
  defaultInput: (level, rng) => {
    const nodes = defaultNodes(level);
    const edges: Edge[] = [];
    for (let index = 1; index < nodes.length; index++)
      edges.push({ from: nodes[rng.int(0, index - 1)], to: nodes[index], weight: rng.int(-2, 8) });
    return { nodes, edges, start: nodes[0] };
  },
  parseInput: (fields) => {
    const nodes = parseNodes(fields.nodes ?? "", 12);
    return {
      nodes,
      edges: parseEdges(fields.edges ?? "", nodes, { directed: true, weighted: true }),
      start: requireVertex(nodes, fields.start, "Start"),
    };
  },
  serializeInput: (input) => ({
    nodes: input.nodes.join(", "),
    edges: serializeEdges(input.edges, true, true),
    start: input.start!,
  }),
  generate,
  referencePython: `from collections import deque
def spfa(adj, source):
    n = len(adj); dist = {u: float("inf") for u in adj}; dist[source] = 0
    queue = deque([source]); inside = {source}; count = {u: 0 for u in adj}; count[source] = 1
    while queue:
        u = queue.popleft(); inside.remove(u)
        for v, w in adj[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                if v not in inside:
                    queue.append(v); inside.add(v); count[v] += 1
                    if count[v] >= n: raise ValueError("negative cycle")
    return dist`,
  referenceTypeScript: `function spfa(adj: Map<string, { to: string; weight: number }[]>, source: string) {
  const dist = new Map([...adj.keys()].map(u => [u, Infinity])); dist.set(source, 0);
  const queue = [source], inside = new Set([source]), count = new Map([[source, 1]]);
  while (queue.length) {
    const u = queue.shift()!; inside.delete(u);
    for (const e of adj.get(u) ?? []) if (dist.get(u)! + e.weight < dist.get(e.to)!) {
      dist.set(e.to, dist.get(u)! + e.weight);
      if (!inside.has(e.to)) { queue.push(e.to); inside.add(e.to); count.set(e.to, (count.get(e.to) ?? 0) + 1); }
    }
  }
  return dist;
}`,
});

export default mod;
