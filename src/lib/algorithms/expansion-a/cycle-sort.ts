import type { AlgorithmModule, ArrayFrame, Step } from "@/lib/engine/types";
import {
  codeBundle,
  defaultValues,
  listFields,
  parseValues,
  pushArrayStep,
  serializeValues,
  standardLearning,
  type NumberListInput,
} from "./shared";

const pseudocode = [
  "procedure cycleSort(a)",
  "  for cycleStart = 0 to n-2:",
  "    item = a[cycleStart]; pos = cycleStart",
  "    count values smaller than item to find pos",
  "    skip duplicates already occupying pos",
  "    write item to pos; displaced value becomes item",
  "    rotate until pos returns to cycleStart",
  "  return a",
];

function generate(input: NumberListInput): Step<ArrayFrame>[] {
  const a = [...input.values];
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;
  let writes = 0;
  const counters = () => ({ comparisons, writes });
  pushArrayStep(steps, a, "Cycle sort places each value directly into its final position.", "يضع ترتيب الدورات كل قيمة مباشرة في موضعها النهائي.", 0, counters());

  for (let cycleStart = 0; cycleStart < a.length - 1; cycleStart++) {
    let item = a[cycleStart];
    let pos = cycleStart;
    pushArrayStep(steps, a, `Start a cycle with item ${item} at index ${cycleStart}.`, `ابدأ دورة بالقيمة ${item} عند الفهرس ${cycleStart}.`, 2, counters(), { [cycleStart]: "pivot" });
    for (let i = cycleStart + 1; i < a.length; i++) {
      comparisons++;
      pushArrayStep(steps, a, `Compare ${a[i]} with cycle item ${item}.`, `قارن ${a[i]} مع قيمة الدورة ${item}.`, 3, counters(), { [cycleStart]: "pivot", [i]: "compare" });
      if (a[i] < item) pos++;
    }
    if (pos === cycleStart) continue;
    while (pos < a.length && item === a[pos]) {
      comparisons++;
      pos++;
    }
    if (pos >= a.length) continue;
    [a[pos], item] = [item, a[pos]];
    writes++;
    pushArrayStep(steps, a, `Write the cycle item at final index ${pos}; carry displaced value ${item}.`, `اكتب قيمة الدورة في الفهرس النهائي ${pos} واحمل القيمة المزاحة ${item}.`, 5, counters(), { [pos]: "sorted", [cycleStart]: "active" });

    while (pos !== cycleStart) {
      pos = cycleStart;
      for (let i = cycleStart + 1; i < a.length; i++) {
        comparisons++;
        if (a[i] < item) pos++;
      }
      while (pos < a.length && item === a[pos]) pos++;
      if (pos >= a.length) break;
      [a[pos], item] = [item, a[pos]];
      writes++;
      pushArrayStep(steps, a, `Rotate the carried value into index ${pos}; next carried value is ${item}.`, `دوّر القيمة المحمولة إلى الفهرس ${pos}؛ والقيمة المحمولة التالية هي ${item}.`, 6, counters(), { [pos]: "swap", [cycleStart]: "active" }, { phase: "rotate" });
    }
  }
  pushArrayStep(steps, a, "All cycles are complete; the array is sorted.", "اكتملت كل الدورات؛ أصبحت المصفوفة مرتبة.", 7, counters(), Object.fromEntries(a.map((_, i) => [i, "sorted"])));
  return steps;
}

const learning = standardLearning({
  overview: "Cycle sort decomposes a permutation into cycles and rotates each cycle so every value reaches its final rank. It minimizes writes, which is valuable when writes are expensive.",
  overviewAr: "يفكك ترتيب الدورات التبديل إلى دورات ويدوّر كل دورة حتى تصل كل قيمة إلى رتبتها النهائية. وهو يقلل عدد الكتابات عندما تكون الكتابة مكلفة.",
  how: ["Choose a cycle start and count smaller values.", "Skip equal values to preserve duplicate positions.", "Rotate displaced values until the cycle closes."],
  howAr: ["اختر بداية دورة واحسب القيم الأصغر.", "تجاوز القيم المتساوية لمعالجة التكرار.", "دوّر القيم المزاحة حتى تغلق الدورة."],
  complexity: { time: { best: "O(n²)", average: "O(n²)", worst: "O(n²)" }, space: "O(1)", notes: "At most one write per value moved to its final cycle position." },
  invariant: "After a cycle closes, every position written by that cycle holds its final ranked value.",
  invariantAr: "بعد إغلاق الدورة يحمل كل موضع كتبته الدورة قيمته ذات الرتبة النهائية.",
  summary: "Cycle sort uses rank counting and cycle rotation to sort with the minimum practical number of writes.",
  summaryAr: "يستخدم ترتيب الدورات حساب الرتبة وتدوير الدورات للترتيب بأقل عدد عملي من الكتابات.",
});

const mod: AlgorithmModule<ArrayFrame, NumberListInput> = {
  slug: "cycle-sort",
  title: "Cycle Sort",
  titleAr: "ترتيب الدورات",
  category: "sorting",
  difficulty: "Advanced",
  tags: ["cycle", "minimum writes", "in-place", "unstable"],
  tagsAr: ["دورات", "أقل كتابات", "في المكان", "غير مستقر"],
  summary: "Places values by final rank and rotates permutation cycles, minimizing array writes.",
  summaryAr: "يضع القيم حسب رتبتها النهائية ويدوّر دورات التبديل لتقليل الكتابات.",
  renderer: "array",
  pseudocode,
  code: codeBundle("Cycle Sort", pseudocode),
  ...learning,
  inputFields: listFields,
  defaultInput: defaultValues,
  parseInput: (fields) => parseValues(fields),
  serializeInput: serializeValues,
  generate,
};

export default mod;
