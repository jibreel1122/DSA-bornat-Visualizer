import type { AlgorithmModule, ArrayFrame, Level, RNG, Step } from "@/lib/engine/types";
import { codeBundle, listFields, parseValues, pushArrayStep, serializeValues, standardLearning, type NumberListInput } from "./shared";

const pseudocode = [
  "procedure bitonicSort(a, lo, length, ascending)",
  "  recursively sort first half ascending",
  "  recursively sort second half descending",
  "  bitonicMerge(a, lo, length, ascending)",
  "    compare-exchange elements half a sequence apart",
  "    recursively merge both halves",
  "  return a",
];

function generate(input: NumberListInput): Step<ArrayFrame>[] {
  const a = [...input.values];
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;
  let swaps = 0;
  const counters = () => ({ comparisons, swaps });
  const snap = (lo: number, length: number, description: string, ar: string, line: number, states: Record<number, "compare" | "swap" | "active"> = {}) =>
    pushArrayStep(steps, a, description, ar, line, counters(), states, { range: { from: lo, to: lo + length - 1 } });
  const merge = (lo: number, length: number, ascending: boolean) => {
    if (length <= 1) return;
    const half = length / 2;
    for (let i = lo; i < lo + half; i++) {
      const j = i + half;
      comparisons++;
      snap(lo, length, `Compare ${a[i]} and ${a[j]} for a ${ascending ? "rising" : "falling"} merge.`, `قارن ${a[i]} و${a[j]} لدمج ${ascending ? "تصاعدي" : "تنازلي"}.`, 4, { [i]: "compare", [j]: "compare" });
      if ((a[i] > a[j]) === ascending) {
        [a[i], a[j]] = [a[j], a[i]];
        swaps++;
        snap(lo, length, `Compare-exchange indices ${i} and ${j}.`, `نفّذ مقارنة وتبديل للفهرسين ${i} و${j}.`, 4, { [i]: "swap", [j]: "swap" });
      }
    }
    merge(lo, half, ascending);
    merge(lo + half, half, ascending);
  };
  const sort = (lo: number, length: number, ascending: boolean) => {
    if (length <= 1) return;
    const half = length / 2;
    sort(lo, half, true);
    sort(lo + half, half, false);
    snap(lo, length, `The two halves form a bitonic sequence; merge it ${ascending ? "ascending" : "descending"}.`, `يشكل النصفان متتالية بتونية؛ ادمجها ${ascending ? "تصاعديًا" : "تنازليًا"}.`, 3);
    merge(lo, length, ascending);
  };
  pushArrayStep(steps, a, "Build bitonic subsequences, then merge them with fixed compare-exchanges.", "ابن متتاليات بتونية ثم ادمجها بمقارنات وتبديلات ثابتة.", 0, counters());
  sort(0, a.length, true);
  pushArrayStep(steps, a, "The final ascending bitonic merge is complete.", "اكتمل الدمج البتوني التصاعدي النهائي.", 6, counters(), Object.fromEntries(a.map((_, i) => [i, "sorted"])));
  return steps;
}

const defaultInput = (level: Level, rng: RNG): NumberListInput => {
  const sizes = [4, 8, 8, 16, 32] as const;
  return { values: rng.shuffle(Array.from({ length: sizes[level - 1] }, (_, i) => i + 1)) };
};
const learning = standardLearning({
  overview: "Bitonic sort creates sequences that first rise then fall, and merges them with a data-independent compare-exchange network.",
  overviewAr: "ينشئ الترتيب البتوني متتاليات تصعد ثم تهبط، ويدمجها بشبكة مقارنة وتبديل لا تعتمد على القيم.",
  how: ["Sort one half up and one half down.", "Compare elements half a sequence apart.", "Recursively merge each half in the requested direction."],
  howAr: ["رتب نصفًا صعودًا ونصفًا هبوطًا.", "قارن عناصر تفصل بينها نصف المتتالية.", "ادمج كل نصف عوديًا بالاتجاه المطلوب."],
  complexity: { time: { best: "O(n log² n)", average: "O(n log² n)", worst: "O(n log² n)" }, space: "O(log n)" },
  invariant: "Each merge receives a bitonic sequence and returns it monotone in the requested direction.",
  invariantAr: "يستقبل كل دمج متتالية بتونية ويعيدها رتيبة بالاتجاه المطلوب.",
  summary: "Bitonic sort is a deterministic sorting network suited to parallel hardware.",
  summaryAr: "الترتيب البتوني شبكة ترتيب حتمية مناسبة للعتاد المتوازي.",
});
const mod: AlgorithmModule<ArrayFrame, NumberListInput> = {
  slug: "bitonic-sort", title: "Bitonic Sort", titleAr: "الترتيب البتوني", category: "sorting", difficulty: "Advanced",
  tags: ["sorting network", "parallel", "bitonic", "power of two"], tagsAr: ["شبكة ترتيب", "متوازٍ", "بتوني", "قوة للعدد اثنين"],
  summary: "Builds bitonic sequences and merges them through a fixed parallel compare-exchange network.",
  summaryAr: "يبني متتاليات بتونية ويدمجها عبر شبكة ثابتة من المقارنات والتبديلات.",
  renderer: "array", pseudocode, code: codeBundle("Bitonic Sort", pseudocode), ...learning,
  inputFields: listFields, defaultInput, parseInput: (fields) => parseValues(fields, { powerOfTwo: true }), serializeInput: serializeValues, generate,
};
export default mod;
