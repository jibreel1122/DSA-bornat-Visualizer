import type { AlgorithmModule, Step, StringFrame } from "@/lib/engine/types";
import { codeBundle, defaultTextPattern, stringFrame, standardLearning } from "./shared";

type Input = { text: string };
const pseudocode = [
  "procedure manacher(text)",
  "  transform text with separators",
  "  center = right = 0",
  "  for i in transformed text:",
  "    mirror = 2*center-i; seed radius inside right",
  "    expand while characters match",
  "    if i+radius[i] > right: update center and right",
  "  return longest palindrome",
];
function generate(input: Input): Step<StringFrame>[] {
  const original = [...input.text];
  const transformed = ["^", ...original.flatMap((ch) => ["#", ch]), "#", "$"];
  const radius = new Array(transformed.length).fill(0);
  const steps: Step<StringFrame>[] = [];
  let comparisons = 0, center = 0, right = 0;
  const snap = (text: string, ar: string, line: number, index?: number, state: "active" | "compare" | "found" = "active") => {
    const states: Record<number, "active" | "compare" | "found"> = {};
    if (index !== undefined && index > 0 && index < transformed.length - 1 && transformed[index] !== "#") states[(index - 2) / 2] = state;
    steps.push({ frame: stringFrame(original, states, undefined, {}, 0, [
      { label: "Transformed", values: transformed },
      { label: "Radius", values: radius },
      { label: "center / right", values: [center, right] },
    ]), description: text, descriptionAr: ar, codeLine: line, counters: { comparisons, expansions: radius.reduce((sum, value) => sum + value, 0) } });
  };
  snap("Insert separators so odd and even palindromes use one radius rule.", "أدخل فواصل كي تستخدم المتناظرات الفردية والزوجية قاعدة نصف قطر واحدة.", 1);
  for (let i = 1; i < transformed.length - 1; i++) {
    const mirror = 2 * center - i;
    if (i < right) radius[i] = Math.min(right - i, radius[mirror] ?? 0);
    snap(`At transformed index ${i}, mirror ${mirror} seeds radius ${radius[i]}.`, `عند الفهرس المحول ${i} تعطي المرآة ${mirror} نصف قطر ابتدائي ${radius[i]}.`, 3, i);
    while (transformed[i + 1 + radius[i]] === transformed[i - 1 - radius[i]]) {
      comparisons++;
      radius[i]++;
      snap(`Matching symmetric characters expand radius[${i}] to ${radius[i]}.`, `توسع الأحرف المتناظرة المتطابقة نصف القطر[${i}] إلى ${radius[i]}.`, 4, i, "compare");
    }
    comparisons++;
    if (i + radius[i] > right) {
      center = i;
      right = i + radius[i];
      snap(`Palindrome reaches farther right; center=${center}, right=${right}.`, `وصل المتناظر أبعد يمينًا؛ المركز=${center} واليمين=${right}.`, 5, i, "found");
    }
  }
  let bestCenter = 0;
  for (let i = 1; i < radius.length - 1; i++) if (radius[i] > radius[bestCenter]) bestCenter = i;
  const start = Math.floor((bestCenter - radius[bestCenter]) / 2);
  const length = radius[bestCenter];
  const states: Record<number, "found"> = {};
  for (let i = start; i < start + length; i++) states[i] = "found";
  steps.push({ frame: stringFrame(original, states, undefined, {}, 0, [{ label: "Longest palindrome", values: original.slice(start, start + length) }, { label: "Start / length", values: [start, length] }]), description: `Longest palindrome is "${original.slice(start, start + length).join("")}" at [${start}..${start + length - 1}].`, descriptionAr: `أطول مقطع متناظر هو "${original.slice(start, start + length).join("")}" في [${start}..${start + length - 1}].`, codeLine: 6, counters: { comparisons, expansions: radius.reduce((sum, value) => sum + value, 0) } });
  return steps;
}
const learning = standardLearning({
  overview: "Manacher's algorithm reuses the mirror radius inside the rightmost known palindrome and expands only beyond established information.",
  overviewAr: "تعيد خوارزمية ماناشر استخدام نصف قطر المرآة داخل أبعد متناظر معروف وتتوسع فقط خارج المعلومات المثبتة.",
  how: ["Normalize parity with separators.", "Seed a radius from its mirror.", "Expand and update the rightmost palindrome."],
  howAr: ["وحّد الفردي والزوجي بالفواصل.", "ابدأ نصف القطر من المرآة.", "توسع وحدّث أبعد متناظر يمينًا."],
  complexity: { time: { best: "O(n)", average: "O(n)", worst: "O(n)" }, space: "O(n)" },
  invariant: "Radii fully inside the right boundary can be safely mirrored up to that boundary.",
  invariantAr: "يمكن عكس أنصاف الأقطار الواقعة كليًا داخل الحد الأيمن بأمان حتى ذلك الحد.",
  summary: "Manacher finds the longest palindromic substring in linear time.",
  summaryAr: "تجد ماناشر أطول مقطع متناظر بزمن خطي.",
});
const mod: AlgorithmModule<StringFrame, Input> = {
  slug: "manacher", title: "Manacher's Algorithm", titleAr: "خوارزمية ماناشر", category: "strings", difficulty: "Advanced",
  tags: ["palindrome", "linear time", "mirror", "radius"], tagsAr: ["تناظر", "زمن خطي", "مرآة", "نصف قطر"],
  summary: "Uses mirrored palindrome radii to find the longest palindromic substring in O(n).",
  summaryAr: "تستخدم أنصاف أقطار متناظرة معكوسة لإيجاد أطول مقطع متناظر في O(n).",
  renderer: "string", pseudocode, code: codeBundle("Manacher's Algorithm", pseudocode), ...learning,
  inputFields: [{ key: "text", label: "Text", labelAr: "النص", placeholder: "abacaba" }],
  defaultInput: (level, rng) => ({ text: defaultTextPattern(level, rng).text }),
  parseInput: (fields) => { const text = fields.text ?? ""; if ([...text].length < 1 || [...text].length > 100) throw new Error("Text must contain 1 to 100 characters."); return { text }; },
  serializeInput: (input) => ({ text: input.text }), generate,
};
export default mod;
