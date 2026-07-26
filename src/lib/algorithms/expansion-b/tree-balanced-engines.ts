import type { CellState, Step, TreeFrame, TreeNodeF } from "@/lib/engine/types";
import { complexities, makeModule, numberField, parseIntegerList, parsePairList, randomUnique, unique } from "./shared";

interface BinaryNode {
  id: string;
  key: number;
  left: BinaryNode | null;
  right: BinaryNode | null;
  parent: BinaryNode | null;
  extra?: string;
}
type SearchTreeInput = { values: number[]; access: number };

function binaryFrame(root: BinaryNode | null, states: Record<string, CellState> = {}, note?: string): TreeFrame {
  const nodes: Record<string, TreeNodeF> = {};
  const visit = (node: BinaryNode | null) => {
    if (!node) return;
    nodes[node.id] = {
      id: node.id,
      value: node.key,
      left: node.left?.id ?? null,
      right: node.right?.id ?? null,
      extra: node.extra,
    };
    visit(node.left);
    visit(node.right);
  };
  visit(root);
  return { nodes, rootId: root?.id ?? null, states: { ...states }, note };
}

function parseSearchTree(fields: Record<string, string>): SearchTreeInput {
  const values = unique(parseIntegerList(fields.values ?? ""));
  const access = Number(fields.access);
  if (!Number.isSafeInteger(access)) throw new Error("Access key must be an integer.");
  return { values, access };
}

