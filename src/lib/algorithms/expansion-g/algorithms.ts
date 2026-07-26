import type { GraphFrame, Step } from "@/lib/engine/types";
import {
  addStep,
  adjacency,
  createGraphModule,
  defaultWeighted,
  edgeKey,
  graphFrame,
  type Edge,
  type GraphInput,
  type GraphSpec,
} from "./common";

type Steps = Step<GraphFrame>[];
const INF = Number.POSITIVE_INFINITY;

function distanceValues(nodes: string[], distances: Map<string, number>): string[] {
  return nodes.map((node) => `${node}:${Number.isFinite(distances.get(node)!) ? distances.get(node) : "∞"}`);
}

function statesFor(nodes: string[], active?: string, found = new Set<string>()): Record<string, "default" | "active" | "found"> {
  return Object.fromEntries(nodes.map((node) => [node, node === active ? "active" : found.has(node) ? "found" : "default"]));
}

function push(
  steps: Steps,
  input: GraphInput,
  directed: boolean,
  description: string,
  descriptionAr: string,
  line: number,
  phase: string,
  options: Parameters<typeof graphFrame>[2] = {},
  counters?: Record<string, number>,
): void {
  addStep(steps, graphFrame(input, directed, options), description, descriptionAr, line, phase, counters);
}

function shortestPathFinal(
  steps: Steps,
  input: GraphInput,
  directed: boolean,
  distances: Map<string, number>,
  parents: Map<string, string | null>,
  phase = "complete",
): Steps {
  const target = input.target;
  const path: string[] = [];
  if (target && Number.isFinite(distances.get(target) ?? INF)) {
    for (let node: string | null = target; node !== null; node = parents.get(node) ?? null) path.push(node);
    path.reverse();
  }
  push(steps, input, directed, "Shortest-path computation is complete.", "اكتمل حساب أقصر المسارات.", 5, phase, {
    states: statesFor(input.nodes, undefined, new Set(path)),
    annotations: Object.fromEntries(input.nodes.map((node) => [node, Number.isFinite(distances.get(node)!) ? String(distances.get(node)) : "∞"])),
    aux: [
      { label: "Distances", values: distanceValues(input.nodes, distances) },
      { label: "Path", values: path.length ? path : ["none"] },
    ],
    note: target ? (path.length ? `distance ${distances.get(target)}` : "target unreachable") : "all reachable distances finalized",
  });
  return steps;
}

function zeroOneBfs(input: GraphInput): Steps {
  const start = input.start!;
  const adj = adjacency(input, true);
  const distance = new Map(input.nodes.map((node) => [node, INF]));
  const parent = new Map<string, string | null>([[start, null]]);
  distance.set(start, 0);
  const deque = [start];
  const steps: Steps = [];
  let relaxations = 0;
  push(steps, input, true, `Put ${start} in the deque.`, `ضع ${start} في الطابور المزدوج.`, 0, "queue", {
    states: statesFor(input.nodes, start),
    aux: [{ label: "Deque", values: deque }],
  });
  while (deque.length) {
    const node = deque.shift()!;
    push(steps, input, true, `Pop ${node} from the front.`, `أزل ${node} من المقدمة.`, 1, "dequeue", {
      states: statesFor(input.nodes, node),
      aux: [{ label: "Deque", values: deque }, { label: "Distances", values: distanceValues(input.nodes, distance) }],
    });
    for (const edge of adj.get(node) ?? []) {
      const candidate = distance.get(node)! + edge.weight;
      push(steps, input, true, `Inspect ${node} → ${edge.to} with weight ${edge.weight}.`, `افحص ${node} ← ${edge.to} بوزن ${edge.weight}.`, 2, "inspect", {
        states: statesFor(input.nodes, edge.to),
        edgeStates: { [edge.key]: "compare" },
        aux: [{ label: "Candidate", values: [candidate] }],
      });
      if (candidate >= distance.get(edge.to)!) continue;
      distance.set(edge.to, candidate);
      parent.set(edge.to, node);
      const previous = deque.indexOf(edge.to);
      if (previous >= 0) deque.splice(previous, 1);
      if (edge.weight === 0) deque.unshift(edge.to);
      else deque.push(edge.to);
      relaxations++;
      push(steps, input, true, `Relax ${edge.to}; push it at the ${edge.weight === 0 ? "front" : "back"}.`, `حدّث ${edge.to} وضعها في ${edge.weight === 0 ? "المقدمة" : "النهاية"}.`, 3, "relax", {
        states: statesFor(input.nodes, edge.to),
        edgeStates: { [edge.key]: "found" },
        annotations: Object.fromEntries(input.nodes.map((value) => [value, Number.isFinite(distance.get(value)!) ? String(distance.get(value)) : "∞"])),
        aux: [{ label: "Deque", values: deque }],
      }, { relaxations });
    }
  }
  return shortestPathFinal(steps, input, true, distance, parent);
}

function dial(input: GraphInput): Steps {
  const start = input.start!;
  const adj = adjacency(input, true);
  const maximum = Math.max(0, ...input.edges.map((edge) => edge.weight));
  const limit = maximum * Math.max(0, input.nodes.length - 1);
  const buckets = Array.from({ length: limit + 1 }, () => [] as string[]);
  const distance = new Map(input.nodes.map((node) => [node, INF]));
  const parent = new Map<string, string | null>([[start, null]]);
  distance.set(start, 0);
  buckets[0].push(start);
  const steps: Steps = [];
  let relaxations = 0;
  for (let index = 0; index <= limit; index++) {
    while (buckets[index].length) {
      const node = buckets[index].shift()!;
      if (distance.get(node) !== index) continue;
      push(steps, input, true, `Extract ${node} from bucket ${index}.`, `استخرج ${node} من الدلو ${index}.`, 1, "bucket", {
        states: statesFor(input.nodes, node),
        aux: [{ label: "Nonempty buckets", values: buckets.flatMap((bucket, bucketIndex) => bucket.map((value) => `${bucketIndex}:${value}`)) }],
      });
      for (const edge of adj.get(node) ?? []) {
        const candidate = index + edge.weight;
        push(steps, input, true, `Test distance ${candidate} for ${edge.to}.`, `اختبر المسافة ${candidate} للعقدة ${edge.to}.`, 2, "inspect", {
          edgeStates: { [edge.key]: "compare" },
          aux: [{ label: "Candidate", values: [candidate] }],
        });
        if (candidate >= distance.get(edge.to)!) continue;
        distance.set(edge.to, candidate);
        parent.set(edge.to, node);
        buckets[candidate].push(edge.to);
        relaxations++;
        push(steps, input, true, `Move ${edge.to} to bucket ${candidate}.`, `انقل ${edge.to} إلى الدلو ${candidate}.`, 3, "relax", {
          states: statesFor(input.nodes, edge.to),
          edgeStates: { [edge.key]: "found" },
          aux: [{ label: "Distances", values: distanceValues(input.nodes, distance) }],
        }, { relaxations });
      }
    }
  }
  return shortestPathFinal(steps, input, true, distance, parent);
}

function bidirectionalDijkstra(input: GraphInput): Steps {
  const start = input.start!;
  const target = input.target!;
  const adj = adjacency(input, false);
  const forward = new Map(input.nodes.map((node) => [node, INF]));
  const backward = new Map(input.nodes.map((node) => [node, INF]));
  const parentF = new Map<string, string | null>([[start, null]]);
  const parentB = new Map<string, string | null>([[target, null]]);
  const settledF = new Set<string>();
  const settledB = new Set<string>();
  forward.set(start, 0);
  backward.set(target, 0);
  const steps: Steps = [];
  let best = start === target ? 0 : INF;
  let meeting: string | null = start === target ? start : null;
  const minimum = (dist: Map<string, number>, settled: Set<string>) =>
    input.nodes.filter((node) => !settled.has(node)).sort((a, b) => dist.get(a)! - dist.get(b)! || a.localeCompare(b))[0];
  const expand = (dist: Map<string, number>, other: Map<string, number>, settled: Set<string>, parents: Map<string, string | null>, side: string) => {
    const node = minimum(dist, settled);
    if (!node || !Number.isFinite(dist.get(node)!)) return;
    settled.add(node);
    push(steps, input, false, `Settle ${node} from the ${side} search.`, `ثبّت ${node} من بحث ${side === "forward" ? "البداية" : "الهدف"}.`, 1, "settle", {
      states: statesFor(input.nodes, node, new Set([...settledF, ...settledB])),
      aux: [{ label: "Forward settled", values: [...settledF] }, { label: "Backward settled", values: [...settledB] }],
    });
    if (Number.isFinite(other.get(node)!)) {
      const candidate = dist.get(node)! + other.get(node)!;
      if (candidate < best) {
        best = candidate;
        meeting = node;
      }
    }
    for (const edge of adj.get(node) ?? []) {
      const candidate = dist.get(node)! + edge.weight;
      push(steps, input, false, `Inspect ${node}–${edge.to}.`, `افحص ${node}–${edge.to}.`, 2, "inspect", { edgeStates: { [edge.key]: "compare" } });
      if (candidate < dist.get(edge.to)!) {
        dist.set(edge.to, candidate);
        parents.set(edge.to, node);
        push(steps, input, false, `Relax ${edge.to} to ${candidate}.`, `حدّث ${edge.to} إلى ${candidate}.`, 3, "relax", {
          edgeStates: { [edge.key]: "found" },
          annotations: Object.fromEntries(input.nodes.map((value) => [value, `${forward.get(value) === INF ? "∞" : forward.get(value)}|${backward.get(value) === INF ? "∞" : backward.get(value)}`])),
        });
      }
    }
  };
  while (settledF.size + settledB.size < input.nodes.length * 2) {
    const minF = minimum(forward, settledF);
    const minB = minimum(backward, settledB);
    if (!minF || !minB || !Number.isFinite(forward.get(minF)!) || !Number.isFinite(backward.get(minB)!)) break;
    if (forward.get(minF)! + backward.get(minB)! >= best) break;
    if (forward.get(minF)! <= backward.get(minB)!) expand(forward, backward, settledF, parentF, "forward");
    else expand(backward, forward, settledB, parentB, "backward");
  }
  const path: string[] = [];
  if (meeting) {
    for (let node: string | null = meeting; node !== null; node = parentF.get(node) ?? null) path.push(node);
    path.reverse();
    for (let node = parentB.get(meeting) ?? null; node !== null; node = parentB.get(node) ?? null) path.push(node);
  }
  push(steps, input, false, path.length ? `Shortest path costs ${best}.` : "The target is unreachable.", path.length ? `كلفة أقصر مسار ${best}.` : "لا يمكن الوصول إلى الهدف.", 5, "complete", {
    states: statesFor(input.nodes, undefined, new Set(path)),
    aux: [{ label: "Path", values: path.length ? path : ["none"] }, { label: "Distance", values: [Number.isFinite(best) ? best : "∞"] }],
  });
  return steps;
}

