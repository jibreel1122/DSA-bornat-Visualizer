import type { CellState, Level, RNG, Step, TreeFrame, TreeNodeF } from "@/lib/engine/types";
import {
  cloneFrame,
  integerField,
  linearComplexity,
  makeTreeModule,
  parseIntegers,
  randomUnique,
  step,
} from "./shared";

interface RootedTree {
  labels: number[];
  adjacency: Map<number, number[]>;
  root: number;
  query: [number, number];
}

function parseEdges(raw: string): { labels: number[]; adjacency: Map<number, number[]> } {
  const tokens = raw.split(",").map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 30) throw new Error("Enter between 1 and 30 edges.");
  const adjacency = new Map<number, number[]>();
  const seen = new Set<string>();
  for (const token of tokens) {
    const parts = token.split("-").map((part) => Number(part.trim()));
    if (parts.length !== 2 || parts.some((value) => !Number.isSafeInteger(value)) || parts[0] === parts[1]) throw new Error(`"${token}" must be u-v with two different integers.`);
    const [left, right] = parts;
    const key = left < right ? `${left}:${right}` : `${right}:${left}`;
    if (seen.has(key)) throw new Error(`Duplicate edge "${token}".`);
    seen.add(key);
    adjacency.set(left, [...(adjacency.get(left) ?? []), right]);
    adjacency.set(right, [...(adjacency.get(right) ?? []), left]);
  }
  const labels = [...adjacency.keys()].sort((a, b) => a - b);
  if (tokens.length !== labels.length - 1) throw new Error("Edges must contain exactly n-1 links.");
  const visited = new Set<number>();
  const stack = [labels[0]];
  while (stack.length) {
    const node = stack.pop()!;
    if (visited.has(node)) continue;
    visited.add(node);
    stack.push(...(adjacency.get(node) ?? []));
  }
  if (visited.size !== labels.length) throw new Error("Edges must form one connected tree.");
  return { labels, adjacency };
}

function parseTree(fields: Record<string, string>): RootedTree {
  const parsed = parseEdges(fields.edges ?? "");
  const root = Number(fields.root);
  if (!Number.isSafeInteger(root) || !parsed.adjacency.has(root)) throw new Error("Root must be a tree vertex.");
  const queryParts = (fields.query ?? "").split(":").map(Number);
  if (queryParts.length !== 2 || queryParts.some((value) => !Number.isSafeInteger(value) || !parsed.adjacency.has(value))) throw new Error("Query must contain two tree vertices separated by a colon.");
  return { ...parsed, root, query: [queryParts[0], queryParts[1]] };
}

function treeDefaults(level: Level, rng: RNG): RootedTree {
  const count = 4 + level;
  const adjacency = new Map<number, number[]>(Array.from({ length: count }, (_, index) => [index, []]));
  for (let child = 1; child < count; child++) {
    const parent = rng.int(0, child - 1);
    adjacency.get(parent)!.push(child);
    adjacency.get(child)!.push(parent);
  }
  return { labels: Array.from({ length: count }, (_, index) => index), adjacency, root: 0, query: [count - 2, count - 1] };
}

function serializeTree(input: RootedTree): Record<string, string> {
  const edges: string[] = [];
  for (const [from, neighbors] of input.adjacency) {
    for (const to of neighbors) if (from < to) edges.push(`${from}-${to}`);
  }
  edges.sort((left, right) => {
    const [leftFrom, leftTo] = left.split("-").map(Number);
    const [rightFrom, rightTo] = right.split("-").map(Number);
    return leftFrom - rightFrom || leftTo - rightTo;
  });
  return { edges: edges.join(", "), root: String(input.root), query: input.query.join(":") };
}

const treeFields = [
  { key: "edges", label: "Tree edges", labelAr: "حواف الشجرة", placeholder: "0-1, 0-2, 1-3, 1-4", help: "Comma-separated undirected u-v edges forming a tree.", helpAr: "حواف غير موجهة u-v تكوّن شجرة.", list: true },
  { key: "root", label: "Root", labelAr: "الجذر", placeholder: "0", help: "Root used for preprocessing.", helpAr: "الجذر المستخدم في المعالجة المسبقة." },
  { key: "query", label: "Vertex query", labelAr: "استعلام عقدتين", placeholder: "3:4", help: "Two vertices separated by a colon.", helpAr: "عقدتان مفصولتان بنقطتين.", search: true },
];

interface RootInfo {
  parent: Map<number, number>;
  depth: Map<number, number>;
  children: Map<number, number[]>;
  order: number[];
}

