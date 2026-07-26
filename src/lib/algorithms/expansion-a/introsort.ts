import type { AlgorithmModule, ArrayFrame, Step } from "@/lib/engine/types";
import { codeBundle, defaultValues, listFields, parseValues, pushArrayStep, serializeValues, standardLearning, type NumberListInput } from "./shared";

const pseudocode = [
  "procedure introsort(a)",
  "  depthLimit = 2 * floor(log2(n))",
  "  intro(lo, hi, depth):",
  "    if range is small: insertionSort(range)",
  "    else if depth == 0: heapSort(range)",
  "    else partition around pivot; recurse with depth-1",
  "  return a",
];

function generate(input: NumberListInput): Step<ArrayFrame>[] {
  const a = [...input.values];
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;
  let swaps = 0;
  const counters = () => ({ comparisons, swaps });
  const snap = (lo: number, hi: number, text: string, ar: string, line: number, states: Record<number, "compare" | "swap" | "pivot" | "active"> = {}, phase?: string) =>
    pushArrayStep(steps, a, text, ar, line, counters(), states, { range: lo <= hi ? { from: lo, to: hi } : null, phase });
  const insertion = (lo: number, hi: number) => {
    snap(lo, hi, `Small range [${lo}..${hi}]: use insertion sort.`, `المجال الصغير [${lo}..${hi}]: استخدم ترتيب الإدراج.`, 3, {}, "insertion");
    for (let i = lo + 1; i <= hi; i++) {
      const key = a[i];
      let j = i - 1;
      while (j >= lo) {
        comparisons++;
        if (a[j] <= key) break;
        a[j + 1] = a[j];
        swaps++;
        snap(lo, hi, `Shift ${a[j]} right to open a slot for ${key}.`, `أزح ${a[j]} يمينًا لفتح موضع للقيمة ${key}.`, 3, { [j]: "compare", [j + 1]: "swap" }, "insertion");
        j--;
      }
      a[j + 1] = key;
    }
  };
  const heap = (lo: number, hi: number) => {
    snap(lo, hi, `Depth limit reached: switch range [${lo}..${hi}] to heap sort.`, `بلغنا حد العمق: حوّل المجال [${lo}..${hi}] إلى ترتيب الكومة.`, 4, {}, "heap");
    const size = hi - lo + 1;
    const sift = (root: number, length: number) => {
      while (true) {
        let largest = root;
        const left = root * 2 + 1;
        const right = left + 1;
        if (left < length) { comparisons++; if (a[lo + left] > a[lo + largest]) largest = left; }
        if (right < length) { comparisons++; if (a[lo + right] > a[lo + largest]) largest = right; }
        if (largest === root) break;
        [a[lo + root], a[lo + largest]] = [a[lo + largest], a[lo + root]];
        swaps++;
        snap(lo, hi, "Sift the larger child upward inside the fallback heap.", "ارفع الابن الأكبر داخل كومة الاحتياط.", 4, { [lo + root]: "swap", [lo + largest]: "swap" }, "heap");
        root = largest;
      }
    };
    for (let i = Math.floor(size / 2) - 1; i >= 0; i--) sift(i, size);
    for (let end = size - 1; end > 0; end--) {
      [a[lo], a[lo + end]] = [a[lo + end], a[lo]];
      swaps++;
      sift(0, end);
    }
  };
  const intro = (lo: number, hi: number, depth: number) => {
    if (lo >= hi) return;
    if (hi - lo + 1 <= 4) return insertion(lo, hi);
    if (depth === 0) return heap(lo, hi);
    const pivot = a[lo + ((hi - lo) >> 1)];
    let i = lo;
    let j = hi;
    snap(lo, hi, `Partition around middle-value pivot ${pivot}; remaining depth ${depth}.`, `قسّم حول المحور الأوسط ${pivot}؛ العمق المتبقي ${depth}.`, 5, { [lo + ((hi - lo) >> 1)]: "pivot" }, "partition");
    while (i <= j) {
      while (a[i] < pivot) { comparisons++; i++; }
      comparisons++;
      while (a[j] > pivot) { comparisons++; j--; }
      comparisons++;
      if (i <= j) {
        [a[i], a[j]] = [a[j], a[i]];
        swaps++;
        snap(lo, hi, `Swap partition boundary values at ${i} and ${j}.`, `بدّل قيمتي حدود التقسيم عند ${i} و${j}.`, 5, { [i]: "swap", [j]: "swap" }, "partition");
        i++; j--;
      }
    }
    intro(lo, j, depth - 1);
    intro(i, hi, depth - 1);
  };
  const depth = a.length > 1 ? 2 * Math.floor(Math.log2(a.length)) : 0;
  pushArrayStep(steps, a, `Introsort starts quicksort with depth limit ${depth}.`, `يبدأ إنتروسورت بالترتيب السريع وحد العمق ${depth}.`, 0, counters());
  intro(0, a.length - 1, depth);
  pushArrayStep(steps, a, "Every partition is complete; introsort is finished.", "اكتملت كل التقسيمات؛ انتهى إنتروسورت.", 6, counters(), Object.fromEntries(a.map((_, i) => [i, "sorted"])));
  return steps;
}

const learning = standardLearning({
  overview: "Introsort begins with quicksort, monitors recursion depth, and switches a dangerous branch to heap sort. Small ranges use insertion sort.",
  overviewAr: "يبدأ إنتروسورت بالترتيب السريع ويراقب عمق العودية ثم يحول الفرع الخطر إلى ترتيب الكومة، ويستخدم الإدراج للمجالات الصغيرة.",
  how: ["Partition like quicksort.", "Use insertion sort on tiny ranges.", "Fall back to heap sort at the depth limit."],
  howAr: ["قسّم كالترتيب السريع.", "استخدم الإدراج للمجالات الصغيرة.", "انتقل إلى الكومة عند بلوغ حد العمق."],
  complexity: { time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)" }, space: "O(log n)" },
  invariant: "Every completed branch is sorted, and no branch may exceed the depth limit without heap fallback.",
  invariantAr: "كل فرع مكتمل مرتب، ولا يتجاوز أي فرع حد العمق دون الانتقال إلى الكومة.",
  summary: "Introsort combines quicksort speed with heap sort's worst-case guarantee.",
  summaryAr: "يجمع إنتروسورت سرعة الترتيب السريع مع ضمان أسوأ حالة لترتيب الكومة.",
});
const mod: AlgorithmModule<ArrayFrame, NumberListInput> = {
  slug: "introsort", title: "Introsort", titleAr: "إنتروسورت", category: "sorting", difficulty: "Advanced",
  tags: ["hybrid", "quicksort", "heap sort", "worst-case guarantee"], tagsAr: ["هجين", "ترتيب سريع", "ترتيب الكومة", "ضمان أسوأ حالة"],
  summary: "Uses quicksort until depth becomes risky, then falls back to heap sort and handles small ranges by insertion sort.",
  summaryAr: "يستخدم الترتيب السريع حتى يصبح العمق خطرًا ثم ينتقل إلى الكومة ويعالج المجالات الصغيرة بالإدراج.",
  renderer: "array", pseudocode, code: codeBundle("Introsort", pseudocode), ...learning,
  inputFields: listFields, defaultInput: defaultValues, parseInput: (fields) => parseValues(fields), serializeInput: serializeValues, generate,
};
export default mod;