function dagShortest(input: GraphInput): Steps {
  const adj = adjacency(input, true);
  const indegree = new Map(input.nodes.map((node) => [node, 0]));
  input.edges.forEach((edge) => indegree.set(edge.to, indegree.get(edge.to)! + 1));
  const queue = input.nodes.filter((node) => indegree.get(node) === 0).sort();
  const order: string[] = [];
  const steps: Steps = [];
  while (queue.length) {
    const node = queue.shift()!;
    order.push(node);
    push(steps, input, true, `Append ${node} to the topological order.`, `أضف ${node} إلى الترتيب الطوبولوجي.`, 0, "queue", {
      states: statesFor(input.nodes, node, new Set(order)),
      aux: [{ label: "Topological order", values: order }, { label: "Queue", values: queue }],
    });
    for (const edge of adj.get(node) ?? []) {
      indegree.set(edge.to, indegree.get(edge.to)! - 1);
      if (indegree.get(edge.to) === 0) {
        queue.push(edge.to);
        queue.sort();
      }
    }
  }
  if (order.length !== input.nodes.length) {
    push(steps, input, true, "A cycle exists, so DAG shortest paths are undefined.", "توجد دورة، لذلك لا تنطبق خوارزمية أقصر مسار في DAG.", 1, "invalid-domain", {
      aux: [{ label: "Result", values: ["cycle"] }],
      note: "input is not a DAG",
    });
    return steps;
  }
  const distance = new Map(input.nodes.map((node) => [node, INF]));
  const parent = new Map<string, string | null>([[input.start!, null]]);
  distance.set(input.start!, 0);
  for (const node of order) {
    if (!Number.isFinite(distance.get(node)!)) continue;
    for (const edge of adj.get(node) ?? []) {
      const candidate = distance.get(node)! + edge.weight;
      push(steps, input, true, `Inspect ${node} → ${edge.to}.`, `افحص ${node} ← ${edge.to}.`, 3, "inspect", { edgeStates: { [edge.key]: "compare" } });
      if (candidate < distance.get(edge.to)!) {
        distance.set(edge.to, candidate);
        parent.set(edge.to, node);
        push(steps, input, true, `Relax ${edge.to} to ${candidate}.`, `حدّث ${edge.to} إلى ${candidate}.`, 4, "relax", {
          edgeStates: { [edge.key]: "found" },
          aux: [{ label: "Distances", values: distanceValues(input.nodes, distance) }],
        });
      }
    }
  }
  return shortestPathFinal(steps, input, true, distance, parent);
}

class DSU {
  parent = new Map<string, string>();
  constructor(nodes: string[]) { nodes.forEach((node) => this.parent.set(node, node)); }
  find(node: string): string {
    const parent = this.parent.get(node)!;
    if (parent !== node) this.parent.set(node, this.find(parent));
    return this.parent.get(node)!;
  }
  union(a: string, b: string): boolean {
    const x = this.find(a);
    const y = this.find(b);
    if (x === y) return false;
    if (x < y) this.parent.set(y, x);
    else this.parent.set(x, y);
    return true;
  }
}

function forestFinal(steps: Steps, input: GraphInput, chosen: Edge[], phase: string): Steps {
  const total = chosen.reduce((sum, edge) => sum + edge.weight, 0);
  push(steps, input, false, `The minimum spanning forest has weight ${total}.`, `وزن الغابة الممتدة الصغرى هو ${total}.`, 5, phase, {
    edgeStates: Object.fromEntries(chosen.map((edge) => [edgeKey(edge.from, edge.to), "found"])),
    aux: [
      { label: "Forest edges", values: chosen.map((edge) => `${edge.from}-${edge.to}:${edge.weight}`) },
      { label: "Total weight", values: [total] },
    ],
    note: chosen.length === input.nodes.length - 1 ? "minimum spanning tree" : "minimum spanning forest (graph disconnected)",
  });
  return steps;
}

function boruvka(input: GraphInput): Steps {
  const dsu = new DSU(input.nodes);
  const chosen: Edge[] = [];
  const steps: Steps = [];
  while (true) {
    const cheapest = new Map<string, Edge>();
    for (const edge of input.edges) {
      const a = dsu.find(edge.from);
      const b = dsu.find(edge.to);
      if (a === b) continue;
      for (const component of [a, b]) {
        const current = cheapest.get(component);
        if (!current || edge.weight < current.weight || (edge.weight === current.weight && `${edge.from}${edge.to}` < `${current.from}${current.to}`)) {
          cheapest.set(component, edge);
        }
      }
      push(steps, input, false, `Component ${a} considers ${edge.from}–${edge.to}.`, `يفحص المكوّن ${a} الحافة ${edge.from}–${edge.to}.`, 1, "edge-choice", {
        edgeStates: { [edgeKey(edge.from, edge.to)]: "compare" },
        aux: [{ label: "Chosen so far", values: chosen.map((value) => `${value.from}-${value.to}`) }],
      });
    }
    let merged = 0;
    const round = [...new Set(cheapest.values())].sort((a, b) => a.weight - b.weight || `${a.from}${a.to}`.localeCompare(`${b.from}${b.to}`));
    for (const edge of round) {
      if (!dsu.union(edge.from, edge.to)) continue;
      chosen.push(edge);
      merged++;
      push(steps, input, false, `Add cheapest outgoing edge ${edge.from}–${edge.to}.`, `أضف أرخص حافة خارجة ${edge.from}–${edge.to}.`, 3, "merge", {
        edgeStates: Object.fromEntries(chosen.map((value) => [edgeKey(value.from, value.to), "found"])),
        aux: [{ label: "Forest edges", values: chosen.map((value) => `${value.from}-${value.to}:${value.weight}`) }],
      });
    }
    if (merged === 0) break;
  }
  return forestFinal(steps, input, chosen, "complete");
}

function reverseDelete(input: GraphInput): Steps {
  let kept = [...input.edges];
  const steps: Steps = [];
  const components = (edges: Edge[]) => {
    const dsu = new DSU(input.nodes);
    edges.forEach((edge) => dsu.union(edge.from, edge.to));
    return new Set(input.nodes.map((node) => dsu.find(node))).size;
  };
  const initialComponents = components(kept);
  const ordered = [...input.edges].sort((a, b) => b.weight - a.weight || `${b.from}${b.to}`.localeCompare(`${a.from}${a.to}`));
  for (const edge of ordered) {
    push(steps, input, false, `Try deleting ${edge.from}–${edge.to}.`, `حاول حذف ${edge.from}–${edge.to}.`, 1, "edge-choice", {
      edgeStates: { [edgeKey(edge.from, edge.to)]: "compare" },
      aux: [{ label: "Kept edges", values: kept.map((value) => `${value.from}-${value.to}`) }],
    });
    const candidate = kept.filter((value) => value !== edge);
    if (components(candidate) === initialComponents) {
      kept = candidate;
      push(steps, input, false, "Deletion preserves every original component.", "يحافظ الحذف على اتصال كل مكوّن أصلي.", 2, "delete", {
        edgeStates: { [edgeKey(edge.from, edge.to)]: "discarded" },
        aux: [{ label: "Kept edges", values: kept.map((value) => `${value.from}-${value.to}`) }],
      });
    } else {
      push(steps, input, false, "Keep the edge because deletion disconnects a component.", "أبقِ الحافة لأن حذفها يفصل مكوّناً.", 3, "keep", {
        edgeStates: { [edgeKey(edge.from, edge.to)]: "found" },
      });
    }
  }
  return forestFinal(steps, input, kept, "complete");
}