function rootTree(input: RootedTree): RootInfo {
  const parent = new Map<number, number>([[input.root, input.root]]);
  const depth = new Map<number, number>([[input.root, 0]]);
  const children = new Map<number, number[]>(input.labels.map((label) => [label, []]));
  const order = [input.root];
  for (let index = 0; index < order.length; index++) {
    const node = order[index];
    for (const neighbor of input.adjacency.get(node) ?? []) {
      if (parent.has(neighbor)) continue;
      parent.set(neighbor, node);
      depth.set(neighbor, depth.get(node)! + 1);
      children.get(node)!.push(neighbor);
      order.push(neighbor);
    }
  }
  return { parent, depth, children, order };
}

function generalFrame(
  input: RootedTree,
  info: RootInfo,
  states: Record<string, CellState>,
  extras: Map<number, string>,
  aux: TreeFrame["aux"],
  note: string,
): TreeFrame {
  const nodes: Record<string, TreeNodeF> = {};
  for (const label of input.labels) {
    nodes[`n${label}`] = {
      id: `n${label}`,
      value: label,
      children: info.children.get(label)!.map((child) => `n${child}`),
      extra: extras.get(label),
    };
  }
  return cloneFrame(nodes, `n${input.root}`, states, aux, note);
}

function generateBinaryLifting(input: RootedTree): Step<TreeFrame>[] {
  const info = rootTree(input);
  const logarithm = Math.ceil(Math.log2(input.labels.length)) + 1;
  const up = Array.from({ length: logarithm }, () => new Map<number, number>());
  const extras = new Map<number, string>();
  let preprocessing = 0;
  let jumps = 0;
  const steps: Step<TreeFrame>[] = [];
  const emit = (states: Record<string, CellState>, description: string, descriptionAr: string, line: number, phase: string) =>
    steps.push(step(generalFrame(input, info, states, extras, up.map((row, index) => ({ label: `2^${index} ancestor`, values: input.labels.map((label) => row.get(label) ?? "–") })), "Binary lifting stores ancestors at powers of two."), description, descriptionAr, line, phase, { preprocessing, jumps }));
  emit({}, `Root the tree at ${input.root}.`, `جذّر الشجرة عند ${input.root}.`, 0, "root");
  for (const node of info.order) {
    up[0].set(node, info.parent.get(node)!);
    extras.set(node, `d=${info.depth.get(node)} · up=${up[0].get(node)}`);
    preprocessing++;
    emit({ [`n${node}`]: "found" }, `Set parent[${node}] = ${up[0].get(node)} at depth ${info.depth.get(node)}.`, `عيّن parent[${node}] = ${up[0].get(node)} عند العمق ${info.depth.get(node)}.`, 0, "parent");
  }
  for (let power = 1; power < logarithm; power++) {
    for (const node of input.labels) {
      const half = up[power - 1].get(node)!;
      up[power].set(node, up[power - 1].get(half)!);
      preprocessing++;
      emit({ [`n${node}`]: "active", [`n${up[power].get(node)}`]: "visited" }, `The 2^${power} ancestor of node ${node} is ${up[power].get(node)}.`, `السلف على مسافة 2^${power} للعقدة ${node} هو ${up[power].get(node)}.`, 1, "table");
    }
  }
  let [left, right] = input.query;
  if (info.depth.get(left)! < info.depth.get(right)!) [left, right] = [right, left];
  let difference = info.depth.get(left)! - info.depth.get(right)!;
  for (let power = logarithm - 1; power >= 0; power--) {
    if ((difference & (1 << power)) !== 0) {
      const next = up[power].get(left)!;
      jumps++;
      emit({ [`n${left}`]: "active", [`n${next}`]: "found" }, `Lift ${left} by 2^${power} to ${next}.`, `ارفع ${left} بمقدار 2^${power} إلى ${next}.`, 2, "lift");
      left = next;
      difference -= 1 << power;
    }
  }
  if (left !== right) {
    for (let power = logarithm - 1; power >= 0; power--) {
      if (up[power].get(left) !== up[power].get(right)) {
        const nextLeft = up[power].get(left)!;
        const nextRight = up[power].get(right)!;
        jumps += 2;
        emit({ [`n${left}`]: "active", [`n${right}`]: "active", [`n${nextLeft}`]: "visited", [`n${nextRight}`]: "visited" }, `Jump both vertices by 2^${power}: ${left}→${nextLeft}, ${right}→${nextRight}.`, `اقفز بالعقدتين 2^${power}: ${left}←${nextLeft} و${right}←${nextRight}.`, 3, "lift-both");
        left = nextLeft;
        right = nextRight;
      }
    }
    left = info.parent.get(left)!;
  }
  emit({ [`n${left}`]: "found" }, `LCA(${input.query[0]}, ${input.query[1]}) = ${left}.`, `السلف المشترك الأدنى لـ (${input.query[0]}، ${input.query[1]}) هو ${left}.`, 3, "done");
  return steps;
}

