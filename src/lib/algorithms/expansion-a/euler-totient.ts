import type { AlgorithmModule, ArrayFrame, Step } from "@/lib/engine/types";
import { codeBundle, gcd, pushArrayStep, standardLearning } from "./shared";

type Input = { n: number };
const pseudocode = [
  "procedure phi(n)",
  "  result = n; remaining = n",
  "  for p = 2 while p*p <= remaining:",
  "    if p divides remaining:",
  "      remove every factor p",
  "      result = result - result/p",
  "  if remaining > 1: result -= result/remaining",
  "  return result",
];
function generate(input: Input): Step<ArrayFrame>[] {
  const candidates = Array.from({ length: input.n }, (_, i) => i + 1);
  const steps: Step<ArrayFrame>[] = [];
  let remaining = input.n, result = input.n, divisions = 0;
  const factors: number[] = [];
  const snap = (text: string, ar: string, line: number, factor?: number) => pushArrayStep(steps, candidates, text, ar, line, { divisions, factors: factors.length }, {}, { aux: [{ label: "n / remaining / φ", values: [input.n, remaining, result] }, { label: "Distinct prime factors", values: factors.length ? factors : ["—"] }], note: factor ? `processing factor ${factor}` : undefined });
  snap(`Start φ(${input.n}) with result=${input.n}.`, `ابدأ φ(${input.n}) والنتيجة=${input.n}.`, 1);
  for (let p = 2; p * p <= remaining; p++) {
    divisions++;
    if (remaining % p !== 0) continue;
    factors.push(p);
    snap(`${p} is a distinct prime factor.`, `${p} عامل أولي مميز.`, 3, p);
    while (remaining % p === 0) {
      remaining /= p;
      divisions++;
      snap(`Remove one factor ${p}; remaining=${remaining}.`, `احذف عاملًا ${p}؛ المتبقي=${remaining}.`, 4, p);
    }
    result -= result / p;
    snap(`Apply result -= result/${p}; result=${result}.`, `طبق result -= result/${p}؛ النتيجة=${result}.`, 5, p);
  }
  if (remaining > 1) {
    factors.push(remaining);
    result -= result / remaining;
    snap(`Remaining prime factor ${remaining}: result=${result}.`, `العامل الأولي المتبقي ${remaining}: النتيجة=${result}.`, 6, remaining);
  }
  const states: Record<number, "found" | "discarded"> = {};
  for (let k = 1; k <= input.n; k++) states[k - 1] = gcd(k, input.n) === 1 ? "found" : "discarded";
  pushArrayStep(steps, candidates, `φ(${input.n}) = ${result}: these are the coprime integers from 1 through ${input.n}.`, `φ(${input.n}) = ${result}: هذه الأعداد الأولية نسبيًا من 1 حتى ${input.n}.`, 7, { divisions, factors: factors.length }, states, { aux: [{ label: "Totient", values: [result] }, { label: "Distinct prime factors", values: factors }] });
  return steps;
}
const learning = standardLearning({
  overview: "Euler's totient counts integers up to n that are coprime with n using φ(n)=n∏(1−1/p) over distinct prime factors.",
  overviewAr: "تحسب دالة أويلر عدد الأعداد حتى n الأولية نسبيًا معه باستخدام φ(n)=n∏(1−1/p) على العوامل الأولية المميزة.",
  how: ["Factor n by trial division.", "Apply result -= result/p once per distinct prime.", "Handle a remaining prime factor."],
  howAr: ["حلل n بالقسمة التجريبية.", "طبق result -= result/p مرة لكل عامل أولي مميز.", "عالج العامل الأولي المتبقي."],
  complexity: { time: { best: "O(1)", average: "O(√n)", worst: "O(√n)" }, space: "O(1)" },
  invariant: "After processing primes through p, result excludes multiples of every processed prime factor.",
  invariantAr: "بعد معالجة العوامل حتى p تستبعد النتيجة مضاعفات كل عامل أولي معالج.",
  summary: "Prime-factor inclusion–exclusion computes Euler's totient in O(√n).",
  summaryAr: "يحسب الاشتمال والاستبعاد بالعوامل الأولية دالة أويلر في O(√n).",
});
const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "euler-totient", title: "Euler's Totient Function", titleAr: "دالة أويلر فاي", category: "mathematics", difficulty: "Intermediate",
  tags: ["number theory", "coprime", "prime factors", "phi"], tagsAr: ["نظرية الأعداد", "أولي نسبيًا", "عوامل أولية", "فاي"],
  summary: "Computes φ(n) from n's distinct prime factors and highlights the coprime integers.", summaryAr: "تحسب φ(n) من العوامل الأولية المميزة وتبرز الأعداد الأولية نسبيًا.",
  renderer: "array", pseudocode, code: codeBundle("Euler Totient", pseudocode), ...learning,
  inputFields: [{ key: "n", label: "n", labelAr: "n", placeholder: "36" }],
  defaultInput: (level, rng) => ({ n: rng.int(6, [18, 36, 60, 90, 120][level - 1]) }),
  parseInput: (fields) => { const n = Number(fields.n); if (!Number.isInteger(n) || n < 1 || n > 300) throw new Error("n must be an integer from 1 to 300."); return { n }; },
  serializeInput: (input) => ({ n: String(input.n) }), generate,
};
export default mod;
