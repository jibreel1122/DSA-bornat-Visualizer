import type { AlgorithmModule, ArrayFrame, CellState, Step } from "@/lib/engine/types";

type Input = { values: number[] };

function generate(input: Input): Step<ArrayFrame>[] {
  const a = input.values;
  const n = a.length;
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;

  let cur = a[0];
  let best = a[0];
  let curStart = 0;
  let bestStart = 0;
  let bestEnd = 0;

  const frame = (
    i: number,
    curFrom: number,
    highlightBest: boolean,
    description: string,
    codeLine: number,
    done = false,
    descriptionAr?: string,
  ): void => {
    const states: Record<number, CellState> = {};
    // Current running window [curFrom..i].
    for (let k = curFrom; k <= i && k < n; k++) states[k] = "compare";
    if (i < n) states[i] = "active";
    // Best window so far.
    if (highlightBest) for (let k = bestStart; k <= bestEnd; k++) states[k] = done ? "sorted" : "found";
    const pointers = i >= 0 && i < n && !done ? [{ index: i, label: "i" }] : [];
    steps.push({
      frame: {
        values: [...a],
        states,
        pointers,
        aux: [
          { label: "current sum", values: [cur] },
          { label: "best sum", values: [best] },
          { label: "best range", values: [`[${bestStart}..${bestEnd}]`] },
        ],
        note: `Kadane's algorithm — one pass, current vs. best`,
      },
      description,
      descriptionAr,
      codeLine,
      counters: { comparisons },
    });
  };

  frame(0, 0, true, `Start: current = best = a[0] = ${a[0]}. Best subarray is [0..0].`, 1, false, `البداية: current = best = a[0] = ${a[0]}. أفضل مصفوفة جزئية هي [0..0].`);

  for (let i = 1; i < n; i++) {
    comparisons++;
    // Extend the current subarray, or restart at a[i] if that's larger.
    const extend = cur + a[i];
    if (a[i] > extend) {
      cur = a[i];
      curStart = i;
      frame(i, curStart, false, `a[${i}] = ${a[i]} > current+a[i] = ${extend}: restart current subarray at index ${i} (current = ${cur}).`, 3, false, `a[${i}] = ${a[i]} > current+a[i] = ${extend}: ابدأ المصفوفة الجزئية الحالية من جديد عند الفهرس ${i} (current = ${cur}).`);
    } else {
      cur = cur + a[i];
      frame(i, curStart, false, `Extend: current = current + a[${i}] = ${cur}.`, 4, false, `مدّد: current = current + a[${i}] = ${cur}.`);
    }
    if (cur > best) {
      best = cur;
      bestStart = curStart;
      bestEnd = i;
      comparisons++;
      frame(i, curStart, true, `New best! best = ${best}, best subarray = [${bestStart}..${bestEnd}].`, 6, false, `أفضل قيمة جديدة! best = ${best}، أفضل مصفوفة جزئية = [${bestStart}..${bestEnd}].`);
    } else {
      frame(i, curStart, true, `current ${cur} ≤ best ${best}: best unchanged at [${bestStart}..${bestEnd}].`, 5, false, `current ${cur} ≤ best ${best}: تبقى best دون تغيير عند [${bestStart}..${bestEnd}].`);
    }
  }

  const sub = a.slice(bestStart, bestEnd + 1);
  frame(bestEnd, bestStart, true, `Maximum subarray sum = ${best} from a[${bestStart}..${bestEnd}] = [${sub.join(", ")}].`, 7, true, `أعظم مجموع لمصفوفة جزئية = ${best} من a[${bestStart}..${bestEnd}] = [${sub.join(", ")}].`);
  return steps;
}