function directedEulerValidity(input: GraphInput): { start: string | null; valid: boolean } {
  const incoming = new Map(input.nodes.map((node) => [node, 0]));
  const outgoing = new Map(input.nodes.map((node) => [node, 0]));
  input.edges.forEach((edge) => {
    outgoing.set(edge.from, outgoing.get(edge.from)! + 1);
    incoming.set(edge.to, incoming.get(edge.to)! + 1);
  });
  const starts = input.nodes.filter((node) => outgoing.get(node)! - incoming.get(node)! === 1);
  const ends = input.nodes.filter((node) => incoming.get(node)! - outgoing.get(node)! === 1);
  const invalid = input.nodes.some((node) => Math.abs(incoming.get(node)! - outgoing.get(node)!) > 1);
  const valid = !invalid && ((starts.length === 1 && ends.length === 1) || (starts.length === 0 && ends.length === 0));
  return { valid, start: valid ? (starts[0] ?? input.nodes.find((node) => outgoing.get(node)! > 0) ?? input.nodes[0]) : null };
}

function hierholzer(input: GraphInput): Steps {
  const validity = directedEulerValidity(input);
  const steps: Steps = [];
  if (!validity.valid) {
    push(steps, input, true, "In/out degrees cannot form an Euler trail.", "درجات الدخول والخروج لا تسمح بمسار أويلري.", 0, "invalid-domain", {
      aux: [{ label: "Trail", values: ["none"] }],
    });
    return steps;
  }
  const outgoing = new Map(input.nodes.map((node) => [node, [] as { edge: Edge; index: number }[]]));
  input.edges.forEach((edge, index) => outgoing.get(edge.from)!.push({ edge, index }));
  for (const list of outgoing.values()) list.sort((a, b) => a.edge.to.localeCompare(b.edge.to) || a.index - b.index);
  const used = new Set<number>();
  const stack = [validity.start!];
  const circuit: string[] = [];
  while (stack.length) {
    const node = stack.at(-1)!;
    const next = (outgoing.get(node) ?? []).find((candidate) => !used.has(candidate.index));
    if (next) {
      used.add(next.index);
      stack.push(next.edge.to);
      push(steps, input, true, `Consume ${next.edge.from} → ${next.edge.to} and push ${next.edge.to}.`, `استهلك ${next.edge.from} ← ${next.edge.to} وأضف ${next.edge.to} للمكدس.`, 2, "edge-choice", {
        edgeStates: { [edgeKey(next.edge.from, next.edge.to)]: "found" },
        aux: [{ label: "Stack", values: stack }, { label: "Reverse circuit", values: circuit }],
      }, { usedEdges: used.size });
    } else {
      circuit.push(stack.pop()!);
      push(steps, input, true, `Backtrack through ${node}.`, `ارجع عبر ${node}.`, 3, "backtrack", {
        states: statesFor(input.nodes, node),
        aux: [{ label: "Stack", values: stack }, { label: "Reverse circuit", values: circuit }],
      });
    }
  }
  const trail = circuit.reverse();
  const valid = used.size === input.edges.length && trail.length === input.edges.length + 1;
  push(steps, input, true, valid ? "Every edge appears exactly once." : "Nonzero-degree vertices are disconnected.", valid ? "ظهرت كل حافة مرة واحدة بالضبط." : "العُقد ذات الدرجة غير الصفرية غير متصلة.", 4, "complete", {
    aux: [{ label: "Trail", values: valid ? trail : ["none"] }],
    note: valid ? "Euler trail" : "no Euler trail",
  });
  return steps;
}

function fleury(input: GraphInput): Steps {
  const degree = new Map(input.nodes.map((node) => [node, 0]));
  input.edges.forEach((edge) => {
    degree.set(edge.from, degree.get(edge.from)! + 1);
    degree.set(edge.to, degree.get(edge.to)! + 1);
  });
  const odd = input.nodes.filter((node) => degree.get(node)! % 2 === 1);
  const steps: Steps = [];
  if (odd.length !== 0 && odd.length !== 2) {
    push(steps, input, false, "The graph has neither zero nor two odd-degree vertices.", "لا يحتوي الرسم على صفر أو عقدتين فرديتي الدرجة.", 0, "invalid-domain", {
      aux: [{ label: "Trail", values: ["none"] }],
    });
    return steps;
  }
  let remaining = [...input.edges];
  let current = odd[0] ?? input.nodes.find((node) => degree.get(node)! > 0) ?? input.nodes[0];
  const trail = [current];
  const reachable = (start: string, edges: Edge[]) => {
    const adj = new Map(input.nodes.map((node) => [node, [] as string[]]));
    edges.forEach((edge) => {
      adj.get(edge.from)!.push(edge.to);
      adj.get(edge.to)!.push(edge.from);
    });
    const seen = new Set([start]);
    const stack = [start];
    while (stack.length) {
      const node = stack.pop()!;
      for (const neighbor of adj.get(node) ?? []) if (!seen.has(neighbor)) {
        seen.add(neighbor);
        stack.push(neighbor);
      }
    }
    return seen.size;
  };
  while (remaining.length) {
    const incident = remaining.filter((edge) => edge.from === current || edge.to === current)
      .sort((a, b) => `${a.from}${a.to}`.localeCompare(`${b.from}${b.to}`));
    let selected: Edge | undefined;
    for (const edge of incident) {
      const candidate = remaining.filter((value) => value !== edge);
      const bridge = incident.length > 1 && reachable(current, remaining) > reachable(current, candidate);
      push(steps, input, false, `Test ${edge.from}–${edge.to}: ${bridge ? "bridge, postpone" : "safe"}.`, `اختبر ${edge.from}–${edge.to}: ${bridge ? "جسر، أجّله" : "آمن"}.`, 2, "edge-choice", {
        edgeStates: { [edgeKey(edge.from, edge.to)]: bridge ? "discarded" : "compare" },
        aux: [{ label: "Trail", values: trail }],
      });
      if (!bridge || incident.length === 1) {
        selected = edge;
        break;
      }
    }
    if (!selected) break;
    remaining = remaining.filter((edge) => edge !== selected);
    current = selected.from === current ? selected.to : selected.from;
    trail.push(current);
    push(steps, input, false, `Traverse to ${current}.`, `اعبر إلى ${current}.`, 3, "traverse", {
      edgeStates: { [edgeKey(selected.from, selected.to)]: "found" },
      aux: [{ label: "Trail", values: trail }],
    });
  }
  const valid = remaining.length === 0 && trail.length === input.edges.length + 1;
  push(steps, input, false, valid ? "Every edge was traversed once." : "No Euler trail exists.", valid ? "تم عبور كل حافة مرة واحدة." : "لا يوجد مسار أويلري.", 4, "complete", {
    aux: [{ label: "Trail", values: valid ? trail : ["none"] }],
  });
  return steps;
}

function validateBipartiteInput(input: GraphInput): { left: string[]; right: string[] } {
  const left = input.left!;
  const leftSet = new Set(left);
  const right = input.nodes.filter((node) => !leftSet.has(node));
  if (input.edges.some((edge) => leftSet.has(edge.from) === leftSet.has(edge.to))) {
    throw new Error("Every edge must cross the declared bipartition.");
  }
  return { left, right };
}

function hopcroftKarp(input: GraphInput): Steps {
  const { left, right } = validateBipartiteInput(input);
  const leftSet = new Set(left);
  const adj = new Map(left.map((node) => [node, [] as string[]]));
  input.edges.forEach((edge) => {
    const a = leftSet.has(edge.from) ? edge.from : edge.to;
    const b = leftSet.has(edge.from) ? edge.to : edge.from;
    adj.get(a)!.push(b);
  });
  for (const list of adj.values()) list.sort();
  const pairL = new Map<string, string | null>(left.map((node) => [node, null]));
  const pairR = new Map<string, string | null>(right.map((node) => [node, null]));
  const distance = new Map<string, number>();
  const steps: Steps = [];
  const bfs = () => {
    const queue: string[] = [];
    left.forEach((node) => {
      if (pairL.get(node) === null) {
        distance.set(node, 0);
        queue.push(node);
      } else distance.set(node, INF);
    });
    let found = false;
    push(steps, input, false, "Build BFS layers from every free left vertex.", "ابنِ طبقات BFS من كل عقدة يسارية حرة.", 1, "queue", {
      aux: [{ label: "Queue", values: queue }, { label: "Matching", values: [...pairL].filter(([, value]) => value).map(([a, b]) => `${a}-${b}`) }],
    });
    while (queue.length) {
      const node = queue.shift()!;
      for (const target of adj.get(node) ?? []) {
        const mate = pairR.get(target) ?? null;
        push(steps, input, false, `Layer edge ${node}–${target}.`, `افحص حافة الطبقة ${node}–${target}.`, 2, "matching-edge", {
          edgeStates: { [input.edges.find((edge) => (edge.from === node && edge.to === target) || (edge.to === node && edge.from === target)) ? edgeKey(input.edges.find((edge) => (edge.from === node && edge.to === target) || (edge.to === node && edge.from === target))!.from, input.edges.find((edge) => (edge.from === node && edge.to === target) || (edge.to === node && edge.from === target))!.to) : `${node}->${target}`]: "compare" },
        });
        if (mate === null) found = true;
        else if (distance.get(mate) === INF) {
          distance.set(mate, distance.get(node)! + 1);
          queue.push(mate);
        }
      }
    }
    return found;
  };
  const dfs = (node: string, seen: Set<string>): boolean => {
    for (const target of adj.get(node) ?? []) {
      if (seen.has(target)) continue;
      seen.add(target);
      const mate = pairR.get(target) ?? null;
      if (mate === null || (distance.get(mate) === distance.get(node)! + 1 && dfs(mate, seen))) {
        pairL.set(node, target);
        pairR.set(target, node);
        push(steps, input, false, `Match ${node} with ${target}.`, `طابق ${node} مع ${target}.`, 3, "augment-matching", {
          aux: [{ label: "Matching", values: [...pairL].filter(([, value]) => value).map(([a, b]) => `${a}-${b}`) }],
        });
        return true;
      }
    }
    distance.set(node, INF);
    return false;
  };
  while (bfs()) for (const node of left) if (pairL.get(node) === null) dfs(node, new Set());
  const matching = [...pairL].filter((entry): entry is [string, string] => entry[1] !== null).map(([a, b]) => `${a}-${b}`);
  push(steps, input, false, `Maximum matching size is ${matching.length}.`, `حجم المطابقة القصوى هو ${matching.length}.`, 4, "complete", {
    aux: [{ label: "Matching", values: matching }, { label: "Size", values: [matching.length] }],
  });
  return steps;
}

