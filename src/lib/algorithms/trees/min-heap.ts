import type { AlgorithmModule, AuxRow, CellState, Step, TreeFrame, TreeNodeF } from "@/lib/engine/types";

type Input = { values: number[]; extractCount: number };

function generate(input: Input): Step<TreeFrame>[] {
  const heap: number[] = [];
  const steps: Step<TreeFrame>[] = [];
  let comparisons = 0;
  let swaps = 0;

  const toFrame = (states: Record<number, CellState>, description: string, codeLine: number, note: string, descriptionAr?: string): void => {
    const nodes: Record<string, TreeNodeF> = {};
    for (let i = 0; i < heap.length; i++) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      nodes[`h${i}`] = {
        id: `h${i}`,
        value: heap[i],
        left: l < heap.length ? `h${l}` : null,
        right: r < heap.length ? `h${r}` : null,
      };
    }
    const nodeStates: Record<string, CellState> = {};
    for (const [i, s] of Object.entries(states)) nodeStates[`h${i}`] = s;
    const auxStates: Record<number, CellState> = { ...states };
    const aux: AuxRow[] = [{ label: "heap array", values: heap.map((v) => v), states: auxStates }];
    steps.push({
      frame: { nodes, rootId: heap.length ? "h0" : null, states: nodeStates, aux, note },
      description,
      descriptionAr,
      codeLine,
      counters: { comparisons, swaps },
    });
  };

  toFrame(
    {},
    `A min-heap keeps every parent ≤ its children, stored compactly in an array (children of i are at 2i+1 and 2i+2).`,
    0,
    `empty heap`,
    `تحافظ الكومة الصغرى على كون كل أب ≤ أبنائه، مخزّنة بإحكام في مصفوفة (أبناء i عند 2i+1 و2i+2).`,
  );

  // --- insertions (sift up) ---
  for (const v of input.values) {
    heap.push(v);
    let i = heap.length - 1;
    toFrame({ [i]: "active" }, `insert(${v}): append at the end (index ${i}), then bubble it up.`, 2, `sift-up`, `insert(${v}): ألحقها في النهاية (الفهرس ${i})، ثم أصعدها للأعلى.`);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      comparisons++;
      if (heap[i] < heap[parent]) {
        toFrame({ [i]: "swap", [parent]: "compare" }, `${heap[i]} < parent ${heap[parent]}: swap up.`, 3, `sift-up`, `${heap[i]} < الأب ${heap[parent]}: بدّل صعودًا.`);
        [heap[i], heap[parent]] = [heap[parent], heap[i]];
        swaps++;
        i = parent;
      } else {
        toFrame({ [i]: "sorted", [parent]: "compare" }, `${heap[i]} ≥ parent ${heap[parent]}: heap property restored.`, 3, `sift-up`, `${heap[i]} ≥ الأب ${heap[parent]}: استُعيدت خاصية الكومة.`);
        break;
      }
    }
  }
  toFrame({ 0: "found" }, `All values inserted. The minimum, ${heap[0]}, sits at the root.`, 0, `heap built`, `أُدرجت كل القيم. الحد الأدنى، ${heap[0]}، يقع في الجذر.`);

  // --- extract-min (sift down) ---
  const times = Math.min(input.extractCount, heap.length);
  for (let e = 0; e < times; e++) {
    const min = heap[0];
    const last = heap.pop()!;
    toFrame({ 0: "swap" }, `extractMin(): remove root ${min}. Move last element ${last} to the root.`, 5, `extract-min`, `extractMin(): احذف الجذر ${min}. انقل العنصر الأخير ${last} إلى الجذر.`);
    if (heap.length === 0) {
      steps[steps.length - 1].description = `extractMin(): removed ${min}. The heap is now empty.`;
      steps[steps.length - 1].descriptionAr = `extractMin(): حُذف ${min}. أصبحت الكومة فارغة الآن.`;
      break;
    }
    heap[0] = last;
    let i = 0;
    toFrame({ 0: "active" }, `Now sift ${last} down to its correct spot.`, 6, `sift-down`, `الآن أنزل ${last} إلى موضعه الصحيح.`);
    while (true) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let smallest = i;
      if (l < heap.length) {
        comparisons++;
        if (heap[l] < heap[smallest]) smallest = l;
      }
      if (r < heap.length) {
        comparisons++;
        if (heap[r] < heap[smallest]) smallest = r;
      }
      if (smallest === i) {
        toFrame({ [i]: "sorted" }, `${heap[i]} ≤ both children: heap property restored.`, 7, `sift-down`, `${heap[i]} ≤ كلا الابنين: استُعيدت خاصية الكومة.`);
        break;
      }
      toFrame({ [i]: "compare", [smallest]: "swap" }, `Swap ${heap[i]} with smaller child ${heap[smallest]}.`, 6, `sift-down`, `بدّل ${heap[i]} مع الابن الأصغر ${heap[smallest]}.`);
      [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
      swaps++;
      i = smallest;
    }
  }

  toFrame(
    heap.length ? { 0: "found" } : {},
    heap.length ? `Done. Current minimum is ${heap[0]}.` : `Done. Heap is empty.`,
    9,
    `final`,
    heap.length ? `تم. الحد الأدنى الحالي هو ${heap[0]}.` : `تم. الكومة فارغة.`,
  );
  return steps;
}