function randomInput(level: number, rng: { int: (a: number, b: number) => number }): Input {
  const n = Math.min(14, 5 + level * 2);
  const values = Array.from({ length: n }, () => rng.int(-9, 9));
  // Guarantee at least one positive so the answer is interesting.
  if (values.every((v) => v <= 0)) values[rng.int(0, n - 1)] = rng.int(1, 9);
  return { values };
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "maximum-subarray",
  title: "Maximum Subarray (Kadane's)",
  titleAr: "أعظم مصفوفة جزئية (خوارزمية كادين)",
  category: "dynamic-programming",
  difficulty: "Beginner",
  tags: ["dynamic programming", "kadane", "array", "greedy dp"],
  tagsAr: ["البرمجة الديناميكية", "كادين", "مصفوفة", "برمجة ديناميكية جشعة"],
  summary: "Finds the contiguous subarray with the largest sum in a single linear pass using Kadane's algorithm.",
  summaryAr: "يجد المصفوفة الجزئية المتجاورة ذات المجموع الأكبر في مرور خطي واحد باستخدام خوارزمية كادين.",
  renderer: "array",
  pseudocode: [
    "procedure kadane(a)",
    "  cur = best = a[0]",
    "  for i = 1..n-1:",
    "    if a[i] > cur + a[i]: cur = a[i]   // restart",
    "    else: cur = cur + a[i]             // extend",
    "    if cur <= best: keep best",
    "    else: best = cur                   // new maximum",
    "  return best",
  ],
  code: {
    pseudocode: `cur = best = a[0]
for i in 1..n-1:
  cur = max(a[i], cur + a[i])
  best = max(best, cur)
return best`,
    c: `int maxSubArray(int* a, int n) {
    int cur = a[0], best = a[0];
    for (int i = 1; i < n; i++) {
        cur = a[i] > cur + a[i] ? a[i] : cur + a[i];
        if (cur > best) best = cur;
    }
    return best;
}`,
    cpp: `int maxSubArray(vector<int>& a) {
    int cur = a[0], best = a[0];
    for (int i = 1; i < (int)a.size(); i++) {
        cur = max(a[i], cur + a[i]);
        best = max(best, cur);
    }
    return best;
}`,
    java: `int maxSubArray(int[] a) {
    int cur = a[0], best = a[0];
    for (int i = 1; i < a.length; i++) {
        cur = Math.max(a[i], cur + a[i]);
        best = Math.max(best, cur);
    }
    return best;
}`,
    python: `def max_subarray(a):
    cur = best = a[0]
    for x in a[1:]:
        cur = max(x, cur + x)
        best = max(best, cur)
    return best`,
    javascript: `function maxSubArray(a) {
  let cur = a[0], best = a[0];
  for (let i = 1; i < a.length; i++) {
    cur = Math.max(a[i], cur + a[i]);
    best = Math.max(best, cur);
  }
  return best;
}`,
    typescript: `function maxSubArray(a: number[]): number {
  let cur = a[0], best = a[0];
  for (let i = 1; i < a.length; i++) {
    cur = Math.max(a[i], cur + a[i]);
    best = Math.max(best, cur);
  }
  return best;
}`,
    csharp: `int MaxSubArray(int[] a) {
    int cur = a[0], best = a[0];
    for (int i = 1; i < a.Length; i++) {
        cur = Math.Max(a[i], cur + a[i]);
        best = Math.Max(best, cur);
    }
    return best;
}`,
    go: `func maxSubArray(a []int) int {
	cur, best := a[0], a[0]
	for i := 1; i < len(a); i++ {
		if a[i] > cur+a[i] { cur = a[i] } else { cur = cur + a[i] }
		if cur > best { best = cur }
	}
	return best
}`,
    rust: `fn max_subarray(a: &[i32]) -> i32 {
    let mut cur = a[0];
    let mut best = a[0];
    for &x in &a[1..] {
        cur = x.max(cur + x);
        best = best.max(cur);
    }
    best
}`,
    kotlin: `fun maxSubArray(a: IntArray): Int {
    var cur = a[0]; var best = a[0]
    for (i in 1 until a.size) {
        cur = maxOf(a[i], cur + a[i])
        best = maxOf(best, cur)
    }
    return best
}`,
    swift: `func maxSubArray(_ a: [Int]) -> Int {
    var cur = a[0], best = a[0]
    for i in 1..<a.count {
        cur = max(a[i], cur + a[i])
        best = max(best, cur)
    }
    return best
}`,
  },
  content: {
    overview: `The maximum-subarray problem asks for the contiguous slice of an array whose elements sum to the largest possible value. For [−2, 1, −3, 4, −1, 2, 1, −5, 4] the best slice is [4, −1, 2, 1] with sum 6. When every number is negative, the answer is the single least-negative element.

Kadane's algorithm solves this in one pass with two running values. "current" is the best sum of a subarray ending exactly at the position being scanned; at each step you decide whether to extend that subarray (add the new element) or to start fresh at the new element — whichever gives a larger sum. "best" simply remembers the largest "current" ever seen. This is dynamic programming in disguise: current[i] = max(a[i], current[i−1] + a[i]), collapsed to O(1) space.`,
    howItWorks: [
      "Initialize current and best to the first element.",
      "Move left to right through the rest of the array.",
      "At index i, choose the larger of a[i] alone (restart) or current + a[i] (extend) — this is the new current.",
      "If current exceeds best, update best (and remember the subarray bounds).",
      "After the pass, best holds the maximum subarray sum.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n)", worst: "O(n)" },
      space: "O(1)",
      notes: "A single linear scan with constant extra memory. Tracking start/end indices to report the actual subarray adds only O(1) bookkeeping.",
    },
    applications: [
      "maximum-profit / best-window analysis over a time series",
      "signal processing (brightest contiguous region)",
      "genomic sequence scoring segments",
      "a building block inside 2-D maximum-submatrix algorithms",
    ],
    advantages: [
      "Optimal O(n) time — a single pass",
      "Constant extra space",
      "Simple to implement and reason about",
      "Extends to reporting the actual subarray bounds",
    ],
    disadvantages: [
      "Assumes contiguous subarrays only (not subsequences)",
      "The all-negative case needs careful initialization",
      "Does not directly generalize to non-contiguous or 2-D without extension",
    ],
    commonMistakes: [
      "Initializing best to 0, which breaks on all-negative arrays.",
      "Resetting current to 0 instead of a[i] when restarting.",
      "Confusing maximum subarray (contiguous) with maximum subsequence.",
      "Forgetting to update the recorded start index when restarting.",
    ],
    interviewQuestions: [
      "Why must best be initialized to a[0] rather than 0?",
      "How do you also return the start and end indices of the best subarray?",
      "How is Kadane's algorithm a form of dynamic programming?",
      "How would you adapt it to find the maximum-sum submatrix in a 2-D grid?",
      "What changes if the subarray must have at least length k?",
    ],
    summary:
      "Kadane's algorithm finds the maximum-sum contiguous subarray in O(n) time and O(1) space by keeping current = max(a[i], current + a[i]) and tracking the best value seen. It's the canonical linear DP and a frequent interview question.",
    quiz: [
      { question: "Kadane's algorithm runs in…", options: ["O(n log n)", "O(n)", "O(n^2)", "O(1)"], answer: 1, explanation: "It makes a single linear pass over the array." },
      { question: "The 'current' value represents…", options: ["The global maximum", "Best sum of a subarray ending at the current index", "The array total", "The smallest element"], answer: 1, explanation: "current is the best subarray sum ending exactly at i." },
      { question: "At each step, current becomes…", options: ["current + a[i] always", "max(a[i], current + a[i])", "min(a[i], current)", "a[i] only"], answer: 1, explanation: "You extend or restart, whichever is larger." },
      { question: "For an all-negative array, the answer is…", options: ["0", "The least-negative single element", "The sum of all elements", "Undefined"], answer: 1, explanation: "The best contiguous slice is the single largest (least negative) element." },
      { question: "Initializing best to 0 is a bug because…", options: ["It is slower", "It returns 0 for all-negative input instead of the true max", "It uses more memory", "It never terminates"], answer: 1, explanation: "0 would wrongly beat every negative subarray sum." },
    ],
  },
  contentAr: {
    overview: `تطرح مسألة أعظم مصفوفة جزئية السؤال التالي: ما الشريحة المتجاورة من المصفوفة التي يبلغ مجموع عناصرها أكبر قيمة ممكنة؟ من أجل [−2, 1, −3, 4, −1, 2, 1, −5, 4] أفضل شريحة هي [4, −1, 2, 1] بمجموع 6. عندما يكون كل عدد سالبًا، فالجواب هو العنصر الوحيد الأقل سلبية.

تحل خوارزمية كادين هذه المسألة في مرور واحد بقيمتين متجددتين. "current" هي أفضل مجموع لمصفوفة جزئية تنتهي بالضبط عند الموضع الجاري مسحه؛ في كل خطوة تقرر إما تمديد تلك المصفوفة الجزئية (إضافة العنصر الجديد) أو البدء من جديد عند العنصر الجديد — أيهما يعطي مجموعًا أكبر. "best" تتذكر ببساطة أكبر "current" شوهدت على الإطلاق. هذه برمجة ديناميكية متخفية: current[i] = max(a[i], current[i−1] + a[i])، مختزلة إلى مساحة O(1).`,
    howItWorks: [
      "هيّئ current و best بالعنصر الأول.",
      "تحرك من اليسار لليمين عبر بقية المصفوفة.",
      "عند الفهرس i، اختر الأكبر بين a[i] وحدها (إعادة بدء) أو current + a[i] (تمديد) — هذه هي current الجديدة.",
      "إذا تجاوزت current قيمة best، حدّث best (وتذكّر حدود المصفوفة الجزئية).",
      "بعد المرور، تحمل best أعظم مجموع لمصفوفة جزئية.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n)", worst: "O(n)" },
      space: "O(1)",
      notes: "مسح خطي واحد بذاكرة إضافية ثابتة. تتبّع فهرسي البداية والنهاية للإبلاغ عن المصفوفة الجزئية الفعلية يضيف محاسبة O(1) فقط.",
    },
    applications: [
      "تحليل أقصى ربح/أفضل نافذة عبر سلسلة زمنية",
      "معالجة الإشارات (أكثر منطقة متجاورة سطوعًا)",
      "تسجيل نقاط قطاعات تسلسل جينومي",
      "لبنة بناء داخل خوارزميات أعظم مصفوفة فرعية ثنائية الأبعاد",
    ],
    advantages: [
      "زمن O(n) أمثل — مرور واحد",
      "مساحة إضافية ثابتة",
      "بسيطة التنفيذ والفهم",
      "تمتد لتُبلغ عن حدود المصفوفة الجزئية الفعلية",
    ],
    disadvantages: [
      "تفترض مصفوفات جزئية متجاورة فقط (لا تتابعات فرعية)",
      "حالة كل الأعداد السالبة تحتاج تهيئة دقيقة",
      "لا تعمم مباشرة إلى حالات غير متجاورة أو ثنائية الأبعاد دون توسيع",
    ],
    commonMistakes: [
      "تهيئة best إلى 0، مما يفشل مع المصفوفات كلها سالبة.",
      "إعادة تعيين current إلى 0 بدلًا من a[i] عند إعادة البدء.",
      "الخلط بين أعظم مصفوفة جزئية (متجاورة) وأعظم تتابع فرعي.",
      "نسيان تحديث فهرس البداية المسجل عند إعادة البدء.",
    ],
    interviewQuestions: [
      "لماذا يجب تهيئة best إلى a[0] بدلًا من 0؟",
      "كيف تُعيد أيضًا فهرسي البداية والنهاية لأفضل مصفوفة جزئية؟",
      "كيف تُعد خوارزمية كادين شكلًا من البرمجة الديناميكية؟",
      "كيف تُكيّفها لإيجاد أعظم مصفوفة فرعية ثنائية الأبعاد في شبكة؟",
      "ماذا يتغير إذا وجب أن يكون طول المصفوفة الجزئية k على الأقل؟",
    ],
    summary:
      "تجد خوارزمية كادين أعظم مجموع لمصفوفة جزئية متجاورة بزمن O(n) ومساحة O(1) بالاحتفاظ بـ current = max(a[i], current + a[i]) وتتبّع أفضل قيمة شوهدت. إنها البرمجة الديناميكية الخطية الكلاسيكية وسؤال مقابلات شائع.",
    quiz: [
      { question: "تعمل خوارزمية كادين بزمن…", options: ["O(n log n)", "O(n)", "O(n^2)", "O(1)"], answer: 1, explanation: "تُجري مرورًا خطيًا واحدًا عبر المصفوفة." },
      { question: "تمثّل القيمة 'current'…", options: ["الحد الأقصى الكلي", "أفضل مجموع لمصفوفة جزئية تنتهي عند الفهرس الحالي", "مجموع المصفوفة كاملة", "أصغر عنصر"], answer: 1, explanation: "current هي أفضل مجموع لمصفوفة جزئية تنتهي بالضبط عند i." },
      { question: "في كل خطوة، تصبح current…", options: ["current + a[i] دائمًا", "max(a[i], current + a[i])", "min(a[i], current)", "a[i] فقط"], answer: 1, explanation: "تُمدّد أو تعيد البدء، أيهما أكبر." },
      { question: "لمصفوفة كلها سالبة، الجواب هو…", options: ["0", "العنصر الوحيد الأقل سلبية", "مجموع كل العناصر", "غير معرّف"], answer: 1, explanation: "أفضل شريحة متجاورة هي العنصر الأكبر (الأقل سلبية) وحده." },
      { question: "تهيئة best إلى 0 خطأ لأن…", options: ["أبطأ", "تُعيد 0 للمدخلات كلها سالبة بدلًا من الحد الأقصى الحقيقي", "تستخدم ذاكرة أكثر", "لا تتوقف أبدًا"], answer: 1, explanation: "ستتغلب 0 خطأً على كل مجموع مصفوفة جزئية سالب." },
    ],
  },
  inputFields: [
    { key: "values", label: "Array (may include negatives)", placeholder: "-2, 1, -3, 4, -1, 2, 1, -5, 4", help: "Comma-separated integers, up to 50." },
  ],
  defaultInput: (level, rng) => randomInput(level, rng),
  parseInput: (fields) => {
    const values = (fields.values ?? "")
      .split(/[,\s]+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const v = Number(p);
        if (!Number.isFinite(v) || !Number.isInteger(v)) throw new Error(`"${p}" is not a whole number.`);
        return v;
      });
    if (values.length < 1) throw new Error("Enter at least one number.");
    if (values.length > 50) throw new Error("Maximum 50 numbers.");
    return { values };
  },
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate,
};

export default mod;
