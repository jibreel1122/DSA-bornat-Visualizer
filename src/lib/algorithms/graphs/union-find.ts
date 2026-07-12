import type { AlgorithmModule, CellState, GraphFrame, Step } from "@/lib/engine/types";
import { circularLayout } from "@/lib/engine/random";

type Input = { n: number; ops: [number, number][] };

function generate(input: Input): Step<GraphFrame>[] {
  const n = input.n;
  const labels = Array.from({ length: n }, (_, i) => String(i));
  const layout = circularLayout(labels);
  const parent = Array.from({ length: n }, (_, i) => i);
  const rank = new Array(n).fill(0);
  const steps: Step<GraphFrame>[] = [];
  let finds = 0;
  let unions = 0;

  const componentCount = () => {
    let c = 0;
    for (let i = 0; i < n; i++) if (parent[i] === i) c++;
    return c;
  };

  const frame = (nodeStates: Record<string, CellState>, description: string, codeLine: number, descriptionAr?: string): void => {
    const edges = [];
    for (let i = 0; i < n; i++) {
      if (parent[i] !== i) edges.push({ from: String(i), to: String(parent[i]) });
    }
    const annotations: Record<string, string> = {};
    for (let i = 0; i < n; i++) if (parent[i] === i) annotations[String(i)] = `root r${rank[i]}`;
    steps.push({
      frame: {
        nodes: labels.map((id) => ({ id, label: id, ...layout[id] })),
        edges,
        directed: true,
        nodeStates: { ...nodeStates },
        nodeAnnotations: annotations,
        aux: [{ label: "components", values: [componentCount()] }],
        note: `disjoint-set forest — arrows point to parents; roots represent sets`,
      },
      description,
      descriptionAr,
      codeLine,
      counters: { finds, unions },
    });
  };

  const find = (x: number, trace: boolean): number => {
    // collect path to root
    const path: number[] = [];
    let cur = x;
    while (parent[cur] !== cur) {
      path.push(cur);
      cur = parent[cur];
    }
    const root = cur;
    if (trace) {
      finds++;
      const st: Record<string, CellState> = { [String(x)]: "active", [String(root)]: "special" };
      for (const p of path) st[String(p)] = "compare";
      frame(st, `find(${x}): follow parent pointers up to the root ${root}.`, 2, `find(${x}): اتبع مؤشرات الأب حتى الجذر ${root}.`);
      // path compression
      if (path.length > 0) {
        for (const node of path) parent[node] = root;
        const st2: Record<string, CellState> = { [String(root)]: "special" };
        for (const p of path) st2[String(p)] = "visited";
        frame(st2, `Path compression: point ${path.join(", ")} directly at root ${root}.`, 3, `ضغط المسار: اجعل ${path.join(", ")} تشير مباشرة إلى الجذر ${root}.`);
      }
    } else {
      for (const node of path) parent[node] = root;
    }
    return root;
  };

  frame({}, `Union-Find (disjoint set union). Every element starts in its own set (it is its own root).`, 0, `اتحاد-بحث (اتحاد المجموعات المنفصلة). يبدأ كل عنصر في مجموعته الخاصة (هو جذر نفسه).`);

  for (const [a, b] of input.ops) {
    frame({ [String(a)]: "active", [String(b)]: "active" }, `union(${a}, ${b}): find the root of each, then link them.`, 5, `union(${a}, ${b}): جِد جذر كل منهما، ثم اربطهما.`);
    const ra = find(a, true);
    const rb = find(b, true);
    if (ra === rb) {
      frame({ [String(ra)]: "discarded" }, `${a} and ${b} already share root ${ra} — already in the same set, nothing to do.`, 6, `${a} و${b} يتشاركان الجذر ${ra} بالفعل — في المجموعة نفسها، لا شيء لفعله.`);
      continue;
    }
    // union by rank
    let root = ra;
    let child = rb;
    if (rank[ra] < rank[rb]) {
      root = rb;
      child = ra;
    }
    parent[child] = root;
    if (rank[ra] === rank[rb]) rank[root]++;
    unions++;
    frame(
      { [String(root)]: "special", [String(child)]: "found" },
      `Attach smaller-rank root ${child} under ${root}${rank[ra] === rank[rb] ? ` and bump ${root}'s rank to ${rank[root]}` : ""}. Sets merged.`,
      7,
      `اربط الجذر الأصغر رتبة ${child} تحت ${root}${rank[ra] === rank[rb] ? ` وارفع رتبة ${root} إلى ${rank[root]}` : ""}. اندمجت المجموعتان.`,
    );
  }

  // color final components
  const finalStates: Record<string, CellState> = {};
  const palette: CellState[] = ["active", "found", "visited", "compare", "special", "sorted"];
  const rootColor = new Map<number, CellState>();
  let ci = 0;
  for (let i = 0; i < n; i++) {
    const r = find(i, false);
    if (!rootColor.has(r)) rootColor.set(r, palette[ci++ % palette.length]);
    finalStates[String(i)] = rootColor.get(r)!;
  }
  frame(finalStates, `Done. ${componentCount()} disjoint set(s) remain; nodes sharing a color are connected.`, 8, `اكتمل. تبقّت ${componentCount()} مجموعة منفصلة؛ العقد المتشاركة في اللون متصلة.`);
  return steps;
}