function generateSplay(input: SearchTreeInput): Step<TreeFrame>[] {
  let root: BinaryNode | null = null;
  let nextId = 0;
  let rotations = 0;
  const steps: Step<TreeFrame>[] = [];
  const emit = (
    states: Record<string, CellState>,
    description: string,
    descriptionAr: string,
    phase: string,
    transformation?: Step<TreeFrame>["transformation"],
  ) => {
    steps.push({
      frame: binaryFrame(root, states, "The most recently inserted or accessed node is splayed to the root."),
      description,
      descriptionAr,
      codeLine: phase === "rotate" ? 4 : phase === "search" ? 1 : 2,
      counters: { rotations },
      phase,
      transformation,
    });
  };
  const rotateLeft = (parent: BinaryNode) => {
    const child = parent.right!;
    emit({ [parent.id]: "swap", [child.id]: "active" }, `Prepare a left rotation: ${child.key} will rise above ${parent.key}.`, `استعد لدوران يساري: سترتفع ${child.key} فوق ${parent.key}.`, "rotate");
    parent.right = child.left;
    if (child.left) child.left.parent = parent;
    child.parent = parent.parent;
    if (!parent.parent) root = child;
    else if (parent.parent.left === parent) parent.parent.left = child;
    else parent.parent.right = child;
    child.left = parent;
    parent.parent = child;
    rotations++;
    emit({ [child.id]: "found", [parent.id]: "active" }, `Complete the left rotation around ${parent.key}.`, `أكمل الدوران اليساري حول ${parent.key}.`, "rotate", { kind: "balance", label: "Splay left rotation" });
  };
  const rotateRight = (parent: BinaryNode) => {
    const child = parent.left!;
    emit({ [parent.id]: "swap", [child.id]: "active" }, `Prepare a right rotation: ${child.key} will rise above ${parent.key}.`, `استعد لدوران يميني: سترتفع ${child.key} فوق ${parent.key}.`, "rotate");
    parent.left = child.right;
    if (child.right) child.right.parent = parent;
    child.parent = parent.parent;
    if (!parent.parent) root = child;
    else if (parent.parent.left === parent) parent.parent.left = child;
    else parent.parent.right = child;
    child.right = parent;
    parent.parent = child;
    rotations++;
    emit({ [child.id]: "found", [parent.id]: "active" }, `Complete the right rotation around ${parent.key}.`, `أكمل الدوران اليميني حول ${parent.key}.`, "rotate", { kind: "balance", label: "Splay right rotation" });
  };
  const splay = (node: BinaryNode) => {
    while (node.parent) {
      const parent = node.parent;
      const grand = parent.parent;
      if (!grand) {
        emit({ [node.id]: "active", [parent.id]: "compare" }, `Zig case: ${node.key} has a parent but no grandparent.`, `حالة Zig: للعقدة ${node.key} أب ولا يوجد جد.`, "classify");
        if (parent.left === node) rotateRight(parent);
        else rotateLeft(parent);
      } else if (grand.left === parent && parent.left === node) {
        emit({ [node.id]: "active", [parent.id]: "compare", [grand.id]: "compare" }, "Zig-zig left-left: rotate the grandparent, then the parent.", "حالة Zig-Zig يسار-يسار: أدر الجد ثم الأب.", "classify");
        rotateRight(grand);
        rotateRight(parent);
      } else if (grand.right === parent && parent.right === node) {
        emit({ [node.id]: "active", [parent.id]: "compare", [grand.id]: "compare" }, "Zig-zig right-right: rotate the grandparent, then the parent.", "حالة Zig-Zig يمين-يمين: أدر الجد ثم الأب.", "classify");
        rotateLeft(grand);
        rotateLeft(parent);
      } else if (grand.left === parent) {
        emit({ [node.id]: "active", [parent.id]: "compare", [grand.id]: "compare" }, "Zig-zag left-right: rotate the parent, then the grandparent.", "حالة Zig-Zag يسار-يمين: أدر الأب ثم الجد.", "classify");
        rotateLeft(parent);
        rotateRight(grand);
      } else {
        emit({ [node.id]: "active", [parent.id]: "compare", [grand.id]: "compare" }, "Zig-zag right-left: rotate the parent, then the grandparent.", "حالة Zig-Zag يمين-يسار: أدر الأب ثم الجد.", "classify");
        rotateRight(parent);
        rotateLeft(grand);
      }
    }
  };
  const find = (key: number): BinaryNode | null => {
    let current: BinaryNode | null = root;
    let last: BinaryNode | null = null;
    while (current) {
      last = current;
      emit({ [current.id]: "compare" }, `Compare access key ${key} with ${current.key}.`, `قارن مفتاح الوصول ${key} مع ${current.key}.`, "search");
      if (key === current.key) return current;
      current = key < current.key ? current.left : current.right;
    }
    return last;
  };
  emit({}, "Start with an empty splay tree.", "ابدأ بشجرة Splay فارغة.", "start");
  for (const key of input.values) {
    if (!root) {
      root = { id: `s${nextId++}`, key, left: null, right: null, parent: null };
      emit({ [root.id]: "found" }, `Insert ${key} as the root.`, `أدرج ${key} جذراً.`, "insert");
      continue;
    }
    let current: BinaryNode | null = root;
    let parent: BinaryNode | null = null;
    while (current) {
      parent = current;
      emit({ [current.id]: "compare" }, `BST insertion compares ${key} with ${current.key}.`, `يقارن إدراج BST القيمة ${key} مع ${current.key}.`, "insert");
      current = key < current.key ? current.left : current.right;
    }
    const node: BinaryNode = { id: `s${nextId++}`, key, left: null, right: null, parent };
    if (key < parent!.key) parent!.left = node;
    else parent!.right = node;
    emit({ [node.id]: "found" }, `Attach ${key} as a normal BST leaf before splaying.`, `اربط ${key} كورقة BST عادية قبل الرفع.`, "insert");
    splay(node);
  }
  const accessed = find(input.access);
  if (accessed) {
    const found = accessed.key === input.access;
    emit({ [accessed.id]: found ? "found" : "discarded" }, found ? `Access found ${input.access}; splay it.` : `${input.access} is absent; splay the last visited node ${accessed.key}.`, found ? `عُثر على ${input.access}؛ ارفعه.` : `${input.access} غير موجود؛ ارفع آخر عقدة زارتها وهي ${accessed.key}.`, "search");
    splay(accessed);
  }
  emit(root ? { [root.id]: "sorted" } : {}, `Access complete; ${root?.key ?? "nothing"} is at the root.`, `اكتمل الوصول؛ ${root?.key ?? "لا شيء"} عند الجذر.`, "done");
  return steps;
}

