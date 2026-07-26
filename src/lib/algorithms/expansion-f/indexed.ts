import type { CellState, Step, TreeFrame, TreeNodeF } from "@/lib/engine/types";
import { cloneFrame, makeTreeModule, parseIntegers, randomUnique, step } from "./shared";

interface Rect {
  id: string;
  lowX: number;
  lowY: number;
  highX: number;
  highY: number;
}
interface RNode {
  id: string;
  leaf: boolean;
  entries: Rect[];
  children: RNode[];
  parent: RNode | null;
}
type RInput = { rectangles: Rect[]; query: Rect };

function parseRectangle(token: string, id: string): Rect {
  const values = token.split(":").map(Number);
  if (values.length !== 4 || values.some((value) => !Number.isInteger(value) || value < 0 || value > 100)) {
    throw new Error(`"${token}" must be x1:y1:x2:y2 with integer coordinates from 0 to 100.`);
  }
  const [lowX, lowY, highX, highY] = values;
  if (lowX > highX || lowY > highY) throw new Error("Rectangle lower coordinates must not exceed upper coordinates.");
  return { id, lowX, lowY, highX, highY };
}

function parseRTree(fields: Record<string, string>): RInput {
  const tokens = (fields.rectangles ?? "").split(",").map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 14) throw new Error("Enter between 1 and 14 rectangles.");
  return {
    rectangles: tokens.map((token, index) => parseRectangle(token, `re${index}`)),
    query: parseRectangle(fields.query ?? "", "query"),
  };
}

function rectLabel(rect: Rect): string {
  return `[${rect.lowX},${rect.lowY}]–[${rect.highX},${rect.highY}]`;
}

function union(left: Rect, right: Rect, id = "mbr"): Rect {
  return {
    id,
    lowX: Math.min(left.lowX, right.lowX),
    lowY: Math.min(left.lowY, right.lowY),
    highX: Math.max(left.highX, right.highX),
    highY: Math.max(left.highY, right.highY),
  };
}

function area(rect: Rect): number {
  return (rect.highX - rect.lowX) * (rect.highY - rect.lowY);
}

function overlaps(left: Rect, right: Rect): boolean {
  return left.lowX <= right.highX && right.lowX <= left.highX && left.lowY <= right.highY && right.lowY <= left.highY;
}

function mbr(node: RNode): Rect {
  const items = node.leaf ? node.entries : node.children.map(mbr);
  if (items.length === 0) return { id: node.id, lowX: 0, lowY: 0, highX: 0, highY: 0 };
  return items.slice(1).reduce((box, rect) => union(box, rect, node.id), { ...items[0], id: node.id });
}

function rFrame(root: RNode, states: Record<string, CellState>, results: Rect[]): TreeFrame {
  const nodes: Record<string, TreeNodeF> = {};
  const visit = (node: RNode) => {
    const box = mbr(node);
    const entryIds = node.entries.map((entry) => entry.id);
    nodes[node.id] = {
      id: node.id,
      value: node.leaf ? "leaf" : "internal",
      children: node.leaf ? entryIds : node.children.map((child) => child.id),
      extra: rectLabel(box),
    };
    for (const entry of node.entries) {
      nodes[entry.id] = { id: entry.id, value: rectLabel(entry), extra: "rectangle" };
    }
    node.children.forEach(visit);
  };
  visit(root);
  return cloneFrame(nodes, root.id, states, [{ label: "overlapping entries", values: results.map(rectLabel) }], "Each internal node stores the minimum bounding rectangle of its children.");
}