function hungarian(input: GraphInput): Steps {
  const { left, right } = validateBipartiteInput(input);
  const steps: Steps = [];
  if (left.length !== right.length) {
    push(steps, input, false, "Hungarian assignment requires equally sized partitions.", "تتطلب خوارزمية هنغارية قسمين متساويين في الحجم.", 0, "invalid-domain", {
      aux: [{ label: "Assignment", values: ["none"] }],
    });
    return steps;
  }
  const cost = new Map<string, number>();
  input.edges.forEach((edge) => cost.set([edge.from, edge.to].sort().join("|"), edge.weight));
  if (left.some((a) => right.some((b) => !cost.has([a, b].sort().join("|"))))) {
    push(steps, input, false, "The assignment matrix must be complete.", "يجب أن تكون مصفوفة الإسناد كاملة.", 0, "invalid-domain", {
      aux: [{ label: "Assignment", values: ["none"] }],
    });
    return steps;
  }
  const n = left.length;
  const u = Array(n + 1).fill(0) as number[];
  const v = Array(n + 1).fill(0) as number[];
  const p = Array(n + 1).fill(0) as number[];
  const way = Array(n + 1).fill(0) as number[];
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let column = 0;
    const min = Array(n + 1).fill(INF) as number[];
    const used = Array(n + 1).fill(false) as boolean[];
    do {
      used[column] = true;
      const row = p[column];
      let delta = INF;
      let next = 0;
      for (let j = 1; j <= n; j++) if (!used[j]) {
        const reduced = cost.get([left[row - 1], right[j - 1]].sort().join("|"))! - u[row] - v[j];
        push(steps, input, false, `Inspect assignment ${left[row - 1]}–${right[j - 1]} with reduced cost ${reduced}.`, `افحص إسناد ${left[row - 1]}–${right[j - 1]} بكلفة مختزلة ${reduced}.`, 1, "edge-choice", {
          aux: [{ label: "Potentials U", values: u.slice(1) }, { label: "Potentials V", values: v.slice(1) }],
        });
        if (reduced < min[j]) {
          min[j] = reduced;
          way[j] = column;
        }
        if (min[j] < delta) {
          delta = min[j];
          next = j;
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else min[j] -= delta;
      }
      column = next;
      push(steps, input, false, `Update dual potentials by ${delta}.`, `حدّث الجهود الثنائية بمقدار ${delta}.`, 2, "matching-potential", {
        aux: [{ label: "Potentials U", values: u.slice(1) }, { label: "Potentials V", values: v.slice(1) }],
      });
    } while (p[column] !== 0);
    do {
      const previous = way[column];
      p[column] = p[previous];
      column = previous;
    } while (column !== 0);
    push(steps, input, false, `Augment the assignment with row ${left[i - 1]}.`, `وسّع الإسناد بالصف ${left[i - 1]}.`, 3, "augment-matching", {
      aux: [{ label: "Partial assignment", values: p.slice(1).map((row, j) => row ? `${left[row - 1]}-${right[j]}` : "-") }],
    });
  }
  const assignment = p.slice(1).map((row, j) => `${left[row - 1]}-${right[j]}`);
  const total = p.slice(1).reduce((sum, row, j) => sum + cost.get([left[row - 1], right[j]].sort().join("|"))!, 0);
  push(steps, input, false, `Minimum assignment cost is ${total}.`, `أقل كلفة إسناد هي ${total}.`, 4, "complete", {
    aux: [{ label: "Assignment", values: assignment }, { label: "Total cost", values: [total] }],
  });
  return steps;
}

function karger(input: GraphInput): Steps {
  const steps: Steps = [];
  if (input.nodes.length < 2) {
    push(steps, input, false, "At least two vertices are required.", "يلزم وجود عقدتين على الأقل.", 0, "invalid-domain", {
      aux: [{ label: "Cut weight", values: [0] }],
    });
    return steps;
  }
  const connected = new Set([input.nodes[0]]);
  const queue = [input.nodes[0]];
  const undirected = adjacency(input, false);
  while (queue.length) {
    const node = queue.shift()!;
    for (const edge of undirected.get(node) ?? []) if (!connected.has(edge.to)) {
      connected.add(edge.to);
      queue.push(edge.to);
    }
  }
  if (connected.size !== input.nodes.length) {
    const first = [...connected].sort();
    const second = input.nodes.filter((node) => !connected.has(node));
    push(steps, input, false, "The graph is disconnected, so its global minimum cut is zero.", "الرسم غير متصل، لذلك وزن القطع الأدنى العام يساوي صفراً.", 0, "complete", {
      states: Object.fromEntries(input.nodes.map((node) => [node, connected.has(node) ? "active" : "special"])),
      aux: [{ label: "Cut sides", values: [first.join(","), second.join(",")] }, { label: "Cut weight", values: [0] }, { label: "Trials", values: [0] }],
    });
    return steps;
  }
  let state = input.seed! >>> 0;
  const random = () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
  let bestWeight = INF;
  let bestSides: [string[], string[]] = [[], []];
  const trials = Math.max(24, input.nodes.length ** 3);
  for (let trial = 0; trial < trials; trial++) {
    const groups = new Map(input.nodes.map((node) => [node, new Set([node])]));
    const owner = new Map(input.nodes.map((node) => [node, node]));
    while (groups.size > 2) {
      const crossing = input.edges.filter((edge) => owner.get(edge.from) !== owner.get(edge.to));
      if (crossing.length === 0) break;
      const totalCrossingWeight = crossing.reduce((sum, candidate) => sum + candidate.weight, 0);
      let ticket = random() * totalCrossingWeight;
      const edge = crossing.find((candidate) => {
        ticket -= candidate.weight;
        return ticket < 0;
      }) ?? crossing.at(-1)!;
      const a = owner.get(edge.from)!;
      const b = owner.get(edge.to)!;
      if (trial === 0) {
        push(steps, input, false, `Contract ${edge.from}–${edge.to}; merge supernodes ${a} and ${b}.`, `ادمج ${edge.from}–${edge.to}؛ وحّد العقدتين الفائقتين ${a} و${b}.`, 1, "cut-contract", {
          edgeStates: { [edgeKey(edge.from, edge.to)]: "compare" },
          aux: [{ label: "Supernodes", values: [...groups.values()].map((group) => [...group].join("")) }],
        });
      }
      for (const node of groups.get(b)!) {
        groups.get(a)!.add(node);
        owner.set(node, a);
      }
      groups.delete(b);
    }
    if (groups.size !== 2) continue;
    const sides = [...groups.values()].map((group) => [...group].sort()) as [string[], string[]];
    const weight = input.edges.filter((edge) => owner.get(edge.from) !== owner.get(edge.to)).reduce((sum, edge) => sum + edge.weight, 0);
    if (trial < 4 || weight < bestWeight) {
      push(steps, input, false, `Trial ${trial + 1} produced cut weight ${weight}.`, `أنتجت المحاولة ${trial + 1} قطعاً بوزن ${weight}.`, 2, "cut-result", {
        states: Object.fromEntries(input.nodes.map((node) => [node, sides[0].includes(node) ? "active" : "special"])),
        aux: [{ label: "Sides", values: sides.map((side) => side.join("")) }, { label: "Trial cut", values: [weight] }],
      });
    }
    if (weight < bestWeight) {
      bestWeight = weight;
      bestSides = sides;
    }
  }
  push(steps, input, false, `Best randomized cut has weight ${bestWeight}.`, `أفضل قطع عشوائي وزنه ${bestWeight}.`, 3, "complete", {
    states: Object.fromEntries(input.nodes.map((node) => [node, bestSides[0].includes(node) ? "active" : "special"])),
    aux: [{ label: "Cut sides", values: bestSides.map((side) => side.join(",")) }, { label: "Cut weight", values: [bestWeight] }, { label: "Trials", values: [trials] }],
    note: "Karger is probabilistic; repeated trials amplify success probability",
  });
  return steps;
}

