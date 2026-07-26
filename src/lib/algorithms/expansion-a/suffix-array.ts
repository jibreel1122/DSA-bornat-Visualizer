import type { AlgorithmModule, Step, StringFrame } from "@/lib/engine/types";
import { codeBundle, stringFrame, standardLearning } from "./shared";

type Input = { text: string };
const pseudocode = [
  "procedure suffixArray(text)",
  "  rank[i] = code(text[i]); sa = [0..n-1]",
  "  for k = 1, 2, 4, ... while k < n:",
  "    sort suffix indices by (rank[i], rank[i+k])",
  "    assign equal pairs the same new rank",
  "  return sa",
];
function generate(input: Input): Step<StringFrame>[] {
  const text = [...input.text];
  const n = text.length;
  const sa = Array.from({ length: n }, (_, i) => i);
  let rank = text.map((ch) => ch.codePointAt(0) ?? 0);
  const steps: Step<StringFrame>[] = [];
  let comparisons = 0, rounds = 0;
  const snap = (description: string, ar: string, line: number, active?: number) => {
    const states: Record<number, "active"> = {};
    if (active !== undefined) states[active] = "active";
    steps.push({ frame: stringFrame(text, states, undefined, {}, 0, [{ label: "Suffix array", values: sa }, { label: "Ranks", values: rank }]), description, descriptionAr: ar, codeLine: line, counters: { comparisons, rounds } });
  };
  snap("Initially rank suffixes by their first character.", "رتّب اللواحق أوليًا حسب حرفها الأول.", 1);
  for (let k = 1; k < n; k *= 2) {
    rounds++;
    const pair = (i: number): [number, number] => [rank[i], i + k < n ? rank[i + k] : -1];
    sa.sort((i, j) => {
      comparisons++;
      const left = pair(i), right = pair(j);
      return left[0] - right[0] || left[1] - right[1];
    });
    snap(`Round ${rounds}: sort suffixes by rank pairs covering ${2 * k} characters.`, `الجولة ${rounds}: رتّب اللواحق بأزواج رتب تغطي ${2 * k} حرفًا.`, 3);
    const nextRank = new Array(n).fill(0);
    for (let order = 1; order < n; order++) {
      const previous = sa[order - 1], current = sa[order];
      const p = pair(previous), c = pair(current);
      nextRank[current] = nextRank[previous] + (p[0] === c[0] && p[1] === c[1] ? 0 : 1);
      snap(`Suffix ${current} receives rank ${nextRank[current]} from pair (${c[0]}, ${c[1]}).`, `يحصل اللاحق ${current} على الرتبة ${nextRank[current]} من الزوج (${c[0]}، ${c[1]}).`, 4, current);
    }
    rank = nextRank;
    if (rank[sa[n - 1]] === n - 1) break;
  }
  snap(`Final suffix order: ${sa.join(", ")}.`, `ترتيب اللواحق النهائي: ${sa.join("، ")}.`, 5);
  return steps;
}
const learning = standardLearning({
  overview: "The prefix-doubling suffix-array algorithm repeatedly sorts suffixes by two ranks that summarize blocks of length k.",
  overviewAr: "ترتب خوارزمية مضاعفة البادئة اللواحق تكراريًا بزوج رتب يلخص كتلتين بطول k.",
  how: ["Rank one-character prefixes.", "Sort by pairs of k-length ranks.", "Compress pairs into new ranks and double k."],
  howAr: ["رتّب البادئات ذات الحرف الواحد.", "رتّب بأزواج رتب بطول k.", "اضغط الأزواج إلى رتب جديدة وضاعف k."],
  complexity: { time: { best: "O(n log² n)", average: "O(n log² n)", worst: "O(n log² n)" }, space: "O(n)" },
  invariant: "After round k, rank order agrees with the first 2k characters of every suffix.",
  invariantAr: "بعد جولة k يتفق ترتيب الرتب مع أول 2k حرفًا من كل لاحقة.",
  summary: "Prefix doubling constructs a lexicographically sorted suffix index.",
  summaryAr: "تبني مضاعفة البادئة فهرس لواحق مرتبًا معجميًا.",
});
const mod: AlgorithmModule<StringFrame, Input> = {
  slug: "suffix-array", title: "Suffix Array", titleAr: "مصفوفة اللواحق", category: "strings", difficulty: "Advanced",
  tags: ["suffixes", "prefix doubling", "lexicographic", "index"], tagsAr: ["لواحق", "مضاعفة البادئة", "معجمي", "فهرس"],
  summary: "Sorts suffix indices lexicographically by repeatedly doubling ranked prefixes.",
  summaryAr: "ترتب فهارس اللواحق معجميًا بمضاعفة البادئات المرتبة تكراريًا.",
  renderer: "string", pseudocode, code: codeBundle("Suffix Array", pseudocode), ...learning,
  inputFields: [{ key: "text", label: "Text", labelAr: "النص", placeholder: "banana" }],
  defaultInput: (level, rng) => ({ text: level <= 2 ? rng.pick(["banana", "abracadabra", "mississippi"]) : Array.from({ length: 5 + level * 2 }, () => rng.pick(["a", "b", "c", "d"])).join("") }),
  parseInput: (fields) => { const text = fields.text ?? ""; if ([...text].length < 1 || [...text].length > 60) throw new Error("Text must contain 1 to 60 characters."); return { text }; },
  serializeInput: (input) => ({ text: input.text }), generate,
};
export default mod;