type TreapInput = { entries: { key: number; priority: number }[] };

function parseTreap(fields: Record<string, string>): TreapInput {
  const pairs = parsePairList(fields.entries ?? "");
  const seen = new Set<number>();
  return {
    entries: pairs.map(([key, priority]) => {
      if (seen.has(key)) throw new Error(`Duplicate key ${key} is not allowed.`);
      seen.add(key);
      return { key, priority };
    }),
  };
}

function generateTreap(input: TreapInput): Step<TreeFrame>[] {
  let root: BinaryNode | null = null;
  let nextId = 0;
  let rotations = 0;
  const steps: Step<TreeFrame>[] = [];
  const emit = (states: Record<string, CellState>, description: string, descriptionAr: string, phase: string, transformation?: Step<TreeFrame>["transformation"]) => {
    steps.push({
      frame: binaryFrame(root, states, "BST by key; min-heap by priority shown after @."),
      description,
      descriptionAr,
      codeLine: phase === "rotate" ? 3 : 1,
      counters: { rotations },
      phase,
      transformation,
    });
  };
  const rotateLeft = (parent: BinaryNode) => {
    const child = parent.right!;
    parent.right = child.left;
    if (child.left) child.left.parent = parent;
    child.parent = parent.parent;
    if (!parent.parent) root = child;
    else if (parent.parent.left === parent) parent.parent.left = child;
    else parent.parent.right = child;
    child.left = parent;
    parent.parent = child;
    rotations++;
  };
  const rotateRight = (parent: BinaryNode) => {
    const child = parent.left!;
    parent.left = child.right;
    if (child.right) child.right.parent = parent;
    child.parent = parent.parent;
    if (!parent.parent) root = child;
    else if (parent.parent.left === parent) parent.parent.left = child;
    else parent.parent.right = child;
    child.right = parent;
    parent.parent = child;
    rotations++;
  };
  emit({}, "Start with an empty treap.", "ابدأ بشجرة Treap فارغة.", "start");
  for (const entry of input.entries) {
    if (!root) {
      root = { id: `t${nextId++}`, key: entry.key, extra: `@${entry.priority}`, left: null, right: null, parent: null };
      emit({ [root.id]: "found" }, `Insert ${entry.key}@${entry.priority} as root.`, `أدرج ${entry.key}@${entry.priority} جذراً.`, "insert");
      continue;
    }
    let current: BinaryNode | null = root;
    let parent: BinaryNode | null = null;
    while (current) {
      parent = current;
      emit({ [current.id]: "compare" }, `Compare key ${entry.key} with ${current.key}.`, `قارن المفتاح ${entry.key} مع ${current.key}.`, "insert");
      current = entry.key < current.key ? current.left : current.right;
    }
    const node: BinaryNode = { id: `t${nextId++}`, key: entry.key, extra: `@${entry.priority}`, left: null, right: null, parent };
    if (entry.key < parent!.key) parent!.left = node;
    else parent!.right = node;
    emit({ [node.id]: "found" }, `Attach ${entry.key}@${entry.priority} as a BST leaf; heap order may now be violated.`, `اربط ${entry.key}@${entry.priority} كورقة BST؛ قد ينكسر ترتيب الكومة الآن.`, "insert");
    while (node.parent) {
      const nodePriority = Number(node.extra!.slice(1));
      const parentPriority = Number(node.parent.extra!.slice(1));
      emit({ [node.id]: "compare", [node.parent.id]: "compare" }, `Compare priorities ${nodePriority} and ${parentPriority}.`, `قارن الأولويتين ${nodePriority} و${parentPriority}.`, "check");
      if (nodePriority >= parentPriority) break;
      const pivot = node.parent;
      emit({ [node.id]: "active", [pivot.id]: "swap" }, `${node.key} has smaller priority; rotate it above ${pivot.key}.`, `أولوية ${node.key} أصغر؛ أدرها فوق ${pivot.key}.`, "rotate");
      if (pivot.left === node) rotateRight(pivot);
      else rotateLeft(pivot);
      emit({ [node.id]: "found", [pivot.id]: "active" }, "Rotation complete; BST key order is preserved and heap order improves.", "اكتمل الدوران؛ بقي ترتيب مفاتيح BST وتحسن ترتيب الكومة.", "rotate", { kind: "balance", label: "Treap priority rotation" });
    }
  }
  emit(root ? { [root.id]: "sorted" } : {}, "Treap construction complete.", "اكتمل بناء Treap.", "done");
  return steps;
}

