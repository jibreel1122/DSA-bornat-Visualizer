import type { AlgorithmModule, ArrayFrame, CellState, Step } from "@/lib/engine/types";
import { randomArray } from "@/lib/engine/random";
import { parseNumberList } from "@/lib/utils";

type Input = { values: number[]; target: number };

function generate(input: Input): Step<ArrayFrame>[] {
  const a = [...input.values].sort((x, y) => x - y);
  const { target } = input;
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;

  const snap = (
    states: Record<number, CellState>,
    range: { from: number; to: number } | null,
    description: string,
    codeLine: number,
    pointers?: { index: number; label: string }[],
    descriptionAr?: string,
  ) => {
    steps.push({ frame: { values: [...a], states: { ...states }, range, pointers }, description, descriptionAr, codeLine, counters: { comparisons } });
  };

  snap({}, { from: 0, to: a.length - 1 }, `Binary search on the sorted array for ${target}.`, 0, undefined, `بحث ثنائي في المصفوفة المرتبة عن ${target}.`);
  let lo = 0;
  let hi = a.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    comparisons++;
    snap(
      { [mid]: "active" },
      { from: lo, to: hi },
      `Range [${lo}..${hi}]: check middle a[${mid}] = ${a[mid]}.`,
      2,
      [{ index: lo, label: "lo" }, { index: mid, label: "mid" }, { index: hi, label: "hi" }],
      `المجال [${lo}..${hi}]: افحص العنصر الأوسط a[${mid}] = ${a[mid]}.`,
    );
    if (a[mid] === target) {
      snap({ [mid]: "found" }, { from: lo, to: hi }, `Found ${target} at index ${mid} in ${comparisons} comparisons.`, 3, [{ index: mid, label: "mid" }], `عُثِر على ${target} عند الفهرس ${mid} في ${comparisons} مقارنة.`);
      return steps;
    }
    if (a[mid] < target) {
      const newLo = mid + 1;
      snap({ [mid]: "discarded" }, newLo <= hi ? { from: newLo, to: hi } : null, `${a[mid]} < ${target}: discard the left half, search right.`, 4, [{ index: mid, label: "mid" }], `${a[mid]} < ${target}: تجاهل النصف الأيسر وابحث في اليمين.`);
      lo = newLo;
    } else {
      const newHi = mid - 1;
      snap({ [mid]: "discarded" }, lo <= newHi ? { from: lo, to: newHi } : null, `${a[mid]} > ${target}: discard the right half, search left.`, 5, [{ index: mid, label: "mid" }], `${a[mid]} > ${target}: تجاهل النصف الأيمن وابحث في اليسار.`);
      hi = newHi;
    }
  }
  snap({}, null, `${target} is not present — the search range is empty.`, 6, undefined, `${target} غير موجود — أصبح مجال البحث فارغًا.`);
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "binary-search",
  title: "Binary Search",
  titleAr: "البحث الثنائي",
  category: "searching",
  difficulty: "Beginner",
  tags: ["divide & conquer", "sorted required", "O(log n)"],
  tagsAr: ["فرّق تسد", "يتطلب الترتيب", "O(log n)"],
  summary: "Repeatedly halves a sorted array, comparing the middle element to the target — O(log n) lookups.",
  summaryAr: "يُنصّف مصفوفة مرتبة مرارًا، مقارنًا العنصر الأوسط بالهدف — عمليات بحث بتكلفة O(log n).",
  renderer: "array",
  pseudocode: [
    "procedure binarySearch(a, target)   // a is sorted",
    "  lo = 0; hi = n-1",
    "  while lo <= hi:  mid = (lo+hi)/2",
    "    if a[mid] == target: return mid",
    "    else if a[mid] < target: lo = mid+1",
    "    else: hi = mid-1",
    "  return -1   // not found",
  ],
  code: {
    pseudocode: `procedure binarySearch(a, target)
  lo = 0; hi = n - 1
  while lo <= hi:
    mid = lo + (hi - lo) / 2
    if a[mid] == target: return mid
    else if a[mid] < target: lo = mid + 1
    else: hi = mid - 1
  return -1`,
    c: `int binary_search(int a[], int n, int target) {
    int lo = 0, hi = n - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        else if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}`,
    cpp: `#include <vector>
int binarySearch(const std::vector<int>& a, int target) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        else if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}`,
    java: `static int binarySearch(int[] a, int target) {
    int lo = 0, hi = a.length - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        else if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}`,
    python: `def binary_search(a: list[int], target: int) -> int:
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == target:
            return mid
        elif a[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`,
    javascript: `function binarySearch(a, target) {
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] === target) return mid;
    else if (a[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`,
    typescript: `function binarySearch(a: number[], target: number): number {
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] === target) return mid;
    else if (a[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`,
    csharp: `static int BinarySearch(int[] a, int target) {
    int lo = 0, hi = a.Length - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        else if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}`,
    go: `func binarySearch(a []int, target int) int {
	lo, hi := 0, len(a)-1
	for lo <= hi {
		mid := lo + (hi-lo)/2
		if a[mid] == target {
			return mid
		} else if a[mid] < target {
			lo = mid + 1
		} else {
			hi = mid - 1
		}
	}
	return -1
}`,
    rust: `fn binary_search(a: &[i32], target: i32) -> Option<usize> {
    let (mut lo, mut hi) = (0i64, a.len() as i64 - 1);
    while lo <= hi {
        let mid = (lo + (hi - lo) / 2) as usize;
        match a[mid].cmp(&target) {
            std::cmp::Ordering::Equal => return Some(mid),
            std::cmp::Ordering::Less => lo = mid as i64 + 1,
            std::cmp::Ordering::Greater => hi = mid as i64 - 1,
        }
    }
    None
}`,
    kotlin: `fun binarySearch(a: IntArray, target: Int): Int {
    var lo = 0; var hi = a.size - 1
    while (lo <= hi) {
        val mid = lo + (hi - lo) / 2
        when {
            a[mid] == target -> return mid
            a[mid] < target -> lo = mid + 1
            else -> hi = mid - 1
        }
    }
    return -1
}`,
    swift: `func binarySearch(_ a: [Int], _ target: Int) -> Int {
    var lo = 0, hi = a.count - 1
    while lo <= hi {
        let mid = lo + (hi - lo) / 2
        if a[mid] == target { return mid }
        else if a[mid] < target { lo = mid + 1 }
        else { hi = mid - 1 }
    }
    return -1
}`,
  },
  content: {
    overview: `Binary search finds a target in a sorted array by repeatedly halving the search interval. It compares the target to the middle element: if they match, it's done; if the target is larger, only the right half can contain it; if smaller, only the left half. Each comparison eliminates half of the remaining candidates.

This halving gives it O(log n) time — searching a billion sorted items takes only about 30 comparisons. The one requirement is that the data be sorted (or kept sorted), which is what makes the "throw away half" reasoning valid.`,
    howItWorks: [
      "Maintain a search window [lo, hi], initially the whole array.",
      "Compute mid and compare a[mid] with the target.",
      "If equal, return mid — success.",
      "If a[mid] < target, the answer must be to the right: set lo = mid + 1.",
      "If a[mid] > target, go left: set hi = mid − 1. Stop when the window is empty.",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(log n)", worst: "O(log n)" },
      space: "O(1)",
      notes: "Each step halves the range, so at most ⌈log₂ n⌉ + 1 comparisons. Iterative form uses O(1) space; recursive form O(log n) stack. Requires sorted input.",
    },
    applications: [
      "Fast lookup in sorted arrays and databases (indexes)",
      "Finding insertion points (lower/upper bound)",
      "Binary search on the answer for optimization/feasibility problems",
      "Root-finding and monotonic predicate searches",
    ],
    advantages: [
      "O(log n) — dramatically faster than linear search on large data",
      "O(1) memory in iterative form",
      "Simple, well-understood, and cache-reasonable on arrays",
      "Generalizes to lower_bound/upper_bound and 'search on answer'",
    ],
    disadvantages: [
      "Requires sorted data (sorting costs O(n log n) up front)",
      "Poor fit for structures without random access (e.g. linked lists)",
      "Insertions/deletions to keep order are O(n) in a plain array",
      "Easy to introduce subtle off-by-one and overflow bugs",
    ],
    commonMistakes: [
      "Computing mid as (lo + hi) / 2, which can overflow — use lo + (hi − lo) / 2.",
      "Wrong loop condition (lo < hi vs lo <= hi) causing missed or infinite ranges.",
      "Updating lo/hi to mid instead of mid ± 1, risking an infinite loop.",
      "Running binary search on unsorted data — results are meaningless.",
    ],
    interviewQuestions: [
      "Why must the array be sorted for binary search to be correct?",
      "How do you avoid integer overflow when computing the midpoint?",
      "Implement lower_bound (first index ≥ target) with binary search.",
      "Explain 'binary search on the answer' with an example.",
      "How many comparisons does binary search need for n = 1,000,000?",
    ],
    summary:
      "Binary search halves a sorted array each step by comparing the middle element to the target, achieving O(log n) time and O(1) space. Its power depends entirely on the data being sorted, and it generalizes far beyond arrays to bound-finding and search-on-answer problems.",
    quiz: [
      { question: "What must be true of the input for binary search to work?", options: ["It is sorted", "It has distinct values", "It is a power of two in size", "It contains no negatives"], answer: 0, explanation: "The halving logic relies on order to know which side to discard." },
      { question: "Binary search runs in…", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], answer: 1, explanation: "Each comparison halves the search space." },
      { question: "Why compute mid as lo + (hi − lo) / 2?", options: ["It is faster", "It avoids integer overflow", "It is more readable", "It changes the result"], answer: 1, explanation: "lo + hi can exceed the integer range for large indices; this form cannot." },
      { question: "After a[mid] < target, which half is searched next?", options: ["Left half", "Right half", "Both halves", "Neither"], answer: 1, explanation: "Everything at or before mid is too small, so lo becomes mid + 1." },
      { question: "About how many comparisons for n = 1,000,000?", options: ["~10", "~20", "~1000", "~1,000,000"], answer: 1, explanation: "log₂(10⁶) ≈ 20." },
    ],
  },
  contentAr: {
    overview: `يجد البحث الثنائي هدفًا في مصفوفة مرتبة عبر تنصيف مجال البحث مرارًا. يقارن الهدف بالعنصر الأوسط: إذا تطابقا فقد انتهى؛ وإذا كان الهدف أكبر، فلا يمكن أن يحتويه إلا النصف الأيمن؛ وإذا كان أصغر، فالنصف الأيسر فقط. كل مقارنة تستبعد نصف المرشحين المتبقين.

هذا التنصيف يمنحه زمن O(log n) — فالبحث في مليار عنصر مرتب يستغرق نحو 30 مقارنة فقط. الشرط الوحيد هو أن تكون البيانات مرتبة (أو أن تبقى مرتبة)، وهو ما يجعل منطق "تخلّص من النصف" صحيحًا.`,
    howItWorks: [
      "احتفظ بنافذة بحث [lo, hi]، تشمل المصفوفة كلها في البداية.",
      "احسب mid وقارن a[mid] مع الهدف.",
      "إذا تساويا، أعِد mid — نجاح.",
      "إذا كان a[mid] < الهدف، فالجواب لا بد أن يكون في اليمين: اجعل lo = mid + 1.",
      "إذا كان a[mid] > الهدف، فاتجه يسارًا: اجعل hi = mid − 1. توقّف عندما تصبح النافذة فارغة.",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(log n)", worst: "O(log n)" },
      space: "O(1)",
      notes: "كل خطوة تُنصّف المجال، فبحدٍ أقصى ⌈log₂ n⌉ + 1 مقارنة. الصيغة التكرارية تستخدم مساحة O(1)؛ والصيغة العودية O(log n) من المكدس. تتطلب مدخلات مرتبة.",
    },
    applications: [
      "بحث سريع في المصفوفات المرتبة وقواعد البيانات (الفهارس)",
      "إيجاد مواضع الإدراج (الحد الأدنى/الأعلى)",
      "البحث الثنائي على الجواب لمسائل التحسين/الجدوى",
      "إيجاد الجذور والبحث في المُسنِدات المنطقية الرتيبة",
    ],
    advantages: [
      "O(log n) — أسرع بكثير من البحث الخطي على البيانات الكبيرة",
      "ذاكرة O(1) في الصيغة التكرارية",
      "بسيط ومفهوم جيدًا ومعقول من حيث الذاكرة المؤقتة على المصفوفات",
      "يتعمم إلى lower_bound/upper_bound و'البحث على الجواب'",
    ],
    disadvantages: [
      "يتطلب بيانات مرتبة (الترتيب يكلّف O(n log n) مقدمًا)",
      "غير ملائم للهياكل التي لا تتيح الوصول العشوائي (مثل القوائم المترابطة)",
      "عمليات الإدراج/الحذف للحفاظ على الترتيب تكلّف O(n) في المصفوفة العادية",
      "من السهل إدخال أخطاء انزياح بمقدار واحد وأخطاء فيضان خفية",
    ],
    commonMistakes: [
      "حساب mid كـ (lo + hi) / 2، مما قد يفيض — استخدم lo + (hi − lo) / 2.",
      "شرط حلقة خاطئ (lo < hi مقابل lo <= hi) يسبب مجالات مفقودة أو حلقات لا نهائية.",
      "تحديث lo/hi إلى mid بدلًا من mid ± 1، مما يخاطر بحلقة لا نهائية.",
      "تشغيل البحث الثنائي على بيانات غير مرتبة — النتائج بلا معنى.",
    ],
    interviewQuestions: [
      "لماذا يجب أن تكون المصفوفة مرتبة كي يكون البحث الثنائي صحيحًا؟",
      "كيف تتجنب فيضان الأعداد الصحيحة عند حساب نقطة المنتصف؟",
      "طبّق lower_bound (أول فهرس ≥ الهدف) باستخدام البحث الثنائي.",
      "اشرح 'البحث الثنائي على الجواب' بمثال.",
      "كم مقارنة يحتاج البحث الثنائي من أجل n = 1,000,000؟",
    ],
    summary:
      "يُنصّف البحث الثنائي مصفوفة مرتبة في كل خطوة بمقارنة العنصر الأوسط بالهدف، محققًا زمن O(log n) ومساحة O(1). قوته تعتمد كليًا على كون البيانات مرتبة، وهو يتعمم إلى ما هو أبعد من المصفوفات ليشمل إيجاد الحدود والبحث على الجواب.",
    quiz: [
      { question: "ما الذي يجب أن يتحقق في المدخلات كي يعمل البحث الثنائي؟", options: ["أن تكون مرتبة", "أن تكون قيمها متمايزة", "أن يكون حجمها قوة للعدد اثنين", "ألا تحتوي على أعداد سالبة"], answer: 0, explanation: "يعتمد منطق التنصيف على الترتيب لمعرفة أي جهة تُستبعد." },
      { question: "يعمل البحث الثنائي بزمن…", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], answer: 1, explanation: "كل مقارنة تُنصّف مجال البحث." },
      { question: "لماذا يُحسب mid كـ lo + (hi − lo) / 2؟", options: ["لأنه أسرع", "لأنه يتجنب فيضان الأعداد الصحيحة", "لأنه أوضح للقراءة", "لأنه يغيّر النتيجة"], answer: 1, explanation: "قد يتجاوز lo + hi نطاق الأعداد الصحيحة عند الفهارس الكبيرة؛ وهذه الصيغة لا تفعل." },
      { question: "بعد a[mid] < الهدف، أي نصف يُبحَث تاليًا؟", options: ["النصف الأيسر", "النصف الأيمن", "كلا النصفين", "لا شيء"], answer: 1, explanation: "كل ما عند mid أو قبله صغير جدًا، لذا يصبح lo يساوي mid + 1." },
      { question: "كم مقارنة تقريبًا من أجل n = 1,000,000؟", options: ["~10", "~20", "~1000", "~1,000,000"], answer: 1, explanation: "log₂(10⁶) ≈ 20." },
    ],
  },
  inputFields: [
    { key: "values", label: "Array values (auto-sorted)", placeholder: "e.g. 2, 5, 8, 12, 16, 23, 38", help: "2–40 numbers; the array is sorted before searching." },
    { key: "target", label: "Target", placeholder: "23" },
  ],
  defaultInput: (level, rng) => {
    const values = randomArray(level, rng, { sorted: true });
    const target = rng.next() < 0.7 ? rng.pick(values) : rng.int(1, 99);
    return { values, target };
  },
  parseInput: (fields) => {
    const values = parseNumberList(fields.values ?? "", { min: -999, max: 999, maxLen: 40 });
    if (values.length < 1) throw new Error("Enter at least one number.");
    const target = Number((fields.target ?? "").trim());
    if (!Number.isFinite(target)) throw new Error("Enter a valid numeric target.");
    return { values, target };
  },
  serializeInput: (input) => ({ values: input.values.join(", "), target: String(input.target) }),
  generate,
};

export default mod;