export const binaryLiftingLca = makeTreeModule<RootedTree>({
  slug: "binary-lifting-lca",
  title: "Binary Lifting LCA",
  titleAr: "السلف المشترك بالرفع الثنائي",
  difficulty: "Advanced",
  tags: ["LCA", "binary lifting", "ancestor table"],
  tagsAr: ["السلف المشترك الأدنى", "رفع ثنائي", "جدول الأسلاف"],
  summary: "Precompute power-of-two ancestors and answer LCA queries with logarithmic jumps.",
  summaryAr: "احسب أسلاف قوى الاثنين مسبقاً وأجب عن استعلام LCA بقفزات لوغاريتمية.",
  overview: "Binary lifting stores each node's 2^k-th ancestor, first equalizes depths, then lifts both query vertices without crossing their LCA.",
  overviewAr: "يخزن الرفع الثنائي سلف كل عقدة بمسافة 2^k، ثم يساوي العمق ويرفع العقدتين من دون تجاوز سلفهما المشترك الأدنى.",
  pseudocode: ["DFS parent and depth", "build up[v][k] from two half jumps", "lift the deeper vertex", "lift both vertices below their LCA"],
  complexity: { time: { best: "O(n log n)", average: "O(log n) per query", worst: "O(log n) per query" }, space: "O(n log n)" },
  applications: ["Ancestry queries", "Tree distances", "Path aggregation"],
  applicationsAr: ["استعلامات النسب", "مسافات الشجرة", "تجميع المسارات"],
  inputFields: treeFields,
  defaultInput: treeDefaults,
  parseInput: parseTree,
  serializeInput: serializeTree,
  generate: generateBinaryLifting,
});

interface MorrisNode {
  id: string;
  key: number;
  left: MorrisNode | null;
  right: MorrisNode | null;
  threadTo: MorrisNode | null;
}
type MorrisInput = { values: number[] };

function parseMorris(fields: Record<string, string>): MorrisInput {
  return { values: parseIntegers(fields.values ?? "", 18, true) };
}

function morrisFrame(root: MorrisNode | null, states: Record<string, CellState>, output: number[]): TreeFrame {
  const nodes: Record<string, TreeNodeF> = {};
  const visit = (node: MorrisNode | null) => {
    if (!node) return;
    nodes[node.id] = {
      id: node.id,
      value: node.key,
      left: node.left?.id ?? null,
      right: node.right?.id ?? null,
      extra: node.threadTo ? `thread→${node.threadTo.key}` : undefined,
    };
    visit(node.left);
    visit(node.right);
  };
  visit(root);
  return cloneFrame(nodes, root?.id ?? null, states, [{ label: "inorder output", values: output }], "Temporary predecessor threads are annotations, not permanent child links.");
}

function generateMorris(input: MorrisInput): Step<TreeFrame>[] {
  let root: MorrisNode | null = null;
  let nextId = 0;
  for (const key of input.values) {
    const node: MorrisNode = { id: `mo${nextId++}`, key, left: null, right: null, threadTo: null };
    if (!root) {
      root = node;
      continue;
    }
    let current: MorrisNode = root;
    while (true) {
      if (key < current.key) {
        if (!current.left) {
          current.left = node;
          break;
        }
        current = current.left;
      } else {
        if (!current.right) {
          current.right = node;
          break;
        }
        current = current.right;
      }
    }
  }
  const output: number[] = [];
  const steps: Step<TreeFrame>[] = [];
  let current = root;
  let threads = 0;
  let visits = 0;
  const emit = (states: Record<string, CellState>, description: string, descriptionAr: string, line: number, phase: string, transformation?: Step<TreeFrame>["transformation"]) =>
    steps.push(step(morrisFrame(root, states, output), description, descriptionAr, line, phase, { threads, visits }, transformation));
  emit({}, "Begin Morris inorder traversal without a stack.", "ابدأ عبور Morris الوسطي من دون مكدس.", 0, "start");
  while (current) {
    if (!current.left) {
      output.push(current.key);
      visits++;
      emit({ [current.id]: "found" }, `${current.key} has no left child; visit it and move right.`, `لا يوجد ابن أيسر لـ ${current.key}؛ زره وانتقل يميناً.`, 1, "visit");
      current = current.right ?? current.threadTo;
      continue;
    }
    let predecessor = current.left;
    emit({ [current.id]: "active", [predecessor.id]: "compare" }, `Find ${current.key}'s inorder predecessor in its left subtree.`, `ابحث عن سلف ${current.key} الوسطي في فرعه الأيسر.`, 2, "predecessor");
    while (predecessor.right && predecessor.right !== current) {
      predecessor = predecessor.right;
      emit({ [predecessor.id]: "compare" }, `Move right to predecessor candidate ${predecessor.key}.`, `انتقل يميناً إلى مرشح السلف ${predecessor.key}.`, 2, "predecessor");
    }
    if (!predecessor.threadTo) {
      emit({ [predecessor.id]: "swap", [current.id]: "active" }, `Prepare a temporary thread from ${predecessor.key} back to ${current.key}.`, `استعد لإنشاء رابط مؤقت من ${predecessor.key} إلى ${current.key}.`, 3, "thread-create");
      predecessor.threadTo = current;
      threads++;
      emit({ [predecessor.id]: "special", [current.id]: "active" }, `Create thread ${predecessor.key}→${current.key}, then descend left.`, `أنشئ الرابط ${predecessor.key}←${current.key} ثم انزل يساراً.`, 3, "thread-create", { kind: "other", label: "Morris thread creation" });
      current = current.left;
    } else {
      emit({ [predecessor.id]: "swap", [current.id]: "active" }, `The thread returns to ${current.key}; prepare to remove it.`, `أعاد الرابط المؤقت الوصول إلى ${current.key}؛ استعد لإزالته.`, 4, "thread-remove");
      predecessor.threadTo = null;
      threads--;
      output.push(current.key);
      visits++;
      emit({ [predecessor.id]: "visited", [current.id]: "found" }, `Remove the thread, visit ${current.key}, and restore the original tree.`, `أزل الرابط وزر ${current.key} واستعد شكل الشجرة الأصلي.`, 4, "thread-remove", { kind: "other", label: "Morris thread removal" });
      current = current.right ?? current.threadTo;
    }
  }
  emit({}, `Morris traversal is complete: ${output.join(", ")}.`, `اكتمل عبور Morris: ${output.join("، ")}.`, 4, "done");
  return steps;
}

