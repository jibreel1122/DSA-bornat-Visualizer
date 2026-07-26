import type { AlgorithmModule, CallStackFrame, CallStackItem, Step } from "@/lib/engine/types";
import { callStackFrame, codeBundle, defaultSearch, parseSearch, searchFields, serializeSearch, standardLearning, type SearchInput } from "./shared";

const pseudocode = [
  "procedure recursiveBinarySearch(a, target, lo, hi)",
  "  if lo > hi: return -1",
  "  mid = floor((lo+hi)/2)",
  "  if a[mid] == target: return mid",
  "  if a[mid] < target: recurse(mid+1, hi)",
  "  else: recurse(lo, mid-1)",
];
function generate(input: SearchInput): Step<CallStackFrame>[] {
  const a = [...input.values].sort((x, y) => x - y);
  const steps: Step<CallStackFrame>[] = [];
  const stack: CallStackFrame["stack"] = [];
  let calls = 0, comparisons = 0;
  const snap = (text: string, ar: string, line: number, output: (string | number)[] = []) =>
    steps.push({ frame: callStackFrame(stack, output, [{ label: "Sorted array", values: a }]), description: text, descriptionAr: ar, codeLine: line, counters: { calls, comparisons } });
  const search = (lo: number, hi: number): number => {
    calls++;
    const frame: CallStackItem = { id: `call-${calls}`, label: `search(${lo}, ${hi})`, state: "active" };
    stack.push(frame);
    snap(`Call search on [${lo}..${hi}].`, `استدع البحث في [${lo}..${hi}].`, 0);
    if (lo > hi) {
      frame.detail = "return -1";
      snap("The interval is empty; return -1.", "المجال فارغ؛ أعد -1.", 1);
      stack.pop();
      return -1;
    }
    const mid = (lo + hi) >> 1;
    comparisons++;
    frame.detail = `mid=${mid}, value=${a[mid]}`;
    snap(`Middle index ${mid} contains ${a[mid]}.`, `يحتوي الفهرس الأوسط ${mid} على ${a[mid]}.`, 2);
    if (a[mid] === input.target) {
      frame.state = "found";
      snap(`Found ${input.target}; return ${mid}.`, `عُثر على ${input.target}؛ أعد ${mid}.`, 3, [mid]);
      stack.pop();
      return mid;
    }
    const result = a[mid] < input.target ? search(mid + 1, hi) : search(lo, mid - 1);
    frame.detail = `return ${result}`;
    snap(`Unwind search(${lo}, ${hi}) with result ${result}.`, `تراجع من search(${lo}، ${hi}) بالنتيجة ${result}.`, a[mid] < input.target ? 4 : 5, [result]);
    stack.pop();
    return result;
  };
  const result = search(0, a.length - 1);
  snap(result >= 0 ? `Final result: index ${result}.` : "Final result: target absent.", result >= 0 ? `النتيجة النهائية: الفهرس ${result}.` : "النتيجة النهائية: الهدف غير موجود.", result >= 0 ? 3 : 1, [result]);
  return steps;
}
const learning = standardLearning({
  overview: "Recursive binary search expresses the halving strategy as nested calls, making the shrinking interval and stack unwinding explicit.",
  overviewAr: "يعبر البحث الثنائي العودي عن استراتيجية التنصيف باستدعاءات متداخلة، فيوضح تقلص المجال وتراجع المكدس.",
  how: ["Stop on an empty interval.", "Compare the middle value.", "Recurse into exactly one valid half and return its result."],
  howAr: ["توقف عند مجال فارغ.", "قارن القيمة الوسطى.", "استدعِ نصفًا صحيحًا واحدًا وأعد نتيجته."],
  complexity: { time: { best: "O(1)", average: "O(log n)", worst: "O(log n)" }, space: "O(log n)" },
  invariant: "If the target exists, it remains inside the interval of the active call.",
  invariantAr: "إذا كان الهدف موجودًا فإنه يبقى داخل مجال الاستدعاء النشط.",
  summary: "Recursive binary search halves a sorted interval and visualizes call-stack unwinding.",
  summaryAr: "ينصف البحث الثنائي العودي مجالًا مرتبًا ويعرض تراجع مكدس الاستدعاءات.",
});
const mod: AlgorithmModule<CallStackFrame, SearchInput> = {
  slug: "recursive-binary-search", title: "Recursive Binary Search", titleAr: "البحث الثنائي العودي", category: "recursion", difficulty: "Beginner",
  tags: ["recursion", "binary search", "call stack", "sorted array"], tagsAr: ["عودية", "بحث ثنائي", "مكدس الاستدعاء", "مصفوفة مرتبة"],
  summary: "Recursively halves a sorted search interval and shows each call and return.", summaryAr: "ينصف مجال البحث المرتب عوديًا ويعرض كل استدعاء وعودة.",
  renderer: "callstack", pseudocode, code: codeBundle("Recursive Binary Search", pseudocode), ...learning,
  inputFields: searchFields, defaultInput: (level, rng) => defaultSearch(level, rng, true), parseInput: (fields) => parseSearch(fields, true), serializeInput: serializeSearch, generate,
};
export default mod;