function generateRTree(input: RInput): Step<TreeFrame>[] {
  let root: RNode = { id: "rt0", leaf: true, entries: [], children: [], parent: null };
  let nextId = 1;
  let splits = 0;
  let comparisons = 0;
  const results: Rect[] = [];
  const steps: Step<TreeFrame>[] = [];
  const emit = (states: Record<string, CellState>, description: string, descriptionAr: string, line: number, phase: string, transformation?: Step<TreeFrame>["transformation"]) =>
    steps.push(step(rFrame(root, states, results), description, descriptionAr, line, phase, { comparisons, splits }, transformation));

  const chooseLeaf = (start: RNode, entry: Rect): RNode => {
    let node = start;
    while (!node.leaf) {
      const scored = node.children.map((child) => {
        const box = mbr(child);
        return { child, enlargement: area(union(box, entry)) - area(box), currentArea: area(box) };
      }).sort((left, right) => left.enlargement - right.enlargement || left.currentArea - right.currentArea || left.child.id.localeCompare(right.child.id));
      comparisons += node.children.length;
      emit(Object.fromEntries(node.children.map((child) => [child.id, child === scored[0].child ? "found" : "compare"])), `Choose ${scored[0].child.id}; its bounding rectangle needs the least enlargement (${scored[0].enlargement}).`, `اختر ${scored[0].child.id}؛ يحتاج مستطيله المحيط إلى أقل توسع (${scored[0].enlargement}).`, 0, "choose");
      node = scored[0].child;
    }
    return node;
  };

  const split = (node: RNode): RNode | null => {
    const itemCount = node.leaf ? node.entries.length : node.children.length;
    emit({ [node.id]: "swap" }, `${node.id} overflowed with ${itemCount} items; prepare a quadratic split.`, `تجاوزت ${node.id} السعة بعدد ${itemCount} عناصر؛ استعد لتقسيم تربيعي.`, 2, "split");
    const items = node.leaf ? [...node.entries] : [...node.children];
    const boxes = items.map((item) => node.leaf ? item as Rect : mbr(item as RNode));
    let seedA = 0;
    let seedB = 1;
    let worstWaste = -Infinity;
    for (let left = 0; left < boxes.length; left++) {
      for (let right = left + 1; right < boxes.length; right++) {
        const waste = area(union(boxes[left], boxes[right])) - area(boxes[left]) - area(boxes[right]);
        if (waste > worstWaste) {
          worstWaste = waste;
          seedA = left;
          seedB = right;
        }
      }
    }
    const groupA = [items[seedA]];
    const groupB = [items[seedB]];
    const remaining = items.filter((_, index) => index !== seedA && index !== seedB);
    const itemBox = (item: Rect | RNode) => node.leaf ? item as Rect : mbr(item as RNode);
    const groupBox = (group: (Rect | RNode)[]) => group.slice(1).reduce<Rect>((box, item) => union(box, itemBox(item)), itemBox(group[0]));
    for (let remainingIndex = 0; remainingIndex < remaining.length; remainingIndex++) {
      const item = remaining[remainingIndex];
      const itemsLeft = remaining.length - remainingIndex;
      if (groupA.length + itemsLeft === 2 && groupA.length < 2) {
        groupA.push(item);
        continue;
      }
      if (groupB.length + itemsLeft === 2 && groupB.length < 2) {
        groupB.push(item);
        continue;
      }
      const box = itemBox(item);
      const a = groupBox(groupA);
      const b = groupBox(groupB);
      const enlargeA = area(union(a, box)) - area(a);
      const enlargeB = area(union(b, box)) - area(b);
      if (enlargeA < enlargeB || (enlargeA === enlargeB && area(a) <= area(b))) groupA.push(item);
      else groupB.push(item);
    }
    const sibling: RNode = { id: `rt${nextId++}`, leaf: node.leaf, entries: [], children: [], parent: node.parent };
    if (node.leaf) {
      node.entries = groupA as Rect[];
      sibling.entries = groupB as Rect[];
    } else {
      node.children = groupA as RNode[];
      sibling.children = groupB as RNode[];
      node.children.forEach((child) => { child.parent = node; });
      sibling.children.forEach((child) => { child.parent = sibling; });
    }
    splits++;
    if (!node.parent) {
      const newRoot: RNode = { id: `rt${nextId++}`, leaf: false, entries: [], children: [node, sibling], parent: null };
      node.parent = newRoot;
      sibling.parent = newRoot;
      root = newRoot;
      emit({ [node.id]: "active", [sibling.id]: "active", [newRoot.id]: "found" }, `Create a new root above split groups ${node.id} and ${sibling.id}.`, `أنشئ جذراً جديداً فوق مجموعتي التقسيم ${node.id} و${sibling.id}.`, 2, "split", { kind: "rebuild", label: "R-tree root split" });
      return null;
    }
    node.parent.children.push(sibling);
    emit({ [node.id]: "active", [sibling.id]: "found" }, `Complete the split into balanced groups ${node.id} and ${sibling.id}.`, `أكمل التقسيم إلى مجموعتين متوازنتين ${node.id} و${sibling.id}.`, 2, "split", { kind: "rebuild", label: "R-tree node split" });
    return node.parent;
  };

  emit({}, "Start with one empty R-tree leaf.", "ابدأ بورقة R-tree فارغة واحدة.", 0, "start");
  for (const entry of input.rectangles) {
    const leaf = chooseLeaf(root, entry);
    leaf.entries.push(entry);
    emit({ [leaf.id]: "active", [entry.id]: "found" }, `Insert rectangle ${rectLabel(entry)} into ${leaf.id}.`, `أدرج المستطيل ${rectLabel(entry)} في ${leaf.id}.`, 1, "insert");
    let current: RNode | null = leaf;
    while (current && (current.leaf ? current.entries.length : current.children.length) > 3) current = split(current);
    let ancestor: RNode | null = leaf.parent;
    while (ancestor) {
      emit({ [ancestor.id]: "visited" }, `Recompute ${ancestor.id}'s bounding rectangle as ${rectLabel(mbr(ancestor))}.`, `أعد حساب المستطيل المحيط لـ ${ancestor.id} ليصبح ${rectLabel(mbr(ancestor))}.`, 3, "adjust");
      ancestor = ancestor.parent;
    }
  }
  const search = (node: RNode) => {
    const box = mbr(node);
    comparisons++;
    const hit = overlaps(box, input.query);
    emit({ [node.id]: hit ? "compare" : "discarded" }, hit ? `${node.id}'s MBR overlaps the query; inspect it.` : `Prune ${node.id}; its MBR is disjoint.`, hit ? `يتقاطع المستطيل المحيط لـ ${node.id} مع الاستعلام؛ افحصه.` : `استبعد ${node.id}؛ مستطيله المحيط منفصل.`, 3, "search");
    if (!hit) return;
    if (node.leaf) {
      for (const entry of node.entries) if (overlaps(entry, input.query)) results.push(entry);
    } else node.children.forEach(search);
  };
  search(root);
  emit({}, `R-tree search found ${results.length} overlapping rectangle(s).`, `وجد بحث R-tree عدد ${results.length} من المستطيلات المتقاطعة.`, 3, "done");
  return steps;
}