export const morrisTraversal = makeTreeModule<MorrisInput>({
  slug: "morris-traversal",
  title: "Morris Traversal",
  titleAr: "عبور Morris",
  difficulty: "Advanced",
  tags: ["inorder", "threading", "O(1) space"],
  tagsAr: ["عبور وسطي", "روابط مؤقتة", "مساحة ثابتة"],
  summary: "Traverse a binary tree inorder using temporary predecessor threads.",
  summaryAr: "اعبر شجرة ثنائية وسطياً باستخدام روابط مؤقتة إلى الأسلاف.",
  overview: "Morris traversal temporarily connects each inorder predecessor to its successor, then removes that thread on the second encounter.",
  overviewAr: "يربط عبور Morris كل سلف وسطي بخليفته مؤقتاً ثم يزيل الرابط عند الوصول الثاني.",
  pseudocode: ["initialize current at the root", "visit directly when no left child exists", "find the inorder predecessor", "create a return thread and descend left", "remove the thread and visit on return"],
  complexity: { time: { best: "O(n)", average: "O(n)", worst: "O(n)" }, space: "O(1)" },
  applications: ["Memory-constrained traversal", "BST iteration", "Threaded-tree education"],
  applicationsAr: ["العبور بذاكرة محدودة", "تكرار BST", "تعليم الأشجار المترابطة"],
  inputFields: [integerField()],
  defaultInput: (level, rng) => ({ values: randomUnique(level, rng, 9) }),
  parseInput: parseMorris,
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate: generateMorris,
});

function generateDiameter(input: RootedTree): Step<TreeFrame>[] {
  const info = rootTree(input);
  const extras = new Map<number, string>();
  const steps: Step<TreeFrame>[] = [];
  let visits = 0;
  const emit = (states: Record<string, CellState>, description: string, descriptionAr: string, line: number, phase: string, queue: number[] = []) =>
    steps.push(step(generalFrame(input, info, states, extras, [{ label: "BFS queue", values: queue }], "Two BFS sweeps find the endpoints of a tree diameter."), description, descriptionAr, line, phase, { visits }));
  const bfs = (source: number, phase: string) => {
    const distance = new Map<number, number>([[source, 0]]);
    const parent = new Map<number, number>([[source, source]]);
    const queue = [source];
    emit({ [`n${source}`]: "found" }, `Start ${phase} BFS from ${source}.`, `ابدأ BFS ${phase} من ${source}.`, 0, phase, queue);
    for (let index = 0; index < queue.length; index++) {
      const node = queue[index];
      visits++;
      extras.set(node, `dist=${distance.get(node)}`);
      emit({ [`n${node}`]: "active" }, `Visit ${node} at distance ${distance.get(node)}.`, `زر ${node} عند المسافة ${distance.get(node)}.`, 1, phase, queue.slice(index + 1));
      for (const neighbor of input.adjacency.get(node) ?? []) {
        if (distance.has(neighbor)) continue;
        distance.set(neighbor, distance.get(node)! + 1);
        parent.set(neighbor, node);
        queue.push(neighbor);
        emit({ [`n${node}`]: "visited", [`n${neighbor}`]: "found" }, `Discover ${neighbor} from ${node}.`, `اكتشف ${neighbor} من ${node}.`, 1, phase, queue.slice(index + 1));
      }
    }
    const farthest = [...distance.entries()].sort((left, right) => right[1] - left[1] || left[0] - right[0])[0][0];
    emit({ [`n${farthest}`]: "found" }, `Farthest vertex from ${source} is ${farthest}.`, `أبعد عقدة عن ${source} هي ${farthest}.`, 2, phase);
    return { farthest, distance, parent };
  };
  const first = bfs(input.root, "first-sweep");
  const second = bfs(first.farthest, "second-sweep");
  const path = [second.farthest];
  while (path.at(-1) !== first.farthest) path.push(second.parent.get(path.at(-1)!)!);
  const states = Object.fromEntries(input.labels.map((label) => [`n${label}`, path.includes(label) ? "found" as CellState : "default" as CellState]));
  steps.push(step(generalFrame(input, info, states, extras, [{ label: "diameter path", values: [...path].reverse() }], "The highlighted path is a longest simple path."), `Diameter length is ${path.length - 1}: ${[...path].reverse().join(" → ")}.`, `طول القطر ${path.length - 1}: ${[...path].reverse().join(" ← ")}.`, 3, "done", { visits }));
  return steps;
}