function stoerWagner(input: GraphInput): Steps {
  const steps: Steps = [];
  if (input.nodes.length < 2) {
    push(steps, input, false, "At least two vertices are required.", "يلزم وجود عقدتين على الأقل.", 0, "invalid-domain", {
      aux: [{ label: "Cut weight", values: [0] }],
    });
    return steps;
  }
  const groups = new Map(input.nodes.map((node) => [node, new Set([node])]));
  const weights = new Map<string, Map<string, number>>(input.nodes.map((node) => [node, new Map()]));
  input.edges.forEach((edge) => {
    weights.get(edge.from)!.set(edge.to, (weights.get(edge.from)!.get(edge.to) ?? 0) + edge.weight);
    weights.get(edge.to)!.set(edge.from, (weights.get(edge.to)!.get(edge.from) ?? 0) + edge.weight);
  });
  let active = [...input.nodes];
  let best = INF;
  let bestSide: string[] = [];
  while (active.length > 1) {
    const added = new Set<string>();
    const connectivity = new Map(active.map((node) => [node, 0]));
    let previous = active[0];
    for (let index = 0; index < active.length; index++) {
      const selected = active.filter((node) => !added.has(node))
        .sort((a, b) => connectivity.get(b)! - connectivity.get(a)! || a.localeCompare(b))[0];
      added.add(selected);
      push(steps, input, false, `Add ${selected} with connection weight ${connectivity.get(selected)}.`, `أضف ${selected} بوزن اتصال ${connectivity.get(selected)}.`, 1, "cut-grow", {
        states: statesFor(input.nodes, selected, new Set([...added].flatMap((node) => [...groups.get(node)!]))),
        aux: [{ label: "Phase order", values: [...added] }, { label: "Connection", values: active.map((node) => `${node}:${connectivity.get(node)}`) }],
      });
      if (index === active.length - 1) {
        const cut = connectivity.get(selected)!;
        push(steps, input, false, `Phase cut isolates ${selected} with weight ${cut}.`, `يعزل قطع المرحلة ${selected} بوزن ${cut}.`, 2, "cut-result", {
          aux: [{ label: "Phase cut", values: [cut] }],
        });
        if (cut < best) {
          best = cut;
          bestSide = [...groups.get(selected)!];
        }
        for (const node of active) if (node !== previous && node !== selected) {
          const combined = (weights.get(previous)!.get(node) ?? 0) + (weights.get(selected)!.get(node) ?? 0);
          weights.get(previous)!.set(node, combined);
          weights.get(node)!.set(previous, combined);
        }
        for (const node of groups.get(selected)!) groups.get(previous)!.add(node);
        active = active.filter((node) => node !== selected);
        push(steps, input, false, `Merge ${selected} into ${previous}.`, `ادمج ${selected} في ${previous}.`, 3, "cut-contract", {
          aux: [{ label: "Supernodes", values: active.map((node) => [...groups.get(node)!].join(",")) }],
        });
      } else {
        previous = selected;
        for (const node of active) if (!added.has(node)) connectivity.set(node, connectivity.get(node)! + (weights.get(selected)!.get(node) ?? 0));
      }
    }
  }
  const other = input.nodes.filter((node) => !bestSide.includes(node));
  push(steps, input, false, `Global minimum cut weight is ${best}.`, `وزن القطع الأدنى العام هو ${best}.`, 4, "complete", {
    states: Object.fromEntries(input.nodes.map((node) => [node, bestSide.includes(node) ? "active" : "special"])),
    aux: [{ label: "Cut sides", values: [bestSide.join(","), other.join(",")] }, { label: "Cut weight", values: [best] }],
  });
  return steps;
}

function pageRank(input: GraphInput): Steps {
  const n = input.nodes.length;
  const incoming = new Map(input.nodes.map((node) => [node, [] as string[]]));
  const outgoing = new Map(input.nodes.map((node) => [node, 0]));
  input.edges.forEach((edge) => {
    incoming.get(edge.to)!.push(edge.from);
    outgoing.set(edge.from, outgoing.get(edge.from)! + 1);
  });
  let rank = new Map(input.nodes.map((node) => [node, 1 / n]));
  const steps: Steps = [];
  for (let iteration = 1; iteration <= input.iterations!; iteration++) {
    const dangling = input.nodes.filter((node) => outgoing.get(node) === 0).reduce((sum, node) => sum + rank.get(node)!, 0);
    const next = new Map<string, number>();
    for (const node of input.nodes) {
      const incomingRank = incoming.get(node)!.reduce((sum, source) => sum + rank.get(source)! / outgoing.get(source)!, 0);
      const value = (1 - input.damping!) / n + input.damping! * (incomingRank + dangling / n);
      next.set(node, value);
      push(steps, input, true, `Iteration ${iteration}: rank(${node}) = ${value.toFixed(6)}.`, `التكرار ${iteration}: رتبة(${node}) = ${value.toFixed(6)}.`, 2, "rank-update", {
        states: statesFor(input.nodes, node),
        annotations: Object.fromEntries(input.nodes.map((valueNode) => [valueNode, (next.get(valueNode) ?? rank.get(valueNode)!).toFixed(4)])),
        aux: [{ label: "Ranks", values: input.nodes.map((valueNode) => `${valueNode}:${(next.get(valueNode) ?? rank.get(valueNode)!).toFixed(6)}`) }],
      }, { iteration });
    }
    rank = next;
  }
  push(steps, input, true, "PageRank iterations are complete.", "اكتملت تكرارات PageRank.", 3, "complete", {
    annotations: Object.fromEntries(input.nodes.map((node) => [node, rank.get(node)!.toFixed(6)])),
    aux: [{ label: "Ranks", values: input.nodes.map((node) => `${node}:${rank.get(node)!.toFixed(6)}`) }, { label: "Rank sum", values: [input.nodes.reduce((sum, node) => sum + rank.get(node)!, 0).toFixed(6)] }],
  });
  return steps;
}

function bronKerbosch(input: GraphInput): Steps {
  const adj = adjacency(input, false);
  const neighbors = new Map(input.nodes.map((node) => [node, new Set((adj.get(node) ?? []).map((edge) => edge.to))]));
  const cliques: string[][] = [];
  const steps: Steps = [];
  const intersect = (values: Set<string>, allowed: Set<string>) => new Set([...values].filter((value) => allowed.has(value)));
  const visit = (r: Set<string>, p: Set<string>, x: Set<string>) => {
    push(steps, input, false, `Explore R={${[...r].join(",")}}, P={${[...p].join(",")}}, X={${[...x].join(",")}}.`, `استكشف R={${[...r].join(",")}}, P={${[...p].join(",")}}, X={${[...x].join(",")}}.`, 1, "clique-candidate", {
      states: Object.fromEntries(input.nodes.map((node) => [node, r.has(node) ? "found" : p.has(node) ? "active" : x.has(node) ? "discarded" : "default"])),
      aux: [{ label: "R", values: [...r] }, { label: "P", values: [...p] }, { label: "X", values: [...x] }],
    });
    if (p.size === 0 && x.size === 0) {
      cliques.push([...r].sort());
      push(steps, input, false, `Record maximal clique {${[...r].join(",")}}.`, `سجّل المجموعة الكاملة العظمى {${[...r].join(",")}}.`, 2, "clique-found", {
        states: statesFor(input.nodes, undefined, r),
        aux: [{ label: "Cliques", values: cliques.map((clique) => clique.join(",")) }],
      });
      return;
    }
    const pivot = [...new Set([...p, ...x])].sort((a, b) => {
      const countA = [...p].filter((node) => neighbors.get(a)!.has(node)).length;
      const countB = [...p].filter((node) => neighbors.get(b)!.has(node)).length;
      return countB - countA || a.localeCompare(b);
    })[0];
    const candidates = [...p].filter((node) => !pivot || !neighbors.get(pivot)!.has(node)).sort();
    for (const node of candidates) {
      visit(new Set([...r, node]), intersect(p, neighbors.get(node)!), intersect(x, neighbors.get(node)!));
      p.delete(node);
      x.add(node);
      push(steps, input, false, `Backtrack from ${node}.`, `تراجع من ${node}.`, 3, "backtrack", {
        states: statesFor(input.nodes, node, r),
      });
    }
  };
  visit(new Set(), new Set(input.nodes), new Set());
  cliques.sort((a, b) => a.join(",").localeCompare(b.join(",")));
  push(steps, input, false, `Found ${cliques.length} maximal cliques.`, `تم العثور على ${cliques.length} مجموعات كاملة عظمى.`, 4, "complete", {
    aux: [{ label: "Maximal cliques", values: cliques.map((clique) => clique.join(",")) }],
  });
  return steps;
}

type ContractEdge = { from: string; to: string; weight: number; source?: ContractEdge; base: Edge };