export const rTree = makeTreeModule<RInput>({
  slug: "r-tree",
  title: "R-Tree",
  titleAr: "شجرة R",
  difficulty: "Advanced",
  tags: ["spatial index", "bounding rectangle", "quadratic split"],
  tagsAr: ["فهرس مكاني", "مستطيل محيط", "تقسيم تربيعي"],
  summary: "Group spatial rectangles by bounding-box enlargement and split overflowing nodes.",
  summaryAr: "جمّع المستطيلات المكانية حسب توسع الصندوق المحيط واقسم العقد الممتلئة.",
  overview: "An R-tree stores minimum bounding rectangles in a height-balanced hierarchy and prunes subtrees whose boxes do not overlap a query.",
  overviewAr: "تخزن شجرة R مستطيلات إحاطة دنيا في تسلسل هرمي متوازن الارتفاع وتستبعد الفروع غير المتقاطعة مع الاستعلام.",
  pseudocode: ["choose leaf with least MBR enlargement", "insert the rectangle", "quadratically split overflowed nodes", "search only overlapping MBRs"],
  complexity: { time: { best: "O(log n)", average: "O(log n)", worst: "O(n)" }, space: "O(n)" },
  applications: ["Spatial databases", "Maps", "Collision queries"],
  applicationsAr: ["قواعد البيانات المكانية", "الخرائط", "استعلامات التصادم"],
  inputFields: [
    { key: "rectangles", label: "Rectangles", labelAr: "المستطيلات", placeholder: "5:5:20:20, 30:10:45:25", help: "Comma-separated x1:y1:x2:y2 rectangles.", helpAr: "مستطيلات x1:y1:x2:y2 مفصولة بفواصل.", list: true },
    { key: "query", label: "Query rectangle", labelAr: "مستطيل الاستعلام", placeholder: "10:10:35:35", help: "Rectangle used for overlap search.", helpAr: "مستطيل بحث التقاطع.", search: true },
  ],
  defaultInput: (level, rng) => {
    const rectangles = Array.from({ length: 3 + level }, (_, index) => {
      const lowX = rng.int(0, 75);
      const lowY = rng.int(0, 75);
      return { id: `re${index}`, lowX, lowY, highX: lowX + rng.int(5, 20), highY: lowY + rng.int(5, 20) };
    });
    return { rectangles, query: { id: "query", lowX: 25, lowY: 25, highX: 60, highY: 60 } };
  },
  parseInput: parseRTree,
  serializeInput: (input) => ({
    rectangles: input.rectangles.map((rect) => `${rect.lowX}:${rect.lowY}:${rect.highX}:${rect.highY}`).join(", "),
    query: `${input.query.lowX}:${input.query.lowY}:${input.query.highX}:${input.query.highY}`,
  }),
  generate: generateRTree,
});

