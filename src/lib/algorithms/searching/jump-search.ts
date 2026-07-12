import type { AlgorithmModule, ArrayFrame, CellState, Step } from "@/lib/engine/types";
import { randomArray } from "@/lib/engine/random";
import { parseNumberList } from "@/lib/utils";

type Input = { values: number[]; target: number };

function generate(input: Input): Step<ArrayFrame>[] {
  const a = [...input.values].sort((x, y) => x - y);
  const { target } = input;
  const n = a.length;
  const step0 = Math.max(1, Math.floor(Math.sqrt(n)));
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;

  const snap = (states: Record<number, CellState>, range: { from: number; to: number } | null, description: string, codeLine: number, pointers?: { index: number; label: string }[], descriptionAr?: string) => {
    steps.push({ frame: { values: [...a], states: { ...states }, range, pointers, note: `block size = ${step0}` }, description, descriptionAr, codeLine, counters: { comparisons } });
  };

  snap({}, { from: 0, to: n - 1 }, `Jump search on the sorted array for ${target}, block size √n = ${step0}.`, 0, undefined, `بحث بالقفز في المصفوفة المرتبة عن ${target}، حجم الكتلة √n = ${step0}.`);

  let prev = 0;
  let curr = step0;
  // jump forward
  while (prev < n && a[Math.min(curr, n) - 1] < target) {
    comparisons++;
    const idx = Math.min(curr, n) - 1;
    snap({ [idx]: "compare" }, { from: prev, to: idx }, `Block end a[${idx}] = ${a[idx]} < ${target}: jump to the next block.`, 1, [{ index: idx, label: "jump" }], `نهاية الكتلة a[${idx}] = ${a[idx]} < ${target}: اقفز إلى الكتلة التالية.`);
    prev = curr;
    curr += step0;
    if (prev >= n) {
      snap({}, null, `Jumped past the end — ${target} is not present.`, 5, undefined, `تجاوز القفز النهاية — ${target} غير موجود.`);
      return steps;
    }
  }

  // linear scan within the block
  snap({}, { from: prev, to: Math.min(curr, n) - 1 }, `Target may be in block [${prev}..${Math.min(curr, n) - 1}]; scan it linearly.`, 2, undefined, `قد يكون الهدف في الكتلة [${prev}..${Math.min(curr, n) - 1}]؛ امسحها خطيًا.`);
  for (let i = prev; i < Math.min(curr, n); i++) {
    comparisons++;
    snap({ [i]: "active" }, { from: prev, to: Math.min(curr, n) - 1 }, `Check a[${i}] = ${a[i]}.`, 3, [{ index: i, label: "i" }], `افحص a[${i}] = ${a[i]}.`);
    if (a[i] === target) {
      snap({ [i]: "found" }, { from: prev, to: Math.min(curr, n) - 1 }, `Found ${target} at index ${i} in ${comparisons} comparisons.`, 4, undefined, `عُثِر على ${target} عند الفهرس ${i} في ${comparisons} مقارنة.`);
      return steps;
    }
    if (a[i] > target) break;
  }
  snap({}, null, `${target} is not present in the array.`, 5, undefined, `${target} غير موجود في المصفوفة.`);
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "jump-search",
  title: "Jump Search",
  titleAr: "البحث بالقفز",
  category: "searching",
  difficulty: "Beginner",
  tags: ["sorted required", "block search", "O(√n)"],
  tagsAr: ["يتطلب الترتيب", "بحث بالكتل", "O(√n)"],
  summary: "Jumps ahead in fixed √n blocks on a sorted array, then scans the block that must contain the target.",
  summaryAr: "يقفز إلى الأمام بكتل ثابتة بحجم √n في مصفوفة مرتبة، ثم يمسح الكتلة التي لا بد أن تحتوي على الهدف.",
  renderer: "array",
  pseudocode: [
    "procedure jumpSearch(a, target)   // a sorted, step = √n",
    "  jump forward by 'step' while block end < target",
    "  // target is now within the last block",
    "  linear scan the block for target",
    "    return index if found",
    "  return -1 (not found)",
  ],
  code: {
    pseudocode: `step = floor(sqrt(n)); prev = 0
while a[min(step, n)-1] < target:
  prev = step; step += floor(sqrt(n))
  if prev >= n: return -1
for i in prev..min(step, n)-1:
  if a[i] == target: return i
return -1`,
    c: `int jump_search(int a[], int n, int target) {
    int step = (int)sqrt(n), prev = 0;
    while (a[(step < n ? step : n) - 1] < target) {
        prev = step; step += (int)sqrt(n);
        if (prev >= n) return -1;
    }
    for (int i = prev; i < (step < n ? step : n); i++)
        if (a[i] == target) return i;
    return -1;
}`,
    cpp: `int jumpSearch(const std::vector<int>& a, int target) {
    int n = a.size(), step = (int)std::sqrt(n), prev = 0;
    while (a[std::min(step, n) - 1] < target) {
        prev = step; step += (int)std::sqrt(n);
        if (prev >= n) return -1;
    }
    for (int i = prev; i < std::min(step, n); i++)
        if (a[i] == target) return i;
    return -1;
}`,
    java: `static int jumpSearch(int[] a, int target) {
    int n = a.length, step = (int)Math.sqrt(n), prev = 0;
    while (a[Math.min(step, n) - 1] < target) {
        prev = step; step += (int)Math.sqrt(n);
        if (prev >= n) return -1;
    }
    for (int i = prev; i < Math.min(step, n); i++)
        if (a[i] == target) return i;
    return -1;
}`,
    python: `import math
def jump_search(a: list[int], target: int) -> int:
    n = len(a)
    step = int(math.sqrt(n))
    prev = 0
    while a[min(step, n) - 1] < target:
        prev = step
        step += int(math.sqrt(n))
        if prev >= n:
            return -1
    for i in range(prev, min(step, n)):
        if a[i] == target:
            return i
    return -1`,
    javascript: `function jumpSearch(a, target) {
  const n = a.length, jump = Math.floor(Math.sqrt(n));
  let prev = 0, step = jump;
  while (a[Math.min(step, n) - 1] < target) {
    prev = step; step += jump;
    if (prev >= n) return -1;
  }
  for (let i = prev; i < Math.min(step, n); i++)
    if (a[i] === target) return i;
  return -1;
}`,
    typescript: `function jumpSearch(a: number[], target: number): number {
  const n = a.length, jump = Math.floor(Math.sqrt(n));
  let prev = 0, step = jump;
  while (a[Math.min(step, n) - 1] < target) {
    prev = step; step += jump;
    if (prev >= n) return -1;
  }
  for (let i = prev; i < Math.min(step, n); i++)
    if (a[i] === target) return i;
  return -1;
}`,
    csharp: `static int JumpSearch(int[] a, int target) {
    int n = a.Length, jump = (int)Math.Sqrt(n), prev = 0, step = jump;
    while (a[Math.Min(step, n) - 1] < target) {
        prev = step; step += jump;
        if (prev >= n) return -1;
    }
    for (int i = prev; i < Math.Min(step, n); i++)
        if (a[i] == target) return i;
    return -1;
}`,
    go: `func jumpSearch(a []int, target int) int {
	n := len(a)
	jump := int(math.Sqrt(float64(n)))
	prev, step := 0, jump
	for a[min(step, n)-1] < target {
		prev = step
		step += jump
		if prev >= n { return -1 }
	}
	for i := prev; i < min(step, n); i++ {
		if a[i] == target { return i }
	}
	return -1
}`,
    rust: `fn jump_search(a: &[i32], target: i32) -> Option<usize> {
    let n = a.len();
    let jump = (n as f64).sqrt() as usize;
    let (mut prev, mut step) = (0usize, jump.max(1));
    while a[step.min(n) - 1] < target {
        prev = step;
        step += jump.max(1);
        if prev >= n { return None; }
    }
    (prev..step.min(n)).find(|&i| a[i] == target)
}`,
    kotlin: `fun jumpSearch(a: IntArray, target: Int): Int {
    val n = a.size
    val jump = Math.sqrt(n.toDouble()).toInt().coerceAtLeast(1)
    var prev = 0; var step = jump
    while (a[minOf(step, n) - 1] < target) {
        prev = step; step += jump
        if (prev >= n) return -1
    }
    for (i in prev until minOf(step, n)) if (a[i] == target) return i
    return -1
}`,
    swift: `func jumpSearch(_ a: [Int], _ target: Int) -> Int {
    let n = a.count
    let jump = max(1, Int(Double(n).squareRoot()))
    var prev = 0, step = jump
    while a[min(step, n) - 1] < target {
        prev = step; step += jump
        if prev >= n { return -1 }
    }
    for i in prev..<min(step, n) where a[i] == target { return i }
    return -1
}`,
  },
  content: {
    overview: `Jump search is a searching algorithm for sorted arrays that sits between linear and binary search. Instead of checking every element (linear) or halving the range (binary), it jumps ahead in fixed-size blocks of about √n elements. Once it finds a block whose end value is greater than or equal to the target, it knows the target — if present — must lie inside that block, and it performs a short linear scan there.

The optimal block size is √n, which balances the number of jumps (n/√n = √n) against the length of the final linear scan (√n), giving an overall O(√n) running time. Jump search is useful when jumping backward is costly (e.g. certain external or tape-like storage) — you only ever move forward in big steps and then scan once.`,
    howItWorks: [
      "Choose a block size of √n.",
      "Jump forward block by block, checking only each block's last element.",
      "Stop when a block's end value is ≥ the target — the target must be in this block.",
      "Linear-scan that block from its start to find the target.",
      "Return the index if found; otherwise the target is absent.",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(√n)", worst: "O(√n)" },
      space: "O(1)",
      notes: "Block size √n minimizes total work (√n jumps + √n scan). Requires a sorted array. Slower than binary search's O(log n) but only ever jumps forward.",
    },
    applications: [
      "Sorted data where backward jumps are expensive",
      "Systems favoring sequential forward access",
      "A middle ground when binary search's random access is undesirable",
      "Teaching the trade-off between linear and binary search",
    ],
    advantages: [
      "O(√n) — faster than linear search",
      "Only jumps forward, then scans once (good access locality)",
      "Simple to implement",
      "O(1) extra memory",
    ],
    disadvantages: [
      "Slower than binary search's O(log n)",
      "Requires a sorted array",
      "Optimal only with block size √n",
      "Still needs random access to block boundaries",
    ],
    commonMistakes: [
      "Using a block size other than √n, hurting performance.",
      "Reading past the array end when the last block is short (clamp with min).",
      "Forgetting to break the linear scan when a[i] exceeds the target.",
      "Running it on unsorted data.",
    ],
    interviewQuestions: [
      "Why is √n the optimal jump size?",
      "How does jump search compare to binary and linear search?",
      "When would you prefer jump search over binary search?",
      "What is the running time and how is it derived?",
    ],
    summary:
      "Jump search jumps forward through a sorted array in √n-sized blocks until it passes the target, then linearly scans the final block. It runs in O(√n) with O(1) space — slower than binary search but only ever moving forward.",
    quiz: [
      { question: "The optimal jump/block size for jump search is…", options: ["log n", "√n", "n/2", "2"], answer: 1, explanation: "√n balances the number of jumps against the length of the final scan." },
      { question: "Jump search's time complexity is…", options: ["O(1)", "O(log n)", "O(√n)", "O(n)"], answer: 2, explanation: "About √n jumps plus a √n linear scan." },
      { question: "Jump search requires the array to be…", options: ["Unsorted", "Sorted", "A power of two", "All positive"], answer: 1, explanation: "Block-end comparisons only make sense on ordered data." },
      { question: "After jumping past the target's block, the algorithm…", options: ["Halves the range", "Linearly scans the block", "Jumps again", "Stops immediately"], answer: 1, explanation: "The target, if present, lies within the last block, found by a short scan." },
      { question: "Jump search is preferable to binary search when…", options: ["Data is unsorted", "Backward jumps are expensive", "n is tiny", "Keys are strings"], answer: 1, explanation: "It only moves forward, which suits sequential/forward-biased access." },
    ],
  },
  contentAr: {
    overview: `البحث بالقفز خوارزمية بحث للمصفوفات المرتبة تقع بين البحث الخطي والبحث الثنائي. فبدلًا من فحص كل عنصر (خطيًا) أو تنصيف المجال (ثنائيًا)، تقفز إلى الأمام بكتل ثابتة الحجم تضم نحو √n من العناصر. وحين تجد كتلة قيمة نهايتها أكبر من الهدف أو تساويه، تعلم أن الهدف — إن وُجِد — لا بد أن يقع داخل تلك الكتلة، فتُجري مسحًا خطيًا قصيرًا هناك.

حجم الكتلة الأمثل هو √n، الذي يوازن بين عدد القفزات (n/√n = √n) وطول المسح الخطي الأخير (√n)، مما يعطي زمن تشغيل إجماليًا قدره O(√n). البحث بالقفز مفيد حين يكون القفز إلى الوراء مكلفًا (مثل بعض وسائط التخزين الخارجية أو الشريطية) — فأنت تتحرك دائمًا إلى الأمام بخطوات كبيرة ثم تمسح مرة واحدة.`,
    howItWorks: [
      "اختر حجم كتلة قدره √n.",
      "اقفز إلى الأمام كتلةً كتلة، فاحصًا العنصر الأخير من كل كتلة فقط.",
      "توقّف حين تصبح قيمة نهاية كتلة ≥ الهدف — لا بد أن يكون الهدف في هذه الكتلة.",
      "امسح تلك الكتلة خطيًا من بدايتها لإيجاد الهدف.",
      "أعِد الفهرس إن وُجِد؛ وإلا فالهدف غائب.",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(√n)", worst: "O(√n)" },
      space: "O(1)",
      notes: "حجم الكتلة √n يُقلّل مجموع العمل (√n قفزة + √n مسح). يتطلب مصفوفة مرتبة. أبطأ من زمن البحث الثنائي O(log n) لكنه يقفز إلى الأمام فقط.",
    },
    applications: [
      "البيانات المرتبة حيث تكون القفزات إلى الوراء مكلفة",
      "الأنظمة التي تفضّل الوصول التسلسلي إلى الأمام",
      "حل وسط عندما يكون الوصول العشوائي للبحث الثنائي غير مرغوب فيه",
      "تدريس المفاضلة بين البحث الخطي والبحث الثنائي",
    ],
    advantages: [
      "O(√n) — أسرع من البحث الخطي",
      "يقفز إلى الأمام فقط ثم يمسح مرة واحدة (محلية وصول جيدة)",
      "سهل التنفيذ",
      "ذاكرة إضافية O(1)",
    ],
    disadvantages: [
      "أبطأ من زمن البحث الثنائي O(log n)",
      "يتطلب مصفوفة مرتبة",
      "أمثلي فقط بحجم كتلة √n",
      "لا يزال يحتاج إلى وصول عشوائي لحدود الكتل",
    ],
    commonMistakes: [
      "استخدام حجم كتلة غير √n، مما يضر بالأداء.",
      "القراءة بعد نهاية المصفوفة عندما تكون الكتلة الأخيرة قصيرة (قيّدها بـ min).",
      "نسيان قطع المسح الخطي عندما يتجاوز a[i] الهدف.",
      "تشغيلها على بيانات غير مرتبة.",
    ],
    interviewQuestions: [
      "لماذا يكون √n هو حجم القفزة الأمثل؟",
      "كيف يقارن البحث بالقفز بالبحث الثنائي والخطي؟",
      "متى تفضّل البحث بالقفز على البحث الثنائي؟",
      "ما زمن التشغيل وكيف يُشتَق؟",
    ],
    summary:
      "يقفز البحث بالقفز إلى الأمام عبر مصفوفة مرتبة بكتل بحجم √n حتى يتجاوز الهدف، ثم يمسح الكتلة الأخيرة خطيًا. يعمل بزمن O(√n) ومساحة O(1) — أبطأ من البحث الثنائي لكنه يتحرك إلى الأمام فقط.",
    quiz: [
      { question: "حجم القفزة/الكتلة الأمثل للبحث بالقفز هو…", options: ["log n", "√n", "n/2", "2"], answer: 1, explanation: "√n يوازن بين عدد القفزات وطول المسح الأخير." },
      { question: "تعقيد الزمن للبحث بالقفز هو…", options: ["O(1)", "O(log n)", "O(√n)", "O(n)"], answer: 2, explanation: "نحو √n قفزة إضافةً إلى مسح خطي بطول √n." },
      { question: "يتطلب البحث بالقفز أن تكون المصفوفة…", options: ["غير مرتبة", "مرتبة", "قوة للعدد اثنين", "كلها موجبة"], answer: 1, explanation: "مقارنات نهايات الكتل لا معنى لها إلا على بيانات مرتبة." },
      { question: "بعد القفز متجاوزًا كتلة الهدف، تقوم الخوارزمية بـ…", options: ["تنصيف المجال", "مسح الكتلة خطيًا", "القفز مجددًا", "التوقف فورًا"], answer: 1, explanation: "الهدف، إن وُجِد، يقع داخل الكتلة الأخيرة، ويُعثَر عليه بمسح قصير." },
      { question: "يُفضَّل البحث بالقفز على البحث الثنائي عندما…", options: ["تكون البيانات غير مرتبة", "تكون القفزات إلى الوراء مكلفة", "يكون n صغيرًا جدًا", "تكون المفاتيح سلاسل نصية"], answer: 1, explanation: "يتحرك إلى الأمام فقط، وهو ما يناسب الوصول التسلسلي/المنحاز إلى الأمام." },
    ],
  },
  inputFields: [
    { key: "values", label: "Array values (auto-sorted)", placeholder: "e.g. 0, 1, 3, 5, 8, 12, 16, 23, 38, 56", help: "2–40 numbers; sorted before searching." },
    { key: "target", label: "Target", placeholder: "16" },
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
