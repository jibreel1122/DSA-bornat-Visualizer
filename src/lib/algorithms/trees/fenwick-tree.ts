import type { AlgorithmModule, ArrayFrame, CellState, Step } from "@/lib/engine/types";

type Input = { values: number[]; queryIdx: number; updateIdx: number; updateDelta: number };

function generate(input: Input): Step<ArrayFrame>[] {
  const a = input.values; // conceptually 1-indexed a[1..n]
  const n = a.length;
  const bit = new Array(n + 1).fill(0); // bit[0] unused
  const steps: Step<ArrayFrame>[] = [];
  let ops = 0;

  const lowbit = (i: number) => i & -i;

  const frame = (
    path: Set<number>,
    active: number | null,
    description: string,
    codeLine: number,
    note: string,
    descriptionAr?: string,
  ): void => {
    const states: Record<number, CellState> = { 0: "discarded" };
    for (const p of path) states[p] = "compare";
    if (active !== null) states[active] = "active";
    const pointers = active !== null ? [{ index: active, label: `i=${active}` }] : [];
    steps.push({
      frame: {
        values: bit.map((v) => v),
        states,
        pointers,
        aux: [
          { label: "original a[1..n]", values: ["-", ...a] },
          active !== null ? { label: "low bit (i & −i)", values: [lowbit(active)] } : { label: "low bit", values: ["—"] },
        ],
        note,
      },
      description,
      descriptionAr,
      codeLine,
      counters: { ops },
    });
  };

  frame(
    new Set(),
    null,
    `A Fenwick tree (Binary Indexed Tree) stores partial sums so prefix-sums and updates are both O(log n). Index i covers the range (i − lowbit(i), i].`,
    0,
    `bit[] all zero`,
    `شجرة فينويك (الشجرة الثنائية المفهرسة) تخزّن مجاميع جزئية كي يكون كل من مجاميع البادئة والتحديثات O(log n). الفهرس i يغطي المجال (i − lowbit(i), i].`,
  );

  // --- build via point updates ---
  for (let i = 1; i <= n; i++) {
    let j = i;
    const path = new Set<number>();
    while (j <= n) {
      bit[j] += a[i - 1];
      path.add(j);
      j += lowbit(j);
    }
    ops++;
    frame(
      path,
      i,
      `Build: add a[${i}] = ${a[i - 1]} into bit[${[...path].join(", ")}] (each responsible for index ${i}).`,
      2,
      `build (O(n log n))`,
      `البناء: أضف a[${i}] = ${a[i - 1]} إلى bit[${[...path].join(", ")}] (كل منها مسؤول عن الفهرس ${i}).`,
    );
  }
  frame(new Set(), null, `Fenwick tree built. Each bit[i] holds the sum of a range of size lowbit(i) ending at i.`, 0, `built`, `بُنيت شجرة فينويك. كل bit[i] يحمل مجموع مجال بحجم lowbit(i) ينتهي عند i.`);

  // --- prefix sum query ---
  const qi = input.queryIdx;
  let sum = 0;
  let i = qi;
  const qpath = new Set<number>();
  frame(new Set(), qi, `prefixSum(${qi}): sum a[1..${qi}] by hopping down via i −= lowbit(i).`, 3, `query`, `prefixSum(${qi}): اجمع a[1..${qi}] بالقفز نزولًا عبر i −= lowbit(i).`);
  while (i > 0) {
    sum += bit[i];
    qpath.add(i);
    frame(
      new Set(qpath),
      i,
      `Add bit[${i}] = ${bit[i]} (running sum ${sum}). Next: ${i} − ${lowbit(i)} = ${i - lowbit(i)}.`,
      5,
      `query`,
      `أضف bit[${i}] = ${bit[i]} (المجموع الجاري ${sum}). التالي: ${i} − ${lowbit(i)} = ${i - lowbit(i)}.`,
    );
    i -= lowbit(i);
    ops++;
  }
  frame(new Set(qpath), null, `prefixSum(${qi}) = ${sum}. Only ${qpath.size} node(s) visited — O(log n).`, 6, `query result`, `prefixSum(${qi}) = ${sum}. زُرت فقط ${qpath.size} عقدة — O(log n).`);

  // --- point update ---
  const ui = input.updateIdx;
  const delta = input.updateDelta;
  let k = ui;
  const upath = new Set<number>();
  frame(new Set(), ui, `update(${ui}, +${delta}): add ${delta} to a[${ui}], climbing via i += lowbit(i).`, 1, `update`, `update(${ui}, +${delta}): أضف ${delta} إلى a[${ui}]، متسلقًا عبر i += lowbit(i).`);
  while (k <= n) {
    bit[k] += delta;
    upath.add(k);
    frame(
      new Set(upath),
      k,
      `Add ${delta} to bit[${k}] → ${bit[k]}. Next: ${k} + ${lowbit(k)} = ${k + lowbit(k)}.`,
      2,
      `update`,
      `أضف ${delta} إلى bit[${k}] ← ${bit[k]}. التالي: ${k} + ${lowbit(k)} = ${k + lowbit(k)}.`,
    );
    k += lowbit(k);
    ops++;
  }
  frame(new Set(upath), null, `Update complete — every bit[] responsible for index ${ui} was adjusted in O(log n).`, 0, `done`, `اكتمل التحديث — عُدِّل كل bit[] مسؤول عن الفهرس ${ui} بزمن O(log n).`);
  return steps;
}