function edmondsArborescence(input: GraphInput): Steps {
  const root = input.start!;
  const steps: Steps = [];
  const reachable = new Set([root]);
  const adj = adjacency(input, true);
  const stack = [root];
  while (stack.length) {
    const node = stack.pop()!;
    for (const edge of adj.get(node) ?? []) if (!reachable.has(edge.to)) {
      reachable.add(edge.to);
      stack.push(edge.to);
    }
  }
  if (reachable.size !== input.nodes.length) {
    push(steps, input, true, "Not every vertex is reachable from the root.", "لا يمكن الوصول إلى كل عقدة من الجذر.", 0, "invalid-domain", {
      aux: [{ label: "Arborescence", values: ["none"] }],
    });
    return steps;
  }
  const initial: ContractEdge[] = input.edges.map((edge) => ({ ...edge, base: edge }));
  const solve = (nodes: string[], edges: ContractEdge[], currentRoot: string, depth: number): ContractEdge[] | null => {
    const incoming = new Map<string, ContractEdge>();
    for (const node of nodes) if (node !== currentRoot) {
      const choices = edges.filter((edge) => edge.to === node && edge.from !== node)
        .sort((a, b) => a.weight - b.weight || `${a.from}${a.to}`.localeCompare(`${b.from}${b.to}`));
      if (!choices[0]) return null;
      incoming.set(node, choices[0]);
      push(steps, input, true, `Choose minimum incoming edge ${choices[0].base.from} → ${choices[0].base.to}.`, `اختر أصغر حافة داخلة ${choices[0].base.from} ← ${choices[0].base.to}.`, 1, "edge-choice", {
        edgeStates: { [edgeKey(choices[0].base.from, choices[0].base.to)]: "compare" },
        aux: [{ label: "Selected incoming", values: [...incoming.values()].map((edge) => `${edge.base.from}>${edge.base.to}:${edge.base.weight}`) }],
      });
    }
    let cycle: string[] | null = null;
    for (const start of nodes) {
      if (start === currentRoot) continue;
      const positions = new Map<string, number>();
      const path: string[] = [];
      let node = start;
      while (node !== currentRoot && incoming.has(node) && !positions.has(node)) {
        positions.set(node, path.length);
        path.push(node);
        node = incoming.get(node)!.from;
      }
      if (positions.has(node)) {
        cycle = path.slice(positions.get(node)!);
        break;
      }
    }
    if (!cycle) return [...incoming.values()];
    const cycleSet = new Set(cycle);
    const supernode = `@cycle${depth}`;
    push(steps, input, true, `Contract cycle {${cycle.join(",")}}.`, `ادمج الدورة {${cycle.join(",")}}.`, 2, "contract-cycle", {
      states: Object.fromEntries(input.nodes.map((node) => [node, cycleSet.has(node) ? "special" : "default"])),
      aux: [{ label: "Cycle", values: cycle }],
    });
    const contractedNodes = [...nodes.filter((node) => !cycleSet.has(node)), supernode];
    const contractedEdges: ContractEdge[] = [];
    for (const edge of edges) {
      const fromInside = cycleSet.has(edge.from);
      const toInside = cycleSet.has(edge.to);
      if (fromInside && toInside) continue;
      if (!fromInside && toInside) {
        contractedEdges.push({
          from: edge.from,
          to: supernode,
          weight: edge.weight - incoming.get(edge.to)!.weight,
          source: edge,
          base: edge.base,
        });
      } else if (fromInside && !toInside) {
        contractedEdges.push({ from: supernode, to: edge.to, weight: edge.weight, source: edge, base: edge.base });
      } else {
        contractedEdges.push({ ...edge, source: edge });
      }
    }
    const contracted = solve(contractedNodes, contractedEdges, currentRoot, depth + 1);
    if (!contracted) return null;
    const expanded: ContractEdge[] = [];
    let entering: string | null = null;
    for (const edge of contracted) {
      const source = edge.source!;
      expanded.push(source);
      if (edge.to === supernode) entering = source.to;
    }
    for (const node of cycle) if (node !== entering) expanded.push(incoming.get(node)!);
    push(steps, input, true, `Expand the cycle and omit the incoming edge of ${entering}.`, `وسّع الدورة واحذف الحافة الداخلة إلى ${entering}.`, 3, "expand-cycle", {
      edgeStates: Object.fromEntries(expanded.map((edge) => [edgeKey(edge.base.from, edge.base.to), "found"])),
      aux: [{ label: "Expanded edges", values: expanded.map((edge) => `${edge.base.from}>${edge.base.to}`) }],
    });
    return expanded;
  };
  const result = solve(input.nodes, initial, root, 0);
  if (!result) {
    push(steps, input, true, "No rooted arborescence exists.", "لا توجد شجرة موجهة ممتدة من الجذر.", 4, "complete", {
      aux: [{ label: "Arborescence", values: ["none"] }],
    });
    return steps;
  }
  const unique = [...new Map(result.map((edge) => [`${edge.base.from}>${edge.base.to}`, edge.base])).values()];
  const total = unique.reduce((sum, edge) => sum + edge.weight, 0);
  push(steps, input, true, `Minimum rooted arborescence weight is ${total}.`, `وزن أصغر شجرة موجهة من الجذر هو ${total}.`, 4, "complete", {
    edgeStates: Object.fromEntries(unique.map((edge) => [edgeKey(edge.from, edge.to), "found"])),
    aux: [{ label: "Arborescence", values: unique.map((edge) => `${edge.from}>${edge.to}:${edge.weight}`) }, { label: "Total weight", values: [total] }],
  });
  return steps;
}

function transitiveClosure(input: GraphInput): Steps {
  const index = new Map(input.nodes.map((node, position) => [node, position]));
  const reach = input.nodes.map((_, row) => input.nodes.map((__, column) => row === column));
  input.edges.forEach((edge) => { reach[index.get(edge.from)!][index.get(edge.to)!] = true; });
  const steps: Steps = [];
  for (let k = 0; k < input.nodes.length; k++) {
    for (let i = 0; i < input.nodes.length; i++) {
      for (let j = 0; j < input.nodes.length; j++) {
        if (reach[i][j] || !reach[i][k] || !reach[k][j]) continue;
        reach[i][j] = true;
        push(steps, input, true, `${input.nodes[i]} reaches ${input.nodes[j]} through ${input.nodes[k]}.`, `${input.nodes[i]} تصل إلى ${input.nodes[j]} عبر ${input.nodes[k]}.`, 2, "closure-update", {
          states: statesFor(input.nodes, input.nodes[k], new Set([input.nodes[i], input.nodes[j]])),
          aux: [{ label: "New reachability", values: [`${input.nodes[i]}>${input.nodes[j]}`] }],
        });
      }
    }
  }
  const pairs = input.nodes.flatMap((from, i) => input.nodes.filter((_, j) => reach[i][j]).map((to) => `${from}>${to}`));
  push(steps, input, true, "The transitive closure is complete.", "اكتمل الإغلاق الانتقالي.", 3, "complete", {
    aux: [{ label: "Reachability", values: pairs }],
  });
  return steps;
}

function biconnected(input: GraphInput): Steps {
  const adj = adjacency(input, false);
  const discovery = new Map<string, number>();
  const low = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const edgeStack: { from: string; to: string; key: string }[] = [];
  const components: string[][] = [];
  const steps: Steps = [];
  let time = 0;
  const emitComponent = (until?: string) => {
    const component: string[] = [];
    while (edgeStack.length) {
      const edge = edgeStack.pop()!;
      component.push(`${edge.from}-${edge.to}`);
      if (!until || edge.key === until) break;
    }
    if (component.length) {
      components.push(component);
      push(steps, input, false, `Emit biconnected component {${component.join(",")}}.`, `أخرج مكوّن الاتصال الثنائي {${component.join(",")}}.`, 4, "component", {
        aux: [{ label: "Components", values: components.map((value) => value.join("|")) }],
      });
    }
  };
  const dfs = (node: string) => {
    discovery.set(node, ++time);
    low.set(node, time);
    push(steps, input, false, `Discover ${node}: disc=low=${time}.`, `اكتشف ${node}: disc=low=${time}.`, 1, "discover", {
      states: statesFor(input.nodes, node),
      annotations: Object.fromEntries([...discovery].map(([value, disc]) => [value, `d=${disc}, low=${low.get(value)}`])),
    });
    for (const edge of adj.get(node) ?? []) {
      const neighbor = edge.to;
      if (!discovery.has(neighbor)) {
        parent.set(neighbor, node);
        edgeStack.push({ from: node, to: neighbor, key: edge.key });
        dfs(neighbor);
        low.set(node, Math.min(low.get(node)!, low.get(neighbor)!));
        push(steps, input, false, `Update low(${node}) to ${low.get(node)} after ${neighbor}.`, `حدّث low(${node}) إلى ${low.get(node)} بعد ${neighbor}.`, 2, "low-link", {
          annotations: Object.fromEntries([...discovery].map(([value, disc]) => [value, `d=${disc}, low=${low.get(value)}`])),
          edgeStates: { [edge.key]: "compare" },
        });
        if (low.get(neighbor)! >= discovery.get(node)!) emitComponent(edge.key);
      } else if (neighbor !== parent.get(node) && discovery.get(neighbor)! < discovery.get(node)!) {
        edgeStack.push({ from: node, to: neighbor, key: edge.key });
        low.set(node, Math.min(low.get(node)!, discovery.get(neighbor)!));
        push(steps, input, false, `Back edge lowers low(${node}) to ${low.get(node)}.`, `تخفض الحافة الخلفية low(${node}) إلى ${low.get(node)}.`, 3, "low-link", {
          edgeStates: { [edge.key]: "special" },
          annotations: Object.fromEntries([...discovery].map(([value, disc]) => [value, `d=${disc}, low=${low.get(value)}`])),
        });
      }
    }
  };
  for (const node of input.nodes) if (!discovery.has(node)) {
    parent.set(node, null);
    dfs(node);
    emitComponent();
  }
  push(steps, input, false, `Found ${components.length} biconnected edge components.`, `تم العثور على ${components.length} مكوّنات حواف ثنائية الاتصال.`, 5, "complete", {
    aux: [{ label: "Components", values: components.map((component) => component.join("|")) }],
  });
  return steps;
}

