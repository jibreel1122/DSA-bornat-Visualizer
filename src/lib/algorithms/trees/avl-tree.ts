import type { AlgorithmModule, CellState, Step, TreeFrame, TreeNodeF } from "@/lib/engine/types";

interface Node {
  id: string;
  value: number;
  left: Node | null;
  right: Node | null;
  parent: Node | null;
  height: number;
}
type Input = { values: number[] };

function generate(input: Input): Step<TreeFrame>[] {
  let idc = 0;
  let root: Node | null = null;
  const steps: Step<TreeFrame>[] = [];
  let comparisons = 0;
  let rotations = 0;

  const h = (n: Node | null) => (n ? n.height : 0);
  const bf = (n: Node | null) => (n ? h(n.left) - h(n.right) : 0);
  const updateHeight = (n: Node) => (n.height = 1 + Math.max(h(n.left), h(n.right)));

  const toFrame = (states: Record<string, CellState>, description: string, codeLine: number, note: string): void => {
    const nodes: Record<string, TreeNodeF> = {};
    const walk = (n: Node | null) => {
      if (!n) return;
      const b = bf(n);
      nodes[n.id] = {
        id: n.id,
        value: n.value,
        left: n.left?.id ?? null,
        right: n.right?.id ?? null,
        extra: `${b > 0 ? "+" : ""}${b}`,
      };
      walk(n.left);
      walk(n.right);
    };
    walk(root);
    steps.push({
      frame: { nodes, rootId: root?.id ?? null, states: { ...states }, note },
      description,
      codeLine,
      counters: { comparisons, rotations },
    });
  };

  const rotateLeft = (x: Node) => {
    const y = x.right!;
    x.right = y.left;
    if (y.left) y.left.parent = x;
    y.parent = x.parent;
    if (!x.parent) root = y;
    else if (x === x.parent.left) x.parent.left = y;
    else x.parent.right = y;
    y.left = x;
    x.parent = y;
    updateHeight(x);
    updateHeight(y);
    rotations++;
  };

  const rotateRight = (x: Node) => {
    const y = x.left!;
    x.left = y.right;
    if (y.right) y.right.parent = x;
    y.parent = x.parent;
    if (!x.parent) root = y;
    else if (x === x.parent.right) x.parent.right = y;
    else x.parent.left = y;
    y.right = x;
    x.parent = y;
    updateHeight(x);
    updateHeight(y);
    rotations++;
  };

  toFrame({}, `An AVL tree is a self-balancing BST: after every insert it rotates so each node's balance factor (height of left − right) stays in {−1, 0, +1}.`, 0, `empty AVL tree`);

  const insert = (value: number) => {
    // 1) Standard BST insertion (connected, with parent pointers).
    if (!root) {
      root = { id: `n${idc++}`, value, left: null, right: null, parent: null, height: 1 };
      toFrame({ [root.id]: "found" }, `insert(${value}): tree empty → new root.`, 2, `insert ${value}`);
      return;
    }
    let cur: Node = root;
    let parent: Node = root;
    while (cur) {
      comparisons++;
      parent = cur;
      toFrame({ [cur.id]: "compare" }, `insert(${value}): ${value} ${value < cur.value ? "<" : ">"} ${cur.value}, go ${value < cur.value ? "left" : "right"}.`, 3, `insert ${value}`);
      if (value === cur.value) {
        toFrame({ [cur.id]: "discarded" }, `${value} already present — AVL keeps unique keys, skip.`, 3, `insert ${value}`);
        return;
      }
      cur = value < cur.value ? (cur.left as Node) : (cur.right as Node);
    }
    const node: Node = { id: `n${idc++}`, value, left: null, right: null, parent, height: 1 };
    if (value < parent.value) parent.left = node;
    else parent.right = node;
    toFrame({ [node.id]: "found" }, `Insert ${value} as a leaf under ${parent.value}. Now retrace upward to rebalance.`, 4, `insert ${value}`);

    // 2) Retrace: update heights and rebalance at the first unbalanced ancestor.
    let z: Node | null = parent;
    while (z) {
      updateHeight(z);
      const balance = bf(z);
      if (balance > 1 || balance < -1) {
        toFrame({ [z.id]: "swap" }, `Node ${z.value} is unbalanced (bf ${balance > 0 ? "+" : ""}${balance}). Rebalance with a rotation.`, 3, `rebalance`);
        if (balance > 1 && bf(z.left) >= 0) {
          // Left-Left
          toFrame({ [z.id]: "swap", [z.left!.id]: "active" }, `Left-Left case → right-rotate ${z.value}.`, 4, `LL rotation`);
          rotateRight(z);
        } else if (balance > 1) {
          // Left-Right
          toFrame({ [z.id]: "swap", [z.left!.id]: "active", [z.left!.right!.id]: "compare" }, `Left-Right case → left-rotate ${z.left!.value}, then right-rotate ${z.value}.`, 5, `LR rotation`);
          rotateLeft(z.left!);
          rotateRight(z);
        } else if (balance < -1 && bf(z.right) <= 0) {
          // Right-Right
          toFrame({ [z.id]: "swap", [z.right!.id]: "active" }, `Right-Right case → left-rotate ${z.value}.`, 6, `RR rotation`);
          rotateLeft(z);
        } else {
          // Right-Left
          toFrame({ [z.id]: "swap", [z.right!.id]: "active", [z.right!.left!.id]: "compare" }, `Right-Left case → right-rotate ${z.right!.value}, then left-rotate ${z.value}.`, 7, `RL rotation`);
          rotateRight(z.right!);
          rotateLeft(z);
        }
        toFrame({}, `Rebalanced. Heights are AVL-valid again (all balance factors in {−1,0,+1}).`, 8, `balanced`);
        break; // one rotation suffices for a single insertion
      }
      z = z.parent;
    }
  };

  for (const v of input.values) insert(v);

  const done: Record<string, CellState> = {};
  const markAll = (n: Node | null) => {
    if (!n) return;
    done[n.id] = "found";
    markAll(n.left);
    markAll(n.right);
  };
  markAll(root);
  toFrame(done, `All values inserted. The tree is height-balanced with height ${h(root)} — searches stay O(log n).`, 8, `final AVL tree`);
  return steps;
}