export const treeDiameter = makeTreeModule<RootedTree>({
  slug: "tree-diameter",
  title: "Tree Diameter",
  titleAr: "قطر الشجرة",
  difficulty: "Intermediate",
  tags: ["longest path", "two BFS", "tree metric"],
  tagsAr: ["أطول مسار", "بحثان BFS", "مقياس شجرة"],
  summary: "Find a longest tree path using two breadth-first sweeps.",
  summaryAr: "أوجد أطول مسار في الشجرة باستخدام بحثين بالعرض.",
  overview: "A farthest vertex from any start is a diameter endpoint; a second BFS from it finds the opposite endpoint and the path.",
  overviewAr: "تكون أبعد عقدة عن أي بداية طرفاً للقطر؛ ويجد BFS ثانٍ منها الطرف الآخر والمسار.",
  pseudocode: ["BFS from any vertex", "choose a farthest endpoint A", "BFS from A and save parents", "reconstruct the path to farthest B"],
  complexity: linearComplexity,
  applications: ["Network latency", "Tree centers", "Phylogenetic analysis"],
  applicationsAr: ["زمن الشبكات", "مراكز الأشجار", "التحليل التطوري"],
  inputFields: treeFields,
  defaultInput: treeDefaults,
  parseInput: parseTree,
  serializeInput: serializeTree,
  generate: generateDiameter,
});

function generateEulerLca(input: RootedTree): Step<TreeFrame>[] {
  const info = rootTree(input);
  const extras = new Map<number, string>();
  const euler: number[] = [];
  const eulerDepth: number[] = [];
  const first = new Map<number, number>();
  const steps: Step<TreeFrame>[] = [];
  let tableWrites = 0;
  const emit = (states: Record<string, CellState>, description: string, descriptionAr: string, line: number, phase: string, extraRows: TreeFrame["aux"] = []) =>
    steps.push(step(generalFrame(input, info, states, extras, [{ label: "Euler tour", values: euler }, { label: "Euler depths", values: eulerDepth }, ...extraRows], "LCA becomes a minimum-depth query between first Euler occurrences."), description, descriptionAr, line, phase, { tableWrites }));
  const walk = (node: number) => {
    if (!first.has(node)) first.set(node, euler.length);
    euler.push(node);
    eulerDepth.push(info.depth.get(node)!);
    extras.set(node, `first=${first.get(node)} · d=${info.depth.get(node)}`);
    emit({ [`n${node}`]: "active" }, `Append ${node} on DFS entry at depth ${info.depth.get(node)}.`, `أضف ${node} عند دخول DFS في العمق ${info.depth.get(node)}.`, 0, "euler");
    for (const child of info.children.get(node)!) {
      walk(child);
      euler.push(node);
      eulerDepth.push(info.depth.get(node)!);
      emit({ [`n${node}`]: "visited", [`n${child}`]: "visited" }, `Return from ${child}; append parent ${node} again.`, `ارجع من ${child} وأضف الأب ${node} مرة أخرى.`, 0, "euler-return");
    }
  };
  walk(input.root);
  const length = euler.length;
  const logs = Array(length + 1).fill(0);
  for (let index = 2; index <= length; index++) logs[index] = logs[Math.floor(index / 2)] + 1;
  const sparse: number[][] = [Array.from({ length }, (_, index) => index)];
  for (let power = 1; (1 << power) <= length; power++) {
    sparse[power] = [];
    for (let start = 0; start + (1 << power) <= length; start++) {
      const left = sparse[power - 1][start];
      const right = sparse[power - 1][start + (1 << (power - 1))];
      sparse[power][start] = eulerDepth[left] <= eulerDepth[right] ? left : right;
      tableWrites++;
      emit({ [`n${euler[sparse[power][start]]}`]: "found" }, `RMQ[${power}][${start}] keeps Euler index ${sparse[power][start]} with smaller depth.`, `تحتفظ RMQ[${power}][${start}] بفهرس Euler ${sparse[power][start]} ذي العمق الأصغر.`, 1, "sparse", [{ label: `RMQ 2^${power}`, values: sparse[power].map((index) => euler[index]) }]);
    }
  }
  let left = first.get(input.query[0])!;
  let right = first.get(input.query[1])!;
  if (left > right) [left, right] = [right, left];
  const power = logs[right - left + 1];
  const a = sparse[power][left];
  const b = sparse[power][right - (1 << power) + 1];
  emit({ [`n${euler[a]}`]: "compare", [`n${euler[b]}`]: "compare" }, `Compare the two overlapping 2^${power} RMQ blocks.`, `قارن كتلتي RMQ المتداخلتين بطول 2^${power}.`, 2, "query");
  const answer = eulerDepth[a] <= eulerDepth[b] ? euler[a] : euler[b];
  emit({ [`n${answer}`]: "found" }, `LCA(${input.query[0]}, ${input.query[1]}) = ${answer}.`, `السلف المشترك الأدنى لـ (${input.query[0]}، ${input.query[1]}) هو ${answer}.`, 3, "done");
  return steps;
}

