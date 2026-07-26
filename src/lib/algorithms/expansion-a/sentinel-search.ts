import type { AlgorithmModule, ArrayFrame, Step } from "@/lib/engine/types";
import { codeBundle, defaultSearch, parseSearch, pushArrayStep, searchFields, serializeSearch, standardLearning, type SearchInput } from "./shared";

const pseudocode = [
  "procedure sentinelSearch(a, target)",
  "  save last = a[n-1]",
  "  a[n-1] = target",
  "  i = 0; while a[i] != target: i++",
  "  restore a[n-1] = last",
  "  if i < n-1 or last == target: return i",
  "  return -1",
];
function generate(input: SearchInput): Step<ArrayFrame>[] {
  const a = [...input.values];
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;
  const lastIndex = a.length - 1;
  const saved = a[lastIndex];
  pushArrayStep(steps, a, `Save the last value ${saved}.`, `احفظ القيمة الأخيرة ${saved}.`, 1, { comparisons }, { [lastIndex]: "active" });
  a[lastIndex] = input.target;
  pushArrayStep(steps, a, `Write sentinel ${input.target} at the final index.`, `اكتب الحارس ${input.target} في الفهرس الأخير.`, 2, { comparisons }, { [lastIndex]: "pivot" }, { phase: "sentinel" });
  let i = 0;
  while (a[i] !== input.target) {
    comparisons++;
    pushArrayStep(steps, a, `a[${i}] = ${a[i]} is not the target; advance without a bounds test.`, `القيمة a[${i}] = ${a[i]} ليست الهدف؛ تقدم بلا فحص للحدود.`, 3, { comparisons }, { [i]: "discarded", [lastIndex]: "pivot" });
    i++;
  }
  comparisons++;
  const found = i < lastIndex || saved === input.target;
  pushArrayStep(
    steps,
    a,
    found ? `A real match stopped the scan at index ${i}.` : `The sentinel stopped the scan at index ${i}; verify it after restoring the array.`,
    found ? `أوقف تطابق حقيقي المسح عند الفهرس ${i}.` : `أوقف الحارس المسح عند الفهرس ${i}؛ تحقق منه بعد إعادة المصفوفة.`,
    3,
    { comparisons },
    { [i]: found ? "found" : "special" },
  );
  a[lastIndex] = saved;
  pushArrayStep(steps, a, `Restore the saved last value ${saved}.`, `أعد القيمة الأخيرة المحفوظة ${saved}.`, 4, { comparisons }, { [lastIndex]: "swap" }, { phase: "restore" });
  pushArrayStep(steps, a, found ? `Found ${input.target} at index ${i}.` : `${input.target} was only the sentinel, so it is not present.`, found ? `عُثر على ${input.target} عند الفهرس ${i}.` : `كانت ${input.target} هي الحارس فقط، لذا فهي غير موجودة.`, found ? 5 : 6, { comparisons }, found ? { [i]: "found" } : {});
  return steps;
}
const learning = standardLearning({
  overview: "Sentinel search temporarily places the target at the final position, guaranteeing the scan stops and removing a bounds comparison from the loop.",
  overviewAr: "يضع بحث الحارس الهدف مؤقتًا في الموضع الأخير ليضمن توقف المسح ويلغي فحص الحدود من الحلقة.",
  how: ["Save the last element.", "Install the target as a sentinel.", "Scan, restore the last element, and distinguish a real match from the sentinel."],
  howAr: ["احفظ العنصر الأخير.", "ضع الهدف كحارس.", "امسح ثم أعد العنصر الأخير وميّز التطابق الحقيقي من الحارس."],
  complexity: { time: { best: "O(1)", average: "O(n)", worst: "O(n)" }, space: "O(1)" },
  invariant: "The sentinel guarantees a match before the scan can leave the array.",
  invariantAr: "يضمن الحارس تطابقًا قبل أن يخرج المسح من المصفوفة.",
  summary: "Sentinel search simplifies linear search's inner loop with one reversible temporary write.",
  summaryAr: "يبسط بحث الحارس الحلقة الداخلية للبحث الخطي بكتابة مؤقتة قابلة للعكس.",
});
const mod: AlgorithmModule<ArrayFrame, SearchInput> = {
  slug: "sentinel-search", title: "Sentinel Search", titleAr: "بحث الحارس", category: "searching", difficulty: "Beginner",
  tags: ["linear search", "sentinel", "in-place", "unsorted"], tagsAr: ["بحث خطي", "حارس", "في المكان", "غير مرتب"],
  summary: "Temporarily stores the target at the end so the linear scan needs no bounds check.",
  summaryAr: "يضع الهدف مؤقتًا في النهاية كي لا يحتاج المسح الخطي إلى فحص الحدود.",
  renderer: "array", pseudocode, code: codeBundle("Sentinel Search", pseudocode), ...learning,
  inputFields: searchFields, defaultInput: defaultSearch, parseInput: parseSearch, serializeInput: serializeSearch, generate,
};
export default mod;