function randomInput(level: number, rng: { int: (a: number, b: number) => number }): Input {
  const n = Math.min(8, 5 + Math.floor(level / 2));
  const opCount = Math.min(7, 3 + level);
  const ops: [number, number][] = [];
  for (let k = 0; k < opCount; k++) {
    const a = rng.int(0, n - 1);
    let b = rng.int(0, n - 1);
    if (a === b) b = (b + 1) % n;
    ops.push([a, b]);
  }
  return { n, ops };
}

const mod: AlgorithmModule<GraphFrame, Input> = {
  slug: "union-find",
  title: "Union-Find (Disjoint Set Union)",
  titleAr: "اتحاد-بحث (اتحاد المجموعات المنفصلة)",
  category: "graphs",
  difficulty: "Intermediate",
  tags: ["disjoint set", "union by rank", "path compression", "connectivity"],
  tagsAr: ["مجموعة منفصلة", "الاتحاد حسب الرتبة", "ضغط المسار", "الاتصال"],
  summary: "Maintains a partition of elements into disjoint sets with near-constant-time union and find via rank and path compression.",
  summaryAr: "يحافظ على تجزئة العناصر إلى مجموعات منفصلة بعمليتي اتحاد وبحث بزمن شبه ثابت عبر الرتبة وضغط المسار.",
  renderer: "graph",
  pseudocode: [
    "structure DSU(n)",
    "  parent[i] = i;  rank[i] = 0",
    "  find(x):",
    "    if parent[x] != x: parent[x] = find(parent[x])  // compress",
    "    return parent[x]",
    "  union(a, b):",
    "    ra = find(a); rb = find(b); if ra == rb: return",
    "    attach lower-rank root under the higher; tie ⇒ bump rank",
    "  return the disjoint sets",
  ],
  code: {
    pseudocode: `parent[i] = i; rank[i] = 0
find(x): while parent[x] != x: parent[x] = parent[parent[x]]; x = parent[x]
union(a,b): ra=find(a); rb=find(b)
  if rank[ra] < rank[rb]: swap
  parent[rb] = ra; if rank[ra]==rank[rb]: rank[ra]++`,
    c: `int parent[N], rnk[N];
int find(int x){ while(parent[x]!=x){ parent[x]=parent[parent[x]]; x=parent[x]; } return x; }
void unite(int a,int b){
    int ra=find(a), rb=find(b);
    if(ra==rb) return;
    if(rnk[ra]<rnk[rb]){ int t=ra; ra=rb; rb=t; }
    parent[rb]=ra;
    if(rnk[ra]==rnk[rb]) rnk[ra]++;
}`,
    cpp: `struct DSU {
    vector<int> parent, rnk;
    DSU(int n): parent(n), rnk(n, 0) { iota(parent.begin(), parent.end(), 0); }
    int find(int x) { return parent[x] == x ? x : parent[x] = find(parent[x]); }
    void unite(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return;
        if (rnk[ra] < rnk[rb]) swap(ra, rb);
        parent[rb] = ra;
        if (rnk[ra] == rnk[rb]) rnk[ra]++;
    }
};`,
    java: `class DSU {
    int[] parent, rank;
    DSU(int n) { parent = new int[n]; rank = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i; }
    int find(int x) { return parent[x] == x ? x : (parent[x] = find(parent[x])); }
    void union(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return;
        if (rank[ra] < rank[rb]) { int t = ra; ra = rb; rb = t; }
        parent[rb] = ra;
        if (rank[ra] == rank[rb]) rank[ra]++;
    }
}`,
    python: `class DSU:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]  # path halving
            x = self.parent[x]
        return x
    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb: return
        if self.rank[ra] < self.rank[rb]: ra, rb = rb, ra
        self.parent[rb] = ra
        if self.rank[ra] == self.rank[rb]: self.rank[ra] += 1`,
    javascript: `class DSU {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }
  find(x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a, b) {
    let ra = this.find(a), rb = this.find(b);
    if (ra === rb) return;
    if (this.rank[ra] < this.rank[rb]) [ra, rb] = [rb, ra];
    this.parent[rb] = ra;
    if (this.rank[ra] === this.rank[rb]) this.rank[ra]++;
  }
}`,
    typescript: `class DSU {
  parent: number[]; rank: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a: number, b: number): void {
    let ra = this.find(a), rb = this.find(b);
    if (ra === rb) return;
    if (this.rank[ra] < this.rank[rb]) [ra, rb] = [rb, ra];
    this.parent[rb] = ra;
    if (this.rank[ra] === this.rank[rb]) this.rank[ra]++;
  }
}`,
    csharp: `class DSU {
    int[] parent, rank;
    public DSU(int n) { parent = new int[n]; rank = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i; }
    public int Find(int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }
    public void Union(int a, int b) {
        int ra = Find(a), rb = Find(b);
        if (ra == rb) return;
        if (rank[ra] < rank[rb]) (ra, rb) = (rb, ra);
        parent[rb] = ra;
        if (rank[ra] == rank[rb]) rank[ra]++;
    }
}`,
    go: `type DSU struct{ parent, rank []int }
func NewDSU(n int) *DSU {
	d := &DSU{make([]int, n), make([]int, n)}
	for i := range d.parent { d.parent[i] = i }
	return d
}
func (d *DSU) Find(x int) int {
	for d.parent[x] != x {
		d.parent[x] = d.parent[d.parent[x]]
		x = d.parent[x]
	}
	return x
}
func (d *DSU) Union(a, b int) {
	ra, rb := d.Find(a), d.Find(b)
	if ra == rb { return }
	if d.rank[ra] < d.rank[rb] { ra, rb = rb, ra }
	d.parent[rb] = ra
	if d.rank[ra] == d.rank[rb] { d.rank[ra]++ }
}`,
    rust: `struct Dsu { parent: Vec<usize>, rank: Vec<usize> }
impl Dsu {
    fn new(n: usize) -> Self { Dsu { parent: (0..n).collect(), rank: vec![0; n] } }
    fn find(&mut self, x: usize) -> usize {
        if self.parent[x] != x {
            let r = self.find(self.parent[x]);
            self.parent[x] = r;
        }
        self.parent[x]
    }
    fn union(&mut self, a: usize, b: usize) {
        let (mut ra, mut rb) = (self.find(a), self.find(b));
        if ra == rb { return; }
        if self.rank[ra] < self.rank[rb] { std::mem::swap(&mut ra, &mut rb); }
        self.parent[rb] = ra;
        if self.rank[ra] == self.rank[rb] { self.rank[ra] += 1; }
    }
}`,
    kotlin: `class DSU(n: Int) {
    val parent = IntArray(n) { it }
    val rank = IntArray(n)
    fun find(x0: Int): Int {
        var x = x0
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x] }
        return x
    }
    fun union(a: Int, b: Int) {
        var ra = find(a); var rb = find(b)
        if (ra == rb) return
        if (rank[ra] < rank[rb]) { val t = ra; ra = rb; rb = t }
        parent[rb] = ra
        if (rank[ra] == rank[rb]) rank[ra]++
    }
}`,
    swift: `struct DSU {
    var parent: [Int]; var rank: [Int]
    init(_ n: Int) { parent = Array(0..<n); rank = Array(repeating: 0, count: n) }
    mutating func find(_ x0: Int) -> Int {
        var x = x0
        while parent[x] != x { parent[x] = parent[parent[x]]; x = parent[x] }
        return x
    }
    mutating func union(_ a: Int, _ b: Int) {
        var ra = find(a), rb = find(b)
        if ra == rb { return }
        if rank[ra] < rank[rb] { swap(&ra, &rb) }
        parent[rb] = ra
        if rank[ra] == rank[rb] { rank[ra] += 1 }
    }
}`,
  },
  content: {
    overview: `The Union-Find, or Disjoint Set Union (DSU), data structure maintains a collection of elements partitioned into non-overlapping sets and answers two questions blazingly fast: "which set is this element in?" (find) and "merge these two sets" (union). It is the backbone of Kruskal's minimum-spanning-tree algorithm and of any problem about connectivity, grouping, or equivalence classes.

Each set is represented as a tree whose root is the set's canonical representative; every element stores a pointer to its parent, and the root points to itself. find follows parent pointers to the root; union links one root under another. Two optimizations make this nearly O(1): union by rank always hangs the shorter tree under the taller one to keep trees flat, and path compression re-points every node visited during a find directly at the root. Together they give an amortized cost of O(α(n)) per operation, where α is the inverse Ackermann function — effectively a small constant for any practical n.`,
    howItWorks: [
      "Initialize each element as its own parent (n singleton sets) with rank 0.",
      "find(x): walk parent pointers to the root; along the way, compress the path by pointing nodes at the root.",
      "union(a, b): find the roots of a and b; if equal, they are already merged.",
      "Otherwise attach the root of lower rank under the root of higher rank (union by rank).",
      "If both roots have equal rank, pick either as the new root and increment its rank.",
    ],
    complexity: {
      time: { best: "O(α(n)) amortized", average: "O(α(n)) amortized", worst: "O(α(n)) amortized" },
      space: "O(n)",
      notes: "With both union by rank and path compression, m operations cost O(m·α(n)), where α is the inverse Ackermann function (≤ 4 for any realistic n) — effectively constant. Without the optimizations it degrades toward O(log n) or O(n).",
    },
    applications: [
      "Kruskal's minimum spanning tree (cycle detection)",
      "connected components in an undirected graph",
      "network / percolation connectivity and image segmentation",
      "equivalence-class problems and account/friend grouping",
    ],
    advantages: [
      "Near-constant amortized union and find",
      "Very small, simple implementation",
      "Path compression keeps trees flat automatically",
      "Ideal for incremental connectivity queries",
    ],
    disadvantages: [
      "Does not support efficient deletion or splitting of sets",
      "Only answers same-set queries, not the path between elements",
      "Naive versions (no rank/compression) can be slow",
      "Not designed for dynamic disconnection",
    ],
    commonMistakes: [
      "Skipping path compression or union by rank, degrading performance.",
      "Attaching by arbitrary choice instead of by rank/size, creating tall trees.",
      "Comparing elements directly instead of comparing their roots.",
      "Forgetting the already-connected check, wrongly bumping rank.",
    ],
    interviewQuestions: [
      "How do union by rank and path compression each improve performance?",
      "What is the amortized complexity, and what is the inverse Ackermann function?",
      "How does Kruskal's algorithm use Union-Find to detect cycles?",
      "How would you count connected components with a DSU?",
      "Can Union-Find support deletion, and if not, why?",
    ],
    summary:
      "Union-Find maintains disjoint sets with two operations — find (with path compression) and union (by rank) — achieving near-constant O(α(n)) amortized time. It underpins Kruskal's MST and connectivity queries, representing each set as a shallow tree rooted at its representative.",
    quiz: [
      { question: "Union-Find primarily answers which question?", options: ["Shortest path length", "Are two elements in the same set?", "What is the sorted order?", "What is the minimum edge?"], answer: 1, explanation: "It tracks set membership and merges sets efficiently." },
      { question: "Path compression works by…", options: ["Deleting nodes", "Pointing visited nodes directly at the root", "Sorting the tree", "Doubling ranks"], answer: 1, explanation: "It flattens the tree so future finds are faster." },
      { question: "Union by rank attaches…", options: ["The taller tree under the shorter", "The shorter tree under the taller", "Randomly", "Always a under b"], answer: 1, explanation: "Hanging the shorter tree under the taller keeps height minimal." },
      { question: "The amortized time per operation is…", options: ["O(log n)", "O(α(n)) ≈ constant", "O(n)", "O(n log n)"], answer: 1, explanation: "With both optimizations it is inverse-Ackermann, effectively constant." },
      { question: "Union-Find is a core part of which algorithm?", options: ["Dijkstra's", "Kruskal's MST", "Quicksort", "BFS"], answer: 1, explanation: "Kruskal's uses it to detect cycles while adding edges." },
    ],
  },
  contentAr: {
    overview: `يحافظ هيكل بيانات اتحاد-بحث، أو اتحاد المجموعات المنفصلة (DSU)، على مجموعة من العناصر مُجزّأة إلى مجموعات غير متداخلة، ويجيب على سؤالين بسرعة فائقة: "في أي مجموعة يقع هذا العنصر؟" (find) و"ادمج هاتين المجموعتين" (union). إنه العمود الفقري لخوارزمية كروسكال للشجرة الممتدة الصغرى ولأي مسألة عن الاتصال أو التجميع أو أصناف التكافؤ.

تُمثَّل كل مجموعة كشجرة جذرها الممثل القانوني للمجموعة؛ يحمل كل عنصر مؤشرًا إلى أبيه، ويشير الجذر إلى نفسه. تتبع find مؤشرات الأب حتى الجذر؛ وتربط union جذرًا تحت آخر. تحسينان يجعلان هذا شبه O(1): الاتحاد حسب الرتبة يُعلِّق دومًا الشجرة الأقصر تحت الأطول للحفاظ على تسطّح الأشجار، وضغط المسار يعيد توجيه كل عقدة زُيرت أثناء find لتشير مباشرة إلى الجذر. معًا يعطيان تكلفة مطفأة قدرها O(α(n)) لكل عملية، حيث α هي دالة أكرمان العكسية — وهي فعليًا ثابت صغير لأي n عملي.`,
    howItWorks: [
      "هيّئ كل عنصر كأبٍ لنفسه (n مجموعة أحادية) برتبة 0.",
      "find(x): اتبع مؤشرات الأب حتى الجذر؛ وفي الطريق، اضغط المسار بجعل العقد تشير إلى الجذر.",
      "union(a, b): جِد جذري a وb؛ إن تساويا، فهما مندمجان بالفعل.",
      "وإلا اربط الجذر الأقل رتبة تحت الجذر الأعلى رتبة (الاتحاد حسب الرتبة).",
      "إذا تساوى الجذران في الرتبة، اختر أيًا منهما كجذر جديد وزِد رتبته.",
    ],
    complexity: {
      time: { best: "O(α(n)) amortized", average: "O(α(n)) amortized", worst: "O(α(n)) amortized" },
      space: "O(n)",
      notes: "مع الاتحاد حسب الرتبة وضغط المسار معًا، تكلّف m عملية O(m·α(n))، حيث α هي دالة أكرمان العكسية (≤ 4 لأي n واقعي) — فعليًا ثابتة. بدون التحسينات تتدهور نحو O(log n) أو O(n).",
    },
    applications: [
      "الشجرة الممتدة الصغرى لكروسكال (اكتشاف الدورات)",
      "المكوّنات المتصلة في رسم بياني غير موجه",
      "اتصال الشبكة/التسرب وتجزئة الصور",
      "مسائل أصناف التكافؤ وتجميع الحسابات/الأصدقاء",
    ],
    advantages: [
      "اتحاد وبحث بزمن مطفأ شبه ثابت",
      "تنفيذ صغير جدًا وبسيط",
      "ضغط المسار يُبقي الأشجار مسطّحة تلقائيًا",
      "مثالي لاستعلامات الاتصال التزايدية",
    ],
    disadvantages: [
      "لا يدعم حذف أو تقسيم المجموعات بكفاءة",
      "يجيب فقط على استعلامات المجموعة نفسها، لا المسار بين العناصر",
      "النسخ الساذجة (بلا رتبة/ضغط) قد تكون بطيئة",
      "غير مصمم لفصل الاتصال الديناميكي",
    ],
    commonMistakes: [
      "تخطي ضغط المسار أو الاتحاد حسب الرتبة، مما يضر بالأداء.",
      "الربط باختيار اعتباطي بدلًا من الرتبة/الحجم، مما يُنشئ أشجارًا طويلة.",
      "مقارنة العناصر مباشرة بدلًا من مقارنة جذورها.",
      "نسيان فحص الاتصال المسبق، مما يرفع الرتبة خطأً.",
    ],
    interviewQuestions: [
      "كيف يُحسِّن كل من الاتحاد حسب الرتبة وضغط المسار الأداء؟",
      "ما التعقيد المطفأ، وما دالة أكرمان العكسية؟",
      "كيف تستخدم خوارزمية كروسكال اتحاد-بحث لاكتشاف الدورات؟",
      "كيف تعدّ المكوّنات المتصلة باستخدام DSU؟",
      "هل يدعم اتحاد-بحث الحذف، وإن لم يكن، فلماذا؟",
    ],
    summary:
      "يحافظ اتحاد-بحث على مجموعات منفصلة بعمليتين — find (بضغط المسار) وunion (حسب الرتبة) — محققًا زمنًا مطفأً شبه ثابت O(α(n)). إنه أساس شجرة كروسكال الممتدة الصغرى واستعلامات الاتصال، ممثِّلًا كل مجموعة كشجرة ضحلة جذرها ممثِّلها.",
    quiz: [
      { question: "على أي سؤال يجيب اتحاد-بحث بشكل أساسي؟", options: ["طول أقصر مسار", "هل عنصران في المجموعة نفسها؟", "ما الترتيب المرتب؟", "ما أصغر حافة؟"], answer: 1, explanation: "يتتبع عضوية المجموعات ويدمجها بكفاءة." },
      { question: "يعمل ضغط المسار عبر…", options: ["حذف العقد", "جعل العقد المزارة تشير مباشرة إلى الجذر", "ترتيب الشجرة", "مضاعفة الرتب"], answer: 1, explanation: "يُسطِّح الشجرة كي تكون عمليات find المستقبلية أسرع." },
      { question: "الاتحاد حسب الرتبة يربط…", options: ["الشجرة الأطول تحت الأقصر", "الشجرة الأقصر تحت الأطول", "عشوائيًا", "دومًا a تحت b"], answer: 1, explanation: "تعليق الشجرة الأقصر تحت الأطول يُبقي الارتفاع أدنى." },
      { question: "الزمن المطفأ لكل عملية هو…", options: ["O(log n)", "O(α(n)) ≈ ثابت", "O(n)", "O(n log n)"], answer: 1, explanation: "مع التحسينين معًا يكون معكوس أكرمان، أي ثابت فعليًا." },
      { question: "اتحاد-بحث جزء أساسي من أي خوارزمية؟", options: ["دايكسترا", "شجرة كروسكال الممتدة الصغرى", "الترتيب السريع", "BFS"], answer: 1, explanation: "تستخدمه كروسكال لاكتشاف الدورات أثناء إضافة الحواف." },
    ],
  },
  inputFields: [
    { key: "n", label: "Number of elements", placeholder: "6", help: "Elements 0..n-1 (3–20)." },
    { key: "ops", label: "Union operations", placeholder: "0-1, 2-3, 1-3, 4-5", help: "Comma-separated pairs a-b to union (up to 30).", list: true },
  ],
  defaultInput: (level, rng) => randomInput(level, rng),
  parseInput: (fields) => {
    const n = Number((fields.n ?? "").trim());
    if (!Number.isInteger(n) || n < 3 || n > 20) throw new Error("Number of elements must be 3–20.");
    const tokens = (fields.ops ?? "").split(/[,\n;]+/).map((p) => p.trim()).filter(Boolean);
    if (tokens.length < 1) throw new Error("Enter at least one union, e.g. 0-1.");
    if (tokens.length > 30) throw new Error("Maximum 30 union operations.");
    const ops: [number, number][] = tokens.map((t) => {
      const m = t.match(/^(\d+)\s*-\s*(\d+)$/);
      if (!m) throw new Error(`"${t}" is invalid. Use a-b like 0-1.`);
      const a = Number(m[1]);
      const b = Number(m[2]);
      if (a >= n || b >= n) throw new Error(`"${t}" references an element ≥ ${n}.`);
      if (a === b) throw new Error(`"${t}" unions an element with itself.`);
      return [a, b];
    });
    return { n, ops };
  },
  serializeInput: (input) => ({ n: String(input.n), ops: input.ops.map(([a, b]) => `${a}-${b}`).join(", ") }),
  generate,
};

export default mod;