type HeapInput = { values: number[]; extracts: number };

function parseHeap(fields: Record<string, string>): HeapInput {
  const values = parseIntegerList(fields.values ?? "");
  const extracts = Number(fields.extracts);
  if (!Number.isSafeInteger(extracts) || extracts < 0 || extracts > values.length) throw new Error("Extract count must be between 0 and the number of values.");
  return { values, extracts };
}

function heapFrame(heap: number[], states: Record<number, CellState>, removed: number[]): TreeFrame {
  const nodes: Record<string, TreeNodeF> = {};
  heap.forEach((value, index) => {
    nodes[`h${index}`] = {
      id: `h${index}`,
      value,
      left: index * 2 + 1 < heap.length ? `h${index * 2 + 1}` : null,
      right: index * 2 + 2 < heap.length ? `h${index * 2 + 2}` : null,
      extra: `i=${index}`,
    };
  });
  return {
    nodes,
    rootId: heap.length ? "h0" : null,
    states: Object.fromEntries(Object.entries(states).map(([index, state]) => [`h${index}`, state])),
    aux: [
      { label: "heap array", values: [...heap] },
      { label: "extracted", values: [...removed] },
    ],
  };
}

function generateMaxHeap(input: HeapInput): Step<TreeFrame>[] {
  const heap: number[] = [];
  const removed: number[] = [];
  const steps: Step<TreeFrame>[] = [];
  let swaps = 0;
  const emit = (states: Record<number, CellState>, description: string, descriptionAr: string, phase: string, transformation?: Step<TreeFrame>["transformation"]) => {
    steps.push({
      frame: heapFrame(heap, states, removed),
      description,
      descriptionAr,
      codeLine: phase === "up" ? 2 : phase === "down" ? 4 : 1,
      counters: { swaps, size: heap.length },
      phase,
      transformation,
    });
  };
  emit({}, "Start with an empty max-heap.", "ابدأ بكومة عظمى فارغة.", "start");
  for (const value of input.values) {
    heap.push(value);
    let index = heap.length - 1;
    emit({ [index]: "found" }, `Append ${value} at complete-tree index ${index}.`, `ألحق ${value} عند فهرس الشجرة الكاملة ${index}.`, "insert");
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      emit({ [index]: "compare", [parent]: "compare" }, `Compare child ${heap[index]} with parent ${heap[parent]}.`, `قارن الابن ${heap[index]} بالأب ${heap[parent]}.`, "up");
      if (heap[parent] >= heap[index]) break;
      [heap[parent], heap[index]] = [heap[index], heap[parent]];
      swaps++;
      index = parent;
      emit({ [index]: "swap" }, "Swap upward; inspect the new positions before continuing.", "بدّل إلى الأعلى وافحص المواضع الجديدة قبل المتابعة.", "up", { kind: "reorder", label: "Max-heap sift-up swap" });
    }
  }
  for (let count = 0; count < input.extracts && heap.length > 0; count++) {
    emit({ 0: "found" }, `The root ${heap[0]} is the maximum and will be extracted.`, `الجذر ${heap[0]} هو الأكبر وسيُستخرج.`, "extract");
    const maximum = heap[0];
    const last = heap.pop()!;
    removed.push(maximum);
    if (heap.length === 0) {
      emit({}, `Remove the sole element ${maximum}.`, `احذف العنصر الوحيد ${maximum}.`, "extract");
      continue;
    }
    heap[0] = last;
    emit({ 0: "active" }, `Move last value ${last} to the root before sifting down.`, `انقل القيمة الأخيرة ${last} إلى الجذر قبل إنزالها.`, "extract", { kind: "reorder", label: "Heap root replacement" });
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let largest = index;
      if (left < heap.length && heap[left] > heap[largest]) largest = left;
      if (right < heap.length && heap[right] > heap[largest]) largest = right;
      if (largest === index) break;
      emit({ [index]: "compare", [largest]: "compare" }, `Choose larger child ${heap[largest]} for the next swap.`, `اختر الابن الأكبر ${heap[largest]} للتبديل التالي.`, "down");
      [heap[index], heap[largest]] = [heap[largest], heap[index]];
      swaps++;
      index = largest;
      emit({ [index]: "swap" }, "Swap downward; the previous parent position now satisfies max-heap order.", "بدّل إلى الأسفل؛ أصبح موضع الأب السابق يحقق ترتيب الكومة العظمى.", "down", { kind: "reorder", label: "Max-heap sift-down swap" });
    }
  }
  emit(Object.fromEntries(heap.map((_, index) => [index, "sorted" as const])), "All requested max-heap operations are complete.", "اكتملت كل عمليات الكومة العظمى.", "done");
  return steps;
}

