import type { AlgorithmModule, ArrayFrame, Step } from "@/lib/engine/types";
import { codeBundle, defaultValues, listFields, parseValues, pushArrayStep, serializeValues, standardLearning, type NumberListInput } from "./shared";

const pseudocode = [
  "procedure gnomeSort(a)",
  "  i = 1",
  "  while i < n:",
  "    if i == 0 or a[i-1] <= a[i]: i++",
  "    else swap(a[i-1], a[i]); i--",
  "  return a",
];

function generate(input: NumberListInput): Step<ArrayFrame>[] {
  const a = [...input.values];
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;
  let swaps = 0;
  const counters = () => ({ comparisons, swaps });
  let i = a.length > 1 ? 1 : a.length;
  pushArrayStep(steps, a, "The gnome walks right while adjacent values are ordered.", "يتحرك القزم يمينًا ما دامت القيم المتجاورة مرتبة.", 0, counters());
  while (i < a.length) {
    if (i === 0) {
      i++;
      continue;
    }
    comparisons++;
    pushArrayStep(steps, a, `Compare a[${i - 1}]=${a[i - 1]} with a[${i}]=${a[i]}.`, `قارن a[${i - 1}]=${a[i - 1]} مع a[${i}]=${a[i]}.`, 3, counters(), { [i - 1]: "compare", [i]: "active" });
    if (a[i - 1] <= a[i]) {
      i++;
    } else {
      [a[i - 1], a[i]] = [a[i], a[i - 1]];
      swaps++;
      pushArrayStep(steps, a, `Swap the inversion and step back to index ${i - 1}.`, `بدّل الانعكاس وارجع إلى الفهرس ${i - 1}.`, 4, counters(), { [i - 1]: "swap", [i]: "swap" }, { phase: "swap" });
      i--;
    }
  }
  pushArrayStep(steps, a, "The gnome reached the end; every adjacent pair is ordered.", "وصل القزم إلى النهاية؛ كل زوج متجاور مرتب.", 5, counters(), Object.fromEntries(a.map((_, index) => [index, "sorted"])));
  return steps;
}

const learning = standardLearning({
  overview: "Gnome sort fixes an adjacent inversion by swapping it and walking one position backward. Once the local order is restored it walks forward again.",
  overviewAr: "يصلح ترتيب القزم الانعكاس المتجاور بالتبديل ثم يرجع موضعًا واحدًا، وبعد استعادة الترتيب المحلي يتقدم من جديد.",
  how: ["Compare the current item with its left neighbor.", "Walk right when ordered.", "Swap and walk left when inverted."],
  howAr: ["قارن العنصر الحالي بجاره الأيسر.", "تحرك يمينًا عند الترتيب.", "بدّل وتحرك يسارًا عند الانعكاس."],
  complexity: { time: { best: "O(n)", average: "O(n²)", worst: "O(n²)" }, space: "O(1)" },
  invariant: "Everything strictly left of the gnome is locally sorted.",
  invariantAr: "كل ما يقع يسار القزم مرتب محليًا.",
  summary: "Gnome sort is insertion-sort behavior expressed entirely through adjacent swaps.",
  summaryAr: "ترتيب القزم هو سلوك ترتيب الإدراج معبّرًا عنه بتبديلات متجاورة.",
});

const mod: AlgorithmModule<ArrayFrame, NumberListInput> = {
  slug: "gnome-sort", title: "Gnome Sort", titleAr: "ترتيب القزم", category: "sorting", difficulty: "Beginner",
  tags: ["adjacent swaps", "stable", "in-place", "adaptive"], tagsAr: ["تبديل متجاور", "مستقر", "في المكان", "متكيف"],
  summary: "Walks forward through ordered neighbors and backward after swapping an inversion.",
  summaryAr: "يتقدم عبر الجيران المرتبين ويرجع بعد تبديل أي انعكاس.",
  renderer: "array", pseudocode, code: codeBundle("Gnome Sort", pseudocode), ...learning,
  inputFields: listFields, defaultInput: defaultValues, parseInput: (fields) => parseValues(fields), serializeInput: serializeValues, generate,
};
export default mod;