function randomInput(level: number, rng: { int: (a: number, b: number) => number }): Input {
  const n = Math.min(8, 4 + level);
  const values = Array.from({ length: n }, () => rng.int(1, 15));
  const queryIdx = rng.int(2, n);
  const updateIdx = rng.int(1, n);
  const updateDelta = rng.int(1, 10);
  return { values, queryIdx, updateIdx, updateDelta };
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "fenwick-tree",
  title: "Fenwick Tree (Binary Indexed Tree)",
  titleAr: "شجرة فينويك (الشجرة الثنائية المفهرسة)",
  category: "trees",
  difficulty: "Advanced",
  tags: ["BIT", "prefix sum", "bit manipulation", "range query"],
  tagsAr: ["BIT", "مجموع البادئة", "معالجة البتات", "استعلام مجال"],
  summary: "A compact array that answers prefix-sum queries and point updates in O(log n) using the low-bit trick i & −i.",
  summaryAr: "مصفوفة مدمجة تُجيب عن استعلامات مجموع البادئة والتحديثات النقطية بزمن O(log n) باستخدام حيلة البت الأدنى i & −i.",
  renderer: "array",
  pseudocode: [
    "structure Fenwick(n)  // 1-indexed bit[]",
    "  update(i, delta):",
    "    while i <= n: bit[i] += delta; i += i & (-i)",
    "  prefixSum(i):",
    "    s = 0",
    "    while i > 0: s += bit[i]; i -= i & (-i)",
    "    return s",
    "  rangeSum(l, r) = prefixSum(r) − prefixSum(l−1)",
  ],
  code: {
    pseudocode: `update(i, d): while i<=n: bit[i]+=d; i += i&(-i)
prefixSum(i): s=0; while i>0: s+=bit[i]; i -= i&(-i); return s
rangeSum(l,r) = prefixSum(r) - prefixSum(l-1)`,
    c: `int bit[N+1];
void update(int i,int delta,int n){
    for(; i<=n; i += i & (-i)) bit[i]+=delta;
}
int prefixSum(int i){
    int s=0;
    for(; i>0; i -= i & (-i)) s+=bit[i];
    return s;
}`,
    cpp: `struct Fenwick {
    vector<long long> bit; int n;
    Fenwick(int n): bit(n+1,0), n(n) {}
    void update(int i,long long d){ for(; i<=n; i += i & -i) bit[i]+=d; }
    long long prefix(int i){ long long s=0; for(; i>0; i -= i & -i) s+=bit[i]; return s; }
    long long range(int l,int r){ return prefix(r)-prefix(l-1); }
};`,
    java: `class Fenwick {
    long[] bit; int n;
    Fenwick(int n){ this.n=n; bit=new long[n+1]; }
    void update(int i,long d){ for(; i<=n; i += i & -i) bit[i]+=d; }
    long prefix(int i){ long s=0; for(; i>0; i -= i & -i) s+=bit[i]; return s; }
    long range(int l,int r){ return prefix(r)-prefix(l-1); }
}`,
    python: `class Fenwick:
    def __init__(self, n):
        self.n = n; self.bit = [0]*(n+1)
    def update(self, i, delta):
        while i <= self.n:
            self.bit[i] += delta; i += i & (-i)
    def prefix(self, i):
        s = 0
        while i > 0:
            s += self.bit[i]; i -= i & (-i)
        return s
    def range(self, l, r):
        return self.prefix(r) - self.prefix(l-1)`,
    javascript: `class Fenwick {
  constructor(n) { this.n = n; this.bit = new Array(n + 1).fill(0); }
  update(i, delta) { for (; i <= this.n; i += i & -i) this.bit[i] += delta; }
  prefix(i) { let s = 0; for (; i > 0; i -= i & -i) s += this.bit[i]; return s; }
  range(l, r) { return this.prefix(r) - this.prefix(l - 1); }
}`,
    typescript: `class Fenwick {
  bit: number[]; n: number;
  constructor(n: number) { this.n = n; this.bit = new Array(n + 1).fill(0); }
  update(i: number, delta: number): void { for (; i <= this.n; i += i & -i) this.bit[i] += delta; }
  prefix(i: number): number { let s = 0; for (; i > 0; i -= i & -i) s += this.bit[i]; return s; }
  range(l: number, r: number): number { return this.prefix(r) - this.prefix(l - 1); }
}`,
    csharp: `class Fenwick {
    long[] bit; int n;
    public Fenwick(int n){ this.n=n; bit=new long[n+1]; }
    public void Update(int i,long d){ for(; i<=n; i += i & -i) bit[i]+=d; }
    public long Prefix(int i){ long s=0; for(; i>0; i -= i & -i) s+=bit[i]; return s; }
    public long Range(int l,int r){ return Prefix(r)-Prefix(l-1); }
}`,
    go: `type Fenwick struct{ bit []int64; n int }
func NewFenwick(n int) *Fenwick { return &Fenwick{make([]int64, n+1), n} }
func (f *Fenwick) Update(i int, d int64) {
	for ; i <= f.n; i += i & (-i) { f.bit[i] += d }
}
func (f *Fenwick) Prefix(i int) int64 {
	var s int64
	for ; i > 0; i -= i & (-i) { s += f.bit[i] }
	return s
}`,
    rust: `struct Fenwick { bit: Vec<i64>, n: usize }
impl Fenwick {
    fn new(n: usize) -> Self { Fenwick { bit: vec![0; n + 1], n } }
    fn update(&mut self, mut i: usize, delta: i64) {
        while i <= self.n { self.bit[i] += delta; i += i & i.wrapping_neg(); }
    }
    fn prefix(&self, mut i: usize) -> i64 {
        let mut s = 0;
        while i > 0 { s += self.bit[i]; i -= i & i.wrapping_neg(); }
        s
    }
}`,
    kotlin: `class Fenwick(val n: Int) {
    val bit = LongArray(n + 1)
    fun update(i0: Int, delta: Long) {
        var i = i0
        while (i <= n) { bit[i] += delta; i += i and (-i) }
    }
    fun prefix(i0: Int): Long {
        var i = i0; var s = 0L
        while (i > 0) { s += bit[i]; i -= i and (-i) }
        return s
    }
}`,
    swift: `struct Fenwick {
    var bit: [Int]; let n: Int
    init(_ n: Int) { self.n = n; bit = Array(repeating: 0, count: n + 1) }
    mutating func update(_ i0: Int, _ delta: Int) {
        var i = i0
        while i <= n { bit[i] += delta; i += i & (-i) }
    }
    func prefix(_ i0: Int) -> Int {
        var i = i0, s = 0
        while i > 0 { s += bit[i]; i -= i & (-i) }
        return s
    }
}`,
  },
  content: {
    overview: `A Fenwick tree, or Binary Indexed Tree (BIT), is a strikingly compact data structure that answers prefix-sum queries and performs point updates on an array, both in O(log n) time, using just a single array and a bit-manipulation trick. It offers the same query/update complexity as a segment tree for sums, but with far less code and memory (exactly n+1 slots).

The core idea is that index i is "responsible" for a range of array elements whose length equals lowbit(i) = i & (−i), the value of i's lowest set bit — the range (i − lowbit(i), i]. To compute a prefix sum up to index i, you repeatedly add bit[i] and jump down by removing the lowest set bit (i −= i & −i) until you reach 0; the disjoint ranges you visit tile exactly [1..i]. To update index i, you go the other way, adding the delta and climbing by i += i & −i to every node whose range includes i. Both paths have length equal to the number of set bits touched, which is O(log n). Range sums come for free as prefixSum(r) − prefixSum(l−1).`,
    howItWorks: [
      "Use a 1-indexed array bit[] where bit[i] stores the sum of the range (i − lowbit(i), i].",
      "lowbit(i) = i & (−i) isolates the lowest set bit — the size of i's responsibility range.",
      "prefixSum(i): add bit[i], then drop the lowest set bit (i −= lowbit(i)); repeat until i is 0.",
      "update(i, delta): add delta to bit[i], then climb by i += lowbit(i) to every affected node.",
      "rangeSum(l, r) = prefixSum(r) − prefixSum(l − 1).",
    ],
    complexity: {
      time: { best: "O(log n) query/update", average: "O(log n)", worst: "O(log n)" },
      space: "O(n)",
      notes: "Each query and update visits O(log n) indices (one per set bit traversed). Building by n updates is O(n log n), or O(n) with a linear construction. Uses only an (n+1)-length array — smaller than a segment tree.",
    },
    applications: [
      "cumulative frequency tables and prefix sums with updates",
      "counting inversions during/after a merge",
      "order-statistics and rank queries over a dynamic multiset",
      "competitive programming range-sum problems",
    ],
    advantages: [
      "O(log n) prefix-sum queries and point updates",
      "Very small memory (n+1) and tiny, cache-friendly code",
      "Elegant low-bit arithmetic — no explicit tree pointers",
      "Easy range sums via two prefix queries",
    ],
    disadvantages: [
      "Naturally supports only invertible operations (sums), not min/max directly",
      "Less flexible than a segment tree (no easy range-min, lazy range updates)",
      "The bit trick is unintuitive at first",
      "1-indexing is error-prone",
    ],
    commonMistakes: [
      "Using 0-based indexing (the low-bit trick needs 1-based indices).",
      "Confusing the update direction (i += lowbit) with the query direction (i −= lowbit).",
      "Trying to use a BIT for range-minimum (it needs invertibility).",
      "Off-by-one in rangeSum (must subtract prefixSum(l − 1), not prefixSum(l)).",
    ],
    interviewQuestions: [
      "What does i & (−i) compute and why is it central to a BIT?",
      "Explain why the query path's ranges exactly tile [1..i].",
      "When would you use a Fenwick tree instead of a segment tree?",
      "How do you count inversions with a BIT?",
      "How can a BIT support range updates and point queries?",
    ],
    summary:
      "A Fenwick tree (BIT) supports prefix-sum queries and point updates in O(log n) using a single (n+1)-array and the low-bit trick i & (−i). It is more compact and simpler than a segment tree for sum-style, invertible operations.",
    quiz: [
      { question: "The expression i & (−i) computes…", options: ["The highest set bit", "The lowest set bit of i", "i squared", "i divided by 2"], answer: 1, explanation: "It isolates the least-significant set bit, the size of i's range." },
      { question: "For a prefix-sum query you move by…", options: ["i += i & −i", "i −= i & −i", "i *= 2", "i++"], answer: 1, explanation: "You strip the lowest set bit to jump to the next disjoint range." },
      { question: "For a point update you move by…", options: ["i −= i & −i", "i += i & −i", "i /= 2", "i--"], answer: 1, explanation: "You climb to every node whose range includes i." },
      { question: "Fenwick tree query/update complexity is…", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], answer: 1, explanation: "Each traverses O(log n) indices (one per set bit)." },
      { question: "A Fenwick tree is best suited for…", options: ["Range minimum queries", "Invertible operations like sums", "Sorting", "Graph traversal"], answer: 1, explanation: "Its subtraction-based range trick needs an invertible operation." },
    ],
  },
  contentAr: {
    overview: `شجرة فينويك، أو الشجرة الثنائية المفهرسة (BIT)، بنية بيانات مدمجة بشكل لافت تُجيب عن استعلامات مجموع البادئة وتُجري تحديثات نقطية على مصفوفة، وكلاهما بزمن O(log n)، باستخدام مصفوفة واحدة فقط وحيلة معالجة بتات. تقدم نفس تعقيد الاستعلام/التحديث لشجرة مجالات من أجل المجاميع، لكن بشيفرة وذاكرة أقل بكثير (n+1 خانة بالضبط).

الفكرة الجوهرية هي أن الفهرس i "مسؤول" عن مجال من عناصر المصفوفة طوله يساوي lowbit(i) = i & (−i)، قيمة أدنى بت مضبوط في i — المجال (i − lowbit(i), i]. لحساب مجموع بادئة حتى الفهرس i، تضيف bit[i] مرارًا وتقفز نزولًا بإزالة أدنى بت مضبوط (i −= i & −i) حتى تصل إلى 0؛ المجالات المنفصلة التي تزورها تُغطي بالضبط [1..i]. لتحديث الفهرس i، تسير في الاتجاه المعاكس، مضيفًا الفرق ومتسلقًا عبر i += i & −i إلى كل عقدة يتضمن مجالها i. كلا المسارين طوله يساوي عدد البتات المضبوطة الملموسة، وهو O(log n). مجاميع المجال تأتي مجانًا كـ prefixSum(r) − prefixSum(l−1).`,
    howItWorks: [
      "استخدم مصفوفة مفهرسة من 1 اسمها bit[] حيث يخزّن bit[i] مجموع المجال (i − lowbit(i), i].",
      "lowbit(i) = i & (−i) تعزل أدنى بت مضبوط — حجم مجال مسؤولية i.",
      "prefixSum(i): أضف bit[i]، ثم أسقط أدنى بت مضبوط (i −= lowbit(i))؛ كرر حتى يصبح i صفرًا.",
      "update(i, delta): أضف delta إلى bit[i]، ثم تسلق عبر i += lowbit(i) إلى كل عقدة متأثرة.",
      "rangeSum(l, r) = prefixSum(r) − prefixSum(l − 1).",
    ],
    complexity: {
      time: { best: "O(log n) query/update", average: "O(log n)", worst: "O(log n)" },
      space: "O(n)",
      notes: "كل استعلام وتحديث يزور O(log n) من الفهارس (واحد لكل بت مضبوط تم اجتيازه). البناء بـ n تحديث هو O(n log n)، أو O(n) ببناء خطي. يستخدم مصفوفة بطول (n+1) فقط — أصغر من شجرة مجالات.",
    },
    applications: [
      "جداول التكرار التراكمي ومجاميع البادئة مع التحديثات",
      "عد الانعكاسات أثناء/بعد الدمج",
      "إحصاءات الرتبة واستعلامات الرتبة فوق مجموعة متعددة ديناميكية",
      "مسائل مجموع المجال في البرمجة التنافسية",
    ],
    advantages: [
      "استعلامات مجموع بادئة وتحديثات نقطية بزمن O(log n)",
      "ذاكرة صغيرة جدًا (n+1) وشيفرة صغيرة صديقة للذاكرة المؤقتة",
      "حساب أنيق بالبت الأدنى — بلا مؤشرات شجرة صريحة",
      "مجاميع مجال سهلة عبر استعلامي بادئة",
    ],
    disadvantages: [
      "تدعم بطبيعتها فقط العمليات القابلة للعكس (المجاميع)، وليس الحد الأدنى/الأعلى مباشرة",
      "أقل مرونة من شجرة المجالات (لا حد أدنى مجال سهل، ولا تحديثات مجال كسولة)",
      "حيلة البت غير بديهية في البداية",
      "الفهرسة من 1 عرضة للخطأ",
    ],
    commonMistakes: [
      "استخدام فهرسة من صفر (حيلة البت الأدنى تحتاج فهارس من 1).",
      "الخلط بين اتجاه التحديث (i += lowbit) واتجاه الاستعلام (i −= lowbit).",
      "محاولة استخدام BIT للحد الأدنى في المجال (يحتاج قابلية العكس).",
      "خطأ بمقدار واحد في rangeSum (يجب طرح prefixSum(l − 1)، وليس prefixSum(l)).",
    ],
    interviewQuestions: [
      "ماذا يحسب i & (−i) ولماذا هو جوهري في BIT؟",
      "اشرح لماذا مجالات مسار الاستعلام تُغطي بالضبط [1..i].",
      "متى تستخدم شجرة فينويك بدلًا من شجرة مجالات؟",
      "كيف تعد الانعكاسات باستخدام BIT؟",
      "كيف يمكن لـBIT دعم تحديثات المجال واستعلامات النقطة؟",
    ],
    summary:
      "شجرة فينويك (BIT) تدعم استعلامات مجموع البادئة والتحديثات النقطية بزمن O(log n) باستخدام مصفوفة واحدة بطول (n+1) وحيلة البت الأدنى i & (−i). هي أكثر إحكامًا وأبسط من شجرة المجالات للعمليات القابلة للعكس من نمط المجموع.",
    quiz: [
      { question: "التعبير i & (−i) يحسب…", options: ["أعلى بت مضبوط", "أدنى بت مضبوط في i", "مربع i", "i مقسومًا على 2"], answer: 1, explanation: "يعزل أدنى بت مضبوط ذي الدلالة، حجم مجال i." },
      { question: "لاستعلام مجموع بادئة تتحرك بـ…", options: ["i += i & −i", "i −= i & −i", "i *= 2", "i++"], answer: 1, explanation: "تُزيل أدنى بت مضبوط للقفز إلى المجال المنفصل التالي." },
      { question: "لتحديث نقطي تتحرك بـ…", options: ["i −= i & −i", "i += i & −i", "i /= 2", "i--"], answer: 1, explanation: "تتسلق إلى كل عقدة يتضمن مجالها i." },
      { question: "تعقيد استعلام/تحديث شجرة فينويك هو…", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], answer: 1, explanation: "كل منهما يجتاز O(log n) من الفهارس (واحد لكل بت مضبوط)." },
      { question: "شجرة فينويك مناسبة أكثر من أجل…", options: ["استعلامات الحد الأدنى للمجال", "العمليات القابلة للعكس مثل المجاميع", "الترتيب", "اجتياز الرسوم البيانية"], answer: 1, explanation: "حيلة المجال المعتمدة على الطرح تحتاج عملية قابلة للعكس." },
    ],
  },
  inputFields: [
    { key: "values", label: "Array a[1..n]", placeholder: "3, 2, 5, 1, 4, 6", help: "2–20 numbers (1-indexed)." },
    { key: "queryIdx", label: "Prefix-sum up to index", placeholder: "4", help: "1-based index." },
    { key: "updateIdx", label: "Update index", placeholder: "3", help: "1-based index to increment." },
    { key: "updateDelta", label: "Update delta (+)", placeholder: "5", help: "Amount to add." },
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
    const n = values.length;
    const queryIdx = Number((fields.queryIdx ?? "").trim());
    if (!Number.isInteger(queryIdx) || queryIdx < 1 || queryIdx > n) throw new Error(`Query index must be 1..${n}.`);
    const updateIdx = Number((fields.updateIdx ?? "").trim());
    if (!Number.isInteger(updateIdx) || updateIdx < 1 || updateIdx > n) throw new Error(`Update index must be 1..${n}.`);
    const updateDelta = Number((fields.updateDelta ?? "").trim());
    if (!Number.isInteger(updateDelta)) throw new Error("Update delta must be a whole number.");
    return { values, queryIdx, updateIdx, updateDelta };
  },
  serializeInput: (input) => ({
    values: input.values.join(", "),
    queryIdx: String(input.queryIdx),
    updateIdx: String(input.updateIdx),
    updateDelta: String(input.updateDelta),
  }),
  generate,
};

export default mod;