function graphCycleDetection(input: GraphInput): Steps {
  const adj = adjacency(input, true);
  const color = new Map(input.nodes.map((node) => [node, 0]));
  const parent = new Map<string, string | null>();
  const steps: Steps = [];
  let cycle: string[] = [];
  const dfs = (node: string): boolean => {
    color.set(node, 1);
    push(steps, input, true, `Enter ${node}; mark it gray.`, `ادخل ${node} وعلّمها بالرمادي.`, 1, "dfs-enter", {
      states: Object.fromEntries(input.nodes.map((value) => [value, color.get(value) === 1 ? "active" : color.get(value) === 2 ? "visited" : "default"])),
      aux: [{ label: "DFS stack", values: input.nodes.filter((value) => color.get(value) === 1) }],
    });
    for (const edge of adj.get(node) ?? []) {
      push(steps, input, true, `Inspect ${node} → ${edge.to}.`, `افحص ${node} ← ${edge.to}.`, 2, "edge-choice", {
        edgeStates: { [edge.key]: "compare" },
      });
      if (color.get(edge.to) === 0) {
        parent.set(edge.to, node);
        if (dfs(edge.to)) return true;
      } else if (color.get(edge.to) === 1) {
        cycle = [edge.to];
        for (let value: string | null = node; value !== edge.to && value !== null; value = parent.get(value) ?? null) cycle.push(value);
        cycle.push(edge.to);
        cycle = [cycle[0], ...cycle.slice(1, -1).reverse(), cycle.at(-1)!];
        push(steps, input, true, `Back edge ${node} → ${edge.to} closes a cycle.`, `تغلق الحافة الخلفية ${node} ← ${edge.to} دورة.`, 3, "cycle-found", {
          edgeStates: { [edge.key]: "found" },
          states: statesFor(input.nodes, undefined, new Set(cycle)),
          aux: [{ label: "Cycle", values: cycle }],
        });
        return true;
      }
    }
    color.set(node, 2);
    push(steps, input, true, `Leave ${node}; mark it black.`, `اخرج من ${node} وعلّمها بالأسود.`, 4, "dfs-exit", {
      states: Object.fromEntries(input.nodes.map((value) => [value, color.get(value) === 1 ? "active" : color.get(value) === 2 ? "visited" : "default"])),
    });
    return false;
  };
  for (const node of input.nodes) if (color.get(node) === 0 && dfs(node)) break;
  push(steps, input, true, cycle.length ? "The directed graph contains a cycle." : "The directed graph is acyclic.", cycle.length ? "يحتوي الرسم الموجه على دورة." : "الرسم الموجه لا يحتوي على دورات.", 5, "complete", {
    aux: [{ label: "Result", values: [cycle.length ? "cycle" : "acyclic"] }, { label: "Cycle", values: cycle.length ? cycle : ["none"] }],
  });
  return steps;
}

const pseudo = (name: string, lines: string[]): string[] => [
  `procedure ${name}(G)`,
  ...lines,
  "  expose the current invariant",
  "  return the verified result",
].slice(0, 6);

function standardDefault(
  directed: boolean,
  domain: "binary" | "nonnegative" | "positive" | "any",
  extras: Partial<GraphInput> = {},
  endpoints = false,
): GraphSpec["defaultInput"] {
  return (level, rng) => {
    const generated = defaultWeighted(level, rng, directed, domain);
    return endpoints
      ? { ...generated, ...extras }
      : { nodes: generated.nodes, edges: generated.edges, ...extras };
  };
}

const dagDefault: GraphSpec["defaultInput"] = (level, rng) => {
  const input = defaultWeighted(level, rng, true, "any");
  const order = new Map(input.nodes.map((node, index) => [node, index]));
  const dedup = new Map<string, Edge>();
  for (const edge of input.edges) {
    const from = order.get(edge.from)! < order.get(edge.to)! ? edge.from : edge.to;
    const to = from === edge.from ? edge.to : edge.from;
    dedup.set(`${from}>${to}`, { from, to, weight: edge.weight });
  }
  return { ...input, edges: [...dedup.values()] };
};

const eulerDirectedDefault: GraphSpec["defaultInput"] = (level) => {
  const count = Math.min(3 + level, 8);
  const nodes = Array.from({ length: count }, (_, index) => String.fromCharCode(65 + index));
  return {
    nodes,
    edges: nodes.map((node, index) => ({ from: node, to: nodes[(index + 1) % nodes.length], weight: 1 })),
  };
};

const eulerUndirectedDefault: GraphSpec["defaultInput"] = (level) => {
  const directed = eulerDirectedDefault(level, { next: () => 0, int: () => 0, pick: (values) => values[0], shuffle: (values) => [...values] });
  return { ...directed, edges: directed.edges.map((edge) => ({ ...edge })) };
};

const bipartiteDefault: GraphSpec["defaultInput"] = (level, rng) => {
  const side = Math.min(2 + Math.floor(level / 2), 4);
  const left = Array.from({ length: side }, (_, index) => `L${index + 1}`);
  const right = Array.from({ length: side }, (_, index) => `R${index + 1}`);
  const edges: Edge[] = [];
  for (const a of left) for (const b of right) if (rng.next() < 0.65 || a.slice(1) === b.slice(1)) edges.push({ from: a, to: b, weight: rng.int(1, 12) });
  return { nodes: [...left, ...right], edges, left };
};

const assignmentDefault: GraphSpec["defaultInput"] = (level, rng) => {
  const input = bipartiteDefault(level, rng);
  input.edges = input.left!.flatMap((a) => input.nodes.filter((node) => !input.left!.includes(node)).map((b) => ({ from: a, to: b, weight: rng.int(1, 15) })));
  return input;
};

const arborescenceDefault: GraphSpec["defaultInput"] = (level, rng) => {
  const input = defaultWeighted(level, rng, true, "any");
  return { nodes: input.nodes, edges: input.edges, start: input.nodes[0] };
};

