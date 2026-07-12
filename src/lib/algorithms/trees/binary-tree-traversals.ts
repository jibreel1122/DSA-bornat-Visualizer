import type { AlgorithmModule, CellState, Step, TreeFrame, TreeNodeF } from "@/lib/engine/types";

interface TNode {
  id: string;
  value: number;
  left: TNode | null;
  right: TNode | null;
}
type Order = "inorder" | "preorder" | "postorder" | "levelorder";
type Input = { values: number[]; order: Order };

let idc = 0;

function buildBST(values: number[]): TNode | null {
  let root: TNode | null = null;
  const insert = (n: TNode | null, v: number): TNode => {
    if (!n) return { id: `n${idc++}`, value: v, left: null, right: null };
    if (v < n.value) n.left = insert(n.left, v);
    else if (v > n.value) n.right = insert(n.right, v);
    return n;
  };
  for (const v of values) root = insert(root, v);
  return root;
}

function toFrame(root: TNode | null, states: Record<string, CellState>, output: number[]): TreeFrame {
  const nodes: Record<string, TreeNodeF> = {};
  const walk = (n: TNode | null) => {
    if (!n) return;
    nodes[n.id] = { id: n.id, value: n.value, left: n.left?.id ?? null, right: n.right?.id ?? null };
    walk(n.left);
    walk(n.right);
  };
  walk(root);
  return { nodes, rootId: root?.id ?? null, states: { ...states }, aux: [{ label: "Visited", values: [...output] }] };
}

const LABEL: Record<Order, string> = {
  inorder: "In-order (Left, Node, Right)",
  preorder: "Pre-order (Node, Left, Right)",
  postorder: "Post-order (Left, Right, Node)",
  levelorder: "Level-order (BFS)",
};

const LABEL_AR: Record<Order, string> = {
  inorder: "الترتيب الداخلي (يسار، عقدة، يمين)",
  preorder: "الترتيب السابق (عقدة، يسار، يمين)",
  postorder: "الترتيب اللاحق (يسار، يمين، عقدة)",
  levelorder: "الترتيب حسب المستوى (BFS)",
};

function generate(input: Input): Step<TreeFrame>[] {
  idc = 0;
  const root = buildBST([...input.values]);
  const steps: Step<TreeFrame>[] = [];
  const output: number[] = [];
  const visited: Record<string, CellState> = {};
  let ops = 0;

  const snap = (states: Record<string, CellState>, description: string, codeLine: number, descriptionAr?: string) => {
    steps.push({ frame: toFrame(root, { ...visited, ...states }, output), description, descriptionAr, codeLine, counters: { visited: output.length, steps: ops } });
  };

  snap({}, `${LABEL[input.order]} traversal of the tree.`, 0, `اجتياز الشجرة بطريقة ${LABEL_AR[input.order]}.`);

  const emit = (n: TNode) => {
    ops++;
    output.push(n.value);
    visited[n.id] = "sorted";
    snap({ [n.id]: "found" }, `Visit ${n.value} → output.`, input.order === "inorder" ? 3 : input.order === "preorder" ? 2 : input.order === "postorder" ? 4 : 6, `زُر ${n.value} → أضِفه إلى الخرج.`);
  };

  if (input.order === "levelorder") {
    const queue: TNode[] = root ? [root] : [];
    while (queue.length) {
      const n = queue.shift()!;
      snap({ [n.id]: "active" }, `Dequeue ${n.value}.`, 5, `أخرج ${n.value} من الطابور.`);
      emit(n);
      if (n.left) queue.push(n.left);
      if (n.right) queue.push(n.right);
    }
  } else {
    const rec = (n: TNode | null) => {
      if (!n) return;
      snap({ [n.id]: "active" }, `Enter node ${n.value}.`, 1, `ادخل العقدة ${n.value}.`);
      if (input.order === "preorder") emit(n);
      rec(n.left);
      if (input.order === "inorder") emit(n);
      rec(n.right);
      if (input.order === "postorder") emit(n);
    };
    rec(root);
  }

  snap({}, `${LABEL[input.order]} result: ${output.join(", ")}.`, 7, `نتيجة ${LABEL_AR[input.order]}: ${output.join(", ")}.`);
  return steps;
}