function randomInput(level: number, rng: { int: (a: number, b: number) => number; shuffle: <T>(a: readonly T[]) => T[] }): Input {
  const n = Math.min(9, 4 + level);
  const values = rng.shuffle(Array.from({ length: n }, (_, k) => (k + 1) * 3 + rng.int(0, 2)));
  return { values, extractCount: Math.min(2, Math.max(1, level - 1)) };
}

const mod: AlgorithmModule<TreeFrame, Input> = {
  slug: "min-heap",
  title: "Min-Heap (Binary Heap)",
  titleAr: "الكومة الصغرى (الكومة الثنائية)",
  category: "trees",
  difficulty: "Intermediate",
  tags: ["heap", "priority queue", "complete tree", "sift"],
  tagsAr: ["كومة", "طابور أولوية", "شجرة كاملة", "إزاحة"],
  summary: "Builds a binary min-heap via sift-up insertions and removes the minimum with sift-down, all in an array.",
  summaryAr: "تبني كومة صغرى ثنائية عبر إدراجات بالإصعاد، وتحذف الحد الأدنى بالإنزال، كل ذلك في مصفوفة.",
  renderer: "tree",
  pseudocode: [
    "structure MinHeap (array a)",
    "  insert(v):",
    "    append v; i = last",
    "    while i>0 and a[i] < a[parent(i)]: swap; i = parent(i)",
    "  extractMin():",
    "    min = a[0]; a[0] = a.pop(); i = 0",
    "    loop: pick smaller child; if a[i] > it: swap down",
    "    else stop",
    "  parent(i)=(i-1)/2, children=2i+1, 2i+2",
    "  return min",
  ],
  code: {
    pseudocode: `insert(v): append; sift up while smaller than parent
extractMin(): save a[0]; move last to root; sift down
parent(i)=(i-1)/2; left=2i+1; right=2i+2`,
    c: `void siftUp(int* a, int i) {
    while (i > 0 && a[i] < a[(i-1)/2]) {
        int p=(i-1)/2, t=a[i]; a[i]=a[p]; a[p]=t; i=p;
    }
}
void siftDown(int* a, int n, int i) {
    while (1) {
        int l=2*i+1, r=2*i+2, s=i;
        if (l<n && a[l]<a[s]) s=l;
        if (r<n && a[r]<a[s]) s=r;
        if (s==i) break;
        int t=a[i]; a[i]=a[s]; a[s]=t; i=s;
    }
}`,
    cpp: `void siftUp(vector<int>& a, int i) {
    while (i && a[i] < a[(i-1)/2]) { swap(a[i], a[(i-1)/2]); i=(i-1)/2; }
}
void siftDown(vector<int>& a, int i) {
    int n=a.size();
    while (true) {
        int l=2*i+1, r=2*i+2, s=i;
        if (l<n && a[l]<a[s]) s=l;
        if (r<n && a[r]<a[s]) s=r;
        if (s==i) break;
        swap(a[i], a[s]); i=s;
    }
}`,
    java: `void siftUp(int[] a, int i) {
    while (i > 0 && a[i] < a[(i-1)/2]) {
        int p=(i-1)/2, t=a[i]; a[i]=a[p]; a[p]=t; i=p;
    }
}
void siftDown(int[] a, int n, int i) {
    while (true) {
        int l=2*i+1, r=2*i+2, s=i;
        if (l<n && a[l]<a[s]) s=l;
        if (r<n && a[r]<a[s]) s=r;
        if (s==i) break;
        int t=a[i]; a[i]=a[s]; a[s]=t; i=s;
    }
}`,
    python: `def sift_up(a, i):
    while i > 0 and a[i] < a[(i-1)//2]:
        a[i], a[(i-1)//2] = a[(i-1)//2], a[i]
        i = (i-1)//2

def sift_down(a, i):
    n = len(a)
    while True:
        l, r, s = 2*i+1, 2*i+2, i
        if l < n and a[l] < a[s]: s = l
        if r < n and a[r] < a[s]: s = r
        if s == i: break
        a[i], a[s] = a[s], a[i]
        i = s`,
    javascript: `function siftUp(a, i) {
  while (i > 0 && a[i] < a[(i-1)>>1]) {
    const p = (i-1)>>1; [a[i], a[p]] = [a[p], a[i]]; i = p;
  }
}
function siftDown(a, i) {
  const n = a.length;
  for (;;) {
    let l = 2*i+1, r = 2*i+2, s = i;
    if (l < n && a[l] < a[s]) s = l;
    if (r < n && a[r] < a[s]) s = r;
    if (s === i) break;
    [a[i], a[s]] = [a[s], a[i]]; i = s;
  }
}`,
    typescript: `function siftUp(a: number[], i: number): void {
  while (i > 0 && a[i] < a[(i-1)>>1]) {
    const p = (i-1)>>1; [a[i], a[p]] = [a[p], a[i]]; i = p;
  }
}
function siftDown(a: number[], i: number): void {
  const n = a.length;
  for (;;) {
    let l = 2*i+1, r = 2*i+2, s = i;
    if (l < n && a[l] < a[s]) s = l;
    if (r < n && a[r] < a[s]) s = r;
    if (s === i) break;
    [a[i], a[s]] = [a[s], a[i]]; i = s;
  }
}`,
    csharp: `void SiftUp(int[] a, int i) {
    while (i > 0 && a[i] < a[(i-1)/2]) {
        int p=(i-1)/2; (a[i], a[p]) = (a[p], a[i]); i=p;
    }
}
void SiftDown(int[] a, int n, int i) {
    while (true) {
        int l=2*i+1, r=2*i+2, s=i;
        if (l<n && a[l]<a[s]) s=l;
        if (r<n && a[r]<a[s]) s=r;
        if (s==i) break;
        (a[i], a[s]) = (a[s], a[i]); i=s;
    }
}`,
    go: `func siftUp(a []int, i int) {
	for i > 0 && a[i] < a[(i-1)/2] {
		p := (i - 1) / 2
		a[i], a[p] = a[p], a[i]
		i = p
	}
}
func siftDown(a []int, i int) {
	n := len(a)
	for {
		l, r, s := 2*i+1, 2*i+2, i
		if l < n && a[l] < a[s] { s = l }
		if r < n && a[r] < a[s] { s = r }
		if s == i { break }
		a[i], a[s] = a[s], a[i]
		i = s
	}
}`,
    rust: `fn sift_up(a: &mut Vec<i32>, mut i: usize) {
    while i > 0 && a[i] < a[(i - 1) / 2] {
        let p = (i - 1) / 2;
        a.swap(i, p);
        i = p;
    }
}
fn sift_down(a: &mut Vec<i32>, mut i: usize) {
    let n = a.len();
    loop {
        let (l, r) = (2 * i + 1, 2 * i + 2);
        let mut s = i;
        if l < n && a[l] < a[s] { s = l; }
        if r < n && a[r] < a[s] { s = r; }
        if s == i { break; }
        a.swap(i, s);
        i = s;
    }
}`,
    kotlin: `fun siftUp(a: IntArray, i0: Int) {
    var i = i0
    while (i > 0 && a[i] < a[(i-1)/2]) {
        val p = (i-1)/2
        val t = a[i]; a[i] = a[p]; a[p] = t; i = p
    }
}
fun siftDown(a: IntArray, n: Int, i0: Int) {
    var i = i0
    while (true) {
        var s = i; val l = 2*i+1; val r = 2*i+2
        if (l < n && a[l] < a[s]) s = l
        if (r < n && a[r] < a[s]) s = r
        if (s == i) break
        val t = a[i]; a[i] = a[s]; a[s] = t; i = s
    }
}`,
    swift: `func siftUp(_ a: inout [Int], _ i0: Int) {
    var i = i0
    while i > 0 && a[i] < a[(i-1)/2] {
        let p = (i-1)/2
        a.swapAt(i, p); i = p
    }
}
func siftDown(_ a: inout [Int], _ i0: Int) {
    var i = i0; let n = a.count
    while true {
        var s = i; let l = 2*i+1, r = 2*i+2
        if l < n && a[l] < a[s] { s = l }
        if r < n && a[r] < a[s] { s = r }
        if s == i { break }
        a.swapAt(i, s); i = s
    }
}`,
  },
  content: {
    overview: `A binary heap is a complete binary tree that satisfies the heap property: in a min-heap every parent is less than or equal to its children, so the smallest element is always at the root. Because the tree is complete, it is stored implicitly in an array — the children of index i live at 2i+1 and 2i+2, and its parent at (i−1)/2 — with no pointers needed.

Two operations maintain the invariant. Insertion appends the new value at the end of the array and "sifts it up," swapping with its parent while it is smaller, until the heap property holds. Extract-min removes the root, moves the last element into its place, and "sifts it down," repeatedly swapping with its smaller child until it settles. Each operation touches only one root-to-leaf path, so both run in O(log n). Heaps are the standard implementation of a priority queue and the engine behind heap sort and algorithms like Dijkstra's.`,
    howItWorks: [
      "Store the complete tree in an array; parent of i is (i−1)/2, children are 2i+1 and 2i+2.",
      "insert: append the value, then sift up — swap with the parent while smaller than it.",
      "The root always holds the minimum, readable in O(1).",
      "extractMin: save the root, move the last element to index 0, then sift down.",
      "Sift down swaps with the smaller of the two children until neither child is smaller.",
    ],
    complexity: {
      time: { best: "O(1) find-min; O(log n) insert/extract", average: "O(log n)", worst: "O(log n)" },
      space: "O(n)",
      notes: "Insert and extract-min touch one root-to-leaf path → O(log n). Building a heap from n items with repeated sift-down is O(n), better than n inserts. Peek at the minimum is O(1).",
    },
    applications: [
      "priority queues (task schedulers, event simulation)",
      "Dijkstra's and Prim's shortest-path / MST algorithms",
      "heap sort (in-place O(n log n) sorting)",
      "finding the k smallest/largest elements of a stream",
    ],
    advantages: [
      "O(log n) insert and extract; O(1) peek at the extreme",
      "Array-backed — no pointers, great cache behavior",
      "Build-heap is O(n)",
      "Simple, predictable performance for priority queues",
    ],
    disadvantages: [
      "No efficient search for an arbitrary element (O(n))",
      "Not sorted — only the root is guaranteed to be the extreme",
      "Decrease-key needs the element's index to be tracked",
      "A balanced BST is preferable when ordered traversal is required",
    ],
    commonMistakes: [
      "Mixing up parent/child index formulas (off-by-one on (i−1)/2).",
      "Forgetting to sift down after moving the last element to the root.",
      "Sifting down toward the larger child instead of the smaller (in a min-heap).",
      "Assuming the array is fully sorted — only the heap property holds.",
    ],
    interviewQuestions: [
      "Why is building a heap with repeated sift-down O(n) rather than O(n log n)?",
      "How do you implement a max-heap given a min-heap (or vice versa)?",
      "How would you support decrease-key efficiently?",
      "How does heap sort use a binary heap, and is it stable?",
      "When would you prefer a balanced BST over a heap?",
    ],
    summary:
      "A binary min-heap is a complete tree (stored in an array) whose root is always the minimum. Insert sifts up and extract-min sifts down, each O(log n), giving an efficient priority queue that powers heap sort and Dijkstra's algorithm.",
    quiz: [
      { question: "In a min-heap, the smallest element is always…", options: ["At a leaf", "At the root", "In the middle of the array", "Unknown"], answer: 1, explanation: "The heap property forces the minimum to the root." },
      { question: "The children of array index i are at…", options: ["i-1 and i+1", "2i and 2i+1", "2i+1 and 2i+2", "i/2 and i/3"], answer: 2, explanation: "For 0-based arrays, children live at 2i+1 and 2i+2." },
      { question: "Insertion into a heap costs…", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], answer: 1, explanation: "Sift-up follows one path of height log n." },
      { question: "extractMin works by…", options: ["Removing a leaf", "Moving the last element to the root and sifting down", "Sorting the array", "Swapping the two smallest"], answer: 1, explanation: "The last element replaces the root, then sinks to its correct position." },
      { question: "Building a heap from n elements via sift-down is…", options: ["O(n log n)", "O(n)", "O(log n)", "O(n²)"], answer: 1, explanation: "The tighter analysis of heapify sums to O(n)." },
    ],
  },
  contentAr: {
    overview: `الكومة الثنائية شجرة ثنائية كاملة تحقق خاصية الكومة: في الكومة الصغرى كل أب أصغر من أو يساوي أبناءه، لذا يقع أصغر عنصر دائمًا في الجذر. ولأن الشجرة كاملة، تُخزَّن ضمنيًا في مصفوفة — أبناء الفهرس i يقعان عند 2i+1 و2i+2، وأبوه عند (i−1)/2 — دون الحاجة إلى مؤشرات.

عمليتان تحافظان على هذا الثابت. الإدراج يُلحق القيمة الجديدة في نهاية المصفوفة و"يُصعدها"، مبدّلًا مع أبيها طالما أصغر منه، حتى تتحقق خاصية الكومة. حذف الحد الأدنى يزيل الجذر، وينقل العنصر الأخير إلى مكانه، و"يُنزله"، مبدّلًا مرارًا مع ابنه الأصغر حتى يستقر. كل عملية تمس مسارًا واحدًا فقط من الجذر إلى ورقة، لذا تعمل كلتاهما بزمن O(log n). الكومات هي التطبيق القياسي لطابور الأولوية والمحرك خلف ترتيب الكومة وخوارزميات مثل دايكسترا.`,
    howItWorks: [
      "خزّن الشجرة الكاملة في مصفوفة؛ أب i هو (i−1)/2، وأبناؤه 2i+1 و2i+2.",
      "الإدراج: ألحق القيمة، ثم أصعدها — بدّل مع الأب طالما أصغر منه.",
      "الجذر يحمل دائمًا الحد الأدنى، ويُقرأ بزمن O(1).",
      "extractMin: احفظ الجذر، انقل العنصر الأخير إلى الفهرس 0، ثم أنزله.",
      "الإنزال يبدّل مع الأصغر من الابنين حتى لا يكون أي ابن أصغر.",
    ],
    complexity: {
      time: { best: "O(1) find-min; O(log n) insert/extract", average: "O(log n)", worst: "O(log n)" },
      space: "O(n)",
      notes: "الإدراج وحذف الحد الأدنى يمسان مسارًا واحدًا من الجذر إلى ورقة ← O(log n). بناء كومة من n عنصر بإنزال متكرر هو O(n)، أفضل من n عملية إدراج. النظر إلى الحد الأدنى هو O(1).",
    },
    applications: [
      "طوابير الأولوية (جدولة المهام، محاكاة الأحداث)",
      "خوارزميتا دايكسترا وپريم لأقصر المسارات / الشجرة الممتدة الصغرى",
      "ترتيب الكومة (ترتيب في المكان بزمن O(n log n))",
      "إيجاد أصغر/أكبر k عنصر في تدفق بيانات",
    ],
    advantages: [
      "إدراج وحذف بزمن O(log n)؛ نظر إلى القيمة القصوى بزمن O(1)",
      "مبنية على مصفوفة — بلا مؤشرات، وسلوك ذاكرة مؤقتة ممتاز",
      "بناء الكومة بزمن O(n)",
      "أداء بسيط ويمكن التنبؤ به لطوابير الأولوية",
    ],
    disadvantages: [
      "لا بحث فعال عن عنصر عشوائي (O(n))",
      "غير مرتبة — الجذر فقط مضمون كونه القيمة القصوى",
      "تقليل المفتاح يحتاج تتبع فهرس العنصر",
      "شجرة بحث ثنائية متوازنة أفضل عند الحاجة إلى اجتياز مرتب",
    ],
    commonMistakes: [
      "الخلط بين صيغتي فهرس الأب والابن (خطأ بمقدار واحد في (i−1)/2).",
      "نسيان الإنزال بعد نقل العنصر الأخير إلى الجذر.",
      "الإنزال نحو الابن الأكبر بدلًا من الأصغر (في الكومة الصغرى).",
      "افتراض أن المصفوفة مرتبة بالكامل — فقط خاصية الكومة متحققة.",
    ],
    interviewQuestions: [
      "لماذا بناء كومة بإنزال متكرر هو O(n) وليس O(n log n)؟",
      "كيف تُطبّق كومة عظمى انطلاقًا من كومة صغرى (أو العكس)؟",
      "كيف تدعم تقليل المفتاح بكفاءة؟",
      "كيف يستخدم ترتيب الكومة كومة ثنائية، وهل هو مستقر؟",
      "متى تفضّل شجرة بحث ثنائية متوازنة على الكومة؟",
    ],
    summary:
      "الكومة الصغرى الثنائية شجرة كاملة (مخزّنة في مصفوفة) جذرها هو دائمًا الحد الأدنى. الإدراج يُصعد والحذف يُنزل، وكل منهما O(log n)، مما يمنح طابور أولوية فعالًا يشغّل ترتيب الكومة وخوارزمية دايكسترا.",
    quiz: [
      { question: "في الكومة الصغرى، أصغر عنصر يقع دائمًا…", options: ["في ورقة", "في الجذر", "في منتصف المصفوفة", "غير معروف"], answer: 1, explanation: "خاصية الكومة تفرض وجود الحد الأدنى في الجذر." },
      { question: "أبناء الفهرس i في المصفوفة يقعان عند…", options: ["i-1 وi+1", "2i وi+1", "2i+1 وi+2", "i/2 وi/3"], answer: 2, explanation: "للمصفوفات المفهرسة من صفر، يقع الأبناء عند 2i+1 و2i+2." },
      { question: "الإدراج في كومة يكلّف…", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], answer: 1, explanation: "الإصعاد يتبع مسارًا واحدًا بارتفاع log n." },
      { question: "extractMin يعمل عبر…", options: ["حذف ورقة", "نقل العنصر الأخير إلى الجذر ثم إنزاله", "ترتيب المصفوفة", "تبديل أصغر عنصرين"], answer: 1, explanation: "العنصر الأخير يحل محل الجذر، ثم يغوص إلى موضعه الصحيح." },
      { question: "بناء كومة من n عنصر عبر الإنزال يكلّف…", options: ["O(n log n)", "O(n)", "O(log n)", "O(n²)"], answer: 1, explanation: "التحليل الأدق لعملية heapify يجمع إلى O(n)." },
    ],
  },
  inputFields: [
    { key: "values", label: "Values to insert", placeholder: "5, 3, 8, 1, 9, 2", help: "2–20 numbers, inserted one at a time." },
    { key: "extractCount", label: "Extract-min count", placeholder: "2", help: "How many minimums to remove afterward (0–10)." },
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
    const extractCount = Number((fields.extractCount ?? "0").trim());
    if (!Number.isInteger(extractCount) || extractCount < 0 || extractCount > 10) throw new Error("Extract count must be 0–10.");
    return { values, extractCount };
  },
  serializeInput: (input) => ({ values: input.values.join(", "), extractCount: String(input.extractCount) }),
  generate,
};

export default mod;