export const eulerTourLca = makeTreeModule<RootedTree>({
  slug: "euler-tour-lca",
  title: "Euler Tour LCA",
  titleAr: "السلف المشترك بجولة Euler",
  difficulty: "Advanced",
  tags: ["LCA", "Euler tour", "RMQ"],
  tagsAr: ["السلف المشترك الأدنى", "جولة Euler", "أصغر قيمة في نطاق"],
  summary: "Reduce lowest-common-ancestor queries to range minima over an Euler tour.",
  summaryAr: "حوّل استعلام السلف المشترك الأدنى إلى أصغر عمق في نطاق من جولة Euler.",
  overview: "The Euler sequence records every DFS entry and return. The shallowest occurrence between two first occurrences is their LCA.",
  overviewAr: "تسجل جولة Euler كل دخول وعودة في DFS؛ وتكون العقدة الأقل عمقاً بين أول ظهورين هي السلف المشترك الأدنى.",
  pseudocode: ["record node on DFS entry and return", "store each node's first occurrence", "build a sparse RMQ table over depths", "query minimum depth between first occurrences"],
  complexity: { time: { best: "O(n log n)", average: "O(1) per query", worst: "O(1) per query" }, space: "O(n log n)" },
  applications: ["Ancestry queries", "Distance queries", "Offline tree analytics"],
  applicationsAr: ["استعلامات النسب", "استعلامات المسافة", "تحليل الأشجار"],
  inputFields: treeFields,
  defaultInput: treeDefaults,
  parseInput: parseTree,
  serializeInput: serializeTree,
  generate: generateEulerLca,
});

