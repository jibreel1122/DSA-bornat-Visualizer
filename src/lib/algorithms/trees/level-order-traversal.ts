import type { AlgorithmModule, AuxRow, CellState, Step, TreeFrame, TreeNodeF } from "@/lib/engine/types";

interface Node {
  id: string;
  value: number;
  left: Node | null;
  right: Node | null;
}
type Input = { values: number[] };

function generate(input: Input): Step<TreeFrame>[] {
  let idc = 0;
  let root: Node | null = null;

  // Build a BST from the values (structure makes level-order non-trivial).
  const insert = (v: number) => {
    const node: Node = { id: `n${idc++}`, value: v, left: null, right: null };
    if (!root) {
      root = node;
      return;
    }
    let cur = root;
    while (true) {
      if (v < cur.value) {
        if (!cur.left) {
          cur.left = node;
          return;
        }
        cur = cur.left;
      } else {
        if (!cur.right) {
          cur.right = node;
          return;
        }
        cur = cur.right;
      }
    }
  };
  for (const v of input.values) insert(v);

  const steps: Step<TreeFrame>[] = [];
  let visits = 0;

  const toFrame = (
    states: Record<string, CellState>,
    queue: Node[],
    output: number[],
    description: string,
    codeLine: number,
  ): void => {
    const nodes: Record<string, TreeNodeF> = {};
    const walk = (n: Node | null) => {
      if (!n) return;
      nodes[n.id] = { id: n.id, value: n.value, left: n.left?.id ?? null, right: n.right?.id ?? null };
      walk(n.left);
      walk(n.right);
    };
    walk(root);
    const aux: AuxRow[] = [
      { label: "queue (front → back)", values: queue.length ? queue.map((n) => n.value) : ["∅"] },
      { label: "visit order", values: output.length ? output : ["—"] },
    ];
    steps.push({
      frame: { nodes, rootId: root?.id ?? null, states: { ...states }, aux, note: `breadth-first: process the tree level by level using a FIFO queue` },
      description,
      codeLine,
      counters: { visits },
    });
  };

  const queue: Node[] = [];
  const output: number[] = [];

  toFrame({}, queue, output, `Level-order (BFS) traversal. Start by enqueuing the root, ${root ? (root as Node).value : "null"}.`, 1);
  if (root) {
    queue.push(root);
    toFrame({ [(root as Node).id]: "active" }, queue, output, `Enqueue root ${(root as Node).value}.`, 2);
  }

  while (queue.length > 0) {
    const node = queue.shift()!;
    output.push(node.value);
    visits++;
    const states: Record<string, CellState> = { [node.id]: "found" };
    for (const q of queue) states[q.id] = "active";
    toFrame(states, queue, output, `Dequeue ${node.value} and visit it. Now enqueue its children.`, 4);

    const childStates: Record<string, CellState> = { [node.id]: "visited" };
    if (node.left) {
      queue.push(node.left);
      childStates[node.left.id] = "active";
    }
    if (node.right) {
      queue.push(node.right);
      childStates[node.right.id] = "active";
    }
    for (const q of queue) childStates[q.id] = "active";
    if (node.left || node.right) {
      toFrame(
        childStates,
        queue,
        output,
        `Enqueue ${[node.left?.value, node.right?.value].filter((x) => x !== undefined).join(" and ")} (children of ${node.value}).`,
        6,
      );
    } else {
      toFrame({ [node.id]: "visited", ...Object.fromEntries(queue.map((q) => [q.id, "active" as CellState])) }, queue, output, `${node.value} is a leaf — no children to enqueue.`, 6);
    }
  }

  // final: mark all visited
  const finalStates: Record<string, CellState> = {};
  const markAll = (n: Node | null) => {
    if (!n) return;
    finalStates[n.id] = "found";
    markAll(n.left);
    markAll(n.right);
  };
  markAll(root);
  toFrame(finalStates, queue, output, `Queue empty — traversal complete. Level-order visit order: [${output.join(", ")}].`, 8);
  return steps;
}

function randomInput(level: number, rng: { int: (a: number, b: number) => number; shuffle: <T>(a: readonly T[]) => T[] }): Input {
  const n = Math.min(9, 4 + level);
  const values = rng.shuffle(Array.from({ length: n }, (_, k) => (k + 1) * 5 + rng.int(0, 3)));
  return { values };
}

