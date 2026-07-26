import type { AlgorithmModule, ArrayFrame, Step } from "@/lib/engine/types";
import { codeBundle, defaultSearch, parseSearch, pushArrayStep, searchFields, serializeSearch, standardLearning, type SearchInput } from "./shared";

const pseudocode = [
  "procedure firstLast(a, target)",
  "  first = boundarySearch(prefer left)",
  "    on equality record mid and continue left",
  "  last = boundarySearch(prefer right)",
  "    on equality record mid and continue right",
  "  return [first, last]",
];
function generate(input: SearchInput): Step<ArrayFrame>[] {
  const a = [...input.values].sort((x, y) => x - y);
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0, first = -1, last = -1;
  const search = (leftmost: boolean) => {
    let lo = 0, hi = a.length - 1, answer = -1;
    const label = leftmost ? "first" : "last";
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      comparisons++;
      pushArrayStep(steps, a, `Find ${label}: compare a[${mid}]=${a[mid]} with ${input.target}.`, `لإيجاد ${leftmost ? "الأول" : "الأخير"}: قارن a[${mid}]=${a[mid]} مع ${input.target}.`, leftmost ? 1 : 3, { comparisons }, { [mid]: "compare" }, { range: { from: lo, to: hi }, pointers: [{ index: lo, label: "lo" }, { index: mid, label: "mid" }, { index: hi, label: "hi" }] });
      if (a[mid] === input.target) {
        answer = mid;
        pushArrayStep(steps, a, `Candidate ${label} occurrence at ${mid}; continue ${leftmost ? "left" : "right"}.`, `مرشح للظهور ${leftmost ? "الأول" : "الأخير"} عند ${mid}؛ تابع ${leftmost ? "يسارًا" : "يمينًا"}.`, leftmost ? 2 : 4, { comparisons }, { [mid]: "found" }, { range: { from: lo, to: hi } });
        if (leftmost) hi = mid - 1; else lo = mid + 1;
      } else if (a[mid] < input.target) lo = mid + 1;
      else hi = mid - 1;
    }
    return answer;
  };
  pushArrayStep(steps, a, `Locate the complete occurrence range of ${input.target}.`, `حدد مجال كل مرات ظهور ${input.target}.`, 0, { comparisons });
  first = search(true);
  last = search(false);
  const states: Record<number, "found"> = {};
  if (first >= 0) for (let i = first; i <= last; i++) states[i] = "found";
  pushArrayStep(steps, a, first >= 0 ? `Occurrences occupy [${first}, ${last}].` : `${input.target} is not present; return [-1, -1].`, first >= 0 ? `تشغل مرات الظهور المجال [${first}، ${last}].` : `${input.target} غير موجود؛ أعد [-1، -1].`, 5, { comparisons }, states, { aux: [{ label: "Result [first,last]", values: [first, last] }] });
  return steps;
}
const learning = standardLearning({
  overview: "Two biased binary searches find the left and right boundaries of a duplicate run.",
  overviewAr: "يجد بحثان ثنائيان منحازان الحدين الأيسر والأيمن لسلسلة القيم المكررة.",
  how: ["On equality, record a candidate.", "Continue left to find first.", "Continue right to find last."],
  howAr: ["عند التطابق سجل مرشحًا.", "تابع يسارًا لإيجاد الأول.", "تابع يمينًا لإيجاد الأخير."],
  complexity: { time: { best: "O(log n)", average: "O(log n)", worst: "O(log n)" }, space: "O(1)" },
  invariant: "Each recorded boundary is a valid occurrence, while the unexplored side may contain a better boundary.",
  invariantAr: "كل حد مسجل ظهور صحيح، وقد يحتوي الجانب غير المستكشف حدًا أفضل.",
  summary: "Biased binary searches return the full duplicate interval in logarithmic time.",
  summaryAr: "يعيد البحث الثنائي المنحاز مجال التكرار كاملًا بزمن لوغاريتمي.",
});
const mod: AlgorithmModule<ArrayFrame, SearchInput> = {
  slug: "binary-search-first-last", title: "Binary Search: First & Last", titleAr: "البحث الثنائي: الأول والأخير", category: "searching", difficulty: "Intermediate",
  tags: ["binary search", "duplicates", "lower bound", "upper bound"], tagsAr: ["بحث ثنائي", "تكرارات", "حد أدنى", "حد أعلى"],
  summary: "Runs left- and right-biased binary searches to find the complete target range.",
  summaryAr: "يشغل بحثين ثنائيين منحازين لليسار واليمين لإيجاد مجال الهدف كاملًا.",
  renderer: "array", pseudocode, code: codeBundle("Binary Search First and Last", pseudocode), ...learning,
  inputFields: searchFields, defaultInput: (level, rng) => {
    const base = defaultSearch(level, rng, true);
    const target = rng.pick(base.values);
    return { values: [...base.values, target, target].sort((a, b) => a - b), target };
  }, parseInput: (fields) => parseSearch(fields, true), serializeInput: serializeSearch, generate,
};
export default mod;