function generateCentroid(input: RootedTree): Step<TreeFrame>[] {
  const info = rootTree(input);
  const removed = new Set<number>();
  const levels = new Map<number, number>();
  const extras = new Map<number, string>();
  const steps: Step<TreeFrame>[] = [];
  let components = 0;
  const emit = (states: Record<string, CellState>, description: string, descriptionAr: string, line: number, phase: string, component: number[] = [], transformation?: Step<TreeFrame>["transformation"]) =>
    steps.push(step(generalFrame(input, info, states, extras, [{ label: "active component", values: component }], "Removed centroids separate independent components."), description, descriptionAr, line, phase, { components }, transformation));
  const decompose = (start: number, level: number): void => {
    const parent = new Map<number, number>([[start, -1]]);
    const order = [start];
    for (let index = 0; index < order.length; index++) {
      const node = order[index];
      for (const neighbor of input.adjacency.get(node) ?? []) {
        if (removed.has(neighbor) || neighbor === parent.get(node)) continue;
        parent.set(neighbor, node);
        order.push(neighbor);
      }
    }
    const sizes = new Map<number, number>();
    for (let index = order.length - 1; index >= 0; index--) {
      const node = order[index];
      const size = 1 + (input.adjacency.get(node) ?? []).filter((neighbor) => parent.get(neighbor) === node).reduce((sum, child) => sum + sizes.get(child)!, 0);
      sizes.set(node, size);
      extras.set(node, `subtree=${size}`);
      emit({ [`n${node}`]: "active" }, `Within this component, subtree size(${node}) = ${size}.`, `داخل هذا المكوّن، حجم فرع ${node} هو ${size}.`, 0, "size", order);
    }
    let centroid = start;
    let moved = true;
    while (moved) {
      moved = false;
      for (const neighbor of input.adjacency.get(centroid) ?? []) {
        if (removed.has(neighbor)) continue;
        const side = parent.get(neighbor) === centroid ? sizes.get(neighbor)! : order.length - sizes.get(centroid)!;
        emit({ [`n${centroid}`]: "compare", [`n${neighbor}`]: "compare" }, `Removing ${centroid} leaves a side through ${neighbor} of size ${side}.`, `إزالة ${centroid} تترك جهة عبر ${neighbor} بحجم ${side}.`, 1, "centroid-check", order);
        if (side > order.length / 2) {
          centroid = neighbor;
          moved = true;
          break;
        }
      }
    }
    emit({ [`n${centroid}`]: "swap" }, `${centroid} is the centroid; prepare to remove it at decomposition level ${level}.`, `${centroid} هو المركز؛ استعد لإزالته عند مستوى التحليل ${level}.`, 2, "centroid", order);
    removed.add(centroid);
    levels.set(centroid, level);
    extras.set(centroid, `centroid level ${level}`);
    components++;
    emit({ [`n${centroid}`]: "found" }, `Mark ${centroid} as centroid level ${level}; remaining sides are independent.`, `علّم ${centroid} كمركز في المستوى ${level}؛ أصبحت الجهات المتبقية مستقلة.`, 2, "centroid", order, { kind: "rebuild", label: "Centroid decomposition split" });
    for (const neighbor of input.adjacency.get(centroid) ?? []) if (!removed.has(neighbor)) decompose(neighbor, level + 1);
  };
  emit({}, "Start centroid decomposition with the complete tree.", "ابدأ تحليل المراكز بالشجرة كاملة.", 0, "start", input.labels);
  decompose(input.root, 0);
  emit(Object.fromEntries(input.labels.map((label) => [`n${label}`, "sorted" as CellState])), `Centroid decomposition assigned ${levels.size} vertices.`, `عيّن تحليل المراكز مستويات ${levels.size} عقدة.`, 3, "done");
  return steps;
}

export const centroidDecomposition = makeTreeModule<RootedTree>({
  slug: "centroid-decomposition",
  title: "Centroid Decomposition",
  titleAr: "تحليل مراكز الشجرة",
  difficulty: "Advanced",
  tags: ["centroid", "divide and conquer", "tree decomposition"],
  tagsAr: ["مركز", "قسّم تسد", "تحليل شجرة"],
  summary: "Recursively remove a balanced centroid from each remaining component.",
  summaryAr: "أزل تكرارياً مركزاً متوازناً من كل مكوّن متبقٍ.",
  overview: "A centroid leaves no component larger than half the current tree. Removing it creates smaller independent subproblems.",
  overviewAr: "لا يترك المركز أي مكوّن أكبر من نصف الشجرة الحالية؛ وتنتج عن إزالته مسائل أصغر مستقلة.",
  pseudocode: ["compute component subtree sizes", "walk toward a side larger than half", "remove and label the centroid", "recurse on every remaining component"],
  complexity: { time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)" }, space: "O(n)" },
  applications: ["Dynamic distance queries", "Nearest marked vertex", "Divide-and-conquer counting"],
  applicationsAr: ["استعلامات مسافة ديناميكية", "أقرب عقدة معلمة", "العد بطريقة قسّم تسد"],
  inputFields: treeFields,
  defaultInput: treeDefaults,
  parseInput: parseTree,
  serializeInput: serializeTree,
  generate: generateCentroid,
});