const mod: AlgorithmModule<TreeFrame, Input> = {
  slug: "level-order-traversal",
  title: "Level-Order Traversal (BFS)",
  category: "trees",
  difficulty: "Beginner",
  tags: ["tree", "bfs", "queue", "traversal"],
  summary: "Visits a binary tree breadth-first, level by level, using a FIFO queue to process nodes in order.",
  renderer: "tree",
  pseudocode: [
    "procedure levelOrder(root)",
    "  if root == null: return",
    "  queue = [root]",
    "  while queue not empty:",
    "    node = queue.dequeue()",
    "    visit(node)",
    "    if node.left:  queue.enqueue(node.left)",
    "    if node.right: queue.enqueue(node.right)",
    "  // nodes are visited top-to-bottom, left-to-right",
  ],
  code: {
    pseudocode: `queue = [root]
while queue not empty:
  node = queue.dequeue()
  visit(node)
  enqueue node.left, node.right (if present)`,
    c: `void levelOrder(Node* root) {
    if (!root) return;
    Node* q[1000]; int head=0, tail=0;
    q[tail++] = root;
    while (head < tail) {
        Node* n = q[head++];
        printf("%d ", n->val);
        if (n->left)  q[tail++] = n->left;
        if (n->right) q[tail++] = n->right;
    }
}`,
    cpp: `void levelOrder(Node* root) {
    if (!root) return;
    queue<Node*> q; q.push(root);
    while (!q.empty()) {
        Node* n = q.front(); q.pop();
        cout << n->val << ' ';
        if (n->left)  q.push(n->left);
        if (n->right) q.push(n->right);
    }
}`,
    java: `void levelOrder(Node root) {
    if (root == null) return;
    Queue<Node> q = new LinkedList<>();
    q.add(root);
    while (!q.isEmpty()) {
        Node n = q.poll();
        System.out.print(n.val + " ");
        if (n.left != null)  q.add(n.left);
        if (n.right != null) q.add(n.right);
    }
}`,
    python: `from collections import deque
def level_order(root):
    if not root: return []
    out, q = [], deque([root])
    while q:
        n = q.popleft()
        out.append(n.val)
        if n.left:  q.append(n.left)
        if n.right: q.append(n.right)
    return out`,
    javascript: `function levelOrder(root) {
  if (!root) return [];
  const out = [], q = [root];
  while (q.length) {
    const n = q.shift();
    out.push(n.val);
    if (n.left)  q.push(n.left);
    if (n.right) q.push(n.right);
  }
  return out;
}`,
    typescript: `function levelOrder(root: Node | null): number[] {
  if (!root) return [];
  const out: number[] = [], q: Node[] = [root];
  while (q.length) {
    const n = q.shift()!;
    out.push(n.val);
    if (n.left)  q.push(n.left);
    if (n.right) q.push(n.right);
  }
  return out;
}`,
    csharp: `void LevelOrder(Node root) {
    if (root == null) return;
    var q = new Queue<Node>();
    q.Enqueue(root);
    while (q.Count > 0) {
        var n = q.Dequeue();
        Console.Write(n.Val + " ");
        if (n.Left != null)  q.Enqueue(n.Left);
        if (n.Right != null) q.Enqueue(n.Right);
    }
}`,
    go: `func levelOrder(root *Node) []int {
	if root == nil { return nil }
	out := []int{}
	q := []*Node{root}
	for len(q) > 0 {
		n := q[0]; q = q[1:]
		out = append(out, n.Val)
		if n.Left != nil  { q = append(q, n.Left) }
		if n.Right != nil { q = append(q, n.Right) }
	}
	return out
}`,
    rust: `use std::collections::VecDeque;
fn level_order(root: Option<Rc<RefCell<Node>>>) -> Vec<i32> {
    let mut out = vec![];
    let mut q = VecDeque::new();
    if let Some(r) = root { q.push_back(r); }
    while let Some(n) = q.pop_front() {
        out.push(n.borrow().val);
        if let Some(l) = n.borrow().left.clone()  { q.push_back(l); }
        if let Some(r) = n.borrow().right.clone() { q.push_back(r); }
    }
    out
}`,
    kotlin: `fun levelOrder(root: Node?): List<Int> {
    if (root == null) return emptyList()
    val out = mutableListOf<Int>()
    val q = ArrayDeque<Node>()
    q.add(root)
    while (q.isNotEmpty()) {
        val n = q.removeFirst()
        out.add(n.value)
        n.left?.let { q.add(it) }
        n.right?.let { q.add(it) }
    }
    return out
}`,
    swift: `func levelOrder(_ root: Node?) -> [Int] {
    guard let root = root else { return [] }
    var out: [Int] = [], q: [Node] = [root], i = 0
    while i < q.count {
        let n = q[i]; i += 1
        out.append(n.value)
        if let l = n.left  { q.append(l) }
        if let r = n.right { q.append(r) }
    }
    return out
}`,
  },
  content: {
    overview: `Level-order traversal — a breadth-first search (BFS) on a tree — visits nodes one depth level at a time: the root first, then all nodes at depth 1 left to right, then depth 2, and so on. Unlike the depth-first traversals (pre/in/post-order) that dive down one branch before backtracking, BFS explores the tree in expanding rings.

The mechanism is a FIFO queue. You enqueue the root, then repeatedly dequeue a node, visit it, and enqueue its children. Because a queue preserves insertion order, nodes come out exactly in level order. Each node is enqueued and dequeued once, so the traversal is O(n) time; the queue can hold up to a full level, so the worst-case space is O(w) where w is the maximum width of the tree (about n/2 for a complete tree).`,
    howItWorks: [
      "If the tree is empty, there is nothing to do.",
      "Enqueue the root node into a FIFO queue.",
      "While the queue is non-empty, dequeue the front node and visit it.",
      "Enqueue that node's left child, then its right child (if they exist).",
      "Repeat; the FIFO order guarantees nodes emerge level by level, left to right.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n)", worst: "O(n)" },
      space: "O(w)",
      notes: "Every node is enqueued and dequeued exactly once → O(n) time. The queue holds at most one level, so space is O(w) where w is the tree's maximum width (up to ~n/2).",
    },
    applications: [
      "printing or serializing a tree level by level",
      "finding the shortest path / minimum depth in an unweighted tree or graph",
      "computing per-level aggregates (e.g. right-side view, level averages)",
      "the general BFS pattern used across graph algorithms",
    ],
    advantages: [
      "Visits nodes in increasing distance from the root",
      "Finds the shallowest matching node first",
      "Simple, iterative — no recursion or explicit stack",
      "Directly generalizes to graph BFS",
    ],
    disadvantages: [
      "Needs O(w) queue space, which can be large for wide trees",
      "Not naturally recursive",
      "Doesn't preserve parent-child nesting like DFS traversals",
    ],
    commonMistakes: [
      "Using a stack (LIFO) instead of a queue, which yields DFS-like order.",
      "Forgetting the empty-tree check before enqueuing the root.",
      "Enqueuing right before left when left-to-right order is required.",
      "Tracking level boundaries incorrectly when per-level grouping is needed.",
    ],
    interviewQuestions: [
      "How do you group the output by level (a list of lists)?",
      "How does BFS find the minimum depth of a binary tree?",
      "What is the maximum queue size during level-order traversal?",
      "How would you produce a zigzag (alternating direction) level order?",
      "How does tree BFS relate to graph BFS?",
    ],
    summary:
      "Level-order traversal visits a tree breadth-first using a FIFO queue: enqueue the root, then repeatedly dequeue a node, visit it, and enqueue its children. It runs in O(n) time and O(w) space and is the tree form of BFS.",
    quiz: [
      { question: "Level-order traversal uses which data structure?", options: ["Stack", "Queue", "Heap", "Hash map"], answer: 1, explanation: "A FIFO queue produces breadth-first order." },
      { question: "The nodes are visited…", options: ["Deepest branch first", "Level by level, top to bottom", "In sorted order", "Randomly"], answer: 1, explanation: "BFS processes one depth level before the next." },
      { question: "Time complexity of level-order traversal is…", options: ["O(log n)", "O(n)", "O(n log n)", "O(n²)"], answer: 1, explanation: "Each node is enqueued and dequeued exactly once." },
      { question: "Replacing the queue with a stack would produce…", options: ["The same order", "A depth-first-like order", "Sorted order", "An error"], answer: 1, explanation: "LIFO ordering changes BFS into a DFS-style traversal." },
      { question: "Worst-case queue space is proportional to…", options: ["Tree height", "Maximum tree width", "Number of leaves only", "Always O(1)"], answer: 1, explanation: "The queue can hold an entire level, i.e. the tree's width." },
    ],
  },
  inputFields: [
    { key: "values", label: "Values (built into a BST)", placeholder: "50, 30, 70, 20, 40, 60, 80", help: "2–9 numbers." },
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
    if (values.length > 9) throw new Error("Maximum 9 values.");
    if (new Set(values).size !== values.length) throw new Error("Values must be distinct for a clean BST.");
    return { values };
  },
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate,
};

export default mod;