const SPECS: GraphSpec[] = [
  {
    slug: "zero-one-bfs",
    title: "0–1 BFS",
    titleAr: "البحث بالعرض بأوزان صفر وواحد",
    difficulty: "Intermediate",
    summary: "Computes shortest paths with a deque when every edge weight is zero or one.",
    summaryAr: "تحسب أقصر المسارات بطابور مزدوج عندما يكون كل وزن صفراً أو واحداً.",
    pseudocode: pseudo("zeroOneBfs", ["initialize distances and deque", "pop the front vertex", "relax each outgoing edge", "push zero edges front and one edges back"]),
    directed: true,
    weighted: true,
    fields: ["start", "target"],
    domain: "binary",
    defaultInput: standardDefault(true, "binary", {}, true),
    generate: zeroOneBfs,
  },
  {
    slug: "dial-algorithm",
    title: "Dial's Algorithm",
    titleAr: "خوارزمية دايل",
    difficulty: "Advanced",
    summary: "Uses distance buckets for nonnegative bounded integer edge weights.",
    summaryAr: "تستخدم دلاء المسافات للأوزان الصحيحة غير السالبة والمحدودة.",
    pseudocode: pseudo("dial", ["initialize integer-indexed buckets", "extract the next nonempty bucket", "inspect outgoing edges", "move improved vertices to new buckets"]),
    directed: true,
    weighted: true,
    fields: ["start", "target"],
    domain: "nonnegative",
    defaultInput: standardDefault(true, "nonnegative", {}, true),
    generate: dial,
  },
  {
    slug: "bidirectional-dijkstra",
    title: "Bidirectional Dijkstra",
    titleAr: "ديكسترا ثنائية الاتجاه",
    difficulty: "Advanced",
    summary: "Runs synchronized Dijkstra searches from both endpoints.",
    summaryAr: "تشغّل بحثي ديكسترا متزامنين من طرفي المسار.",
    pseudocode: pseudo("bidirectionalDijkstra", ["initialize two distance maps", "settle the cheaper frontier", "relax incident edges", "stop when lower bounds meet"]),
    directed: false,
    weighted: true,
    fields: ["start", "target"],
    domain: "nonnegative",
    defaultInput: standardDefault(false, "nonnegative", {}, true),
    generate: bidirectionalDijkstra,
  },
  {
    slug: "dag-shortest-path",
    title: "DAG Shortest Path",
    titleAr: "أقصر مسار في رسم لا دوري",
    difficulty: "Intermediate",
    summary: "Relaxes vertices once in topological order and accepts negative edges.",
    summaryAr: "تحدّث العُقد مرة واحدة حسب الترتيب الطوبولوجي وتقبل الأوزان السالبة.",
    pseudocode: pseudo("dagShortestPath", ["topologically sort the graph", "reject a directed cycle", "initialize the source distance", "relax edges in topological order"]),
    directed: true,
    weighted: true,
    fields: ["start", "target"],
    domain: "any",
    defaultInput: dagDefault,
    generate: dagShortest,
  },
  {
    slug: "boruvka",
    title: "Borůvka's Algorithm",
    titleAr: "خوارزمية بوروفكا",
    difficulty: "Advanced",
    summary: "Repeatedly adds each component's cheapest outgoing edge.",
    summaryAr: "تضيف بصورة متكررة أرخص حافة خارجة من كل مكوّن.",
    pseudocode: pseudo("boruvka", ["make one component per vertex", "find each component's cheapest edge", "merge components through those edges", "repeat until no merge remains"]),
    directed: false,
    weighted: true,
    domain: "any",
    defaultInput: standardDefault(false, "positive"),
    generate: boruvka,
  },
  {
    slug: "reverse-delete-mst",
    title: "Reverse-Delete MST",
    titleAr: "الشجرة الممتدة بالحذف العكسي",
    difficulty: "Advanced",
    summary: "Deletes heavy edges whenever component connectivity is preserved.",
    summaryAr: "تحذف الحواف الثقيلة متى بقي اتصال المكوّن محفوظاً.",
    pseudocode: pseudo("reverseDelete", ["sort edges from heavy to light", "tentatively delete an edge", "restore it if a component disconnects", "keep the remaining forest"]),
    directed: false,
    weighted: true,
    domain: "any",
    defaultInput: standardDefault(false, "positive"),
    generate: reverseDelete,
  },
  {
    slug: "hierholzer",
    title: "Hierholzer's Algorithm",
    titleAr: "خوارزمية هيرهولزر",
    difficulty: "Intermediate",
    summary: "Builds a directed Euler trail by splicing edge-disjoint circuits.",
    summaryAr: "تبني مسار أويلر موجهاً بدمج دورات منفصلة الحواف.",
    pseudocode: pseudo("hierholzer", ["validate directed degrees", "walk unused outgoing edges", "push vertices on a stack", "backtrack into the final circuit"]),
    directed: true,
    weighted: true,
    domain: "any",
    defaultInput: eulerDirectedDefault,
    generate: hierholzer,
  },
  {
    slug: "fleury",
    title: "Fleury's Algorithm",
    titleAr: "خوارزمية فلوري",
    difficulty: "Intermediate",
    summary: "Constructs an undirected Euler trail while avoiding bridges when possible.",
    summaryAr: "تبني مسار أويلر غير موجه مع تجنب الجسور متى أمكن.",
    pseudocode: pseudo("fleury", ["validate odd-degree count", "inspect incident unused edges", "avoid a bridge when alternatives exist", "traverse the selected edge"]),
    directed: false,
    weighted: true,
    domain: "any",
    defaultInput: eulerUndirectedDefault,
    generate: fleury,
  },
  {
    slug: "hopcroft-karp",
    title: "Hopcroft–Karp",
    titleAr: "خوارزمية هوبكروفت–كارب",
    difficulty: "Advanced",
    summary: "Finds maximum bipartite matching in BFS-layered augmenting batches.",
    summaryAr: "تجد المطابقة الثنائية القصوى بدفعات من المسارات المعززة ذات طبقات BFS.",
    pseudocode: pseudo("hopcroftKarp", ["BFS from every free left vertex", "build shortest augmenting layers", "DFS through layer-respecting edges", "augment all compatible paths"]),
    directed: false,
    weighted: true,
    fields: ["left"],
    domain: "any",
    defaultInput: bipartiteDefault,
    generate: hopcroftKarp,
  },
  {
    slug: "hungarian-algorithm",
    title: "Hungarian Algorithm",
    titleAr: "الخوارزمية الهنغارية",
    difficulty: "Advanced",
    summary: "Computes a minimum-cost perfect assignment using dual potentials.",
    summaryAr: "تحسب إسناداً مثالياً بأقل كلفة باستخدام الجهود الثنائية.",
    pseudocode: pseudo("hungarian", ["initialize row and column potentials", "scan reduced costs", "update dual potentials", "augment the partial assignment"]),
    directed: false,
    weighted: true,
    fields: ["left"],
    domain: "any",
    defaultInput: assignmentDefault,
    generate: hungarian,
  },
  {
    slug: "karger-min-cut",
    title: "Karger's Minimum Cut",
    titleAr: "القطع الأدنى العشوائي لكارغر",
    difficulty: "Advanced",
    summary: "Repeatedly contracts random edges and retains the lightest sampled cut.",
    summaryAr: "تدمج حواف عشوائية مراراً وتحتفظ بأخف قطع تم اختباره.",
    pseudocode: pseudo("karger", ["repeat independent seeded trials", "choose a random crossing edge", "contract its endpoint supernodes", "retain the lightest two-supernode cut"]),
    directed: false,
    weighted: true,
    fields: ["seed"],
    domain: "positive",
    defaultInput: standardDefault(false, "positive", { seed: 7 }),
    generate: karger,
  },
  {
    slug: "stoer-wagner-min-cut",
    title: "Stoer–Wagner Minimum Cut",
    titleAr: "القطع الأدنى لشتوير–فاغنر",
    difficulty: "Advanced",
    summary: "Deterministically computes the global minimum cut in a weighted undirected graph.",
    summaryAr: "تحسب بصورة حتمية القطع الأدنى العام في رسم غير موجه موزون.",
    pseudocode: pseudo("stoerWagner", ["grow a maximum-adjacency phase", "record the final vertex's phase cut", "merge the final two vertices", "retain the lightest phase cut"]),
    directed: false,
    weighted: true,
    domain: "nonnegative",
    defaultInput: standardDefault(false, "positive"),
    generate: stoerWagner,
  },
  {
    slug: "pagerank",
    title: "PageRank",
    titleAr: "خوارزمية ترتيب الصفحات",
    difficulty: "Intermediate",
    summary: "Iteratively distributes rank through incoming links with dangling-node correction.",
    summaryAr: "توزع الرتبة تكرارياً عبر الروابط الداخلة مع معالجة العُقد المعلقة.",
    pseudocode: pseudo("pageRank", ["initialize uniform ranks", "collect incoming rank contributions", "redistribute dangling rank", "apply damping and repeat"]),
    directed: true,
    weighted: true,
    fields: ["iterations", "damping"],
    domain: "any",
    defaultInput: standardDefault(true, "positive", { iterations: 12, damping: 0.85 }),
    generate: pageRank,
  },
  {
    slug: "bron-kerbosch",
    title: "Bron–Kerbosch",
    titleAr: "خوارزمية برون–كيربوش",
    difficulty: "Advanced",
    summary: "Enumerates every maximal clique using pivoted backtracking.",
    summaryAr: "تعدد كل مجموعة كاملة عظمى باستخدام التراجع مع محور.",
    pseudocode: pseudo("bronKerbosch", ["maintain R, P, and X sets", "choose a pivot", "recurse on non-neighbor candidates", "record R when P and X are empty"]),
    directed: false,
    weighted: true,
    domain: "any",
    defaultInput: standardDefault(false, "positive"),
    generate: bronKerbosch,
  },
  {
    slug: "edmonds-arborescence",
    title: "Edmonds' Arborescence",
    titleAr: "شجرة إدموندز الموجهة",
    difficulty: "Advanced",
    summary: "Finds a minimum rooted directed spanning arborescence by contracting cycles.",
    summaryAr: "تجد أصغر شجرة موجهة ممتدة من جذر عبر دمج الدورات.",
    pseudocode: pseudo("edmondsArborescence", ["choose each non-root minimum incoming edge", "detect a selected-edge cycle", "contract and reweight that cycle", "solve recursively and expand"]),
    directed: true,
    weighted: true,
    fields: ["start"],
    domain: "any",
    defaultInput: arborescenceDefault,
    generate: edmondsArborescence,
  },
  {
    slug: "transitive-closure",
    title: "Transitive Closure",
    titleAr: "الإغلاق الانتقالي",
    difficulty: "Intermediate",
    summary: "Computes all directed reachability pairs with Warshall's recurrence.",
    summaryAr: "تحسب كل أزواج الوصول الموجهة باستخدام علاقة وورشال التكرارية.",
    pseudocode: pseudo("transitiveClosure", ["initialize self and edge reachability", "choose an intermediate vertex k", "set reach(i,j) through k", "return all reachable pairs"]),
    directed: true,
    weighted: true,
    domain: "any",
    defaultInput: standardDefault(true, "positive"),
    generate: transitiveClosure,
  },
  {
    slug: "biconnected-components",
    title: "Biconnected Components",
    titleAr: "مكوّنات الاتصال الثنائي",
    difficulty: "Advanced",
    summary: "Uses DFS low-link values and an edge stack to emit biconnected blocks.",
    summaryAr: "تستخدم قيم low-link ومكدس حواف لإخراج كتل الاتصال الثنائي.",
    pseudocode: pseudo("biconnectedComponents", ["DFS and assign discovery times", "push tree and back edges", "propagate low-link values", "pop a component at each boundary"]),
    directed: false,
    weighted: true,
    domain: "any",
    defaultInput: standardDefault(false, "positive"),
    generate: biconnected,
  },
  {
    slug: "graph-cycle-detection",
    title: "Directed Graph Cycle Detection",
    titleAr: "كشف الدورة في الرسم الموجه",
    difficulty: "Intermediate",
    summary: "Detects a directed cycle through white, gray, and black DFS states.",
    summaryAr: "تكشف دورة موجهة باستخدام حالات DFS البيضاء والرمادية والسوداء.",
    pseudocode: pseudo("detectDirectedCycle", ["mark a DFS vertex gray", "inspect every outgoing edge", "report an edge to a gray ancestor", "mark the finished vertex black"]),
    directed: true,
    weighted: true,
    domain: "any",
    defaultInput: standardDefault(true, "positive"),
    generate: graphCycleDetection,
  },
];

export const modules = SPECS.map(createGraphModule);
