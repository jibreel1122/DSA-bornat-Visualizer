import type { AlgorithmModule, CellState, Step, TreeFrame, TreeNodeF } from "@/lib/engine/types";

interface BSTNode {
  id: string;
  value: number;
  left: BSTNode | null;
  right: BSTNode | null;
}
type Op = { kind: "insert" | "search" | "delete"; value: number };
type Input = { ops: Op[] };

let idc = 0;

function toFrame(root: BSTNode | null, states: Record<string, CellState>, note?: string): TreeFrame {
  const nodes: Record<string, TreeNodeF> = {};
  const walk = (n: BSTNode | null) => {
    if (!n) return;
    nodes[n.id] = { id: n.id, value: n.value, left: n.left?.id ?? null, right: n.right?.id ?? null };
    walk(n.left);
    walk(n.right);
  };
  walk(root);
  return { nodes, rootId: root?.id ?? null, states: { ...states }, note };
}

function generate(input: Input): Step<TreeFrame>[] {
  idc = 0;
  let root: BSTNode | null = null;
  const steps: Step<TreeFrame>[] = [];
  let comparisons = 0;
  let nodeCount = 0;

  const snap = (states: Record<string, CellState>, description: string, codeLine: number, note?: string) => {
    steps.push({ frame: toFrame(root, states, note), description, codeLine, counters: { comparisons, nodes: nodeCount } });
  };

  snap({}, `A binary search tree keeps left < node < right. Let's run the operations.`, 0);

  const insert = (value: number) => {
    if (!root) {
      root = { id: `n${idc++}`, value, left: null, right: null };
      nodeCount++;
      snap({ [root.id]: "found" }, `Tree empty — insert ${value} as the root.`, 2);
      return;
    }
    let cur: BSTNode = root;
    while (true) {
      comparisons++;
      if (value === cur.value) {
        snap({ [cur.id]: "compare" }, `${value} already present — skip (no duplicates).`, 3);
        return;
      }
      if (value < cur.value) {
        snap({ [cur.id]: "compare" }, `${value} < ${cur.value}: go left.`, 4);
        if (!cur.left) {
          cur.left = { id: `n${idc++}`, value, left: null, right: null };
          nodeCount++;
          snap({ [cur.left.id]: "found" }, `Insert ${value} as left child of ${cur.value}.`, 5);
          return;
        }
        cur = cur.left;
      } else {
        snap({ [cur.id]: "compare" }, `${value} > ${cur.value}: go right.`, 6);
        if (!cur.right) {
          cur.right = { id: `n${idc++}`, value, left: null, right: null };
          nodeCount++;
          snap({ [cur.right.id]: "found" }, `Insert ${value} as right child of ${cur.value}.`, 7);
          return;
        }
        cur = cur.right;
      }
    }
  };

  const search = (value: number) => {
    let cur = root;
    while (cur) {
      comparisons++;
      if (value === cur.value) {
        snap({ [cur.id]: "found" }, `Found ${value}!`, 9);
        return;
      }
      snap({ [cur.id]: "compare" }, `${value} ${value < cur.value ? "<" : ">"} ${cur.value}: go ${value < cur.value ? "left" : "right"}.`, 9);
      cur = value < cur.value ? cur.left : cur.right;
    }
    snap({}, `${value} is not in the tree.`, 9);
  };

  const minNode = (n: BSTNode): BSTNode => (n.left ? minNode(n.left) : n);

  const remove = (node: BSTNode | null, value: number): BSTNode | null => {
    if (!node) return null;
    if (value < node.value) node.left = remove(node.left, value);
    else if (value > node.value) node.right = remove(node.right, value);
    else {
      nodeCount--;
      if (!node.left) return node.right;
      if (!node.right) return node.left;
      const succ = minNode(node.right);
      node.value = succ.value;
      nodeCount++; // will be decremented by the recursive delete of successor
      node.right = remove(node.right, succ.value);
    }
    return node;
  };

  for (const op of input.ops) {
    if (op.kind === "insert") {
      snap({}, `Insert ${op.value}.`, 1);
      insert(op.value);
    } else if (op.kind === "search") {
      snap({}, `Search for ${op.value}.`, 8);
      search(op.value);
    } else {
      snap({}, `Delete ${op.value}.`, 10);
      root = remove(root, op.value);
      snap({}, `Deleted ${op.value} (successor promoted if it had two children).`, 11);
    }
  }
  snap({}, `All operations complete. In-order traversal yields sorted values.`, 12);
  return steps;
}