interface VNode {
  id: string;
  universe: number;
  label: string;
  min: number | null;
  max: number | null;
  summary: VNode | null;
  clusters: Map<number, VNode>;
}
type VInput = { values: number[]; universe: number; query: number };

function isPowerOfTwo(value: number): boolean {
  return value >= 2 && (value & (value - 1)) === 0;
}

function parseVeb(fields: Record<string, string>): VInput {
  const universe = Number(fields.universe);
  if (!Number.isSafeInteger(universe) || !isPowerOfTwo(universe) || universe > 256) throw new Error("Universe must be a power of two from 2 to 256.");
  const values = parseIntegers(fields.values ?? "", 24, true);
  if (values.some((value) => value < 0 || value >= universe)) throw new Error("Every value must be inside [0, universe).");
  const query = Number(fields.query);
  if (!Number.isSafeInteger(query) || query < -1 || query >= universe) throw new Error("Query must be between -1 and universe - 1.");
  return { values, universe, query };
}

function lowerSize(universe: number): number {
  return 2 ** Math.floor(Math.log2(universe) / 2);
}

function upperSize(universe: number): number {
  return universe / lowerSize(universe);
}

function vFrame(root: VNode, states: Record<string, CellState>, path: string[]): TreeFrame {
  const nodes: Record<string, TreeNodeF> = {};
  const visit = (node: VNode) => {
    const children = [
      ...(node.summary ? [node.summary] : []),
      ...[...node.clusters.entries()].sort(([left], [right]) => left - right).map(([, cluster]) => cluster),
    ];
    nodes[node.id] = {
      id: node.id,
      value: node.label,
      children: children.map((child) => child.id),
      extra: `u=${node.universe} · min=${node.min ?? "∅"} · max=${node.max ?? "∅"}`,
    };
    children.forEach(visit);
  };
  visit(root);
  return cloneFrame(nodes, root.id, states, [{ label: "recursive path", values: path }], "Values are split into high cluster numbers and low offsets.");
}