function generateHld(input: RootedTree): Step<TreeFrame>[] {
  const info = rootTree(input);
  const size = new Map<number, number>();
  const heavy = new Map<number, number | null>();
  const head = new Map<number, number>();
  const position = new Map<number, number>();
  const extras = new Map<number, string>();
  const steps: Step<TreeFrame>[] = [];
  let writes = 0;
  let nextPosition = 0;
  const emit = (states: Record<string, CellState>, description: string, descriptionAr: string, line: number, phase: string, chains: (string | number)[] = []) =>
    steps.push(step(generalFrame(input, info, states, extras, [{ label: "linearized chains", values: chains }], "Heavy edges continue a chain; light edges begin a new chain."), description, descriptionAr, line, phase, { writes }));
  for (let index = info.order.length - 1; index >= 0; index--) {
    const node = info.order[index];
    let total = 1;
    let largest: number | null = null;
    for (const child of info.children.get(node)!) {
      total += size.get(child)!;
      if (largest === null || size.get(child)! > size.get(largest)!) largest = child;
    }
    size.set(node, total);
    heavy.set(node, largest);
    extras.set(node, `size=${total} · heavy=${largest ?? "∅"}`);
    writes++;
    emit({ [`n${node}`]: "found", ...(largest === null ? {} : { [`n${largest}`]: "active" as CellState }) }, `Node ${node} has size ${total}; heavy child is ${largest ?? "none"}.`, `حجم العقدة ${node} هو ${total}؛ ابنها الثقيل ${largest ?? "لا يوجد"}.`, 0, "sizes");
  }
  const chains: string[] = [];
  const decompose = (node: number, chainHead: number): void => {
    head.set(node, chainHead);
    position.set(node, nextPosition++);
    extras.set(node, `head=${chainHead} · pos=${position.get(node)} · size=${size.get(node)}`);
    chains.push(`${node}@${chainHead}`);
    writes++;
    emit({ [`n${node}`]: "found", [`n${chainHead}`]: "special" }, `Assign node ${node} to chain head ${chainHead} at position ${position.get(node)}.`, `عيّن العقدة ${node} إلى السلسلة ذات الرأس ${chainHead} في الموضع ${position.get(node)}.`, 1, "decompose", chains);
    const heavyChild = heavy.get(node);
    if (heavyChild !== null && heavyChild !== undefined) {
      emit({ [`n${node}`]: "active", [`n${heavyChild}`]: "active" }, `Heavy edge ${node}→${heavyChild} stays in chain ${chainHead}.`, `تبقى الحافة الثقيلة ${node}←${heavyChild} في السلسلة ${chainHead}.`, 2, "heavy-edge", chains);
      decompose(heavyChild, chainHead);
    }
    for (const child of info.children.get(node)!) {
      if (child === heavyChild) continue;
      emit({ [`n${node}`]: "visited", [`n${child}`]: "special" }, `Light edge ${node}→${child} starts a new chain at ${child}.`, `تبدأ الحافة الخفيفة ${node}←${child} سلسلة جديدة عند ${child}.`, 2, "light-edge", chains);
      decompose(child, child);
    }
  };
  emit({}, "Start heavy-light preprocessing.", "ابدأ المعالجة المسبقة للتحليل الثقيل الخفيف.", 0, "start");
  decompose(input.root, input.root);
  let [left, right] = input.query;
  const segments: string[] = [];
  while (head.get(left) !== head.get(right)) {
    if (info.depth.get(head.get(left)!)! < info.depth.get(head.get(right)!)!) [left, right] = [right, left];
    const segmentHead = head.get(left)!;
    segments.push(`[${position.get(segmentHead)},${position.get(left)}]`);
    emit({ [`n${left}`]: "active", [`n${segmentHead}`]: "found" }, `Consume chain segment ${segmentHead}..${left}, then jump above its head.`, `استهلك مقطع السلسلة ${segmentHead}..${left} ثم اقفز فوق رأسها.`, 3, "path-query", segments);
    left = info.parent.get(segmentHead)!;
  }
  if (info.depth.get(left)! > info.depth.get(right)!) [left, right] = [right, left];
  segments.push(`[${position.get(left)},${position.get(right)}]`);
  emit({ [`n${left}`]: "found", [`n${right}`]: "found" }, `The path is represented by ${segments.length} contiguous segment(s): ${segments.join(", ")}.`, `يتمثل المسار في ${segments.length} مقاطع متجاورة: ${segments.join("، ")}.`, 3, "done", segments);
  return steps;
}

export const heavyLightDecomposition = makeTreeModule<RootedTree>({
  slug: "heavy-light-decomposition",
  title: "Heavy-Light Decomposition",
  titleAr: "التحليل الثقيل الخفيف",
  difficulty: "Advanced",
  tags: ["path query", "heavy edge", "linearization"],
  tagsAr: ["استعلام مسار", "حافة ثقيلة", "تحويل خطي"],
  summary: "Split root-to-leaf paths into heavy chains so any path uses logarithmically many segments.",
  summaryAr: "قسّم مسارات الجذر إلى سلاسل ثقيلة بحيث يستخدم أي مسار عدداً لوغاريتمياً من المقاطع.",
  overview: "Each node chooses its largest child as heavy. Heavy edges share a linear chain; every light edge reduces subtree size by at least half.",
  overviewAr: "تختار كل عقدة أكبر أبنائها كابن ثقيل؛ تشترك الحواف الثقيلة في سلسلة خطية وتخفض كل حافة خفيفة حجم الفرع إلى النصف على الأقل.",
  pseudocode: ["compute subtree sizes and heavy children", "continue heavy child in the current chain", "start a new chain at every light child", "split a path query by chain heads"],
  complexity: { time: { best: "O(n)", average: "O(log² n) per query", worst: "O(log² n) per query" }, space: "O(n)" },
  applications: ["Path sums", "Path maximum queries", "Dynamic tree updates"],
  applicationsAr: ["مجاميع المسارات", "أكبر قيمة في مسار", "تحديثات الشجرة الديناميكية"],
  inputFields: treeFields,
  defaultInput: treeDefaults,
  parseInput: parseTree,
  serializeInput: serializeTree,
  generate: generateHld,
});