interface TwoThreeNode {
  id: string;
  keys: number[];
  children: TwoThreeNode[];
}
type TwoThreeInput = { values: number[] };

function twoThreeFrame(root: TwoThreeNode | null, states: Record<string, CellState> = {}, note?: string): TreeFrame {
  const nodes: Record<string, TreeNodeF> = {};
  const visit = (node: TwoThreeNode) => {
    nodes[node.id] = {
      id: node.id,
      value: node.keys.join(" | "),
      children: node.children.map((child) => child.id),
      extra: `${node.keys.length}-key`,
    };
    node.children.forEach(visit);
  };
  if (root) visit(root);
  return { nodes, rootId: root?.id ?? null, states, note };
}

function generateTwoThree(input: TwoThreeInput): Step<TreeFrame>[] {
  let root: TwoThreeNode | null = null;
  let nextId = 0;
  let splits = 0;
  const steps: Step<TreeFrame>[] = [];
  const emit = (states: Record<string, CellState>, description: string, descriptionAr: string, phase: string, transformation?: Step<TreeFrame>["transformation"]) => {
    steps.push({
      frame: twoThreeFrame(root, states, "Each stable node has one or two keys; all leaves share one depth."),
      description,
      descriptionAr,
      codeLine: phase === "split" ? 4 : 2,
      counters: { splits },
      phase,
      transformation,
    });
  };
  const insert = (node: TwoThreeNode, key: number): { promoted: number; left: TwoThreeNode; right: TwoThreeNode } | null => {
    emit({ [node.id]: "compare" }, `Inspect node [${node.keys.join(", ")}] for key ${key}.`, `افحص العقدة [${node.keys.join("، ")}] للمفتاح ${key}.`, "descend");
    if (node.keys.includes(key)) {
      emit({ [node.id]: "discarded" }, `Duplicate ${key} is ignored.`, `تُهمل القيمة المكررة ${key}.`, "duplicate");
      return null;
    }
    if (node.children.length === 0) {
      node.keys.push(key);
      node.keys.sort((a, b) => a - b);
      emit({ [node.id]: node.keys.length === 3 ? "swap" : "found" }, `Insert ${key} into the leaf, producing [${node.keys.join(", ")}].`, `أدرج ${key} في الورقة لتصبح [${node.keys.join("، ")}].`, "insert");
    } else {
      const childIndex = key < node.keys[0] ? 0 : node.keys.length === 1 || key < node.keys[1] ? 1 : 2;
      const split = insert(node.children[childIndex], key);
      if (!split) return null;
      emit({ [node.id]: "active" }, `Promote ${split.promoted} from the split child into its parent.`, `ارفع ${split.promoted} من الابن المنقسم إلى الأب.`, "promote");
      node.keys.splice(childIndex, 0, split.promoted);
      node.children.splice(childIndex, 1, split.left, split.right);
      emit({ [node.id]: node.keys.length === 3 ? "swap" : "found" }, `Parent now contains [${node.keys.join(", ")}].`, `أصبح الأب يحتوي [${node.keys.join("، ")}].`, "promote");
    }
    if (node.keys.length < 3) return null;
    const [low, middle, high] = node.keys;
    const leftChildren = node.children.length ? node.children.slice(0, 2) : [];
    const rightChildren = node.children.length ? node.children.slice(2) : [];
    emit({ [node.id]: "swap" }, `Overflow [${low}, ${middle}, ${high}]: split around middle key ${middle}.`, `فائض [${low}، ${middle}، ${high}]: اقسم حول المفتاح الأوسط ${middle}.`, "split");
    const left: TwoThreeNode = { id: `${node.id}L${splits}`, keys: [low], children: leftChildren };
    const right: TwoThreeNode = { id: `${node.id}R${splits}`, keys: [high], children: rightChildren };
    splits++;
    return { promoted: middle, left, right };
  };
  emit({}, "Start with an empty 2-3 tree.", "ابدأ بشجرة 2-3 فارغة.", "start");
  for (const key of unique(input.values)) {
    if (!root) {
      root = { id: `q${nextId++}`, keys: [key], children: [] };
      emit({ [root.id]: "found" }, `Create root [${key}].`, `أنشئ الجذر [${key}].`, "insert");
      continue;
    }
    const split = insert(root, key);
    if (split) {
      root = { id: `q${nextId++}`, keys: [split.promoted], children: [split.left, split.right] };
      emit({ [root.id]: "found" }, `Root split creates a new root [${split.promoted}].`, `أنشأ انقسام الجذر جذراً جديداً [${split.promoted}].`, "split", { kind: "balance", label: "2-3 root split" });
    } else {
      emit({}, `Insertion of ${key} preserves equal leaf depth.`, `يحافظ إدراج ${key} على تساوي أعماق الأوراق.`, "stable");
    }
  }
  emit(root ? { [root.id]: "sorted" } : {}, "2-3 tree construction complete.", "اكتمل بناء شجرة 2-3.", "done");
  return steps;
}

