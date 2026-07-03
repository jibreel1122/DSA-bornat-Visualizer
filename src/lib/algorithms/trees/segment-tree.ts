import type { AlgorithmModule, CellState, Step, TreeFrame, TreeNodeF } from "@/lib/engine/types";

interface Node {
  id: string;
  lo: number;
  hi: number;
  sum: number;
  left: Node | null;
  right: Node | null;
}
type Input = { values: number[]; queryL: number; queryR: number; updateIdx: number; updateVal: number };

function generate(input: Input): Step<TreeFrame>[] {
  const a = [...input.values];
  const n = a.length;
  let idc = 0;
  const steps: Step<TreeFrame>[] = [];
  let ops = 0;
  let root: Node | null = null;

  const toFrame = (states: Record<string, CellState>, description: string, codeLine: number, note: string): void => {
    const nodes: Record<string, TreeNodeF> = {};
    const walk = (nd: Node | null) => {
      if (!nd) return;
      nodes[nd.id] = {
        id: nd.id,
        value: nd.sum,
        left: nd.left?.id ?? null,
        right: nd.right?.id ?? null,
        extra: nd.lo === nd.hi ? `[${nd.lo}]` : `[${nd.lo}..${nd.hi}]`,
      };
      walk(nd.left);
      walk(nd.right);
    };
    walk(root);
    steps.push({
      frame: {
        nodes,
        rootId: root?.id ?? null,
        states: { ...states },
        aux: [{ label: "array", values: a.map((v) => v) }],
        note,
      },
      description,
      codeLine,
      counters: { ops },
    });
  };

  const build = (lo: number, hi: number): Node => {
    const node: Node = { id: `s${idc++}`, lo, hi, sum: 0, left: null, right: null };
    if (lo === hi) {
      node.sum = a[lo];
    } else {
      const mid = (lo + hi) >> 1;
      node.left = build(lo, mid);
      node.right = build(mid + 1, hi);
      node.sum = node.left.sum + node.right.sum;
    }
    return node;
  };

  root = build(0, n - 1);
  ops++;
  toFrame({ [root.id]: "found" }, `Segment tree built over [${a.join(", ")}]. Each node stores the sum of its index range; the root covers the whole array.`, 1, `built (O(n))`);

  // --- range sum query ---
  const L = input.queryL;
  const R = input.queryR;
  const querySteps: string[] = [];
  const query = (node: Node | null, l: number, r: number): number => {
    if (!node || r < node.lo || node.hi < l) {
      if (node) toFrame({ [node.id]: "discarded" }, `Node [${node.lo}..${node.hi}] is outside query [${l}..${r}] → contributes 0.`, 3, `query`);
      return 0;
    }
    if (l <= node.lo && node.hi <= r) {
      toFrame({ [node.id]: "found" }, `Node [${node.lo}..${node.hi}] is fully inside [${l}..${r}] → take its sum ${node.sum}.`, 4, `query`);
      return node.sum;
    }
    toFrame({ [node.id]: "active" }, `Node [${node.lo}..${node.hi}] partially overlaps [${l}..${r}] → recurse into both children.`, 5, `query`);
    ops++;
    return query(node.left, l, r) + query(node.right, l, r);
  };
  toFrame({}, `Range-sum query on [${L}..${R}]: descend, using whole-node sums where a node lies entirely inside the range.`, 2, `query [${L}..${R}]`);
  const result = query(root, L, R);
  toFrame({}, `Sum of indices ${L}..${R} = ${result}. Only O(log n) nodes were visited.`, 6, `query result`);

  // --- point update ---
  const idx = input.updateIdx;
  const val = input.updateVal;
  const delta = val - a[idx];
  a[idx] = val;
  const update = (node: Node): void => {
    if (node.lo === node.hi) {
      node.sum = val;
      toFrame({ [node.id]: "swap" }, `Leaf [${node.lo}] updated to ${val}.`, 8, `update`);
      return;
    }
    const mid = (node.lo + node.hi) >> 1;
    if (idx <= mid) update(node.left!);
    else update(node.right!);
    node.sum = node.left!.sum + node.right!.sum;
    toFrame({ [node.id]: "active" }, `Recompute node [${node.lo}..${node.hi}] sum = ${node.sum} after the change.`, 9, `update`);
  };
  toFrame({}, `Point update: set index ${idx} to ${val} (was ${val - delta}). Update the leaf, then fix sums on the path to the root.`, 7, `update idx ${idx}`);
  ops++;
  update(root);

  const done: Record<string, CellState> = {};
  const markAll = (nd: Node | null) => {
    if (!nd) return;
    done[nd.id] = "found";
    markAll(nd.left);
    markAll(nd.right);
  };
  markAll(root);
  toFrame(done, `Done. Both range queries and point updates run in O(log n) on the segment tree.`, 10, `final`);
  return steps;
}

