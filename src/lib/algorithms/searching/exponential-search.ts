import type { AlgorithmModule, ArrayFrame, CellState, Step } from "@/lib/engine/types";
import { randomArray } from "@/lib/engine/random";
import { parseNumberList } from "@/lib/utils";

type Input = { values: number[]; target: number };

function generate(input: Input): Step<ArrayFrame>[] {
  const a = [...input.values].sort((x, y) => x - y);
  const { target } = input;
  const n = a.length;
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;

  const snap = (states: Record<number, CellState>, range: { from: number; to: number } | null, description: string, codeLine: number, pointers?: { index: number; label: string }[], descriptionAr?: string) => {
    steps.push({ frame: { values: [...a], states: { ...states }, range, pointers }, description, descriptionAr, codeLine, counters: { comparisons } });
  };

  snap({}, { from: 0, to: n - 1 }, `Exponential search: double a bound until it passes the target, then binary search inside it.`, 0, undefined, `البحث الأسي: ضاعِف الحد حتى يتجاوز الهدف، ثم أجرِ بحثًا ثنائيًا داخله.`);

  comparisons++;
  if (a[0] === target) { snap({ 0: "found" }, { from: 0, to: 0 }, `a[0] = ${a[0]} is the target.`, 1, undefined, `a[0] = ${a[0]} هو الهدف.`); return steps; }

  let bound = 1;
  while (bound < n && a[bound] < target) {
    comparisons++;
    snap({ [bound]: "compare" }, { from: 0, to: bound }, `a[${bound}] = ${a[bound]} < ${target}: double the bound to ${bound * 2}.`, 2, [{ index: bound, label: "bound" }], `a[${bound}] = ${a[bound]} < ${target}: ضاعِف الحد إلى ${bound * 2}.`);
    bound *= 2;
  }
  const lo = Math.floor(bound / 2);
  const hi = Math.min(bound, n - 1);
  snap({}, { from: lo, to: hi }, `Target must be in [${lo}..${hi}]; binary search there.`, 3, undefined, `لا بد أن يكون الهدف في [${lo}..${hi}]؛ أجرِ بحثًا ثنائيًا هناك.`);

  let l = lo, h = hi;
  while (l <= h) {
    const mid = (l + h) >> 1;
    comparisons++;
    snap({ [mid]: "active" }, { from: l, to: h }, `Middle a[${mid}] = ${a[mid]}.`, 4, [{ index: l, label: "lo" }, { index: mid, label: "mid" }, { index: h, label: "hi" }], `العنصر الأوسط a[${mid}] = ${a[mid]}.`);
    if (a[mid] === target) { snap({ [mid]: "found" }, { from: l, to: h }, `Found ${target} at index ${mid} in ${comparisons} comparisons.`, 5, undefined, `عُثِر على ${target} عند الفهرس ${mid} في ${comparisons} مقارنة.`); return steps; }
    if (a[mid] < target) {
      const newL = mid + 1;
      snap({ [mid]: "discarded" }, newL <= h ? { from: newL, to: h } : null, `Too small — go right.`, 6, undefined, `صغير جدًا — اتجه يمينًا.`);
      l = newL;
    } else {
      const newH = mid - 1;
      snap({ [mid]: "discarded" }, l <= newH ? { from: l, to: newH } : null, `Too large — go left.`, 7, undefined, `كبير جدًا — اتجه يسارًا.`);
      h = newH;
    }
  }
  snap({}, null, `${target} is not present.`, 8, undefined, `${target} غير موجود.`);
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "exponential-search",
  title: "Exponential Search",
  titleAr: "البحث الأسي",
  category: "searching",
  difficulty: "Intermediate",
  tags: ["sorted required", "unbounded", "O(log n)"],
  tagsAr: ["يتطلب الترتيب", "غير محدود", "O(log n)"],
  summary: "Doubles a range bound until it passes the target, then binary-searches that range — great for unbounded lists.",
  summaryAr: "يضاعف حد المجال حتى يتجاوز الهدف، ثم يُجري بحثًا ثنائيًا في ذلك المجال — ممتاز للقوائم غير المحدودة.",
  renderer: "array",
  pseudocode: [
    "procedure exponentialSearch(a, target)",
    "  if a[0] == target: return 0",
    "  bound = 1; while bound<n and a[bound]<target: bound *= 2",
    "  // target lies in [bound/2, min(bound, n-1)]",
    "  binary search that range:",
    "    if a[mid]==target return mid",
    "    else if a[mid]<target: lo=mid+1",
    "    else: hi=mid-1",
    "  return -1",
  ],
  code: {
    pseudocode: `if a[0]==target: return 0
bound = 1
while bound<n and a[bound]<target: bound *= 2
return binarySearch(a, target, bound/2, min(bound, n-1))`,
    c: `int exponential_search(int a[], int n, int target) {
    if (a[0] == target) return 0;
    int bound = 1;
    while (bound < n && a[bound] < target) bound *= 2;
    int lo = bound/2, hi = bound < n ? bound : n-1;
    while (lo <= hi) {
        int mid = lo + (hi-lo)/2;
        if (a[mid] == target) return mid;
        else if (a[mid] < target) lo = mid+1; else hi = mid-1;
    }
    return -1;
}`,
    cpp: `int exponentialSearch(const std::vector<int>& a, int target) {
    int n = a.size();
    if (a[0] == target) return 0;
    int bound = 1;
    while (bound < n && a[bound] < target) bound *= 2;
    int lo = bound/2, hi = std::min(bound, n-1);
    while (lo <= hi) {
        int mid = lo + (hi-lo)/2;
        if (a[mid] == target) return mid;
        else if (a[mid] < target) lo = mid+1; else hi = mid-1;
    }
    return -1;
}`,
    java: `static int exponentialSearch(int[] a, int target) {
    int n = a.length;
    if (a[0] == target) return 0;
    int bound = 1;
    while (bound < n && a[bound] < target) bound *= 2;
    int lo = bound/2, hi = Math.min(bound, n-1);
    while (lo <= hi) {
        int mid = lo + (hi-lo)/2;
        if (a[mid] == target) return mid;
        else if (a[mid] < target) lo = mid+1; else hi = mid-1;
    }
    return -1;
}`,
    python: `def exponential_search(a: list[int], target: int) -> int:
    n = len(a)
    if a[0] == target:
        return 0
    bound = 1
    while bound < n and a[bound] < target:
        bound *= 2
    lo, hi = bound // 2, min(bound, n - 1)
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == target:
            return mid
        elif a[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`,
    javascript: `function exponentialSearch(a, target) {
  const n = a.length;
  if (a[0] === target) return 0;
  let bound = 1;
  while (bound < n && a[bound] < target) bound *= 2;
  let lo = bound >> 1, hi = Math.min(bound, n - 1);
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] === target) return mid;
    else if (a[mid] < target) lo = mid + 1; else hi = mid - 1;
  }
  return -1;
}`,
    typescript: `function exponentialSearch(a: number[], target: number): number {
  const n = a.length;
  if (a[0] === target) return 0;
  let bound = 1;
  while (bound < n && a[bound] < target) bound *= 2;
  let lo = bound >> 1, hi = Math.min(bound, n - 1);
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] === target) return mid;
    else if (a[mid] < target) lo = mid + 1; else hi = mid - 1;
  }
  return -1;
}`,
    csharp: `static int ExponentialSearch(int[] a, int target) {
    int n = a.Length;
    if (a[0] == target) return 0;
    int bound = 1;
    while (bound < n && a[bound] < target) bound *= 2;
    int lo = bound/2, hi = Math.Min(bound, n-1);
    while (lo <= hi) {
        int mid = lo + (hi-lo)/2;
        if (a[mid] == target) return mid;
        else if (a[mid] < target) lo = mid+1; else hi = mid-1;
    }
    return -1;
}`,
    go: `func exponentialSearch(a []int, target int) int {
	n := len(a)
	if a[0] == target { return 0 }
	bound := 1
	for bound < n && a[bound] < target { bound *= 2 }
	lo, hi := bound/2, min(bound, n-1)
	for lo <= hi {
		mid := (lo + hi) / 2
		if a[mid] == target { return mid } else if a[mid] < target { lo = mid + 1 } else { hi = mid - 1 }
	}
	return -1
}`,
    rust: `fn exponential_search(a: &[i32], target: i32) -> Option<usize> {
    let n = a.len();
    if a[0] == target { return Some(0); }
    let mut bound = 1;
    while bound < n && a[bound] < target { bound *= 2; }
    let (mut lo, mut hi) = (bound / 2, bound.min(n - 1));
    while lo <= hi {
        let mid = (lo + hi) / 2;
        if a[mid] == target { return Some(mid); }
        if a[mid] < target { lo = mid + 1; } else { if mid == 0 { break; } hi = mid - 1; }
    }
    None
}`,
    kotlin: `fun exponentialSearch(a: IntArray, target: Int): Int {
    val n = a.size
    if (a[0] == target) return 0
    var bound = 1
    while (bound < n && a[bound] < target) bound *= 2
    var lo = bound / 2; var hi = minOf(bound, n - 1)
    while (lo <= hi) {
        val mid = (lo + hi) / 2
        when {
            a[mid] == target -> return mid
            a[mid] < target -> lo = mid + 1
            else -> hi = mid - 1
        }
    }
    return -1
}`,
    swift: `func exponentialSearch(_ a: [Int], _ target: Int) -> Int {
    let n = a.count
    if a[0] == target { return 0 }
    var bound = 1
    while bound < n && a[bound] < target { bound *= 2 }
    var lo = bound / 2, hi = min(bound, n - 1)
    while lo <= hi {
        let mid = (lo + hi) / 2
        if a[mid] == target { return mid }
        else if a[mid] < target { lo = mid + 1 } else { hi = mid - 1 }
    }
    return -1
}`,
  },
  content: {
    overview: `Exponential search (also called doubling or galloping search) finds a target in a sorted array in two stages. First it finds a range that must contain the target by starting at index 1 and repeatedly doubling the index until the value there exceeds the target. Then it runs an ordinary binary search within the identified range [bound/2, bound].

Its great strength is searching unbounded or very large sorted sequences where you don't know the length in advance — the doubling phase discovers a bracketing range in O(log i) steps, where i is the target's position. The subsequent binary search is also O(log i), so the whole thing is O(log i), which can be far less than O(log n) when the target is near the front.`,
    howItWorks: [
      "Check index 0 first as a special case.",
      "Set bound = 1 and double it while a[bound] is still less than the target.",
      "Stop when a[bound] ≥ target (or you pass the end) — the target lies in [bound/2, bound].",
      "Run binary search within that bracketed range.",
      "Return the index if found, else report absent.",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(log i)", worst: "O(log n)" },
      space: "O(1)",
      notes: "i is the target's index. Doubling phase is O(log i); binary search on the range is O(log i). Ideal for unbounded/infinite sorted streams. Requires sorted data.",
    },
    applications: [
      "Searching unbounded or unknown-length sorted sequences",
      "Very large sorted arrays where the target is likely near the front",
      "Search over sorted data on disk/streams",
      "Range-finding before a bounded binary search",
    ],
    advantages: [
      "O(log i) — excellent when the target is near the start",
      "Works without knowing the array length",
      "O(1) extra memory",
      "Reuses binary search for the bounded phase",
    ],
    disadvantages: [
      "Requires sorted data",
      "Slightly more complex than plain binary search",
      "No advantage when the target is near the end",
      "Needs care with the doubling bound near the array end",
    ],
    commonMistakes: [
      "Not clamping the upper bound to n − 1 before binary search.",
      "Forgetting the a[0] special case.",
      "Starting the bound at 0 (it must start at 1 so doubling grows).",
      "Overflow when doubling on huge/unbounded ranges.",
    ],
    interviewQuestions: [
      "Why is exponential search well suited to unbounded arrays?",
      "What is the complexity in terms of the target's position i?",
      "How does the doubling phase bracket the target?",
      "Why clamp the bound to n − 1 before the binary search?",
    ],
    summary:
      "Exponential search doubles an index until it brackets the target, then binary-searches that range — running in O(log i) where i is the target's position. It shines on unbounded or huge sorted sequences, especially when the target is near the front.",
    quiz: [
      { question: "The first phase of exponential search does what?", options: ["Sorts the array", "Doubles a bound until it passes the target", "Scans linearly", "Interpolates position"], answer: 1, explanation: "It grows the index geometrically to bracket the target's range." },
      { question: "The second phase is a…", options: ["Linear scan", "Binary search over the bracketed range", "Jump search", "Hash lookup"], answer: 1, explanation: "Once bracketed in [bound/2, bound], binary search finishes the job." },
      { question: "Its complexity in terms of target index i is…", options: ["O(i)", "O(log i)", "O(i log i)", "O(1)"], answer: 1, explanation: "Both the doubling and binary phases are O(log i)." },
      { question: "Exponential search is especially useful for…", options: ["Unsorted arrays", "Unbounded/unknown-length sorted arrays", "Tiny arrays", "Random access only"], answer: 1, explanation: "The doubling phase finds a range without knowing the length." },
      { question: "Before binary searching, the upper bound must be…", options: ["Set to 0", "Clamped to n − 1", "Doubled again", "Ignored"], answer: 1, explanation: "The bound may exceed the array, so clamp it to the last index." },
    ],
  },
  contentAr: {
    overview: `يجد البحث الأسي (المعروف أيضًا بالبحث بالمضاعفة أو بالعَدْو) هدفًا في مصفوفة مرتبة على مرحلتين. أولًا يجد مجالًا لا بد أن يحتوي على الهدف بالبدء من الفهرس 1 ومضاعفة الفهرس مرارًا حتى تتجاوز القيمة هناك الهدف. ثم يُجري بحثًا ثنائيًا عاديًا داخل المجال المحدَّد [bound/2, bound].

قوته الكبرى في البحث ضمن تسلسلات مرتبة غير محدودة أو ضخمة جدًا لا تعرف طولها مسبقًا — فمرحلة المضاعفة تكتشف مجالًا حاصرًا في O(log i) من الخطوات، حيث i هو موضع الهدف. والبحث الثنائي اللاحق أيضًا O(log i)، فيصبح الكل O(log i)، وهو قد يكون أقل بكثير من O(log n) حين يكون الهدف قرب المقدمة.`,
    howItWorks: [
      "افحص الفهرس 0 أولًا كحالة خاصة.",
      "اجعل bound = 1 وضاعِفه ما دام a[bound] أصغر من الهدف.",
      "توقّف عندما يصبح a[bound] ≥ الهدف (أو تتجاوز النهاية) — يقع الهدف في [bound/2, bound].",
      "أجرِ بحثًا ثنائيًا داخل ذلك المجال المحصور.",
      "أعِد الفهرس إن وُجِد، وإلا فأبلغ بأنه غائب.",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(log i)", worst: "O(log n)" },
      space: "O(1)",
      notes: "i هو فهرس الهدف. مرحلة المضاعفة O(log i)؛ والبحث الثنائي على المجال O(log i). مثالي للتدفقات المرتبة غير المحدودة/اللانهائية. يتطلب بيانات مرتبة.",
    },
    applications: [
      "البحث في تسلسلات مرتبة غير محدودة أو مجهولة الطول",
      "المصفوفات المرتبة الضخمة جدًا حيث يُرجَّح وجود الهدف قرب المقدمة",
      "البحث في بيانات مرتبة على القرص/التدفقات",
      "إيجاد المجال قبل بحث ثنائي محدود",
    ],
    advantages: [
      "O(log i) — ممتاز حين يكون الهدف قرب البداية",
      "يعمل دون معرفة طول المصفوفة",
      "ذاكرة إضافية O(1)",
      "يعيد استخدام البحث الثنائي في المرحلة المحدودة",
    ],
    disadvantages: [
      "يتطلب بيانات مرتبة",
      "أكثر تعقيدًا قليلًا من البحث الثنائي البسيط",
      "لا ميزة له حين يكون الهدف قرب النهاية",
      "يحتاج إلى عناية بحد المضاعفة قرب نهاية المصفوفة",
    ],
    commonMistakes: [
      "عدم تقييد الحد الأعلى إلى n − 1 قبل البحث الثنائي.",
      "نسيان الحالة الخاصة a[0].",
      "بدء الحد من 0 (يجب أن يبدأ من 1 كي تنمو المضاعفة).",
      "الفيضان عند المضاعفة على مجالات ضخمة/غير محدودة.",
    ],
    interviewQuestions: [
      "لماذا يناسب البحث الأسي المصفوفات غير المحدودة؟",
      "ما التعقيد بدلالة موضع الهدف i؟",
      "كيف تحصر مرحلة المضاعفة الهدف؟",
      "لماذا يُقيَّد الحد إلى n − 1 قبل البحث الثنائي؟",
    ],
    summary:
      "يضاعف البحث الأسي فهرسًا حتى يحصر الهدف، ثم يُجري بحثًا ثنائيًا في ذلك المجال — عاملًا بزمن O(log i) حيث i هو موضع الهدف. يتألق في التسلسلات المرتبة غير المحدودة أو الضخمة، خاصةً حين يكون الهدف قرب المقدمة.",
    quiz: [
      { question: "ماذا تفعل المرحلة الأولى من البحث الأسي؟", options: ["ترتّب المصفوفة", "تضاعف حدًا حتى يتجاوز الهدف", "تمسح خطيًا", "تستقرئ الموضع"], answer: 1, explanation: "تنمّي الفهرس هندسيًا لحصر مجال الهدف." },
      { question: "المرحلة الثانية هي…", options: ["مسح خطي", "بحث ثنائي على المجال المحصور", "بحث بالقفز", "بحث في جدول تجزئة"], answer: 1, explanation: "بمجرد الحصر في [bound/2, bound]، يُنهي البحث الثنائي المهمة." },
      { question: "تعقيده بدلالة فهرس الهدف i هو…", options: ["O(i)", "O(log i)", "O(i log i)", "O(1)"], answer: 1, explanation: "كل من مرحلة المضاعفة والمرحلة الثنائية O(log i)." },
      { question: "البحث الأسي مفيد بشكل خاص لـ…", options: ["المصفوفات غير المرتبة", "المصفوفات المرتبة غير المحدودة/المجهولة الطول", "المصفوفات الصغيرة جدًا", "الوصول العشوائي فقط"], answer: 1, explanation: "مرحلة المضاعفة تجد مجالًا دون معرفة الطول." },
      { question: "قبل البحث الثنائي، يجب أن يكون الحد الأعلى…", options: ["مضبوطًا على 0", "مقيَّدًا إلى n − 1", "مضاعَفًا مجددًا", "متجاهَلًا"], answer: 1, explanation: "قد يتجاوز الحد المصفوفة، لذا قيّده إلى الفهرس الأخير." },
    ],
  },
  inputFields: [
    { key: "values", label: "Array values (auto-sorted)", placeholder: "e.g. 2, 3, 4, 10, 40, 55, 68, 80, 95", help: "2–40 numbers; sorted before searching." },
    { key: "target", label: "Target", placeholder: "10" },
  ],
  defaultInput: (level, rng) => {
    const values = randomArray(level, rng, { sorted: true });
    const target = rng.next() < 0.7 ? rng.pick(values) : rng.int(1, 99);
    return { values, target };
  },
  parseInput: (fields) => {
    const values = parseNumberList(fields.values ?? "", { min: -999, max: 999, maxLen: 40 });
    if (values.length < 2) throw new Error("Enter at least 2 numbers.");
    const target = Number((fields.target ?? "").trim());
    if (!Number.isFinite(target)) throw new Error("Enter a valid numeric target.");
    return { values, target };
  },
  serializeInput: (input) => ({ values: input.values.join(", "), target: String(input.target) }),
  generate,
};

export default mod;