export const splayTree = makeModule<TreeFrame, SearchTreeInput>({
  slug: "splay-tree",
  title: "Splay Tree",
  titleAr: "شجرة Splay",
  category: "trees",
  difficulty: "Advanced",
  tags: ["self-adjusting tree", "zig", "zig-zig", "zig-zag"],
  tagsAr: ["شجرة ذاتية الضبط", "Zig", "Zig-Zig", "Zig-Zag"],
  summary: "Moves every inserted or accessed node to the root through explicit zig and double rotations.",
  summaryAr: "تنقل كل عقدة مدرجة أو مطلوبة إلى الجذر عبر دورانات Zig والدورانات المزدوجة.",
  renderer: "tree",
  pseudocode: ["search or BST-insert key", "while node has parent", "  classify zig, zig-zig, or zig-zag", "  perform one or two rotations", "node becomes root"],
  pseudocodeAr: ["ابحث أو أدرج كمفتاح BST", "ما دامت للعقدة أب", "  صنف Zig أو Zig-Zig أو Zig-Zag", "  نفذ دوراناً أو دورانين", "تصبح العقدة جذراً"],
  overview: "A splay tree is a self-adjusting BST that moves the most recently accessed node to the root without storing balance metadata.",
  overviewAr: "شجرة Splay هي BST ذاتية الضبط تنقل آخر عقدة جرى الوصول إليها إلى الجذر دون تخزين معلومات توازن.",
  complexity: { time: { best: "O(1)", average: "O(log n) amortized", worst: "O(n)" }, space: "O(n)" },
  applications: ["Caches", "Ropes", "Locality-sensitive dictionaries"],
  applicationsAr: ["الذاكرة المخبأة", "هياكل الحبال النصية", "قواميس حساسة للمحلية"],
  inputFields: [numberField(), { key: "access", label: "Access key", labelAr: "مفتاح الوصول", placeholder: "30", help: "Found key, or last visited node on a miss, is splayed.", helpAr: "يُرفع المفتاح الموجود أو آخر عقدة زارتها عملية بحث فاشلة.", search: true }],
  defaultInput: () => ({ values: [40, 20, 60, 10, 30, 50, 70], access: 30 }),
  parseInput: parseSearchTree,
  serializeInput: (input) => ({ values: input.values.join(", "), access: String(input.access) }),
  generate: generateSplay,
});

