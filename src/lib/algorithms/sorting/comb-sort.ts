import type { AlgorithmModule, ArrayFrame, CellState, Step } from "@/lib/engine/types";
import { randomArray } from "@/lib/engine/random";
import { parseNumberList } from "@/lib/utils";
import { arrayFrame } from "../step-helpers";

type Input = { values: number[] };

function generate(input: Input): Step<ArrayFrame>[] {
  const a = [...input.values];
  const n = a.length;
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;
  let swaps = 0;
  const c = () => ({ comparisons, swaps });
  const SHRINK = 1.3;

  steps.push({ frame: arrayFrame(a, {}, { note: `gap = ${n}` }), description: `Comb sort compares elements a large gap apart, shrinking the gap by 1.3× each pass.`, descriptionAr: `ترتيب المشط يقارن عناصر متباعدة بفجوة كبيرة، مقلّصًا الفجوة بمعامل 1.3× في كل مرور.`, codeLine: 0, counters: c() });

  let gap = n;
  let swapped = true;
  while (gap > 1 || swapped) {
    gap = Math.floor(gap / SHRINK);
    if (gap < 1) gap = 1;
    swapped = false;
    for (let i = 0; i + gap < n; i++) {
      comparisons++;
      steps.push({ frame: arrayFrame(a, { [i]: "compare", [i + gap]: "compare" }, { note: `gap = ${gap}` }), description: `Compare a[${i}] = ${a[i]} with a[${i + gap}] = ${a[i + gap]} (gap ${gap}).`, descriptionAr: `قارن a[${i}] = ${a[i]} مع a[${i + gap}] = ${a[i + gap]} (فجوة ${gap}).`, codeLine: 2, counters: c() });
      if (a[i] > a[i + gap]) {
        [a[i], a[i + gap]] = [a[i + gap], a[i]];
        swaps++;
        swapped = true;
        steps.push({ frame: arrayFrame(a, { [i]: "swap", [i + gap]: "swap" }, { note: `gap = ${gap}` }), description: `Out of order — swap across the gap.`, descriptionAr: `غير مرتب — بدّل عبر الفجوة.`, codeLine: 3, counters: c() });
      }
    }
  }
  const sorted: Record<number, CellState> = {};
  for (let i = 0; i < n; i++) sorted[i] = "sorted";
  steps.push({ frame: { values: [...a], states: sorted }, description: `Sorted! Large gaps kill 'turtles' early; gap 1 finishes like bubble sort.`, descriptionAr: `اكتمل الترتيب! الفجوات الكبيرة تقضي على 'السلاحف' مبكرًا؛ الفجوة 1 تنهي العمل كالترتيب الفقاعي.`, codeLine: 4, counters: c() });
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "comb-sort",
  title: "Comb Sort",
  titleAr: "ترتيب المشط",
  category: "sorting",
  difficulty: "Beginner",
  tags: ["gap sequence", "bubble variant", "in-place", "unstable"],
  tagsAr: ["متتالية فجوات", "مشتق من الفقاعي", "في المكان", "غير مستقر"],
  summary: "Improves bubble sort by comparing elements a shrinking gap apart, eliminating small trailing values fast.",
  summaryAr: "يحسّن الترتيب الفقاعي بمقارنة عناصر متباعدة بفجوة متقلصة، فيقضي على القيم الصغيرة المتأخرة بسرعة.",
  renderer: "array",
  pseudocode: [
    "procedure combSort(a)",
    "  gap = n; swapped = true",
    "  while gap > 1 or swapped:",
    "    gap = max(1, floor(gap / 1.3))",
    "    for i = 0 to n-gap-1:",
    "      if a[i] > a[i+gap]: swap; swapped = true",
    "  return a",
  ],
  code: {
    pseudocode: `gap = n; swapped = true
while gap > 1 or swapped:
  gap = max(1, floor(gap / 1.3))
  swapped = false
  for i in 0..n-gap-1:
    if a[i] > a[i+gap]: swap(a[i], a[i+gap]); swapped = true`,
    c: `void comb_sort(int a[], int n) {
    int gap = n, swapped = 1;
    while (gap > 1 || swapped) {
        gap = (int)(gap / 1.3); if (gap < 1) gap = 1;
        swapped = 0;
        for (int i = 0; i + gap < n; i++)
            if (a[i] > a[i+gap]) { int t=a[i];a[i]=a[i+gap];a[i+gap]=t; swapped=1; }
    }
}`,
    cpp: `void combSort(std::vector<int>& a) {
    int n = a.size(), gap = n; bool swapped = true;
    while (gap > 1 || swapped) {
        gap = std::max(1, (int)(gap / 1.3));
        swapped = false;
        for (int i = 0; i + gap < n; i++)
            if (a[i] > a[i+gap]) { std::swap(a[i], a[i+gap]); swapped = true; }
    }
}`,
    java: `static void combSort(int[] a) {
    int n = a.length, gap = n; boolean swapped = true;
    while (gap > 1 || swapped) {
        gap = Math.max(1, (int)(gap / 1.3));
        swapped = false;
        for (int i = 0; i + gap < n; i++)
            if (a[i] > a[i+gap]) { int t=a[i];a[i]=a[i+gap];a[i+gap]=t; swapped=true; }
    }
}`,
    python: `def comb_sort(a: list[int]) -> list[int]:
    n, gap, swapped = len(a), len(a), True
    while gap > 1 or swapped:
        gap = max(1, int(gap / 1.3))
        swapped = False
        for i in range(n - gap):
            if a[i] > a[i+gap]:
                a[i], a[i+gap] = a[i+gap], a[i]; swapped = True
    return a`,
    javascript: `function combSort(a) {
  const n = a.length;
  let gap = n, swapped = true;
  while (gap > 1 || swapped) {
    gap = Math.max(1, Math.floor(gap / 1.3));
    swapped = false;
    for (let i = 0; i + gap < n; i++)
      if (a[i] > a[i+gap]) { [a[i],a[i+gap]]=[a[i+gap],a[i]]; swapped = true; }
  }
  return a;
}`,
    typescript: `function combSort(a: number[]): number[] {
  const n = a.length;
  let gap = n, swapped = true;
  while (gap > 1 || swapped) {
    gap = Math.max(1, Math.floor(gap / 1.3));
    swapped = false;
    for (let i = 0; i + gap < n; i++)
      if (a[i] > a[i+gap]) { [a[i],a[i+gap]]=[a[i+gap],a[i]]; swapped = true; }
  }
  return a;
}`,
    csharp: `static void CombSort(int[] a) {
    int n = a.Length, gap = n; bool swapped = true;
    while (gap > 1 || swapped) {
        gap = Math.Max(1, (int)(gap / 1.3));
        swapped = false;
        for (int i = 0; i + gap < n; i++)
            if (a[i] > a[i+gap]) { (a[i],a[i+gap])=(a[i+gap],a[i]); swapped = true; }
    }
}`,
    go: `func combSort(a []int) {
	n, gap, swapped := len(a), len(a), true
	for gap > 1 || swapped {
		gap = int(float64(gap) / 1.3)
		if gap < 1 { gap = 1 }
		swapped = false
		for i := 0; i+gap < n; i++ {
			if a[i] > a[i+gap] { a[i], a[i+gap] = a[i+gap], a[i]; swapped = true }
		}
	}
}`,
    rust: `fn comb_sort(a: &mut [i32]) {
    let n = a.len();
    let mut gap = n;
    let mut swapped = true;
    while gap > 1 || swapped {
        gap = ((gap as f64) / 1.3) as usize;
        if gap < 1 { gap = 1; }
        swapped = false;
        for i in 0..n - gap {
            if a[i] > a[i + gap] { a.swap(i, i + gap); swapped = true; }
        }
    }
}`,
    kotlin: `fun combSort(a: IntArray) {
    val n = a.size; var gap = n; var swapped = true
    while (gap > 1 || swapped) {
        gap = maxOf(1, (gap / 1.3).toInt())
        swapped = false
        for (i in 0 until n - gap)
            if (a[i] > a[i+gap]) { val t=a[i];a[i]=a[i+gap];a[i+gap]=t; swapped = true }
    }
}`,
    swift: `func combSort(_ a: inout [Int]) {
    let n = a.count; var gap = n; var swapped = true
    while gap > 1 || swapped {
        gap = max(1, Int(Double(gap) / 1.3))
        swapped = false
        for i in 0..<(n - gap) where a[i] > a[i+gap] { a.swapAt(i, i+gap); swapped = true }
    }
}`,
  },
  content: {
    overview: `Comb sort is an improvement on bubble sort invented to solve the same "turtle" problem: small values near the end of the array that bubble sort moves only one slot per pass. Comb sort starts by comparing elements that are a large gap apart and shrinks that gap by a fixed factor (empirically ~1.3) on each pass, finishing with gap 1 where it behaves exactly like bubble sort.

The large initial gaps let out-of-place elements jump most of the way to their destination immediately, dramatically reducing the number of passes. With the 1.3 shrink factor, comb sort typically runs close to O(n log n) in practice, though its worst case is still O(n²).`,
    howItWorks: [
      "Start with a gap equal to the array length.",
      "Shrink the gap by dividing by ~1.3 (never below 1).",
      "Compare and swap elements that are 'gap' positions apart across the array.",
      "Repeat, shrinking the gap each round, so turtles jump far early.",
      "Keep going until the gap is 1 and a full pass produces no swaps.",
    ],
    complexity: {
      time: { best: "O(n log n)", average: "≈O(n²/2^p)", worst: "O(n²)" },
      space: "O(1)",
      notes: "The 1.3 shrink factor gives good average performance (often near O(n log n)); worst case is still O(n²). In-place, O(1) extra memory.",
    },
    applications: [
      "A simple drop-in improvement over bubble sort",
      "Small to medium arrays needing in-place sorting",
      "Teaching gap-based improvements to elementary sorts",
      "Embedded contexts favoring tiny, non-recursive code",
    ],
    advantages: [
      "Much faster than bubble sort by eliminating turtles early",
      "In-place, O(1) memory",
      "Simple and non-recursive",
      "Good average-case performance with the 1.3 factor",
    ],
    disadvantages: [
      "Not stable",
      "Worst case remains O(n²)",
      "Performance depends on the shrink factor",
      "Still slower than quicksort/merge sort in general",
    ],
    commonMistakes: [
      "Letting the gap drop below 1.",
      "Stopping the loop before the gap reaches 1 with a final no-swap pass.",
      "Using a shrink factor far from 1.3, hurting performance.",
      "Assuming it's stable — the gap swaps reorder equal keys.",
    ],
    interviewQuestions: [
      "What is the 'turtle' problem and how does comb sort address it?",
      "Why is 1.3 the commonly chosen shrink factor?",
      "How does comb sort relate to shell sort?",
      "What is comb sort's worst-case complexity?",
    ],
    summary:
      "Comb sort is bubble sort with a shrinking gap (÷1.3 each pass), letting distant elements swap early to eliminate turtles. In-place and O(1) space, it averages near O(n log n) but has an O(n²) worst case and is not stable.",
    quiz: [
      { question: "Comb sort improves bubble sort by…", options: ["Using recursion", "Comparing elements a shrinking gap apart", "Sorting from both ends", "Counting values"], answer: 1, explanation: "Large gaps let out-of-place elements jump far, killing turtles early." },
      { question: "The commonly used gap shrink factor is about…", options: ["1.3", "2.0", "0.5", "10"], answer: 0, explanation: "Empirically, dividing the gap by ~1.3 each pass works best." },
      { question: "When the gap reaches 1, comb sort behaves like…", options: ["Merge sort", "Bubble sort", "Quick sort", "Counting sort"], answer: 1, explanation: "Adjacent comparisons at gap 1 are exactly a bubble-sort pass." },
      { question: "Comb sort's worst-case time is…", options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"], answer: 2, explanation: "Despite good averages, adversarial input still yields quadratic time." },
      { question: "Comb sort is…", options: ["stable", "unstable", "out-of-place", "recursive"], answer: 1, explanation: "Swaps across gaps can reorder equal keys, so it is not stable." },
    ],
  },
  contentAr: {
    overview: `ترتيب المشط تحسين على الترتيب الفقاعي ابتُكر لحل مشكلة "السلحفاة" ذاتها: القيم الصغيرة قرب نهاية المصفوفة التي يحرّكها الترتيب الفقاعي خانة واحدة فقط في كل مرور. يبدأ ترتيب المشط بمقارنة عناصر متباعدة بفجوة كبيرة ويقلّص تلك الفجوة بمعامل ثابت (تجريبيًا نحو 1.3) في كل مرور، منتهيًا بفجوة 1 حيث يتصرف تمامًا كالترتيب الفقاعي.

الفجوات الابتدائية الكبيرة تتيح للعناصر غير الموضوعة القفز معظم الطريق إلى وجهتها فورًا، ما يقلّل عدد المرورات كثيرًا. بمعامل التقليص 1.3، يعمل ترتيب المشط عادة قريبًا من O(n log n) عمليًا، رغم أن أسوأ حالته تبقى O(n²).`,
    howItWorks: [
      "ابدأ بفجوة تساوي طول المصفوفة.",
      "قلّص الفجوة بالقسمة على ~1.3 (لا تقل أبدًا عن 1).",
      "قارن وبدّل العناصر المتباعدة بمقدار 'الفجوة' عبر المصفوفة.",
      "كرر، مقلّصًا الفجوة كل جولة، بحيث تقفز السلاحف بعيدًا مبكرًا.",
      "استمر حتى تصبح الفجوة 1 ويُجري مرور كامل دون أي تبديل.",
    ],
    complexity: {
      time: { best: "O(n log n)", average: "≈O(n²/2^p)", worst: "O(n²)" },
      space: "O(1)",
      notes: "معامل التقليص 1.3 يعطي أداءً متوسطًا جيدًا (غالبًا قريبًا من O(n log n))؛ أسوأ حالة تبقى O(n²). في المكان، ذاكرة إضافية O(1).",
    },
    applications: [
      "تحسين بسيط سهل التطبيق على الترتيب الفقاعي",
      "المصفوفات الصغيرة إلى المتوسطة التي تحتاج ترتيبًا في المكان",
      "تدريس التحسينات القائمة على الفجوات للترتيبات الأولية",
      "السياقات المدمجة المفضّلة للكود الصغير غير العودي",
    ],
    advantages: [
      "أسرع بكثير من الترتيب الفقاعي بالقضاء على السلاحف مبكرًا",
      "في المكان، ذاكرة O(1)",
      "بسيط وغير عودي",
      "أداء متوسط جيد بمعامل 1.3",
    ],
    disadvantages: [
      "غير مستقر",
      "أسوأ حالة تبقى O(n²)",
      "الأداء يعتمد على معامل التقليص",
      "لا يزال أبطأ من الترتيب السريع/الترتيب بالدمج عمومًا",
    ],
    commonMistakes: [
      "السماح للفجوة بالنزول تحت 1.",
      "إيقاف الحلقة قبل وصول الفجوة إلى 1 مع مرور أخير دون تبديل.",
      "استخدام معامل تقليص بعيد عن 1.3، مما يضر بالأداء.",
      "افتراض أنه مستقر — تبديلات الفجوة تعيد ترتيب المفاتيح المتساوية.",
    ],
    interviewQuestions: [
      "ما مشكلة 'السلحفاة' وكيف يعالجها ترتيب المشط؟",
      "لماذا 1.3 هو معامل التقليص الشائع الاختيار؟",
      "كيف يرتبط ترتيب المشط بترتيب شل؟",
      "ما تعقيد أسوأ حالة لترتيب المشط؟",
    ],
    summary:
      "ترتيب المشط هو ترتيب فقاعي بفجوة متقلصة (÷1.3 كل مرور)، يتيح للعناصر البعيدة التبديل مبكرًا للقضاء على السلاحف. في المكان ومساحة O(1)، يبلغ متوسطه قريبًا من O(n log n) لكن أسوأ حالته O(n²) وهو غير مستقر.",
    quiz: [
      { question: "يحسّن ترتيب المشط الترتيب الفقاعي عبر…", options: ["استخدام العودية", "مقارنة عناصر متباعدة بفجوة متقلصة", "الترتيب من الطرفين", "عدّ القيم"], answer: 1, explanation: "الفجوات الكبيرة تتيح للعناصر غير الموضوعة القفز بعيدًا، فتقضي على السلاحف مبكرًا." },
      { question: "معامل تقليص الفجوة الشائع الاستخدام هو نحو…", options: ["1.3", "2.0", "0.5", "10"], answer: 0, explanation: "تجريبيًا، قسمة الفجوة على ~1.3 كل مرور تعطي أفضل أداء." },
      { question: "عندما تصل الفجوة إلى 1، يتصرف ترتيب المشط مثل…", options: ["الترتيب بالدمج", "الترتيب الفقاعي", "الترتيب السريع", "ترتيب العد"], answer: 1, explanation: "المقارنات المتجاورة عند الفجوة 1 هي بالضبط مرور ترتيب فقاعي." },
      { question: "زمن أسوأ حالة لترتيب المشط هو…", options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"], answer: 2, explanation: "رغم المتوسطات الجيدة، المدخلات العدائية لا تزال تعطي زمنًا تربيعيًا." },
      { question: "ترتيب المشط…", options: ["مستقر", "غير مستقر", "خارج المكان", "عودي"], answer: 1, explanation: "التبديلات عبر الفجوات قد تعيد ترتيب المفاتيح المتساوية، فهو غير مستقر." },
    ],
  },
  inputFields: [{ key: "values", label: "Array values", placeholder: "e.g. 8, 4, 1, 56, 3, 44, 23, 6", help: "2–40 numbers." }],
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