function randomOps(level: number, rng: { int: (a: number, b: number) => number; pick: <T>(a: readonly T[]) => T }): Op[] {
  const count = Math.min(12, 4 + level * 2);
  const values: number[] = [];
  const ops: Op[] = [];
  const used = new Set<number>();
  for (let i = 0; i < count; i++) {
    let v = rng.int(10, 99);
    let guard = 0;
    while (used.has(v) && guard++ < 20) v = rng.int(10, 99);
    used.add(v);
    values.push(v);
    ops.push({ kind: "insert", value: v });
  }
  ops.push({ kind: "search", value: rng.pick(values) });
  if (level >= 3 && values.length > 2) ops.push({ kind: "delete", value: rng.pick(values) });
  return ops;
}

const mod: AlgorithmModule<TreeFrame, Input> = {
  slug: "binary-search-tree",
  title: "Binary Search Tree",
  category: "trees",
  difficulty: "Intermediate",
  tags: ["tree", "ordered", "insert/search/delete"],
  summary: "An ordered tree where left < node < right, giving O(h) search, insertion, and deletion.",
  renderer: "tree",
  pseudocode: [
    "structure BST: left < node < right",
    "insert(v):",
    "  if empty: v is root",
    "  compare with node:",
    "    if v < node: go left",
    "      if no left child: place v here",
    "    if v > node: go right",
    "      if no right child: place v here",
    "search(v): walk left/right by comparison",
    "  found when node.value == v",
    "delete(v): 3 cases —",
    "  leaf: remove; one child: splice;",
    "  two children: replace with in-order successor",
    "// in-order traversal is sorted",
  ],
  code: {
    pseudocode: `insert(node, v):
  if node is null: return Node(v)
  if v < node.value: node.left  = insert(node.left, v)
  elif v > node.value: node.right = insert(node.right, v)
  return node

search(node, v):
  while node:
    if v == node.value: return node
    node = v < node.value ? node.left : node.right
  return null`,
    c: `typedef struct Node { int v; struct Node *l, *r; } Node;
Node* new_node(int v){ Node* n=malloc(sizeof(Node)); n->v=v; n->l=n->r=NULL; return n; }
Node* insert(Node* root, int v){
    if(!root) return new_node(v);
    if(v < root->v) root->l = insert(root->l, v);
    else if(v > root->v) root->r = insert(root->r, v);
    return root;
}
Node* search(Node* root, int v){
    while(root && root->v != v) root = v < root->v ? root->l : root->r;
    return root;
}`,
    cpp: `struct Node { int v; Node *l=nullptr, *r=nullptr; Node(int x):v(x){} };
Node* insert(Node* root, int v) {
    if (!root) return new Node(v);
    if (v < root->v) root->l = insert(root->l, v);
    else if (v > root->v) root->r = insert(root->r, v);
    return root;
}
Node* search(Node* root, int v) {
    while (root && root->v != v) root = v < root->v ? root->l : root->r;
    return root;
}`,
    java: `class Node { int v; Node l, r; Node(int v){ this.v = v; } }
Node insert(Node root, int v) {
    if (root == null) return new Node(v);
    if (v < root.v) root.l = insert(root.l, v);
    else if (v > root.v) root.r = insert(root.r, v);
    return root;
}
Node search(Node root, int v) {
    while (root != null && root.v != v) root = v < root.v ? root.l : root.r;
    return root;
}`,
    python: `class Node:
    def __init__(self, v):
        self.v, self.left, self.right = v, None, None

def insert(root, v):
    if root is None:
        return Node(v)
    if v < root.v:
        root.left = insert(root.left, v)
    elif v > root.v:
        root.right = insert(root.right, v)
    return root

def search(root, v):
    while root and root.v != v:
        root = root.left if v < root.v else root.right
    return root`,
    javascript: `function insert(root, v) {
  if (!root) return { v, left: null, right: null };
  if (v < root.v) root.left = insert(root.left, v);
  else if (v > root.v) root.right = insert(root.right, v);
  return root;
}
function search(root, v) {
  while (root && root.v !== v) root = v < root.v ? root.left : root.right;
  return root;
}`,
    typescript: `interface Node { v: number; left: Node | null; right: Node | null; }
function insert(root: Node | null, v: number): Node {
  if (!root) return { v, left: null, right: null };
  if (v < root.v) root.left = insert(root.left, v);
  else if (v > root.v) root.right = insert(root.right, v);
  return root;
}
function search(root: Node | null, v: number): Node | null {
  while (root && root.v !== v) root = v < root.v ? root.left : root.right;
  return root;
}`,
    csharp: `class Node { public int V; public Node L, R; public Node(int v){ V = v; } }
Node Insert(Node root, int v) {
    if (root == null) return new Node(v);
    if (v < root.V) root.L = Insert(root.L, v);
    else if (v > root.V) root.R = Insert(root.R, v);
    return root;
}
Node Search(Node root, int v) {
    while (root != null && root.V != v) root = v < root.V ? root.L : root.R;
    return root;
}`,
    go: `type Node struct { V int; L, R *Node }
func insert(root *Node, v int) *Node {
	if root == nil { return &Node{V: v} }
	if v < root.V { root.L = insert(root.L, v) } else if v > root.V { root.R = insert(root.R, v) }
	return root
}
func search(root *Node, v int) *Node {
	for root != nil && root.V != v {
		if v < root.V { root = root.L } else { root = root.R }
	}
	return root
}`,
    rust: `struct Node { v: i32, l: Option<Box<Node>>, r: Option<Box<Node>> }
fn insert(root: Option<Box<Node>>, v: i32) -> Option<Box<Node>> {
    match root {
        None => Some(Box::new(Node { v, l: None, r: None })),
        Some(mut n) => {
            if v < n.v { n.l = insert(n.l.take(), v); }
            else if v > n.v { n.r = insert(n.r.take(), v); }
            Some(n)
        }
    }
}`,
    kotlin: `class Node(var v: Int) { var l: Node? = null; var r: Node? = null }
fun insert(root: Node?, v: Int): Node {
    if (root == null) return Node(v)
    if (v < root.v) root.l = insert(root.l, v) else if (v > root.v) root.r = insert(root.r, v)
    return root
}
fun search(root: Node?, v: Int): Node? {
    var n = root
    while (n != null && n.v != v) n = if (v < n.v) n.l else n.r
    return n
}`,
    swift: `final class Node { var v: Int; var l: Node?; var r: Node?; init(_ v: Int){ self.v = v } }
func insert(_ root: Node?, _ v: Int) -> Node {
    guard let root = root else { return Node(v) }
    if v < root.v { root.l = insert(root.l, v) } else if v > root.v { root.r = insert(root.r, v) }
    return root
}
func search(_ root: Node?, _ v: Int) -> Node? {
    var n = root
    while let node = n, node.v != v { n = v < node.v ? node.l : node.r }
    return n
}`,
  },
  content: {
    overview: `A binary search tree (BST) stores keys so that for every node, all keys in its left subtree are smaller and all keys in its right subtree are larger. This ordering invariant lets you find, insert, or delete a key by walking down from the root, choosing left or right at each step — just like binary search, but on a dynamic pointer structure that supports efficient insertion and deletion.

Each operation costs O(h), where h is the height of the tree. For a balanced tree h ≈ log n, but a BST built from already-sorted insertions degenerates into a linked list with h = n. Self-balancing variants (AVL, red-black) exist precisely to keep h logarithmic.`,
    howItWorks: [
      "Search/insert start at the root and compare the target with the current node.",
      "Go left if the target is smaller, right if larger; stop on a match (search) or an empty slot (insert).",
      "Insertion attaches the new key as a leaf at the empty slot where the search ended.",
      "Deletion has three cases: a leaf is removed directly; a node with one child is spliced out; a node with two children is replaced by its in-order successor (smallest key in the right subtree).",
      "An in-order traversal always visits keys in sorted order.",
    ],
    complexity: {
      time: { best: "O(log n)", average: "O(log n)", worst: "O(n)" },
      space: "O(n)",
      notes: "All operations are O(h). Average height is O(log n) for random insertions; worst case O(n) for sorted insertions. Balanced variants guarantee O(log n).",
    },
    applications: [
      "Ordered maps and sets (with balancing) in standard libraries",
      "Range queries and nearest-key lookups",
      "Database indexing (B-trees generalize the idea to disk)",
      "Maintaining a dynamically sorted collection with fast updates",
    ],
    advantages: [
      "O(log n) search, insert, and delete when balanced",
      "In-order traversal yields sorted output for free",
      "Supports predecessor/successor and range queries",
      "Dynamic — grows and shrinks without reallocation",
    ],
    disadvantages: [
      "Degenerates to O(n) if inserted in sorted order (unbalanced)",
      "No O(1) random access by index",
      "Pointer overhead and poor cache locality vs arrays",
      "Requires balancing logic to guarantee performance",
    ],
    commonMistakes: [
      "Not handling duplicate keys consistently (skip, count, or side-convention).",
      "Botching the two-child delete — you must use the in-order successor (or predecessor).",
      "Assuming a BST stays balanced; sorted inserts make it a linked list.",
      "Forgetting to reconnect the parent pointer when splicing out a node.",
    ],
    interviewQuestions: [
      "How do you delete a node with two children, and why the in-order successor?",
      "Why can a BST degrade to O(n), and how do AVL/red-black trees prevent it?",
      "How do you validate that a binary tree is a valid BST?",
      "How would you find the k-th smallest element efficiently?",
      "Describe finding the in-order successor of a given node.",
    ],
    summary:
      "A BST maintains left < node < right, enabling O(h) search, insert, and delete by walking down from the root. Balanced it gives O(log n); built from sorted input it degrades to O(n) — the motivation for self-balancing trees. In-order traversal returns keys sorted.",
    quiz: [
      { question: "In a BST, where are keys smaller than a node stored?", options: ["Right subtree", "Left subtree", "Both subtrees", "The root only"], answer: 1, explanation: "The BST invariant places smaller keys in the left subtree, larger in the right." },
      { question: "What is the worst-case time for BST search?", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], answer: 2, explanation: "A tree built from sorted inserts becomes a chain of height n." },
      { question: "Deleting a node with two children replaces it with its…", options: ["parent", "left child", "in-order successor or predecessor", "root"], answer: 2, explanation: "The in-order successor (min of the right subtree) preserves the ordering invariant." },
      { question: "An in-order traversal of a BST visits keys in what order?", options: ["Random", "Sorted ascending", "Level by level", "Reverse insertion"], answer: 1, explanation: "Left–node–right ordering yields ascending sorted keys." },
      { question: "Why do AVL and red-black trees exist?", options: ["To store more data", "To keep height O(log n) and avoid the O(n) worst case", "To allow duplicates", "To use less memory"], answer: 1, explanation: "They rebalance on updates to guarantee logarithmic height." },
    ],
  },
  inputFields: [
    {
      key: "ops",
      label: "Operations",
      placeholder: "insert 50, insert 30, insert 70, search 30, delete 50",
      help: "Comma-separated: insert N, search N, delete N.",
    },
  ],
  defaultInput: (level, rng) => ({ ops: randomOps(level, rng) }),
  parseInput: (fields) => {
    const parts = (fields.ops ?? "").split(/[,\n]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) throw new Error("Enter at least one operation, e.g. insert 50.");
    if (parts.length > 24) throw new Error("Maximum 24 operations.");
    const ops: Op[] = parts.map((p) => {
      const m = p.match(/^(insert|search|delete)\s+(-?\d+)$/i);
      if (!m) throw new Error(`"${p}" is invalid. Use: insert 50, search 30, or delete 70.`);
      return { kind: m[1].toLowerCase() as Op["kind"], value: Number(m[2]) };
    });
    return { ops };
  },
  serializeInput: (input) => ({ ops: input.ops.map((o) => `${o.kind} ${o.value}`).join(", ") }),
  generate,
};

export default mod;