export const treap = makeModule<TreeFrame, TreapInput>({
  slug: "treap",
  title: "Treap",
  titleAr: "شجرة Treap",
  category: "trees",
  difficulty: "Advanced",
  tags: ["BST", "heap priority", "rotations", "randomized tree"],
  tagsAr: ["BST", "أولوية كومة", "دورانات", "شجرة عشوائية"],
  summary: "Preserves BST order by key and min-heap order by priority using rotations.",
  summaryAr: "تحافظ على ترتيب BST بالمفتاح وترتيب الكومة الصغرى بالأولوية باستخدام الدورانات.",
  renderer: "tree",
  pseudocode: ["BST-insert (key, priority)", "while priority < parent.priority", "  rotate node above parent", "preserve key order during every rotation"],
  pseudocodeAr: ["أدرج المفتاح والأولوية كـBST", "ما دامت الأولوية أصغر من أولوية الأب", "  أدر العقدة فوق الأب", "حافظ على ترتيب المفاتيح في كل دوران"],
  overview: "A treap combines a BST over keys with a heap over priorities. Rotations repair priority order without changing in-order key order.",
  overviewAr: "تجمع Treap بين BST للمفاتيح وكومة للأولويات، وتصلح الدورانات ترتيب الأولوية دون تغيير ترتيب المفاتيح الداخلي.",
  complexity: { time: { best: "O(1)", average: "O(log n)", worst: "O(n)" }, space: "O(n)" },
  applications: ["Randomized search trees", "Split/merge sets", "Ordered maps"],
  applicationsAr: ["أشجار بحث عشوائية", "مجموعات الانقسام والدمج", "خرائط مرتبة"],
  inputFields: [{ key: "entries", label: "Key:priority", labelAr: "المفتاح:الأولوية", placeholder: "50:40, 30:20, 70:60, 20:10", help: "Unique keys; smaller priority rises.", helpAr: "مفاتيح فريدة؛ ترتفع الأولوية الأصغر." }],
  defaultInput: () => parseTreap({ entries: "50:40, 30:20, 70:60, 20:10, 40:30" }),
  parseInput: parseTreap,
  serializeInput: (input) => ({ entries: input.entries.map((entry) => `${entry.key}:${entry.priority}`).join(", ") }),
  generate: generateTreap,
});