function generateVeb(input: VInput): Step<TreeFrame>[] {
  let nextId = 1;
  const create = (universe: number, label: string): VNode => ({ id: `ve${nextId++}`, universe, label, min: null, max: null, summary: null, clusters: new Map() });
  const root: VNode = { id: "ve0", universe: input.universe, label: "root", min: null, max: null, summary: null, clusters: new Map() };
  const path: string[] = [];
  let recursiveCalls = 0;
  const steps: Step<TreeFrame>[] = [];
  const emit = (states: Record<string, CellState>, description: string, descriptionAr: string, line: number, phase: string, transformation?: Step<TreeFrame>["transformation"]) =>
    steps.push(step(vFrame(root, states, path), description, descriptionAr, line, phase, { recursiveCalls }, transformation));
  const high = (node: VNode, value: number) => Math.floor(value / lowerSize(node.universe));
  const low = (node: VNode, value: number) => value % lowerSize(node.universe);
  const index = (node: VNode, cluster: number, offset: number) => cluster * lowerSize(node.universe) + offset;
  const emptyInsert = (node: VNode, value: number) => {
    node.min = value;
    node.max = value;
    emit({ [node.id]: "found" }, `Empty-insert ${value}; min and max both become ${value}.`, `أدرج ${value} في بنية فارغة؛ يصبح الحد الأدنى والأقصى ${value}.`, 0, "empty-insert");
  };
  const insert = (node: VNode, original: number): void => {
    recursiveCalls++;
    let value = original;
    path.push(`${node.label}:${value}`);
    emit({ [node.id]: "active" }, `Insert local value ${value} into ${node.label} (u=${node.universe}).`, `أدرج القيمة المحلية ${value} في ${node.label} (u=${node.universe}).`, 0, "insert");
    if (node.min === null) {
      emptyInsert(node, value);
      path.pop();
      return;
    }
    if (value < node.min) {
      emit({ [node.id]: "swap" }, `Swap ${value} with current minimum ${node.min}.`, `بدّل ${value} مع الحد الأدنى الحالي ${node.min}.`, 1, "min-swap");
      [value, node.min] = [node.min, value];
      emit({ [node.id]: "found" }, `The node minimum is now ${node.min}; continue inserting displaced ${value}.`, `أصبح الحد الأدنى للعقدة ${node.min}؛ تابع إدراج ${value} المزاحة.`, 1, "min-swap", { kind: "reorder", label: "vEB minimum swap" });
    }
    if (node.universe > 2) {
      const clusterIndex = high(node, value);
      const offset = low(node, value);
      let cluster = node.clusters.get(clusterIndex);
      if (!cluster) {
        cluster = create(lowerSize(node.universe), `cluster ${clusterIndex}`);
        node.clusters.set(clusterIndex, cluster);
        emit({ [node.id]: "active", [cluster.id]: "found" }, `Materialize cluster ${clusterIndex}; local offset is ${offset}.`, `أنشئ العنقود ${clusterIndex}؛ الإزاحة المحلية ${offset}.`, 2, "cluster", { kind: "rebuild", label: "vEB cluster creation" });
      }
      if (cluster.min === null) {
        if (!node.summary) {
          node.summary = create(upperSize(node.universe), "summary");
          emit({ [node.summary.id]: "found" }, `Create a summary for ${node.label}.`, `أنشئ ملخصاً لـ ${node.label}.`, 2, "summary", { kind: "rebuild", label: "vEB summary creation" });
        }
        insert(node.summary, clusterIndex);
        emptyInsert(cluster, offset);
      } else insert(cluster, offset);
    }
    if (node.max === null || value > node.max) {
      node.max = value;
      emit({ [node.id]: "found" }, `Update ${node.label}'s maximum to ${value}.`, `حدّث الحد الأقصى لـ ${node.label} إلى ${value}.`, 3, "max");
    }
    path.pop();
  };

  emit({}, "Start with an empty van Emde Boas tree.", "ابدأ بشجرة van Emde Boas فارغة.", 0, "start");
  input.values.forEach((value) => insert(root, value));

  const successor = (node: VNode | null, value: number): number | null => {
    if (!node || node.min === null) return null;
    recursiveCalls++;
    path.push(`${node.label}:succ(${value})`);
    emit({ [node.id]: "compare" }, `Find successor of local value ${value} in ${node.label}.`, `ابحث عن خليفة القيمة المحلية ${value} في ${node.label}.`, 4, "successor");
    if (node.universe === 2) {
      const answer = value < 0 && node.min !== null ? node.min : value < 1 && node.max === 1 ? 1 : null;
      path.pop();
      return answer;
    }
    if (value < node.min) {
      const answer = node.min;
      path.pop();
      return answer;
    }
    const clusterIndex = high(node, value);
    const offset = low(node, value);
    const cluster = node.clusters.get(clusterIndex);
    if (cluster?.max !== null && cluster?.max !== undefined && offset < cluster.max) {
      const local = successor(cluster, offset);
      path.pop();
      return local === null ? null : index(node, clusterIndex, local);
    }
    const nextCluster = successor(node.summary, clusterIndex);
    if (nextCluster === null) {
      path.pop();
      return null;
    }
    const minimum = node.clusters.get(nextCluster)?.min ?? null;
    path.pop();
    return minimum === null ? null : index(node, nextCluster, minimum);
  };
  const answer = successor(root, input.query);
  emit({ [root.id]: answer === null ? "discarded" : "found" }, answer === null ? `${input.query} has no successor.` : `The successor of ${input.query} is ${answer}.`, answer === null ? `لا يوجد خليفة لـ ${input.query}.` : `خليفة ${input.query} هو ${answer}.`, 4, "done");
  return steps;
}