function randomInput(level: number, rng: { int: (a: number, b: number) => number; shuffle: <T>(a: readonly T[]) => T[] }): Input {
  // Ascending-ish input triggers rotations, showing off self-balancing.
  const n = Math.min(7, 4 + level);
  if (level <= 2) return { values: Array.from({ length: n }, (_, k) => (k + 1) * 10) }; // forces LL/RR rotations
  return { values: rng.shuffle(Array.from({ length: n }, (_, k) => (k + 1) * 10)) };
}

const mod: AlgorithmModule<TreeFrame, Input> = {
  slug: "avl-tree",
  title: "AVL Tree (Self-Balancing BST)",
  category: "trees",
  difficulty: "Advanced",
  tags: ["tree", "self-balancing", "rotations", "balance factor"],
  summary: "A height-balanced binary search tree that rotates after inserts to keep every balance factor in {−1, 0, +1}.",
  renderer: "tree",
  pseudocode: [
    "procedure insert(node, key)",
    "  do a normal BST insert",
    "  update heights back up the path",
    "  balance = height(left) − height(right)",
    "  if balance > 1 and key < left.key:  right-rotate  (LL)",
    "  if balance > 1 and key > left.key:  left then right (LR)",
    "  if balance < -1 and key > right.key: left-rotate  (RR)",
    "  if balance < -1 and key < right.key: right then left (RL)",
    "  return balanced subtree",
  ],
  code: {
    pseudocode: `insert(node, key): BST insert; update height
balance = h(left) - h(right)
LL: balance>1 & key<left.key  -> rotateRight
RR: balance<-1 & key>right.key -> rotateLeft
LR: balance>1 & key>left.key  -> rotateLeft(left); rotateRight
RL: balance<-1 & key<right.key -> rotateRight(right); rotateLeft`,
    c: `int height(Node* n){ return n ? n->h : 0; }
int bf(Node* n){ return n ? height(n->left)-height(n->right) : 0; }
Node* rotateRight(Node* y){
    Node* x=y->left; y->left=x->right; x->right=y;
    y->h=1+max(height(y->left),height(y->right));
    x->h=1+max(height(x->left),height(x->right));
    return x;
}
Node* insert(Node* n,int k){
    if(!n) return newNode(k);
    if(k<n->key) n->left=insert(n->left,k); else n->right=insert(n->right,k);
    n->h=1+max(height(n->left),height(n->right));
    int b=bf(n);
    if(b>1 && k<n->left->key) return rotateRight(n);
    if(b<-1 && k>n->right->key) return rotateLeft(n);
    if(b>1){ n->left=rotateLeft(n->left); return rotateRight(n); }
    if(b<-1){ n->right=rotateRight(n->right); return rotateLeft(n); }
    return n;
}`,
    cpp: `Node* insert(Node* n, int k) {
    if (!n) return new Node(k);
    if (k < n->key) n->left = insert(n->left, k);
    else n->right = insert(n->right, k);
    n->h = 1 + max(height(n->left), height(n->right));
    int b = bf(n);
    if (b > 1 && k < n->left->key)  return rotateRight(n);
    if (b < -1 && k > n->right->key) return rotateLeft(n);
    if (b > 1)  { n->left = rotateLeft(n->left);   return rotateRight(n); }
    if (b < -1) { n->right = rotateRight(n->right); return rotateLeft(n); }
    return n;
}`,
    java: `Node insert(Node n, int k) {
    if (n == null) return new Node(k);
    if (k < n.key) n.left = insert(n.left, k);
    else n.right = insert(n.right, k);
    n.h = 1 + Math.max(height(n.left), height(n.right));
    int b = bf(n);
    if (b > 1 && k < n.left.key)  return rotateRight(n);
    if (b < -1 && k > n.right.key) return rotateLeft(n);
    if (b > 1)  { n.left = rotateLeft(n.left);   return rotateRight(n); }
    if (b < -1) { n.right = rotateRight(n.right); return rotateLeft(n); }
    return n;
}`,
    python: `def insert(n, k):
    if not n: return Node(k)
    if k < n.key: n.left = insert(n.left, k)
    else: n.right = insert(n.right, k)
    n.h = 1 + max(height(n.left), height(n.right))
    b = bf(n)
    if b > 1 and k < n.left.key:  return rotate_right(n)
    if b < -1 and k > n.right.key: return rotate_left(n)
    if b > 1:  n.left = rotate_left(n.left);   return rotate_right(n)
    if b < -1: n.right = rotate_right(n.right); return rotate_left(n)
    return n`,
    javascript: `function insert(n, k) {
  if (!n) return new Node(k);
  if (k < n.key) n.left = insert(n.left, k);
  else n.right = insert(n.right, k);
  n.h = 1 + Math.max(height(n.left), height(n.right));
  const b = bf(n);
  if (b > 1 && k < n.left.key)  return rotateRight(n);
  if (b < -1 && k > n.right.key) return rotateLeft(n);
  if (b > 1)  { n.left = rotateLeft(n.left);   return rotateRight(n); }
  if (b < -1) { n.right = rotateRight(n.right); return rotateLeft(n); }
  return n;
}`,
    typescript: `function insert(n: Node | null, k: number): Node {
  if (!n) return new Node(k);
  if (k < n.key) n.left = insert(n.left, k);
  else n.right = insert(n.right, k);
  n.h = 1 + Math.max(height(n.left), height(n.right));
  const b = bf(n);
  if (b > 1 && k < n.left!.key)  return rotateRight(n);
  if (b < -1 && k > n.right!.key) return rotateLeft(n);
  if (b > 1)  { n.left = rotateLeft(n.left!);   return rotateRight(n); }
  if (b < -1) { n.right = rotateRight(n.right!); return rotateLeft(n); }
  return n;
}`,
    csharp: `Node Insert(Node n, int k) {
    if (n == null) return new Node(k);
    if (k < n.Key) n.Left = Insert(n.Left, k);
    else n.Right = Insert(n.Right, k);
    n.H = 1 + Math.Max(Height(n.Left), Height(n.Right));
    int b = Bf(n);
    if (b > 1 && k < n.Left.Key)  return RotateRight(n);
    if (b < -1 && k > n.Right.Key) return RotateLeft(n);
    if (b > 1)  { n.Left = RotateLeft(n.Left);   return RotateRight(n); }
    if (b < -1) { n.Right = RotateRight(n.Right); return RotateLeft(n); }
    return n;
}`,
    go: `func insert(n *Node, k int) *Node {
	if n == nil { return &Node{key: k, h: 1} }
	if k < n.key { n.left = insert(n.left, k) } else { n.right = insert(n.right, k) }
	n.h = 1 + max(height(n.left), height(n.right))
	b := bf(n)
	if b > 1 && k < n.left.key { return rotateRight(n) }
	if b < -1 && k > n.right.key { return rotateLeft(n) }
	if b > 1 { n.left = rotateLeft(n.left); return rotateRight(n) }
	if b < -1 { n.right = rotateRight(n.right); return rotateLeft(n) }
	return n
}`,
    rust: `fn insert(node: Option<Box<Node>>, k: i32) -> Option<Box<Node>> {
    let mut n = match node { Some(n) => n, None => return Some(Box::new(Node::new(k))) };
    if k < n.key { n.left = insert(n.left.take(), k); }
    else { n.right = insert(n.right.take(), k); }
    n.update_height();
    let b = n.balance();
    // apply LL / RR / LR / RL rotations based on b and child balances
    Some(rebalance(n, b, k))
}`,
    kotlin: `fun insert(n: Node?, k: Int): Node {
    if (n == null) return Node(k)
    if (k < n.key) n.left = insert(n.left, k) else n.right = insert(n.right, k)
    n.h = 1 + maxOf(height(n.left), height(n.right))
    val b = bf(n)
    if (b > 1 && k < n.left!!.key)  return rotateRight(n)
    if (b < -1 && k > n.right!!.key) return rotateLeft(n)
    if (b > 1)  { n.left = rotateLeft(n.left!!);   return rotateRight(n) }
    if (b < -1) { n.right = rotateRight(n.right!!); return rotateLeft(n) }
    return n
}`,
    swift: `func insert(_ n: Node?, _ k: Int) -> Node {
    guard let n = n else { return Node(k) }
    if k < n.key { n.left = insert(n.left, k) } else { n.right = insert(n.right, k) }
    n.h = 1 + max(height(n.left), height(n.right))
    let b = bf(n)
    if b > 1 && k < n.left!.key  { return rotateRight(n) }
    if b < -1 && k > n.right!.key { return rotateLeft(n) }
    if b > 1  { n.left = rotateLeft(n.left!);   return rotateRight(n) }
    if b < -1 { n.right = rotateRight(n.right!); return rotateLeft(n) }
    return n
}`,
  },
  content: {
    overview: `An AVL tree (named after inventors Adelson-Velsky and Landis, 1962) is the first self-balancing binary search tree ever devised. It keeps the tree's height logarithmic by enforcing a strict invariant: for every node, the heights of its left and right subtrees differ by at most one. That difference is called the node's balance factor, and it must always be −1, 0, or +1.

After a normal BST insertion, one subtree may become too tall, violating the invariant. The tree restores balance with rotations — local, O(1) pointer rearrangements that reduce a subtree's height while preserving the BST ordering. There are four cases, named for the shape of the imbalance: Left-Left and Right-Right need a single rotation, while Left-Right and Right-Left need a double rotation. Because the height is guaranteed to be about 1.44·log₂(n), search, insert, and delete are all O(log n) in the worst case — AVL trees are more rigidly balanced than red-black trees, giving faster lookups at the cost of more rotations on updates.`,
    howItWorks: [
      "Insert the key like an ordinary BST, descending left/right by comparison.",
      "Walk back up the insertion path, updating each ancestor's stored height.",
      "At each ancestor compute the balance factor = height(left) − height(right).",
      "If a balance factor reaches +2 or −2, identify the case (LL, RR, LR, RL).",
      "Apply the matching single or double rotation; one rotation fixes a single insertion.",
    ],
    complexity: {
      time: { best: "O(log n)", average: "O(log n)", worst: "O(log n)" },
      space: "O(n)",
      notes: "The height is at most ~1.44·log₂(n), so search/insert/delete are O(log n) worst-case. Each insert triggers at most one (single or double) rotation; deletion may cause O(log n) rotations up the path.",
    },
    applications: [
      "in-memory ordered maps/sets needing fast worst-case lookups",
      "databases and language runtimes requiring guaranteed O(log n)",
      "ordered statistics and range queries",
      "any workload that is lookup-heavy relative to updates",
    ],
    advantages: [
      "Guaranteed O(log n) worst-case operations",
      "More tightly balanced than red-black trees → faster searches",
      "Simple, well-defined rotation cases",
      "Maintains sorted order for in-order traversal",
    ],
    disadvantages: [
      "More rotations on insert/delete than red-black trees",
      "Extra height/balance-factor bookkeeping per node",
      "Deletion logic is more involved than insertion",
      "Overhead is wasted if the workload is update-heavy",
    ],
    commonMistakes: [
      "Forgetting to update node heights before checking the balance factor.",
      "Misidentifying the rotation case (e.g. LR vs LL).",
      "Not returning the new subtree root after a rotation, detaching the tree.",
      "Assuming one rotation always suffices for deletion (it can need several).",
    ],
    interviewQuestions: [
      "What is a balance factor and what values are allowed in an AVL tree?",
      "Explain the four rotation cases and which need a double rotation.",
      "Why is one rotation enough after an insertion but not always after a deletion?",
      "How do AVL trees compare with red-black trees in balance and rotation cost?",
      "What is the maximum height of an AVL tree with n nodes?",
    ],
    summary:
      "An AVL tree is a BST that keeps every node's balance factor in {−1, 0, +1} by rotating after inserts and deletes, guaranteeing O(log n) operations. Its four rotation cases (LL, RR, LR, RL) make it more tightly balanced than a red-black tree, favoring lookup-heavy workloads.",
    quiz: [
      { question: "An AVL tree's balance factor for any node must be…", options: ["0 only", "Between −1 and +1", "Between −2 and +2", "Any value"], answer: 1, explanation: "The heights of the two subtrees may differ by at most one." },
      { question: "A Left-Right imbalance is fixed by…", options: ["A single right rotation", "A left rotation then a right rotation", "Recoloring", "No action"], answer: 1, explanation: "LR needs a double rotation: left-rotate the child, then right-rotate the node." },
      { question: "AVL operations are guaranteed to run in…", options: ["O(1)", "O(log n) worst case", "O(n)", "O(n log n)"], answer: 1, explanation: "The height stays logarithmic, bounding all operations." },
      { question: "Compared with red-black trees, AVL trees are…", options: ["Less balanced", "More tightly balanced (faster lookups)", "Not ordered", "Always slower"], answer: 1, explanation: "Stricter balancing means shorter height and faster searches, but more rotations." },
      { question: "A single insertion requires at most…", options: ["No rotations", "One (single or double) rotation", "log n rotations", "n rotations"], answer: 1, explanation: "One rotation restores AVL balance after any single insertion." },
    ],
  },
  inputFields: [
    { key: "values", label: "Values to insert", placeholder: "10, 20, 30, 40, 50", help: "2–20 distinct numbers, inserted in order (watch rotations!)." },
  ],
  defaultInput: (level, rng) => randomInput(level, rng),
  parseInput: (fields) => {
    const values = (fields.values ?? "")
      .split(/[,\s]+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const v = Number(p);
        if (!Number.isInteger(v)) throw new Error(`"${p}" is not a whole number.`);
        return v;
      });
    if (values.length < 2) throw new Error("Enter at least 2 values.");
    if (values.length > 20) throw new Error("Maximum 20 values.");
    if (new Set(values).size !== values.length) throw new Error("Values must be distinct.");
    return { values };
  },
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate,
};

export default mod;