export const maxHeap = makeModule<TreeFrame, HeapInput>({
  slug: "max-heap",
  title: "Max-Heap",
  titleAr: "الكومة العظمى",
  category: "trees",
  difficulty: "Intermediate",
  tags: ["heap", "complete tree", "sift up", "sift down"],
  tagsAr: ["كومة", "شجرة كاملة", "رفع", "إنزال"],
  summary: "Builds a complete max-heap with visible swaps and extracts requested maxima one at a time.",
  summaryAr: "تبني كومة عظمى كاملة بتبديلات ظاهرة وتستخرج القيم العظمى المطلوبة واحدة تلو الأخرى.",
  renderer: "tree",
  pseudocode: ["insert: append at next complete-tree slot", "while child > parent, swap upward", "extract max: save root", "move last value to root", "swap downward with larger child"],
  pseudocodeAr: ["الإدراج: ألحق في خانة الشجرة الكاملة التالية", "ما دام الابن أكبر من الأب بدّل للأعلى", "استخراج الأكبر: احفظ الجذر", "انقل القيمة الأخيرة إلى الجذر", "بدّل للأسفل مع الابن الأكبر"],
  overview: "A max-heap is a complete binary tree whose parent is at least as large as each child.",
  overviewAr: "الكومة العظمى شجرة ثنائية كاملة لا تقل قيمة أي أب فيها عن قيم أبنائه.",
  complexity: complexities.logarithmic,
  applications: ["Priority queues", "Heap sort", "Top-k selection"],
  applicationsAr: ["طوابير الأولوية", "ترتيب الكومة", "اختيار أكبر k"],
  inputFields: [numberField(), { key: "extracts", label: "Extract count", labelAr: "عدد الاستخراجات", placeholder: "2", help: "How many maxima to remove after construction.", helpAr: "عدد القيم العظمى التي تُحذف بعد البناء." }],
  defaultInput: (level, rng) => ({ values: randomUnique(level, rng), extracts: Math.min(2, level) }),
  parseInput: parseHeap,
  serializeInput: (input) => ({ values: input.values.join(", "), extracts: String(input.extracts) }),
  generate: generateMaxHeap,
});

export const twoThreeTree = makeModule<TreeFrame, TwoThreeInput>({
  slug: "two-three-tree",
  title: "2-3 Tree",
  titleAr: "شجرة 2-3",
  category: "trees",
  difficulty: "Advanced",
  tags: ["balanced multiway tree", "split", "promotion"],
  tagsAr: ["شجرة متعددة متوازنة", "انقسام", "ترقية"],
  summary: "Inserts into one/two-key nodes and exposes every temporary three-key overflow, split, and promotion.",
  summaryAr: "تدرج في عقد ذات مفتاح أو مفتاحين وتعرض كل فائض مؤقت وانقسام وترقية.",
  renderer: "tree",
  pseudocode: ["descend to the ordered leaf", "insert key in sorted order", "if node has three keys", "  split around middle key", "  promote middle to parent", "repeat upward; split root if needed"],
  pseudocodeAr: ["انزل إلى الورقة المرتبة", "أدرج المفتاح بترتيب", "إن أصبحت العقدة بثلاثة مفاتيح", "  اقسم حول المفتاح الأوسط", "  ارفع الأوسط إلى الأب", "كرر صعوداً واقسم الجذر عند الحاجة"],
  overview: "A 2-3 tree is a perfectly balanced search tree whose stable nodes hold one or two keys. Overflow splits propagate upward.",
  overviewAr: "شجرة 2-3 شجرة بحث متوازنة تماماً تحمل عقدها المستقرة مفتاحاً أو مفتاحين، وتصعد انقسامات الفائض.",
  complexity: complexities.logarithmic,
  applications: ["Balanced dictionaries", "Foundation for B-trees", "Ordered sets"],
  applicationsAr: ["قواميس متوازنة", "أساس أشجار B", "مجموعات مرتبة"],
  inputFields: [numberField()],
  defaultInput: () => ({ values: [40, 20, 60, 10, 30, 50, 70, 25] }),
  parseInput: (fields) => ({ values: unique(parseIntegerList(fields.values ?? "")) }),
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate: generateTwoThree,
});