export const vanEmdeBoasTree = makeTreeModule<VInput>({
  slug: "van-emde-boas-tree",
  title: "van Emde Boas Tree",
  titleAr: "شجرة van Emde Boas",
  difficulty: "Advanced",
  tags: ["integer set", "successor", "universe decomposition"],
  tagsAr: ["مجموعة أعداد صحيحة", "خليفة", "تقسيم الكون"],
  summary: "Recursively split a bounded integer universe to support successor queries.",
  summaryAr: "قسّم كوناً محدوداً من الأعداد الصحيحة تكرارياً لدعم استعلامات الخليفة.",
  overview: "A van Emde Boas tree stores min/max directly and recursively decomposes keys into high cluster and low offset parts.",
  overviewAr: "تخزن شجرة van Emde Boas الحدين الأدنى والأقصى مباشرةً وتقسم المفاتيح إلى عنقود علوي وإزاحة سفلية.",
  pseudocode: ["empty-insert min and max", "swap a smaller key with min", "insert high part in summary", "insert low part in its cluster", "find successor locally or in next nonempty cluster"],
  complexity: { time: { best: "O(1)", average: "O(log log U)", worst: "O(log log U)" }, space: "O(U)" },
  applications: ["Integer priority queues", "Successor dictionaries", "Packet scheduling"],
  applicationsAr: ["طوابير أولوية صحيحة", "قواميس الخليفة", "جدولة الحزم"],
  inputFields: [
    { key: "universe", label: "Universe size", labelAr: "حجم الكون", placeholder: "16", help: "A power of two, at most 256.", helpAr: "قوة للعدد اثنين ولا تتجاوز 256." },
    { key: "values", label: "Values", labelAr: "القيم", placeholder: "2, 3, 4, 7, 14", help: "Unique values in [0,U).", helpAr: "قيم فريدة ضمن [0,U).", list: true },
    { key: "query", label: "Successor query", labelAr: "استعلام الخليفة", placeholder: "4", help: "Find the smallest stored value greater than this.", helpAr: "ابحث عن أصغر قيمة مخزنة أكبر منها.", search: true },
  ],
  defaultInput: (level, rng) => {
    const universe = level <= 2 ? 16 : level <= 4 ? 32 : 64;
    const values = randomUnique(level, rng, Math.min(10, universe - 1)).map((value) => value % universe);
    const unique = [...new Set(values)];
    return { universe, values: unique, query: unique[Math.floor(unique.length / 2)] ?? 0 };
  },
  parseInput: parseVeb,
  serializeInput: (input) => ({ universe: String(input.universe), values: input.values.join(", "), query: String(input.query) }),
  generate: generateVeb,
});
