import type { AlgorithmModule, CellState, Step, TreeFrame, TreeNodeF } from "@/lib/engine/types";

const T = 2; // minimum degree → up to 2T-1 = 3 keys, 2T = 4 children (a 2-3-4 tree)
const MAX_KEYS = 2 * T - 1;

interface BNode {
  id: string;
  keys: number[];
  children: BNode[];
  leaf: boolean;
}
type Input = { values: number[] };

function generate(input: Input): Step<TreeFrame>[] {
  let idc = 0;
  const mk = (leaf: boolean): BNode => ({ id: `b${idc++}`, keys: [], children: [], leaf });
  let root: BNode = mk(true);
  const steps: Step<TreeFrame>[] = [];
  let splits = 0;
  let inserts = 0;

  const toFrame = (states: Record<string, CellState>, description: string, codeLine: number, note: string): void => {
    const nodes: Record<string, TreeNodeF> = {};
    const walk = (n: BNode) => {
      nodes[n.id] = {
        id: n.id,
        value: n.keys.join(" | "),
        children: n.children.map((c) => c.id),
      };
      n.children.forEach(walk);
    };
    walk(root);
    steps.push({
      frame: { nodes, rootId: root.id, states: { ...states }, note },
      description,
      codeLine,
      counters: { inserts, splits },
    });
  };

  toFrame({ [root.id]: "active" }, `A B-tree keeps keys sorted inside nodes that hold up to ${MAX_KEYS} keys (min degree t=${T}). Full children are split before we descend, so the tree grows upward and stays balanced.`, 0, `empty B-tree (t=${T})`);

  const splitChild = (parent: BNode, i: number) => {
    const child = parent.children[i];
    const z = mk(child.leaf);
    const mid = T - 1;
    const upKey = child.keys[mid];
    z.keys = child.keys.slice(mid + 1);
    child.keys = child.keys.slice(0, mid);
    if (!child.leaf) {
      z.children = child.children.slice(T);
      child.children = child.children.slice(0, T);
    }
    parent.keys.splice(i, 0, upKey);
    parent.children.splice(i + 1, 0, z);
    splits++;
    toFrame({ [parent.id]: "special", [child.id]: "swap", [z.id]: "found" }, `Split full node [${[...child.keys, upKey, ...z.keys].join(", ")}]: push median ${upKey} up to the parent, keep the rest in two children.`, 6, `split`);
  };

  const insertNonFull = (node: BNode, k: number) => {
    let i = node.keys.length - 1;
    if (node.leaf) {
      while (i >= 0 && k < node.keys[i]) i--;
      node.keys.splice(i + 1, 0, k);
      toFrame({ [node.id]: "found" }, `Insert ${k} into leaf → [${node.keys.join(", ")}].`, 5, `insert ${k}`);
    } else {
      while (i >= 0 && k < node.keys[i]) i--;
      i++;
      toFrame({ [node.id]: "compare", [node.children[i].id]: "active" }, `${k}: descend into child ${i + 1} of node [${node.keys.join(", ")}].`, 6, `insert ${k}`);
      if (node.children[i].keys.length === MAX_KEYS) {
        splitChild(node, i);
        if (k > node.keys[i]) i++;
      }
      insertNonFull(node.children[i], k);
    }
  };

  const insert = (k: number) => {
    inserts++;
    if (root.keys.length === MAX_KEYS) {
      const s = mk(false);
      s.children = [root];
      root = s;
      toFrame({ [s.id]: "active" }, `Root is full — grow the tree: make a new empty root above the old one, then split.`, 2, `insert ${k}`);
      splitChild(s, 0);
      insertNonFull(s, k);
    } else {
      insertNonFull(root, k);
    }
  };

  for (const v of input.values) insert(v);

  const done: Record<string, CellState> = {};
  const markAll = (n: BNode) => {
    done[n.id] = "found";
    n.children.forEach(markAll);
  };
  markAll(root);
  const height = (() => {
    let h = 1;
    let n = root;
    while (!n.leaf) {
      h++;
      n = n.children[0];
    }
    return h;
  })();
  toFrame(done, `Done. All keys inserted; the B-tree has height ${height} and every leaf is at the same depth — searches are O(log n).`, 7, `final B-tree`);
  return steps;
}

