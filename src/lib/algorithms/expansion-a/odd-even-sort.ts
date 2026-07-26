import type { AlgorithmModule, ArrayFrame, Step } from "@/lib/engine/types";
import { codeBundle, defaultValues, listFields, parseValues, pushArrayStep, serializeValues, standardLearning, type NumberListInput } from "./shared";

const pseudocode = [
  "procedure oddEvenSort(a)",
  "  repeat until no swaps:",
  "    compare-exchange (1,2), (3,4), ...",
  "    compare-exchange (0,1), (2,3), ...",
  "  return a",
];

function generate(input: NumberListInput): Step<ArrayFrame>[] {
  const a = [...input.values];
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;
  let swaps = 0;
  let passes = 0;
  const counters = () => ({ comparisons, swaps, passes });
  pushArrayStep(steps, a, "Odd-even sort alternates disjoint odd and even compare-exchange phases.", "يتناوب ترتيب الفردي-الزوجي بين مرحلتي مقارنة وتبديل منفصلتين.", 0, counters());
  let changed = true;
  while (changed) {
    changed = false;
    passes++;
    for (const start of [1, 0]) {
      pushArrayStep(steps, a, `${start === 1 ? "Odd" : "Even"} phase begins.`, `تبدأ المرحلة ${start === 1 ? "الفردية" : "الزوجية"}.`, start === 1 ? 2 : 3, counters(), {}, { phase: start === 1 ? "odd" : "even" });
      for (let i = start; i + 1 < a.length; i += 2) {
        comparisons++;
        pushArrayStep(steps, a, `Compare disjoint pair (${i}, ${i + 1}): ${a[i]} and ${a[i + 1]}.`, `قارن الزوج المنفصل (${i}، ${i + 1}): ${a[i]} و${a[i + 1]}.`, start === 1 ? 2 : 3, counters(), { [i]: "compare", [i + 1]: "compare" });
        if (a[i] > a[i + 1]) {
          [a[i], a[i + 1]] = [a[i + 1], a[i]];
          swaps++;
          changed = true;
          pushArrayStep(steps, a, `Swap pair (${i}, ${i + 1}).`, `بدّل الزوج (${i}، ${i + 1}).`, start === 1 ? 2 : 3, counters(), { [i]: "swap", [i + 1]: "swap" }, { phase: "swap" });
        }
      }
    }
  }
  pushArrayStep(steps, a, "A full odd-even pass made no swaps; the array is sorted.", "لم ينفذ المرور الفردي-الزوجي الكامل أي تبديل؛ المصفوفة مرتبة.", 4, counters(), Object.fromEntries(a.map((_, i) => [i, "sorted"])));
  return steps;
}

const learning = standardLearning({
  overview: "Odd-even transposition sort alternates independent adjacent compare-exchanges. The pairs in one phase do not overlap, which makes the algorithm naturally parallel.",
  overviewAr: "يتناوب ترتيب النقل الفردي-الزوجي بين مقارنات وتبديلات متجاورة مستقلة. أزواج كل مرحلة لا تتداخل، لذلك يناسب التنفيذ المتوازي.",
  how: ["Process pairs beginning at odd indices.", "Process pairs beginning at even indices.", "Stop after a complete pass with no swap."],
  howAr: ["عالج الأزواج التي تبدأ بفهرس فردي.", "عالج الأزواج التي تبدأ بفهرس زوجي.", "توقف بعد مرور كامل بلا تبديل."],
  complexity: { time: { best: "O(n)", average: "O(n²)", worst: "O(n²)" }, space: "O(1)" },
  invariant: "After enough phases, every inversion crosses an adjacent boundary toward its correct side.",
  invariantAr: "بعد عدد كاف من المراحل يعبر كل انعكاس حدًا متجاورًا نحو جانبه الصحيح.",
  summary: "Odd-even sort is a parallel-friendly adjacent exchange network.",
  summaryAr: "ترتيب الفردي-الزوجي شبكة تبديل متجاور مناسبة للتوازي.",
});

const mod: AlgorithmModule<ArrayFrame, NumberListInput> = {
  slug: "odd-even-sort", title: "Odd–Even Sort", titleAr: "ترتيب الفردي-الزوجي", category: "sorting", difficulty: "Intermediate",
  tags: ["parallel", "transposition", "stable", "in-place"], tagsAr: ["متوازٍ", "نقل", "مستقر", "في المكان"],
  summary: "Alternates odd-indexed and even-indexed adjacent compare-exchange phases.",
  summaryAr: "يتناوب بين مرحلتي مقارنة وتبديل للأزواج الفردية والزوجية.",
  renderer: "array", pseudocode, code: codeBundle("Odd–Even Sort", pseudocode), ...learning,
  inputFields: listFields, defaultInput: defaultValues, parseInput: (fields) => parseValues(fields), serializeInput: serializeValues, generate,
};
export default mod;