const mod: AlgorithmModule<TreeFrame, Input> = {
  slug: "binary-tree-traversals",
  title: "Binary Tree Traversals",
  titleAr: "اجتيازات الشجرة الثنائية",
  category: "trees",
  difficulty: "Beginner",
  tags: ["tree", "DFS", "BFS", "traversal"],
  tagsAr: ["شجرة", "بحث بالعمق أولًا", "بحث بالعرض أولًا", "اجتياز"],
  summary: "Visits every node in in-order, pre-order, post-order, or level-order — the four canonical traversals.",
  summaryAr: "يزور كل عقدة بالترتيب الداخلي أو السابق أو اللاحق أو حسب المستوى — الاجتيازات الأربعة الكلاسيكية.",
  renderer: "tree",
  pseudocode: [
    "traverse(node):",
    "  preorder:  visit node, recurse left, recurse right",
    "  inorder:   recurse left, visit node, recurse right",
    "  postorder: recurse left, recurse right, visit node",
    "  // level-order uses a queue instead of recursion:",
    "  enqueue root; while queue not empty:",
    "    node = dequeue; visit node",
    "    enqueue node.left, node.right",
    "  // done",
  ],
  code: {
    pseudocode: `inorder(n):   if n: inorder(n.left); visit(n); inorder(n.right)
preorder(n):  if n: visit(n); preorder(n.left); preorder(n.right)
postorder(n): if n: postorder(n.left); postorder(n.right); visit(n)
levelorder(root):
  q = [root]
  while q: n = q.pop_front(); visit(n); q.push(n.left, n.right)`,
    c: `void inorder(Node* n){ if(!n) return; inorder(n->l); visit(n->v); inorder(n->r); }
void preorder(Node* n){ if(!n) return; visit(n->v); preorder(n->l); preorder(n->r); }
void postorder(Node* n){ if(!n) return; postorder(n->l); postorder(n->r); visit(n->v); }`,
    cpp: `void inorder(Node* n){ if(!n) return; inorder(n->l); visit(n->v); inorder(n->r); }
void preorder(Node* n){ if(!n) return; visit(n->v); preorder(n->l); preorder(n->r); }
void postorder(Node* n){ if(!n) return; postorder(n->l); postorder(n->r); visit(n->v); }`,
    java: `void inorder(Node n){ if(n==null) return; inorder(n.l); visit(n.v); inorder(n.r); }
void preorder(Node n){ if(n==null) return; visit(n.v); preorder(n.l); preorder(n.r); }
void postorder(Node n){ if(n==null) return; postorder(n.l); postorder(n.r); visit(n.v); }
void levelOrder(Node root){
    Queue<Node> q = new LinkedList<>(); if(root!=null) q.add(root);
    while(!q.isEmpty()){ Node n=q.poll(); visit(n.v);
        if(n.l!=null) q.add(n.l); if(n.r!=null) q.add(n.r); }
}`,
    python: `def inorder(n):
    if not n: return
    inorder(n.left); visit(n.val); inorder(n.right)

def preorder(n):
    if not n: return
    visit(n.val); preorder(n.left); preorder(n.right)

def postorder(n):
    if not n: return
    postorder(n.left); postorder(n.right); visit(n.val)

from collections import deque
def level_order(root):
    q = deque([root] if root else [])
    while q:
        n = q.popleft(); visit(n.val)
        if n.left: q.append(n.left)
        if n.right: q.append(n.right)`,
    javascript: `function inorder(n){ if(!n) return; inorder(n.left); visit(n.val); inorder(n.right); }
function preorder(n){ if(!n) return; visit(n.val); preorder(n.left); preorder(n.right); }
function postorder(n){ if(!n) return; postorder(n.left); postorder(n.right); visit(n.val); }
function levelOrder(root){
  const q = root ? [root] : [];
  while(q.length){ const n=q.shift(); visit(n.val);
    if(n.left) q.push(n.left); if(n.right) q.push(n.right); }
}`,
    typescript: `function inorder(n: Node | null){ if(!n) return; inorder(n.left); visit(n.val); inorder(n.right); }
function preorder(n: Node | null){ if(!n) return; visit(n.val); preorder(n.left); preorder(n.right); }
function postorder(n: Node | null){ if(!n) return; postorder(n.left); postorder(n.right); visit(n.val); }`,
    csharp: `void Inorder(Node n){ if(n==null) return; Inorder(n.L); Visit(n.V); Inorder(n.R); }
void Preorder(Node n){ if(n==null) return; Visit(n.V); Preorder(n.L); Preorder(n.R); }
void Postorder(Node n){ if(n==null) return; Postorder(n.L); Postorder(n.R); Visit(n.V); }`,
    go: `func inorder(n *Node){ if n==nil { return }; inorder(n.L); visit(n.V); inorder(n.R) }
func preorder(n *Node){ if n==nil { return }; visit(n.V); preorder(n.L); preorder(n.R) }
func postorder(n *Node){ if n==nil { return }; postorder(n.L); postorder(n.R); visit(n.V) }`,
    rust: `fn inorder(n: &Option<Box<Node>>) { if let Some(x)=n { inorder(&x.l); visit(x.v); inorder(&x.r); } }
fn preorder(n: &Option<Box<Node>>) { if let Some(x)=n { visit(x.v); preorder(&x.l); preorder(&x.r); } }
fn postorder(n: &Option<Box<Node>>) { if let Some(x)=n { postorder(&x.l); postorder(&x.r); visit(x.v); } }`,
    kotlin: `fun inorder(n: Node?){ if(n==null) return; inorder(n.l); visit(n.v); inorder(n.r) }
fun preorder(n: Node?){ if(n==null) return; visit(n.v); preorder(n.l); preorder(n.r) }
fun postorder(n: Node?){ if(n==null) return; postorder(n.l); postorder(n.r); visit(n.v) }`,
    swift: `func inorder(_ n: Node?){ guard let n=n else { return }; inorder(n.l); visit(n.v); inorder(n.r) }
func preorder(_ n: Node?){ guard let n=n else { return }; visit(n.v); preorder(n.l); preorder(n.r) }
func postorder(_ n: Node?){ guard let n=n else { return }; postorder(n.l); postorder(n.r); visit(n.v) }`,
  },
  content: {
    overview: `Traversing a tree means visiting every node exactly once in a well-defined order. Binary trees have four classic traversals. Three are depth-first and differ only in when the node itself is visited relative to its children: pre-order (node first), in-order (node between children), and post-order (node last). The fourth, level-order, is breadth-first and visits nodes level by level using a queue.

The order you choose depends on the task. In-order on a BST prints keys sorted. Pre-order copies or serializes a tree. Post-order frees a tree or evaluates an expression tree bottom-up. Level-order answers "what's on each level" and underlies shortest-path reasoning on trees.`,
    howItWorks: [
      "Pre-order: visit the node, then recurse into the left subtree, then the right.",
      "In-order: recurse left, visit the node, then recurse right (sorted output on a BST).",
      "Post-order: recurse left, recurse right, then visit the node.",
      "Level-order: use a FIFO queue — dequeue a node, visit it, enqueue its children.",
      "Each node is visited once, so every traversal is linear in the number of nodes.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n)", worst: "O(n)" },
      space: "O(h)",
      notes: "Every node is visited once → O(n). Recursive DFS uses O(h) stack space (h = height); level-order uses O(w) queue space (w = max width, up to n/2).",
    },
    applications: [
      "In-order on a BST to output sorted keys",
      "Pre-order to serialize/clone a tree structure",
      "Post-order to delete a tree or evaluate expression trees",
      "Level-order for level statistics, tree width, and shortest tree paths",
    ],
    advantages: [
      "Simple recursive formulations for the three DFS orders",
      "Each traversal is optimal at O(n)",
      "Different orders serve distinct, practical purposes",
    ],
    disadvantages: [
      "Recursive DFS risks stack overflow on very deep trees",
      "Level-order needs an explicit queue and O(width) memory",
      "Choosing the wrong order silently produces wrong results (e.g. non-sorted output)",
    ],
    commonMistakes: [
      "Confusing pre/in/post — remember it's about when the node is visited.",
      "Expecting in-order to be sorted on a non-BST (it isn't).",
      "Using a stack instead of a queue for level-order (that gives DFS).",
      "Deep recursion overflowing the stack; use an explicit stack or Morris traversal.",
    ],
    interviewQuestions: [
      "Which traversal of a BST produces sorted output, and why?",
      "How do you perform an iterative in-order traversal with an explicit stack?",
      "Reconstruct a binary tree from its pre-order and in-order sequences.",
      "What traversal would you use to evaluate an expression tree?",
      "Explain Morris traversal and its O(1) space advantage.",
    ],
    summary:
      "The four binary-tree traversals — pre-order, in-order, post-order (DFS), and level-order (BFS) — each visit every node once in O(n) time. In-order sorts a BST, pre-order serializes, post-order tears down or evaluates, and level-order processes tree levels.",
    quiz: [
      { question: "Which traversal outputs a BST's keys in sorted order?", options: ["Pre-order", "In-order", "Post-order", "Level-order"], answer: 1, explanation: "In-order visits left subtree, node, right subtree — ascending on a BST." },
      { question: "Level-order traversal uses which data structure?", options: ["Stack", "Queue", "Priority queue", "Hash set"], answer: 1, explanation: "A FIFO queue processes nodes breadth-first, level by level." },
      { question: "Post-order visits a node…", options: ["before its children", "between its children", "after both children", "randomly"], answer: 2, explanation: "Post-order recurses into both subtrees before visiting the node itself." },
      { question: "Time complexity of any full traversal is…", options: ["O(log n)", "O(n)", "O(n log n)", "O(n²)"], answer: 1, explanation: "Each of the n nodes is visited exactly once." },
      { question: "Which traversal is best for deleting/freeing a tree?", options: ["Pre-order", "In-order", "Post-order", "Level-order"], answer: 2, explanation: "Post-order frees children before their parent, avoiding dangling references." },
    ],
  },
  contentAr: {
    overview: `اجتياز الشجرة يعني زيارة كل عقدة مرة واحدة بالضبط وفق ترتيب محدد جيدًا. للأشجار الثنائية أربعة اجتيازات كلاسيكية. ثلاثة منها بالعمق أولًا (DFS) ولا تختلف إلا في توقيت زيارة العقدة نفسها بالنسبة لأبنائها: الترتيب السابق (العقدة أولًا)، والترتيب الداخلي (العقدة بين الأبناء)، والترتيب اللاحق (العقدة أخيرًا). أما الرابع، الترتيب حسب المستوى، فهو بالعرض أولًا (BFS) ويزور العقد مستوى تلو الآخر باستخدام طابور.

الترتيب الذي تختاره يعتمد على المهمة. الترتيب الداخلي في شجرة بحث ثنائية يطبع المفاتيح مرتبة. الترتيب السابق ينسخ الشجرة أو يسلسلها. الترتيب اللاحق يحرر الشجرة أو يُقيّم شجرة تعبير من الأسفل إلى الأعلى. الترتيب حسب المستوى يجيب عن سؤال "ما الموجود في كل مستوى" ويؤسس لمنطق أقصر المسارات على الأشجار.`,
    howItWorks: [
      "الترتيب السابق: زُر العقدة، ثم عاود الدخول إلى الشجرة الفرعية اليسرى، ثم اليمنى.",
      "الترتيب الداخلي: عاود الدخول يسارًا، ثم زُر العقدة، ثم عاود الدخول يمينًا (خرج مرتب في شجرة بحث ثنائية).",
      "الترتيب اللاحق: عاود الدخول يسارًا، ثم يمينًا، ثم زُر العقدة.",
      "الترتيب حسب المستوى: استخدم طابور FIFO — أخرج عقدة، زُرها، ثم أضف أبناءها إلى الطابور.",
      "تُزار كل عقدة مرة واحدة، لذا كل اجتياز خطي في عدد العقد.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n)", worst: "O(n)" },
      space: "O(h)",
      notes: "تُزار كل عقدة مرة واحدة ← O(n). البحث بالعمق أولًا العودي يستخدم مساحة مكدس O(h) (h هو الارتفاع)؛ والترتيب حسب المستوى يستخدم مساحة طابور O(w) (w هو أقصى عرض، وقد يصل إلى n/2).",
    },
    applications: [
      "الترتيب الداخلي في شجرة بحث ثنائية لإخراج المفاتيح مرتبة",
      "الترتيب السابق لتسلسل/استنساخ بنية الشجرة",
      "الترتيب اللاحق لحذف شجرة أو تقييم أشجار التعبير",
      "الترتيب حسب المستوى لإحصاءات المستويات وعرض الشجرة وأقصر مسارات الشجرة",
    ],
    advantages: [
      "صيغ عودية بسيطة للترتيبات الثلاثة بالعمق أولًا",
      "كل اجتياز أمثل بتكلفة O(n)",
      "الترتيبات المختلفة تخدم أغراضًا عملية متمايزة",
    ],
    disadvantages: [
      "البحث العودي بالعمق أولًا يخاطر بفيضان المكدس في الأشجار العميقة جدًا",
      "الترتيب حسب المستوى يحتاج طابورًا صريحًا وذاكرة O(العرض)",
      "اختيار الترتيب الخاطئ ينتج نتائج خاطئة بصمت (مثل خرج غير مرتب)",
    ],
    commonMistakes: [
      "الخلط بين السابق والداخلي واللاحق — تذكّر أن الأمر يتعلق بتوقيت زيارة العقدة.",
      "توقّع أن يكون الترتيب الداخلي مرتبًا في شجرة ليست شجرة بحث ثنائية (وهو ليس كذلك).",
      "استخدام مكدس بدلًا من طابور للترتيب حسب المستوى (ذلك يعطي بحثًا بالعمق أولًا).",
      "العودية العميقة تُفيض المكدس؛ استخدم مكدسًا صريحًا أو اجتياز موريس.",
    ],
    interviewQuestions: [
      "أي اجتياز لشجرة بحث ثنائية ينتج خرجًا مرتبًا، ولماذا؟",
      "كيف تُجري اجتيازًا داخليًا تكراريًا باستخدام مكدس صريح؟",
      "أعِد بناء شجرة ثنائية من تسلسلَي الترتيب السابق والداخلي.",
      "أي اجتياز تستخدمه لتقييم شجرة تعبير؟",
      "اشرح اجتياز موريس وميزته في استخدام مساحة O(1).",
    ],
    summary:
      "اجتيازات الشجرة الثنائية الأربعة — السابق والداخلي واللاحق (DFS)، وحسب المستوى (BFS) — تزور كل منها كل عقدة مرة واحدة بزمن O(n). الترتيب الداخلي يرتب شجرة البحث الثنائية، والسابق يسلسلها، واللاحق يفككها أو يُقيّمها، وحسب المستوى يعالج مستويات الشجرة.",
    quiz: [
      { question: "أي اجتياز يُخرج مفاتيح شجرة بحث ثنائية مرتبة؟", options: ["الترتيب السابق", "الترتيب الداخلي", "الترتيب اللاحق", "الترتيب حسب المستوى"], answer: 1, explanation: "الترتيب الداخلي يزور الشجرة الفرعية اليسرى ثم العقدة ثم اليمنى — تصاعديًا في شجرة بحث ثنائية." },
      { question: "الترتيب حسب المستوى يستخدم أي بنية بيانات؟", options: ["مكدس", "طابور", "طابور أولوية", "مجموعة تجزئة"], answer: 1, explanation: "طابور FIFO يعالج العقد بالعرض أولًا، مستوى تلو الآخر." },
      { question: "الترتيب اللاحق يزور العقدة…", options: ["قبل أبنائها", "بين أبنائها", "بعد كلا ابنيها", "عشوائيًا"], answer: 2, explanation: "الترتيب اللاحق يعاود الدخول إلى كلا الشجرتين الفرعيتين قبل زيارة العقدة نفسها." },
      { question: "التعقيد الزمني لأي اجتياز كامل هو…", options: ["O(log n)", "O(n)", "O(n log n)", "O(n²)"], answer: 1, explanation: "تُزار كل عقدة من العقد الـ n مرة واحدة بالضبط." },
      { question: "أي اجتياز الأفضل لحذف/تحرير شجرة؟", options: ["الترتيب السابق", "الترتيب الداخلي", "الترتيب اللاحق", "الترتيب حسب المستوى"], answer: 2, explanation: "الترتيب اللاحق يحرر الأبناء قبل الأب، متجنبًا المراجع المعلّقة." },
    ],
  },
  inputFields: [
    { key: "values", label: "Values (built into a BST)", placeholder: "50, 30, 70, 20, 40, 60, 80", help: "2–20 numbers; inserted to form the tree." },
    { key: "order", label: "Traversal", placeholder: "inorder | preorder | postorder | levelorder" },
  ],
  defaultInput: (level, rng) => {
    const n = Math.min(15, 4 + level * 2);
    const vals: number[] = [];
    const used = new Set<number>();
    while (vals.length < n) {
      const v = rng.int(10, 99);
      if (used.has(v)) continue;
      used.add(v);
      vals.push(v);
    }
    const order = rng.pick(["inorder", "preorder", "postorder", "levelorder"] as const);
    return { values: vals, order };
  },
  parseInput: (fields) => {
    const values = (fields.values ?? "")
      .split(/[,\s]+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const n = Number(p);
        if (!Number.isInteger(n)) throw new Error(`"${p}" is not an integer.`);
        return n;
      });
    if (values.length < 2) throw new Error("Enter at least 2 values.");
    if (values.length > 30) throw new Error("Maximum 30 values.");
    const raw = (fields.order ?? "inorder").trim().toLowerCase();
    const order = (["inorder", "preorder", "postorder", "levelorder"] as const).find((o) => o === raw);
    if (!order) throw new Error("Traversal must be inorder, preorder, postorder, or levelorder.");
    return { values, order };
  },
  serializeInput: (input) => ({ values: input.values.join(", "), order: input.order }),
  generate,
};

export default mod;