function randomInput(level: number, rng: { int: (a: number, b: number) => number }): Input {
  const n = Math.min(8, 4 + level);
  const values = Array.from({ length: n }, () => rng.int(1, 20));
  const queryL = rng.int(0, n - 2);
  const queryR = rng.int(queryL, n - 1);
  const updateIdx = rng.int(0, n - 1);
  const updateVal = rng.int(1, 20);
  return { values, queryL, queryR, updateIdx, updateVal };
}

const mod: AlgorithmModule<TreeFrame, Input> = {
  slug: "segment-tree",
  title: "Segment Tree (Range Queries)",
  category: "trees",
  difficulty: "Advanced",
  tags: ["tree", "range query", "point update", "divide and conquer"],
  summary: "Answers range-sum queries and point updates in O(log n) by storing partial sums over a binary tree of index ranges.",
  renderer: "tree",
  pseudocode: [
    "structure SegmentTree(array)",
    "  build(lo, hi): node.sum = build(left) + build(right)",
    "  query(node, l, r):",
    "    if node range outside [l,r]: return 0",
    "    if node range inside [l,r]: return node.sum",
    "    return query(left) + query(right)",
    "  update(node, i, v): fix the leaf, recompute sums upward",
  ],
  code: {
    pseudocode: `build(lo,hi): if lo==hi: sum=a[lo]
  else: sum = build(lo,mid) + build(mid+1,hi)
query(l,r): 0 if outside; sum if inside; else split
update(i,v): set leaf; recompute ancestors`,
    c: `int tree[4*N];
void build(int* a,int node,int lo,int hi){
    if(lo==hi){ tree[node]=a[lo]; return; }
    int mid=(lo+hi)/2;
    build(a,2*node,lo,mid); build(a,2*node+1,mid+1,hi);
    tree[node]=tree[2*node]+tree[2*node+1];
}
int query(int node,int lo,int hi,int l,int r){
    if(r<lo||hi<l) return 0;
    if(l<=lo&&hi<=r) return tree[node];
    int mid=(lo+hi)/2;
    return query(2*node,lo,mid,l,r)+query(2*node+1,mid+1,hi,l,r);
}`,
    cpp: `struct SegTree {
    vector<int> t; int n;
    SegTree(vector<int>& a){ n=a.size(); t.assign(4*n,0); build(a,1,0,n-1); }
    void build(vector<int>& a,int nd,int lo,int hi){
        if(lo==hi){ t[nd]=a[lo]; return; }
        int m=(lo+hi)/2;
        build(a,2*nd,lo,m); build(a,2*nd+1,m+1,hi);
        t[nd]=t[2*nd]+t[2*nd+1];
    }
    int query(int nd,int lo,int hi,int l,int r){
        if(r<lo||hi<l) return 0;
        if(l<=lo&&hi<=r) return t[nd];
        int m=(lo+hi)/2;
        return query(2*nd,lo,m,l,r)+query(2*nd+1,m+1,hi,l,r);
    }
};`,
    java: `class SegTree {
    int[] t; int n;
    SegTree(int[] a){ n=a.length; t=new int[4*n]; build(a,1,0,n-1); }
    void build(int[] a,int nd,int lo,int hi){
        if(lo==hi){ t[nd]=a[lo]; return; }
        int m=(lo+hi)/2;
        build(a,2*nd,lo,m); build(a,2*nd+1,m+1,hi);
        t[nd]=t[2*nd]+t[2*nd+1];
    }
    int query(int nd,int lo,int hi,int l,int r){
        if(r<lo||hi<l) return 0;
        if(l<=lo&&hi<=r) return t[nd];
        int m=(lo+hi)/2;
        return query(2*nd,lo,m,l,r)+query(2*nd+1,m+1,hi,l,r);
    }
}`,
    python: `class SegTree:
    def __init__(self, a):
        self.n = len(a); self.t = [0]*(4*self.n)
        self.build(a, 1, 0, self.n-1)
    def build(self, a, nd, lo, hi):
        if lo == hi: self.t[nd] = a[lo]; return
        m = (lo+hi)//2
        self.build(a, 2*nd, lo, m); self.build(a, 2*nd+1, m+1, hi)
        self.t[nd] = self.t[2*nd] + self.t[2*nd+1]
    def query(self, nd, lo, hi, l, r):
        if r < lo or hi < l: return 0
        if l <= lo and hi <= r: return self.t[nd]
        m = (lo+hi)//2
        return self.query(2*nd, lo, m, l, r) + self.query(2*nd+1, m+1, hi, l, r)`,
    javascript: `class SegTree {
  constructor(a) { this.n = a.length; this.t = new Array(4 * this.n).fill(0); this.build(a, 1, 0, this.n - 1); }
  build(a, nd, lo, hi) {
    if (lo === hi) { this.t[nd] = a[lo]; return; }
    const m = (lo + hi) >> 1;
    this.build(a, 2 * nd, lo, m); this.build(a, 2 * nd + 1, m + 1, hi);
    this.t[nd] = this.t[2 * nd] + this.t[2 * nd + 1];
  }
  query(nd, lo, hi, l, r) {
    if (r < lo || hi < l) return 0;
    if (l <= lo && hi <= r) return this.t[nd];
    const m = (lo + hi) >> 1;
    return this.query(2 * nd, lo, m, l, r) + this.query(2 * nd + 1, m + 1, hi, l, r);
  }
}`,
    typescript: `class SegTree {
  t: number[]; n: number;
  constructor(a: number[]) { this.n = a.length; this.t = new Array(4 * this.n).fill(0); this.build(a, 1, 0, this.n - 1); }
  build(a: number[], nd: number, lo: number, hi: number): void {
    if (lo === hi) { this.t[nd] = a[lo]; return; }
    const m = (lo + hi) >> 1;
    this.build(a, 2 * nd, lo, m); this.build(a, 2 * nd + 1, m + 1, hi);
    this.t[nd] = this.t[2 * nd] + this.t[2 * nd + 1];
  }
  query(nd: number, lo: number, hi: number, l: number, r: number): number {
    if (r < lo || hi < l) return 0;
    if (l <= lo && hi <= r) return this.t[nd];
    const m = (lo + hi) >> 1;
    return this.query(2 * nd, lo, m, l, r) + this.query(2 * nd + 1, m + 1, hi, l, r);
  }
}`,
    csharp: `class SegTree {
    int[] t; int n;
    public SegTree(int[] a){ n=a.Length; t=new int[4*n]; Build(a,1,0,n-1); }
    void Build(int[] a,int nd,int lo,int hi){
        if(lo==hi){ t[nd]=a[lo]; return; }
        int m=(lo+hi)/2;
        Build(a,2*nd,lo,m); Build(a,2*nd+1,m+1,hi);
        t[nd]=t[2*nd]+t[2*nd+1];
    }
    public int Query(int nd,int lo,int hi,int l,int r){
        if(r<lo||hi<l) return 0;
        if(l<=lo&&hi<=r) return t[nd];
        int m=(lo+hi)/2;
        return Query(2*nd,lo,m,l,r)+Query(2*nd+1,m+1,hi,l,r);
    }
}`,
    go: `type SegTree struct{ t []int; n int }
func NewSeg(a []int) *SegTree {
	s := &SegTree{make([]int, 4*len(a)), len(a)}
	s.build(a, 1, 0, s.n-1)
	return s
}
func (s *SegTree) build(a []int, nd, lo, hi int) {
	if lo == hi { s.t[nd] = a[lo]; return }
	m := (lo + hi) / 2
	s.build(a, 2*nd, lo, m); s.build(a, 2*nd+1, m+1, hi)
	s.t[nd] = s.t[2*nd] + s.t[2*nd+1]
}
func (s *SegTree) query(nd, lo, hi, l, r int) int {
	if r < lo || hi < l { return 0 }
	if l <= lo && hi <= r { return s.t[nd] }
	m := (lo + hi) / 2
	return s.query(2*nd, lo, m, l, r) + s.query(2*nd+1, m+1, hi, l, r)
}`,
    rust: `struct SegTree { t: Vec<i64>, n: usize }
impl SegTree {
    fn new(a: &[i64]) -> Self {
        let n = a.len();
        let mut s = SegTree { t: vec![0; 4 * n], n };
        s.build(a, 1, 0, n - 1);
        s
    }
    fn build(&mut self, a: &[i64], nd: usize, lo: usize, hi: usize) {
        if lo == hi { self.t[nd] = a[lo]; return; }
        let m = (lo + hi) / 2;
        self.build(a, 2 * nd, lo, m);
        self.build(a, 2 * nd + 1, m + 1, hi);
        self.t[nd] = self.t[2 * nd] + self.t[2 * nd + 1];
    }
    fn query(&self, nd: usize, lo: usize, hi: usize, l: usize, r: usize) -> i64 {
        if r < lo || hi < l { return 0; }
        if l <= lo && hi <= r { return self.t[nd]; }
        let m = (lo + hi) / 2;
        self.query(2 * nd, lo, m, l, r) + self.query(2 * nd + 1, m + 1, hi, l, r)
    }
}`,
    kotlin: `class SegTree(a: IntArray) {
    val n = a.size
    val t = IntArray(4 * n)
    init { build(a, 1, 0, n - 1) }
    fun build(a: IntArray, nd: Int, lo: Int, hi: Int) {
        if (lo == hi) { t[nd] = a[lo]; return }
        val m = (lo + hi) / 2
        build(a, 2 * nd, lo, m); build(a, 2 * nd + 1, m + 1, hi)
        t[nd] = t[2 * nd] + t[2 * nd + 1]
    }
    fun query(nd: Int, lo: Int, hi: Int, l: Int, r: Int): Int {
        if (r < lo || hi < l) return 0
        if (l <= lo && hi <= r) return t[nd]
        val m = (lo + hi) / 2
        return query(2 * nd, lo, m, l, r) + query(2 * nd + 1, m + 1, hi, l, r)
    }
}`,
    swift: `final class SegTree {
    var t: [Int]; let n: Int
    init(_ a: [Int]) { n = a.count; t = Array(repeating: 0, count: 4 * n); build(a, 1, 0, n - 1) }
    func build(_ a: [Int], _ nd: Int, _ lo: Int, _ hi: Int) {
        if lo == hi { t[nd] = a[lo]; return }
        let m = (lo + hi) / 2
        build(a, 2 * nd, lo, m); build(a, 2 * nd + 1, m + 1, hi)
        t[nd] = t[2 * nd] + t[2 * nd + 1]
    }
    func query(_ nd: Int, _ lo: Int, _ hi: Int, _ l: Int, _ r: Int) -> Int {
        if r < lo || hi < l { return 0 }
        if l <= lo && hi <= r { return t[nd] }
        let m = (lo + hi) / 2
        return query(2 * nd, lo, m, l, r) + query(2 * nd + 1, m + 1, hi, l, r)
    }
}`,
  },
  content: {
    overview: `A segment tree is a binary tree built over an array that answers range queries — such as the sum, minimum, or maximum over any contiguous slice — and supports updates, both in O(log n) time. Each leaf corresponds to one array element, and each internal node stores an aggregate (here, the sum) of the range covered by its two children, so the root covers the entire array.

The magic is that any query range can be decomposed into O(log n) precomputed node ranges. To sum a[l..r], you recurse from the root: if a node's range lies entirely inside [l, r] you take its stored sum wholesale; if it lies entirely outside you ignore it; and only when it partially overlaps do you descend into both children. A point update changes one leaf and then walks back to the root recomputing the affected sums. Segment trees generalize to any associative operation and, with lazy propagation, even support range updates in O(log n).`,
    howItWorks: [
      "Build recursively: a leaf holds one element; an internal node holds the combined value of its two children (root spans the whole array).",
      "For a range query, start at the root and compare each node's range with the query range.",
      "If a node is fully inside the query range, use its stored aggregate directly.",
      "If fully outside, contribute the identity (0 for sums); if partially overlapping, recurse into both children.",
      "For a point update, set the leaf then recompute each ancestor's aggregate up to the root.",
    ],
    complexity: {
      time: { best: "O(log n) query/update", average: "O(log n)", worst: "O(log n)" },
      space: "O(n)",
      notes: "Building is O(n); each query and point update visits O(log n) nodes. The tree uses about 2n–4n nodes. Range updates need lazy propagation to stay O(log n).",
    },
    applications: [
      "range sum / min / max / gcd queries with updates",
      "competitive programming and interval problems",
      "computational geometry (stabbing, sweep-line counts)",
      "frequency and prefix aggregates over mutable arrays",
    ],
    advantages: [
      "O(log n) queries AND updates (unlike static prefix sums)",
      "Works for any associative operation",
      "Supports range updates via lazy propagation",
      "Predictable, balanced O(log n) height",
    ],
    disadvantages: [
      "Uses 2–4× the array size in memory",
      "More complex than a Fenwick/BIT for simple sums",
      "Recursive implementation has constant-factor overhead",
      "Lazy propagation adds significant code complexity",
    ],
    commonMistakes: [
      "Allocating too few tree nodes (use 4n to be safe).",
      "Returning the wrong identity for the operation (0 for sum, +∞ for min).",
      "Mixing up fully-inside vs partial-overlap conditions.",
      "Forgetting to recompute ancestor aggregates after an update.",
    ],
    interviewQuestions: [
      "Why can any range be covered by O(log n) segment-tree nodes?",
      "How does lazy propagation enable O(log n) range updates?",
      "When would you choose a Fenwick tree over a segment tree?",
      "How do you adapt a sum segment tree to min or max queries?",
      "How much memory does a segment tree need and why 4n?",
    ],
    summary:
      "A segment tree stores range aggregates over a binary tree of index intervals, answering range queries and point updates in O(log n) by combining O(log n) fully-covered nodes. It generalizes to any associative operation and, with lazy propagation, to range updates.",
    quiz: [
      { question: "Each internal segment-tree node stores…", options: ["A single array element", "The aggregate over its children's range", "A pointer to the array", "The query result"], answer: 1, explanation: "Internal nodes hold the combined value (e.g. sum) of their subrange." },
      { question: "A range query visits how many nodes?", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], answer: 1, explanation: "Any range decomposes into O(log n) fully-covered nodes." },
      { question: "During a query, a node fully inside the range is…", options: ["Recursed into", "Used directly via its stored aggregate", "Ignored", "Updated"], answer: 1, explanation: "Its precomputed aggregate is taken wholesale — no recursion needed." },
      { question: "After a point update you must…", options: ["Rebuild the whole tree", "Recompute aggregates on the path to the root", "Do nothing", "Sort the array"], answer: 1, explanation: "Only the ancestors of the changed leaf need updating." },
      { question: "Range updates in O(log n) require…", options: ["A hash map", "Lazy propagation", "Sorting", "A second array"], answer: 1, explanation: "Lazy propagation defers child updates until needed." },
    ],
  },
  inputFields: [
    { key: "values", label: "Array values", placeholder: "1, 3, 5, 7, 9, 11", help: "2–8 numbers." },
    { key: "queryL", label: "Query left index", placeholder: "1", help: "0-based." },
    { key: "queryR", label: "Query right index", placeholder: "4", help: "≥ left index." },
    { key: "updateIdx", label: "Update index", placeholder: "2", help: "Index to change." },
    { key: "updateVal", label: "Update value", placeholder: "10", help: "New value at that index." },
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
    if (values.length > 8) throw new Error("Maximum 8 values.");
    const n = values.length;
    const queryL = Number((fields.queryL ?? "0").trim());
    const queryR = Number((fields.queryR ?? String(n - 1)).trim());
    if (!Number.isInteger(queryL) || !Number.isInteger(queryR) || queryL < 0 || queryR >= n || queryL > queryR) {
      throw new Error(`Query range must satisfy 0 ≤ left ≤ right ≤ ${n - 1}.`);
    }
    const updateIdx = Number((fields.updateIdx ?? "0").trim());
    const updateVal = Number((fields.updateVal ?? "0").trim());
    if (!Number.isInteger(updateIdx) || updateIdx < 0 || updateIdx >= n) throw new Error(`Update index must be 0..${n - 1}.`);
    if (!Number.isInteger(updateVal)) throw new Error("Update value must be a whole number.");
    return { values, queryL, queryR, updateIdx, updateVal };
  },
  serializeInput: (input) => ({
    values: input.values.join(", "),
    queryL: String(input.queryL),
    queryR: String(input.queryR),
    updateIdx: String(input.updateIdx),
    updateVal: String(input.updateVal),
  }),
  generate,
};

export default mod;
