import type { AlgorithmModule, ArrayFrame, Step } from "@/lib/engine/types";
import { codeBundle, defaultRanked, parseRanked, pushArrayStep, serializeRanked, standardLearning, type RankedInput } from "./shared";

const fields = [
  { key: "values", label: "Values", labelAr: "القيم", placeholder: "7, 2, 9, 1, 5", list: true },
  { key: "k", label: "Rank k", labelAr: "الرتبة k", placeholder: "3", help: "1 means the smallest value.", helpAr: "الرتبة 1 تعني أصغر قيمة." },
];
const pseudocode = [
  "procedure quickselect(a, k)",
  "  targetIndex = k-1",
  "  partition [lo..hi] around pivot",
  "  place pivot at its final index p",
  "  if p == targetIndex: return a[p]",
  "  if targetIndex < p: hi = p-1",
  "  else: lo = p+1",
];
function generate(input: RankedInput): Step<ArrayFrame>[] {
  const a = [...input.values];
  const target = input.k - 1;
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0, swaps = 0, partitions = 0;
  let lo = 0, hi = a.length - 1;
  const snap = (text: string, ar: string, line: number, states: Record<number, "compare" | "swap" | "pivot" | "found"> = {}) =>
    pushArrayStep(steps, a, text, ar, line, { comparisons, swaps, partitions }, states, { range: { from: lo, to: hi }, aux: [{ label: "Requested rank", values: [input.k] }] });
  snap(`Find the ${input.k}${input.k === 1 ? "st" : input.k === 2 ? "nd" : input.k === 3 ? "rd" : "th"} smallest value.`, `أوجد القيمة ذات الرتبة ${input.k} تصاعديًا.`, 0);
  while (lo <= hi) {
    const pivot = a[hi];
    partitions++;
    snap(`Partition [${lo}..${hi}] around pivot ${pivot}.`, `قسّم [${lo}..${hi}] حول المحور ${pivot}.`, 2, { [hi]: "pivot" });
    let store = lo;
    for (let i = lo; i < hi; i++) {
      comparisons++;
      snap(`Compare ${a[i]} with pivot ${pivot}.`, `قارن ${a[i]} مع المحور ${pivot}.`, 2, { [i]: "compare", [hi]: "pivot" });
      if (a[i] <= pivot) {
        [a[i], a[store]] = [a[store], a[i]];
        swaps++;
        snap(`Move ${a[store]} into the ≤ pivot partition.`, `انقل ${a[store]} إلى قسم القيم الأصغر أو المساوية للمحور.`, 2, { [i]: "swap", [store]: "swap" });
        store++;
      }
    }
    [a[store], a[hi]] = [a[hi], a[store]];
    swaps++;
    snap(`Pivot ${pivot} reaches final index ${store}.`, `وصل المحور ${pivot} إلى فهرسه النهائي ${store}.`, 3, { [store]: "pivot" });
    if (store === target) {
      snap(`Rank ${input.k} is ${a[store]}.`, `القيمة ذات الرتبة ${input.k} هي ${a[store]}.`, 4, { [store]: "found" });
      return steps;
    }
    if (target < store) {
      hi = store - 1;
      snap(`Requested rank is left of the pivot; continue in [${lo}..${hi}].`, `الرتبة المطلوبة يسار المحور؛ تابع في [${lo}..${hi}].`, 5);
    } else {
      lo = store + 1;
      snap(`Requested rank is right of the pivot; continue in [${lo}..${hi}].`, `الرتبة المطلوبة يمين المحور؛ تابع في [${lo}..${hi}].`, 6);
    }
  }
  return steps;
}
const learning = standardLearning({
  overview: "Quickselect partitions like quicksort but follows only the side containing the requested rank.",
  overviewAr: "يقسم الاختيار السريع كالترتيب السريع لكنه يتابع الجانب الذي يحتوي الرتبة المطلوبة فقط.",
  how: ["Partition around a pivot.", "The pivot reaches its final sorted index.", "Discard the side that cannot contain k."],
  howAr: ["قسّم حول محور.", "يصل المحور إلى فهرسه النهائي المرتب.", "تجاهل الجانب الذي لا يمكن أن يحتوي k."],
  complexity: { time: { best: "O(n)", average: "O(n)", worst: "O(n²)" }, space: "O(1)" },
  invariant: "The requested order statistic always remains inside [lo, hi].",
  invariantAr: "تبقى القيمة ذات الرتبة المطلوبة دائمًا داخل [lo, hi].",
  summary: "Quickselect finds one rank without sorting the entire array.",
  summaryAr: "يجد الاختيار السريع رتبة واحدة دون ترتيب المصفوفة كاملة.",
});
const mod: AlgorithmModule<ArrayFrame, RankedInput> = {
  slug: "quickselect", title: "Quickselect", titleAr: "الاختيار السريع", category: "searching", difficulty: "Advanced",
  tags: ["selection", "partition", "order statistic", "in-place"], tagsAr: ["اختيار", "تقسيم", "إحصاء رتبي", "في المكان"],
  summary: "Partitions only toward the requested order statistic, averaging linear time.",
  summaryAr: "يقسم باتجاه الإحصاء الرتبي المطلوب فقط بزمن خطي في المتوسط.",
  renderer: "array", pseudocode, code: codeBundle("Quickselect", pseudocode), ...learning,
  inputFields: fields, defaultInput: defaultRanked, parseInput: parseRanked, serializeInput: serializeRanked, generate,
};
export default mod;