function randomInput(level: number, rng: { shuffle: <T>(a: readonly T[]) => T[] }): Input {
  const n = Math.min(10, 5 + level);
  return { values: rng.shuffle(Array.from({ length: n }, (_, k) => (k + 1) * 5)) };
}

const mod: AlgorithmModule<TreeFrame, Input> = {
  slug: "b-tree",
  title: "B-Tree",
  category: "trees",
  difficulty: "Advanced",
  tags: ["tree", "balanced", "multiway", "database index"],
  summary: "A balanced multiway search tree where nodes hold many keys and split when full, keeping all leaves at the same depth.",
  renderer: "tree",
  pseudocode: [
    "procedure insert(key)",
    "  if root is full:",
    "    grow a new root and split the old root",
    "  insertNonFull(root, key)",
    "procedure insertNonFull(node, key)",
    "  if node is a leaf: put key in sorted order",
    "  else: find child; if child full: splitChild; descend",
    "  // every leaf remains at the same depth",
  ],
  code: {
    pseudocode: `insert(key):
  if len(root.keys) == 2t-1: newRoot; splitChild(newRoot,0)
  insertNonFull(root, key)
insertNonFull(node, key):
  if leaf: insert key sorted
  else: i = child index; if full: splitChild(node,i); descend`,
    c: `void insertNonFull(Node* x, int k) {
    int i = x->n - 1;
    if (x->leaf) {
        while (i >= 0 && k < x->keys[i]) { x->keys[i+1] = x->keys[i]; i--; }
        x->keys[i+1] = k; x->n++;
    } else {
        while (i >= 0 && k < x->keys[i]) i--;
        i++;
        if (x->child[i]->n == 2*T-1) { splitChild(x, i); if (k > x->keys[i]) i++; }
        insertNonFull(x->child[i], k);
    }
}`,
    cpp: `void insertNonFull(Node* x, int k) {
    int i = x->keys.size() - 1;
    if (x->leaf) {
        x->keys.push_back(0);
        while (i >= 0 && k < x->keys[i]) { x->keys[i+1] = x->keys[i]; i--; }
        x->keys[i+1] = k;
    } else {
        while (i >= 0 && k < x->keys[i]) i--;
        i++;
        if (x->child[i]->keys.size() == 2*T-1) { splitChild(x, i); if (k > x->keys[i]) i++; }
        insertNonFull(x->child[i], k);
    }
}`,
    java: `void insertNonFull(Node x, int k) {
    int i = x.n - 1;
    if (x.leaf) {
        while (i >= 0 && k < x.keys[i]) { x.keys[i+1] = x.keys[i]; i--; }
        x.keys[i+1] = k; x.n++;
    } else {
        while (i >= 0 && k < x.keys[i]) i--;
        i++;
        if (x.child[i].n == 2*T-1) { splitChild(x, i); if (k > x.keys[i]) i++; }
        insertNonFull(x.child[i], k);
    }
}`,
    python: `def insert_non_full(x, k):
    i = len(x.keys) - 1
    if x.leaf:
        x.keys.append(0)
        while i >= 0 and k < x.keys[i]:
            x.keys[i+1] = x.keys[i]; i -= 1
        x.keys[i+1] = k
    else:
        while i >= 0 and k < x.keys[i]: i -= 1
        i += 1
        if len(x.child[i].keys) == 2*T - 1:
            split_child(x, i)
            if k > x.keys[i]: i += 1
        insert_non_full(x.child[i], k)`,
    javascript: `function insertNonFull(x, k) {
  let i = x.keys.length - 1;
  if (x.leaf) {
    while (i >= 0 && k < x.keys[i]) i--;
    x.keys.splice(i + 1, 0, k);
  } else {
    while (i >= 0 && k < x.keys[i]) i--;
    i++;
    if (x.child[i].keys.length === 2 * T - 1) { splitChild(x, i); if (k > x.keys[i]) i++; }
    insertNonFull(x.child[i], k);
  }
}`,
    typescript: `function insertNonFull(x: Node, k: number): void {
  let i = x.keys.length - 1;
  if (x.leaf) {
    while (i >= 0 && k < x.keys[i]) i--;
    x.keys.splice(i + 1, 0, k);
  } else {
    while (i >= 0 && k < x.keys[i]) i--;
    i++;
    if (x.child[i].keys.length === 2 * T - 1) { splitChild(x, i); if (k > x.keys[i]) i++; }
    insertNonFull(x.child[i], k);
  }
}`,
    csharp: `void InsertNonFull(Node x, int k) {
    int i = x.N - 1;
    if (x.Leaf) {
        while (i >= 0 && k < x.Keys[i]) { x.Keys[i+1] = x.Keys[i]; i--; }
        x.Keys[i+1] = k; x.N++;
    } else {
        while (i >= 0 && k < x.Keys[i]) i--;
        i++;
        if (x.Child[i].N == 2*T-1) { SplitChild(x, i); if (k > x.Keys[i]) i++; }
        InsertNonFull(x.Child[i], k);
    }
}`,
    go: `func insertNonFull(x *Node, k int) {
	i := len(x.keys) - 1
	if x.leaf {
		x.keys = append(x.keys, 0)
		for i >= 0 && k < x.keys[i] { x.keys[i+1] = x.keys[i]; i-- }
		x.keys[i+1] = k
	} else {
		for i >= 0 && k < x.keys[i] { i-- }
		i++
		if len(x.child[i].keys) == 2*T-1 { splitChild(x, i); if k > x.keys[i] { i++ } }
		insertNonFull(x.child[i], k)
	}
}`,
    rust: `fn insert_non_full(x: &mut Node, k: i32) {
    let mut i = x.keys.len() as i32 - 1;
    if x.leaf {
        while i >= 0 && k < x.keys[i as usize] { i -= 1; }
        x.keys.insert((i + 1) as usize, k);
    } else {
        while i >= 0 && k < x.keys[i as usize] { i -= 1; }
        let mut ci = (i + 1) as usize;
        if x.child[ci].keys.len() == 2 * T - 1 {
            split_child(x, ci);
            if k > x.keys[ci] { ci += 1; }
        }
        insert_non_full(&mut x.child[ci], k);
    }
}`,
    kotlin: `fun insertNonFull(x: Node, k: Int) {
    var i = x.keys.size - 1
    if (x.leaf) {
        while (i >= 0 && k < x.keys[i]) i--
        x.keys.add(i + 1, k)
    } else {
        while (i >= 0 && k < x.keys[i]) i--
        i++
        if (x.child[i].keys.size == 2 * T - 1) { splitChild(x, i); if (k > x.keys[i]) i++ }
        insertNonFull(x.child[i], k)
    }
}`,
    swift: `func insertNonFull(_ x: Node, _ k: Int) {
    var i = x.keys.count - 1
    if x.leaf {
        while i >= 0 && k < x.keys[i] { i -= 1 }
        x.keys.insert(k, at: i + 1)
    } else {
        while i >= 0 && k < x.keys[i] { i -= 1 }
        i += 1
        if x.child[i].keys.count == 2 * T - 1 { splitChild(x, i); if k > x.keys[i] { i += 1 } }
        insertNonFull(x.child[i], k)
    }
}`,
  },
  content: {
    overview: `A B-tree is a balanced search tree generalized so that each node can hold many keys and have many children, rather than just one key and two children. It is the workhorse of databases and file systems: because a single node can be sized to match a disk block or memory page, a B-tree of height 3–4 can index millions of records with only a handful of disk reads. Every leaf sits at exactly the same depth, so performance is uniform.

A B-tree of minimum degree t requires each non-root node to hold between t−1 and 2t−1 keys (this visualization uses t=2, a "2-3-4 tree" with 1–3 keys per node). Keys within a node stay sorted, and a node with k keys has k+1 children whose key ranges interleave with the keys. Insertion uses a clever proactive strategy: while descending toward the correct leaf, any full child (2t−1 keys) encountered is split first — its median key moves up into the parent and the node divides into two. This keeps every node on the path non-full, so a single downward pass suffices and the tree grows in height only by splitting the root. All operations are O(log n) with a very small base.`,
    howItWorks: [
      "Each node holds up to 2t−1 sorted keys and up to 2t children; all leaves are at the same depth.",
      "To insert, if the root is full, create a new root and split the old one — this is the only way height increases.",
      "Descend toward the target leaf; before entering a full child, split it, pushing its median key up.",
      "Because splits happen on the way down, the leaf you reach is guaranteed non-full.",
      "Insert the key into that leaf in sorted position.",
    ],
    complexity: {
      time: { best: "O(log n)", average: "O(log n)", worst: "O(log n)" },
      space: "O(n)",
      notes: "Height is O(log_t n), so search/insert/delete are O(t·log_t n) comparisons — very shallow for large t. B-trees minimize disk/page accesses, which is why databases and filesystems use them (and the B+ tree variant).",
    },
    applications: [
      "database indexes (B-tree and B+ tree)",
      "filesystem metadata (NTFS, HFS+, ext4, Btrfs)",
      "key-value stores and on-disk ordered maps",
      "any large ordered index kept on block storage",
    ],
    advantages: [
      "Very shallow height → few disk/page accesses",
      "Node size tunable to the storage block size",
      "All leaves at equal depth → uniform performance",
      "Efficient range scans and ordered iteration",
    ],
    disadvantages: [
      "More complex than a binary BST to implement",
      "Nodes may be partially full, wasting some space",
      "In-memory it can be slower than a binary balanced tree",
      "Deletion with rebalancing (merge/borrow) is intricate",
    ],
    commonMistakes: [
      "Splitting reactively after overflow instead of proactively on the way down.",
      "Forgetting that only a root split increases the tree's height.",
      "Miscomputing the median index when splitting (t−1).",
      "Allowing a node to exceed 2t−1 keys before splitting.",
    ],
    interviewQuestions: [
      "Why are B-trees preferred over binary search trees for on-disk indexes?",
      "What is the minimum degree t and how does it bound keys per node?",
      "Why split full nodes proactively during a top-down insert?",
      "How does a B+ tree differ from a B-tree?",
      "How does node size relate to the disk block size?",
    ],
    summary:
      "A B-tree is a balanced multiway search tree whose nodes hold up to 2t−1 sorted keys and split when full, keeping all leaves at equal depth and the height O(log_t n). By matching node size to a disk block, B-trees (and B+ trees) minimize I/O and underpin databases and filesystems.",
    quiz: [
      { question: "A B-tree node can hold…", options: ["Exactly one key", "Up to 2t−1 sorted keys", "Only two keys", "Unlimited keys"], answer: 1, explanation: "Minimum degree t allows between t−1 and 2t−1 keys per node." },
      { question: "In a B-tree, all leaves are…", options: ["At random depths", "At the same depth", "Always empty", "Colored"], answer: 1, explanation: "Balanced growth keeps every leaf at equal depth." },
      { question: "During top-down insertion, a full child is…", options: ["Left alone", "Split before descending into it", "Deleted", "Merged"], answer: 1, explanation: "Proactive splitting keeps the path non-full for a single pass." },
      { question: "A B-tree's height increases only when…", options: ["Any node splits", "The root splits", "A leaf fills", "A key is deleted"], answer: 1, explanation: "Splitting the root adds a level; other splits don't." },
      { question: "B-trees are favored for disk storage because…", options: ["They are binary", "Their shallow height minimizes block/disk accesses", "They need no balancing", "They store no keys"], answer: 1, explanation: "High fan-out means very few I/O operations per lookup." },
    ],
  },
  inputFields: [
    { key: "values", label: "Keys to insert", placeholder: "10, 20, 5, 6, 12, 30, 7, 17", help: "3–30 distinct numbers, inserted in order (watch nodes split)." },
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
    if (values.length < 3) throw new Error("Enter at least 3 keys.");
    if (values.length > 30) throw new Error("Maximum 30 keys.");
    if (new Set(values).size !== values.length) throw new Error("Keys must be distinct.");
    return { values };
  },
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate,
};

export default mod;
