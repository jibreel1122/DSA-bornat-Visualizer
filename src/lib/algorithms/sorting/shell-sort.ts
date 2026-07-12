import type { AlgorithmModule, ArrayFrame, CellState, Step } from "@/lib/engine/types";
import { randomArray } from "@/lib/engine/random";
import { parseNumberList } from "@/lib/utils";

type Input = { values: number[] };

function frame(values: number[], states: Record<number, CellState>, note?: string, pointers?: { index: number; label: string }[]): ArrayFrame {
  return { values: [...values], states: { ...states }, note, pointers };
}

function generate(input: Input): Step<ArrayFrame>[] {
  const a = [...input.values];
  const n = a.length;
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;
  let shifts = 0;
  const counters = () => ({ comparisons, shifts });

  steps.push({ frame: frame(a, {}, "gap sequence: n/2, n/4, … 1"), description: `Shell sort runs insertion sort on elements spaced by a shrinking gap.`, descriptionAr: `ترتيب شل يُشغّل ترتيب الإدراج على عناصر متباعدة بفجوة متقلصة.`, codeLine: 0, counters: counters() });

  for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
    steps.push({ frame: frame(a, {}, `gap = ${gap}`), description: `Start a pass with gap ${gap}.`, descriptionAr: `ابدأ مرورًا بفجوة ${gap}.`, codeLine: 1, counters: counters() });
    for (let i = gap; i < n; i++) {
      const key = a[i];
      let j = i;
      steps.push({ frame: frame(a, { [i]: "active" }, `gap = ${gap}`, [{ index: i, label: "i" }]), description: `Take key a[${i}] = ${key}; compare backwards in steps of ${gap}.`, descriptionAr: `خذ المفتاح a[${i}] = ${key}؛ قارن للخلف بخطوات مقدارها ${gap}.`, codeLine: 2, counters: counters() });
      while (j >= gap) {
        comparisons++;
        steps.push({ frame: frame(a, { [j - gap]: "compare", [j]: "active" }, `gap = ${gap}`), description: `Compare a[${j - gap}] = ${a[j - gap]} with key ${key}.`, descriptionAr: `قارن a[${j - gap}] = ${a[j - gap]} مع المفتاح ${key}.`, codeLine: 3, counters: counters() });
        if (a[j - gap] > key) {
          a[j] = a[j - gap];
          shifts++;
          steps.push({ frame: frame(a, { [j]: "swap", [j - gap]: "swap" }, `gap = ${gap}`), description: `${a[j]} > ${key}, shift it forward by ${gap}.`, descriptionAr: `${a[j]} > ${key}، أزحه للأمام بمقدار ${gap}.`, codeLine: 4, counters: counters() });
          j -= gap;
        } else break;
      }
      a[j] = key;
      steps.push({ frame: frame(a, { [j]: "found" }, `gap = ${gap}`), description: `Place key ${key} at index ${j}.`, descriptionAr: `ضع المفتاح ${key} عند الفهرس ${j}.`, codeLine: 5, counters: counters() });
    }
  }
  const sorted: Record<number, CellState> = {};
  for (let i = 0; i < n; i++) sorted[i] = "sorted";
  steps.push({ frame: frame(a, sorted), description: `Sorted! Gaps let elements move long distances early, beating plain insertion sort.`, descriptionAr: `اكتمل الترتيب! الفجوات تتيح للعناصر التحرك مسافات طويلة مبكرًا، متفوقة على ترتيب الإدراج البسيط.`, codeLine: 6, counters: counters() });
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "shell-sort",
  title: "Shell Sort",
  titleAr: "ترتيب شل",
  category: "sorting",
  difficulty: "Intermediate",
  tags: ["gap sequence", "in-place", "adaptive", "insertion-based"],
  tagsAr: ["متتالية فجوات", "في المكان", "متكيّف", "قائم على الإدراج"],
  summary: "Generalizes insertion sort by comparing elements a shrinking gap apart, moving them long distances early.",
  summaryAr: "يُعمّم ترتيب الإدراج بمقارنة عناصر متباعدة بفجوة متقلصة، فتتحرك مسافات طويلة مبكرًا.",
  renderer: "array",
  pseudocode: [
    "procedure shellSort(a[0..n-1])",
    "  for gap = n/2 down to 1 (halving):",
    "    for i = gap to n-1:  key = a[i]; j = i",
    "      while j >= gap and a[j-gap] > key:",
    "        a[j] = a[j-gap]; j -= gap   // gapped shift",
    "      a[j] = key                    // insert",
    "  return a",
  ],
  code: {
    pseudocode: `procedure shellSort(a, n)
  gap = n / 2
  while gap > 0:
    for i = gap to n-1:
      key = a[i]; j = i
      while j >= gap and a[j-gap] > key:
        a[j] = a[j-gap]; j -= gap
      a[j] = key
    gap = gap / 2`,
    c: `void shell_sort(int a[], int n) {
    for (int gap = n/2; gap > 0; gap /= 2)
        for (int i = gap; i < n; i++) {
            int key = a[i], j = i;
            while (j >= gap && a[j-gap] > key) { a[j] = a[j-gap]; j -= gap; }
            a[j] = key;
        }
}`,
    cpp: `void shellSort(std::vector<int>& a) {
    int n = a.size();
    for (int gap = n/2; gap > 0; gap /= 2)
        for (int i = gap; i < n; ++i) {
            int key = a[i], j = i;
            while (j >= gap && a[j-gap] > key) { a[j] = a[j-gap]; j -= gap; }
            a[j] = key;
        }
}`,
    java: `static void shellSort(int[] a) {
    int n = a.length;
    for (int gap = n/2; gap > 0; gap /= 2)
        for (int i = gap; i < n; i++) {
            int key = a[i], j = i;
            while (j >= gap && a[j-gap] > key) { a[j] = a[j-gap]; j -= gap; }
            a[j] = key;
        }
}`,
    python: `def shell_sort(a: list[int]) -> list[int]:
    n = len(a)
    gap = n // 2
    while gap > 0:
        for i in range(gap, n):
            key, j = a[i], i
            while j >= gap and a[j-gap] > key:
                a[j] = a[j-gap]; j -= gap
            a[j] = key
        gap //= 2
    return a`,
    javascript: `function shellSort(a) {
  const n = a.length;
  for (let gap = n >> 1; gap > 0; gap >>= 1)
    for (let i = gap; i < n; i++) {
      const key = a[i]; let j = i;
      while (j >= gap && a[j-gap] > key) { a[j] = a[j-gap]; j -= gap; }
      a[j] = key;
    }
  return a;
}`,
    typescript: `function shellSort(a: number[]): number[] {
  const n = a.length;
  for (let gap = n >> 1; gap > 0; gap >>= 1)
    for (let i = gap; i < n; i++) {
      const key = a[i]; let j = i;
      while (j >= gap && a[j-gap] > key) { a[j] = a[j-gap]; j -= gap; }
      a[j] = key;
    }
  return a;
}`,
    csharp: `static void ShellSort(int[] a) {
    int n = a.Length;
    for (int gap = n/2; gap > 0; gap /= 2)
        for (int i = gap; i < n; i++) {
            int key = a[i], j = i;
            while (j >= gap && a[j-gap] > key) { a[j] = a[j-gap]; j -= gap; }
            a[j] = key;
        }
}`,
    go: `func shellSort(a []int) {
	n := len(a)
	for gap := n / 2; gap > 0; gap /= 2 {
		for i := gap; i < n; i++ {
			key, j := a[i], i
			for j >= gap && a[j-gap] > key {
				a[j] = a[j-gap]
				j -= gap
			}
			a[j] = key
		}
	}
}`,
    rust: `fn shell_sort(a: &mut [i32]) {
    let n = a.len();
    let mut gap = n / 2;
    while gap > 0 {
        for i in gap..n {
            let key = a[i];
            let mut j = i;
            while j >= gap && a[j - gap] > key { a[j] = a[j - gap]; j -= gap; }
            a[j] = key;
        }
        gap /= 2;
    }
}`,
    kotlin: `fun shellSort(a: IntArray) {
    val n = a.size
    var gap = n / 2
    while (gap > 0) {
        for (i in gap until n) {
            val key = a[i]; var j = i
            while (j >= gap && a[j-gap] > key) { a[j] = a[j-gap]; j -= gap }
            a[j] = key
        }
        gap /= 2
    }
}`,
    swift: `func shellSort(_ a: inout [Int]) {
    let n = a.count
    var gap = n / 2
    while gap > 0 {
        for i in gap..<n {
            let key = a[i]; var j = i
            while j >= gap && a[j-gap] > key { a[j] = a[j-gap]; j -= gap }
            a[j] = key
        }
        gap /= 2
    }
}`,
  },
  content: {
    overview: `Shell sort is a generalization of insertion sort that allows elements to move far across the array in a single step. Plain insertion sort only ever swaps adjacent elements, so a small value stuck at the end takes many moves to reach the front. Shell sort fixes this by first sorting elements that are a large "gap" apart, then repeatedly shrinking the gap until it reaches 1 — at which point the array is nearly sorted and the final insertion pass is cheap.

Its performance depends heavily on the gap sequence. The simple halving sequence (n/2, n/4, …, 1) shown here is easy to understand but not optimal; sequences like Ciura's or Sedgewick's push it well below O(n²). Shell sort is in-place, reasonably fast on medium arrays, and was historically important as a simple sub-quadratic sort.`,
    howItWorks: [
      "Choose a starting gap (here, n/2).",
      "Run an insertion sort where compared elements are 'gap' positions apart instead of adjacent.",
      "Long-range shifts move out-of-place elements most of the way home early.",
      "Halve the gap and repeat, each pass leaving the array 'more sorted'.",
      "The final pass with gap 1 is an ordinary insertion sort on nearly-sorted data — fast.",
    ],
    complexity: {
      time: { best: "O(n log n)", average: "≈O(n^1.25)", worst: "O(n²)" },
      space: "O(1)",
      notes: "Complexity depends on the gap sequence. Halving gives O(n²) worst case; better sequences (Ciura, Sedgewick) achieve around O(n^1.3) or better. In-place, O(1) extra memory.",
    },
    applications: [
      "Medium-sized arrays where a simple, in-place, sub-quadratic sort is wanted",
      "Embedded systems (small code, no recursion, no extra memory)",
      "Situations avoiding recursion/stack usage of quicksort/merge sort",
      "As a teaching bridge between insertion sort and advanced sorts",
    ],
    advantages: [
      "In-place with O(1) extra memory",
      "Much faster than plain insertion sort on larger inputs",
      "Simple, iterative, no recursion",
      "Adaptive — benefits from partial order",
    ],
    disadvantages: [
      "Not stable",
      "Performance is very sensitive to the gap sequence",
      "Worst case O(n²) with poor gaps",
      "Harder to analyze than most sorts",
    ],
    commonMistakes: [
      "Using a poor gap sequence and expecting O(n log n).",
      "Off-by-one errors in the gapped inner loop (j >= gap).",
      "Assuming shell sort is stable — the long jumps reorder equal keys.",
      "Forgetting the final gap must reach 1.",
    ],
    interviewQuestions: [
      "Why does shell sort outperform plain insertion sort?",
      "How does the choice of gap sequence affect complexity?",
      "Is shell sort stable? Why or why not?",
      "Why is the final pass (gap = 1) always cheap?",
    ],
    summary:
      "Shell sort is gapped insertion sort: it sorts elements a large gap apart, then shrinks the gap to 1, letting values travel long distances early. In-place and O(1) space, with complexity between O(n log n) and O(n²) depending on the gap sequence.",
    quiz: [
      { question: "Shell sort is a generalization of which algorithm?", options: ["Merge sort", "Insertion sort", "Quick sort", "Heap sort"], answer: 1, explanation: "It performs insertion sort on elements a gap apart, shrinking the gap to 1." },
      { question: "What mainly determines shell sort's running time?", options: ["The pivot", "The gap sequence", "The recursion depth", "The alphabet size"], answer: 1, explanation: "Different gap sequences yield very different asymptotic bounds." },
      { question: "Why is the gap = 1 pass fast?", options: ["It is skipped", "The array is already nearly sorted by then", "It uses binary search", "It sorts in place"], answer: 1, explanation: "Earlier gapped passes leave few remaining inversions for the final insertion pass." },
      { question: "Shell sort's extra space usage is…", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 0, explanation: "It sorts in place with only a few index variables." },
      { question: "Shell sort is…", options: ["stable", "unstable", "always O(n log n)", "recursive"], answer: 1, explanation: "Long-distance moves can reorder equal keys, so it is not stable." },
    ],
  },
  contentAr: {
    overview: `ترتيب شل تعميم لترتيب الإدراج يسمح للعناصر بالتحرك مسافات بعيدة عبر المصفوفة بخطوة واحدة. ترتيب الإدراج البسيط يبدّل فقط العناصر المتجاورة، فقيمة صغيرة عالقة في النهاية تحتاج حركات كثيرة للوصول إلى المقدمة. يعالج ترتيب شل هذا بترتيب العناصر المتباعدة بـ"فجوة" كبيرة أولًا، ثم تقليص الفجوة مرارًا حتى تصل إلى 1 — عندها تكون المصفوفة شبه مرتبة ويصبح مرور الإدراج الأخير رخيصًا.

يعتمد أداؤه بشدة على متتالية الفجوات. متتالية التنصيف البسيطة (n/2، n/4، …، 1) الموضحة هنا سهلة الفهم لكنها ليست مثلى؛ متتاليات مثل متتالية Ciura أو Sedgewick تدفعه إلى ما دون O(n²) بكثير. ترتيب شل في المكان، سريع بشكل معقول على المصفوفات المتوسطة، وكان مهمًا تاريخيًا كترتيب بسيط دون التربيعي.`,
    howItWorks: [
      "اختر فجوة بداية (هنا، n/2).",
      "شغّل ترتيب إدراج حيث تكون العناصر المقارَنة متباعدة بمقدار 'الفجوة' بدلًا من التجاور.",
      "الإزاحات بعيدة المدى تنقل العناصر غير الموضوعة معظم الطريق إلى موضعها مبكرًا.",
      "قلّص الفجوة إلى النصف وكرر، كل مرور يترك المصفوفة 'أكثر ترتيبًا'.",
      "المرور الأخير بفجوة 1 هو ترتيب إدراج عادي على بيانات شبه مرتبة — سريع.",
    ],
    complexity: {
      time: { best: "O(n log n)", average: "≈O(n^1.25)", worst: "O(n²)" },
      space: "O(1)",
      notes: "التعقيد يعتمد على متتالية الفجوات. التنصيف يعطي أسوأ حالة O(n²)؛ المتتاليات الأفضل (Ciura، Sedgewick) تحقق نحو O(n^1.3) أو أفضل. في المكان، ذاكرة إضافية O(1).",
    },
    applications: [
      "المصفوفات المتوسطة الحجم حيث يُرغب بترتيب بسيط في المكان دون التربيعي",
      "الأنظمة المدمجة (كود صغير، دون عودية، دون ذاكرة إضافية)",
      "المواقف التي تتجنب استخدام العودية/المكدس في الترتيب السريع/الترتيب بالدمج",
      "كجسر تدريسي بين ترتيب الإدراج والترتيبات المتقدمة",
    ],
    advantages: [
      "في المكان بذاكرة إضافية O(1)",
      "أسرع بكثير من ترتيب الإدراج البسيط على المدخلات الأكبر",
      "بسيط، تكراري، دون عودية",
      "متكيّف — يستفيد من الترتيب الجزئي",
    ],
    disadvantages: [
      "غير مستقر",
      "الأداء حساس جدًا لمتتالية الفجوات",
      "أسوأ حالة O(n²) مع فجوات سيئة",
      "أصعب في التحليل من معظم الترتيبات",
    ],
    commonMistakes: [
      "استخدام متتالية فجوات سيئة وتوقّع O(n log n).",
      "أخطاء انزياح بمقدار واحد في الحلقة الداخلية ذات الفجوة (j >= gap).",
      "افتراض أن ترتيب شل مستقر — القفزات الطويلة تعيد ترتيب المفاتيح المتساوية.",
      "نسيان أن الفجوة الأخيرة يجب أن تصل إلى 1.",
    ],
    interviewQuestions: [
      "لماذا يتفوق ترتيب شل على ترتيب الإدراج البسيط؟",
      "كيف يؤثر اختيار متتالية الفجوات على التعقيد؟",
      "هل ترتيب شل مستقر؟ لماذا أو لماذا لا؟",
      "لماذا المرور الأخير (فجوة = 1) رخيص دائمًا؟",
    ],
    summary:
      "ترتيب شل هو ترتيب إدراج بفجوات: يرتب العناصر المتباعدة بفجوة كبيرة، ثم يقلّص الفجوة إلى 1، مما يتيح للقيم قطع مسافات طويلة مبكرًا. في المكان ومساحة O(1)، بتعقيد بين O(n log n) وO(n²) حسب متتالية الفجوات.",
    quiz: [
      { question: "ترتيب شل هو تعميم لأي خوارزمية؟", options: ["الترتيب بالدمج", "ترتيب الإدراج", "الترتيب السريع", "ترتيب الكومة"], answer: 1, explanation: "يُجري ترتيب إدراج على عناصر متباعدة بفجوة، مقلّصًا الفجوة إلى 1." },
      { question: "ما الذي يحدد بشكل رئيسي زمن تشغيل ترتيب شل؟", options: ["المحور", "متتالية الفجوات", "عمق العودية", "حجم الأبجدية"], answer: 1, explanation: "متتاليات الفجوات المختلفة تعطي حدودًا تقاربية مختلفة جدًا." },
      { question: "لماذا يكون مرور الفجوة = 1 سريعًا؟", options: ["يُتخطى", "المصفوفة تكون شبه مرتبة بحلول ذلك الوقت", "يستخدم البحث الثنائي", "يرتب في المكان"], answer: 1, explanation: "المرورات ذات الفجوات السابقة تترك انقلابات قليلة متبقية للمرور الأخير بالإدراج." },
      { question: "استخدام ترتيب شل للذاكرة الإضافية هو…", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 0, explanation: "يرتب في المكان بمتغيرات فهرسة قليلة فقط." },
      { question: "ترتيب شل…", options: ["مستقر", "غير مستقر", "دائمًا O(n log n)", "عودي"], answer: 1, explanation: "الحركات بعيدة المدى قد تعيد ترتيب المفاتيح المتساوية، فهو غير مستقر." },
    ],
  },
  inputFields: [{ key: "values", label: "Array values", placeholder: "e.g. 23, 12, 1, 8, 34, 54, 2, 3", help: "2–40 numbers." }],
  defaultInput: (level, rng) => ({ values: randomArray(level, rng) }),
  parseInput: (fields) => {
    const values = parseNumberList(fields.values ?? "", { min: -999, max: 999, maxLen: 40 });
    if (values.length < 2) throw new Error("Enter at least 2 numbers to sort.");
    return { values };
  },
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate,
};

export default mod;
