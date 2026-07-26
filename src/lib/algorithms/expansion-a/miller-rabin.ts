import type { AlgorithmModule, CallStackFrame, Step } from "@/lib/engine/types";
import { callStackFrame, codeBundle, standardLearning } from "./shared";

type Input = { n: number };
const pseudocode = [
  "procedure millerRabin(n)",
  "  handle n < 2 and small prime divisors",
  "  write n-1 = d * 2^s with d odd",
  "  for each deterministic witness a:",
  "    x = a^d mod n",
  "    if x is 1 or n-1: continue",
  "    square x up to s-1 times; accept witness if x becomes n-1",
  "    otherwise return composite",
  "  return prime",
];
const modPow = (base: bigint, exponent: bigint, modulus: bigint) => {
  let result = BigInt(1), b = base % modulus, e = exponent;
  while (e > BigInt(0)) {
    if (e % BigInt(2) === BigInt(1)) result = (result * b) % modulus;
    b = (b * b) % modulus;
    e /= BigInt(2);
  }
  return result;
};
function generate(input: Input): Step<CallStackFrame>[] {
  const steps: Step<CallStackFrame>[] = [];
  const witnesses = [2, 3, 5, 7, 11];
  let tests = 0, squarings = 0;
  const push = (text: string, ar: string, line: number, stack: CallStackFrame["stack"] = [], output: (string | number)[] = []) =>
    steps.push({ frame: callStackFrame(stack, output, [{ label: "n", values: [input.n] }]), description: text, descriptionAr: ar, codeLine: line, counters: { tests, squarings } });
  if (input.n < 2) { push(`${input.n} is less than 2, so it is composite.`, `${input.n} أصغر من 2، لذا ليس أوليًا.`, 1, [], ["composite"]); return steps; }
  for (const p of [2, 3, 5, 7, 11]) {
    if (input.n === p) { push(`${input.n} is a small prime.`, `${input.n} عدد أولي صغير.`, 1, [], ["prime"]); return steps; }
    if (input.n % p === 0) { push(`${p} divides ${input.n}, proving it composite.`, `${p} يقسم ${input.n}، وهذا يثبت أنه غير أولي.`, 1, [], ["composite"]); return steps; }
  }
  const n = BigInt(input.n);
  let d = n - BigInt(1), s = 0;
  while (d % BigInt(2) === BigInt(0)) { d /= BigInt(2); s++; }
  push(`${input.n}-1 = ${d} × 2^${s}.`, `${input.n}-1 = ${d} × 2^${s}.`, 2);
  for (const witness of witnesses) {
    if (witness >= input.n) continue;
    tests++;
    let x = modPow(BigInt(witness), d, n);
    const stack = [{ id: `w${witness}`, label: `witness ${witness}`, detail: `x=${x}`, state: "active" as const }];
    push(`Witness ${witness}: x = ${witness}^${d} mod ${input.n} = ${x}.`, `الشاهد ${witness}: x = ${witness}^${d} mod ${input.n} = ${x}.`, 4, stack);
    if (x === BigInt(1) || x === n - BigInt(1)) continue;
    let passed = false;
    for (let r = 1; r < s; r++) {
      x = (x * x) % n;
      squarings++;
      stack[0].detail = `r=${r}, x=${x}`;
      push(`Square modulo n: x=${x} at round ${r}.`, `ربّع بترديد n: x=${x} في الجولة ${r}.`, 6, stack);
      if (x === n - BigInt(1)) { passed = true; break; }
    }
    if (!passed) { push(`Witness ${witness} proves ${input.n} composite.`, `يثبت الشاهد ${witness} أن ${input.n} غير أولي.`, 7, stack, ["composite"]); return steps; }
  }
  push(`${input.n} passes every deterministic witness and is prime in the supported range.`, `يجتاز ${input.n} كل الشواهد الحتمية وهو أولي ضمن المجال المدعوم.`, 8, [], ["prime"]);
  return steps;
}
const learning = standardLearning({
  overview: "Miller–Rabin tests whether repeated squaring exposes a nontrivial witness of compositeness. Fixed witnesses make this implementation deterministic in its bounded input range.",
  overviewAr: "يختبر ميلر-رابين هل يكشف التربيع المتكرر شاهدًا غير تافه على عدم الأولية، وتجعل الشواهد الثابتة التنفيذ حتميًا ضمن مجال الإدخال.",
  how: ["Factor powers of two from n−1.", "Test a^d modulo n.", "Repeatedly square, requiring a value of n−1 before the chain ends."],
  howAr: ["استخرج قوى اثنين من n−1.", "اختبر a^d بترديد n.", "ربّع تكراريًا واشترط ظهور n−1 قبل انتهاء السلسلة."],
  complexity: { time: { best: "O(log³ n)", average: "O(log³ n)", worst: "O(log³ n)" }, space: "O(1)" },
  invariant: "A surviving witness chain satisfies the strong probable-prime condition.",
  invariantAr: "تحقق سلسلة الشاهد الناجية شرط الأولية الاحتمالية القوي.",
  summary: "Deterministic witnesses turn Miller–Rabin into an exact primality test for this input range.",
  summaryAr: "تحول الشواهد الحتمية ميلر-رابين إلى اختبار أولية دقيق لهذا المجال.",
});
const mod: AlgorithmModule<CallStackFrame, Input> = {
  slug: "miller-rabin", title: "Miller–Rabin Primality Test", titleAr: "اختبار ميلر-رابين للأولية", category: "mathematics", difficulty: "Advanced",
  tags: ["primality", "witness", "modular exponentiation", "deterministic range"], tagsAr: ["أولية", "شاهد", "أس قياسي", "مجال حتمي"],
  summary: "Uses deterministic witnesses and modular squaring to test primality in the supported integer range.", summaryAr: "يستخدم شواهد حتمية وتربيعًا قياسيًا لاختبار الأولية ضمن مجال الأعداد المدعوم.",
  renderer: "callstack", pseudocode, code: codeBundle("Miller–Rabin", pseudocode), ...learning,
  inputFields: [{ key: "n", label: "n", labelAr: "n", placeholder: "97" }],
  defaultInput: (level, rng) => ({ n: rng.pick([[29, 31], [97, 91], [997, 1001], [104729, 104723], [2147483647, 2147483646]][level - 1]) }),
  parseInput: (fields) => { const n = Number(fields.n); if (!Number.isSafeInteger(n) || n < 0 || n > 2_147_483_647) throw new Error("n must be an integer from 0 to 2,147,483,647."); return { n }; },
  serializeInput: (input) => ({ n: String(input.n) }), generate,
};
export default mod;
