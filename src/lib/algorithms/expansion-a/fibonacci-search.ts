import type { AlgorithmModule, ArrayFrame, Step } from "@/lib/engine/types";
import { codeBundle, defaultSearch, parseSearch, pushArrayStep, searchFields, serializeSearch, standardLearning, type SearchInput } from "./shared";

const pseudocode = [
  "procedure fibonacciSearch(sorted a, target)",
  "  grow fibM until fibM >= n",
  "  offset = -1",
  "  while fibM > 1:",
  "    i = min(offset + fibMm2, n-1)",
  "    if a[i] < target: move three Fibonacci numbers down right",
  "    else if a[i] > target: move two Fibonacci numbers down left",
  "    else return i",
  "  check the one remaining candidate",
];
function generate(input: SearchInput): Step<ArrayFrame>[] {
  const a = [...input.values].sort((x, y) => x - y);
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;
  let fibMm2 = 0, fibMm1 = 1, fibM = fibMm2 + fibMm1;
  while (fibM < a.length) [fibMm2, fibMm1, fibM] = [fibMm1, fibM, fibMm1 + fibM];
  let offset = -1;
  const snap = (text: string, ar: string, line: number, index?: number, state: "active" | "discarded" | "found" = "active") =>
    pushArrayStep(steps, a, text, ar, line, { comparisons }, index === undefined ? {} : { [index]: state }, {
      range: offset + 1 < a.length ? { from: offset + 1, to: a.length - 1 } : null,
      aux: [{ label: "Fibonacci window", values: [fibM, fibMm1, fibMm2] }],
      pointers: index === undefined ? undefined : [{ index, label: "probe" }],
    });
  snap(`Smallest Fibonacci number covering ${a.length} items is ${fibM}.`, `أصغر عدد فيبوناتشي يغطي ${a.length} عنصرًا هو ${fibM}.`, 1);
  while (fibM > 1) {
    const i = Math.min(offset + fibMm2, a.length - 1);
    comparisons++;
    snap(`Probe a[${i}] = ${a[i]} for target ${input.target}.`, `افحص a[${i}] = ${a[i]} بحثًا عن ${input.target}.`, 4, i);
    if (a[i] < input.target) {
      [fibM, fibMm1, fibMm2] = [fibMm1, fibMm2, fibMm1 - fibMm2];
      offset = i;
      snap(`${a[i]} is smaller; discard through index ${i}.`, `${a[i]} أصغر؛ تجاهل حتى الفهرس ${i}.`, 5, i, "discarded");
    } else if (a[i] > input.target) {
      [fibM, fibMm1, fibMm2] = [fibMm2, fibMm1 - fibMm2, fibMm2 - (fibMm1 - fibMm2)];
      snap(`${a[i]} is larger; shrink to the left Fibonacci block.`, `${a[i]} أكبر؛ قلّص إلى كتلة فيبوناتشي اليسرى.`, 6, i, "discarded");
    } else {
      snap(`Found ${input.target} at index ${i}.`, `عُثر على ${input.target} عند الفهرس ${i}.`, 7, i, "found");
      return steps;
    }
  }
  if (fibMm1 === 1 && offset + 1 < a.length) {
    comparisons++;
    const i = offset + 1;
    snap(`Check the final candidate a[${i}] = ${a[i]}.`, `افحص المرشح الأخير a[${i}] = ${a[i]}.`, 8, i);
    if (a[i] === input.target) {
      snap(`Found ${input.target} at index ${i}.`, `عُثر على ${input.target} عند الفهرس ${i}.`, 8, i, "found");
      return steps;
    }
  }
  snap(`${input.target} is not present.`, `${input.target} غير موجود.`, 8);
  return steps;
}
const learning = standardLearning({
  overview: "Fibonacci search narrows a sorted array using Fibonacci-sized blocks. Its probes use addition and subtraction rather than division.",
  overviewAr: "يضيق بحث فيبوناتشي مجال مصفوفة مرتبة بكتل أحجامها أعداد فيبوناتشي، وتستخدم مجساته الجمع والطرح بدل القسمة.",
  how: ["Find a Fibonacci number covering the array.", "Probe at offset plus the smaller block.", "Replace the window by the correct neighboring Fibonacci block."],
  howAr: ["أوجد عدد فيبوناتشي يغطي المصفوفة.", "افحص عند الإزاحة زائد الكتلة الأصغر.", "استبدل النافذة بكتلة فيبوناتشي المجاورة الصحيحة."],
  complexity: { time: { best: "O(1)", average: "O(log n)", worst: "O(log n)" }, space: "O(1)" },
  invariant: "If the target exists, it remains in the Fibonacci-sized candidate block after every update.",
  invariantAr: "إذا كان الهدف موجودًا فإنه يبقى داخل كتلة المرشحين ذات حجم فيبوناتشي بعد كل تحديث.",
  summary: "Fibonacci search is logarithmic search using Fibonacci partitions.",
  summaryAr: "بحث فيبوناتشي بحث لوغاريتمي يستخدم تقسيمات فيبوناتشي.",
});
const mod: AlgorithmModule<ArrayFrame, SearchInput> = {
  slug: "fibonacci-search", title: "Fibonacci Search", titleAr: "بحث فيبوناتشي", category: "searching", difficulty: "Intermediate",
  tags: ["sorted array", "Fibonacci", "divide and conquer"], tagsAr: ["مصفوفة مرتبة", "فيبوناتشي", "فرّق تسد"],
  summary: "Searches a sorted array by shrinking Fibonacci-sized candidate blocks.",
  summaryAr: "يبحث في مصفوفة مرتبة بتقليص كتل مرشحين بأحجام فيبوناتشي.",
  renderer: "array", pseudocode, code: codeBundle("Fibonacci Search", pseudocode), ...learning,
  inputFields: searchFields, defaultInput: (level, rng) => defaultSearch(level, rng, true), parseInput: (fields) => parseSearch(fields, true), serializeInput: serializeSearch, generate,
};
export default mod;
