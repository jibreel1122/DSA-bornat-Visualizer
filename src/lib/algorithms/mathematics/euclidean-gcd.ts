import type { AlgorithmModule, CallStackFrame, CallStackItem, Step } from "@/lib/engine/types";

type Input = { a: number; b: number };

function generate(input: Input): Step<CallStackFrame>[] {
  const steps: Step<CallStackFrame>[] = [];
  const stack: CallStackItem[] = [];
  let calls = 0;
  let uid = 0;

  const snap = (description: string, codeLine: number, topState?: CallStackItem["state"]) => {
    const shown = stack.map((s, i) => ({ ...s, state: i === stack.length - 1 ? topState ?? s.state : s.state }));
    steps.push({ frame: { stack: shown }, description, codeLine, counters: { calls, depth: stack.length } });
  };

  snap(`Euclidean algorithm: gcd(a, b) = gcd(b, a mod b) until b = 0.`, 0);

  const gcd = (a: number, b: number): number => {
    calls++;
    const item: CallStackItem = { id: `g${uid++}`, label: `gcd(${a}, ${b})`, state: "active" };
    stack.push(item);
    snap(`Call gcd(${a}, ${b}).`, 1, "active");
    if (b === 0) {
      item.detail = `= ${a}`;
      snap(`Base case: b = 0, so gcd = ${a}.`, 2, "found");
      stack.pop();
      return a;
    }
    const r = a % b;
    item.detail = `${a} mod ${b} = ${r}`;
    snap(`${a} mod ${b} = ${r}. Recurse on gcd(${b}, ${r}).`, 3);
    const result = gcd(b, r);
    item.detail = `= ${result}`;
    snap(`gcd(${a}, ${b}) returns ${result}.`, 4, "sorted");
    stack.pop();
    return result;
  };

  const result = gcd(input.a, input.b);
  snap(`gcd(${input.a}, ${input.b}) = ${result}.`, 5);
  return steps;
}

const mod: AlgorithmModule<CallStackFrame, Input> = {
  slug: "euclidean-gcd",
  title: "Euclidean Algorithm (GCD)",
  category: "mathematics",
  difficulty: "Beginner",
  tags: ["number theory", "recursion", "gcd", "modulo"],
  summary: "Finds the greatest common divisor by repeatedly replacing (a, b) with (b, a mod b) until b is 0.",
  renderer: "callstack",
  pseudocode: [
    "procedure gcd(a, b)",
    "  call gcd(a, b)",
    "  if b == 0: return a          // base case",
    "  r = a mod b",
    "  return gcd(b, r)             // recurse",
    "  // result propagates back up",
  ],
  code: {
    pseudocode: `procedure gcd(a, b)
  if b == 0: return a
  return gcd(b, a mod b)`,
    c: `int gcd(int a, int b) {
    return b == 0 ? a : gcd(b, a % b);
}`,
    cpp: `int gcd(int a, int b) {
    return b == 0 ? a : gcd(b, a % b);
}`,
    java: `static int gcd(int a, int b) {
    return b == 0 ? a : gcd(b, a % b);
}`,
    python: `def gcd(a: int, b: int) -> int:
    return a if b == 0 else gcd(b, a % b)`,
    javascript: `function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}`,
    typescript: `function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}`,
    csharp: `static int Gcd(int a, int b) {
    return b == 0 ? a : Gcd(b, a % b);
}`,
    go: `func gcd(a, b int) int {
	if b == 0 {
		return a
	}
	return gcd(b, a%b)
}`,
    rust: `fn gcd(a: u64, b: u64) -> u64 {
    if b == 0 { a } else { gcd(b, a % b) }
}`,
    kotlin: `fun gcd(a: Int, b: Int): Int = if (b == 0) a else gcd(b, a % b)`,
    swift: `func gcd(_ a: Int, _ b: Int) -> Int {
    b == 0 ? a : gcd(b, a % b)
}`,
  },
  content: {
    overview: `The Euclidean algorithm is one of the oldest algorithms still in use, dating to Euclid's Elements around 300 BC. It computes the greatest common divisor (GCD) of two integers — the largest number that divides both — with astonishing efficiency.

Its correctness rests on a simple fact: any common divisor of a and b also divides a mod b. So gcd(a, b) = gcd(b, a mod b). Repeatedly applying this shrinks the numbers quickly until the second becomes 0, at which point the first is the answer.`,
    howItWorks: [
      "To compute gcd(a, b), check whether b is 0.",
      "If b = 0, the GCD is a — this is the base case.",
      "Otherwise compute the remainder r = a mod b.",
      "Recurse on gcd(b, r): the problem shrinks because r < b.",
      "The recursion bottoms out quickly; the surviving value is the GCD.",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(log(min(a,b)))", worst: "O(log(min(a,b)))" },
      space: "O(log(min(a,b)))",
      notes: "The number of steps is O(log(min(a,b))); the worst case is consecutive Fibonacci numbers. An iterative version uses O(1) space.",
    },
    applications: [
      "Reducing fractions to lowest terms",
      "The extended version computes modular inverses (RSA, cryptography)",
      "Computing the least common multiple: lcm(a,b) = a·b / gcd(a,b)",
      "Solving linear Diophantine equations",
    ],
    advantages: [
      "Extremely fast — logarithmic number of steps",
      "Tiny, elegant implementation",
      "No factorization needed (much faster than factoring)",
      "Extends to modular inverses via the Extended Euclidean algorithm",
    ],
    disadvantages: [
      "Recursive form uses O(log n) stack (iterative avoids this)",
      "Only defined for integers",
      "The basic version doesn't yield Bézout coefficients (use the extended form)",
    ],
    commonMistakes: [
      "Swapping the arguments incorrectly — the recursion is gcd(b, a mod b).",
      "Not handling gcd(a, 0) = a (and gcd(0, 0) conventionally 0).",
      "Using subtraction repeatedly instead of modulo (much slower).",
      "Mishandling negative inputs (take absolute values first).",
    ],
    interviewQuestions: [
      "Why is gcd(a, b) = gcd(b, a mod b) valid?",
      "What input pair maximizes the number of steps?",
      "How does the Extended Euclidean algorithm find modular inverses?",
      "Derive lcm from gcd.",
      "Convert the recursive GCD to an iterative O(1)-space loop.",
    ],
    summary:
      "The Euclidean algorithm computes gcd(a, b) by repeatedly replacing (a, b) with (b, a mod b) until b is 0, running in O(log min(a,b)) steps. Ancient, elegant, and the foundation for modular inverses and fraction reduction.",
    quiz: [
      { question: "The Euclidean algorithm's base case is…", options: ["a == b", "b == 0", "a == 0 and b == 0", "a mod b == 1"], answer: 1, explanation: "When b reaches 0, a is the GCD." },
      { question: "gcd(a, b) equals…", options: ["gcd(a − b, b)", "gcd(b, a mod b)", "gcd(a·b, 1)", "a + b"], answer: 1, explanation: "Any common divisor of a and b divides a mod b, justifying the recurrence." },
      { question: "The number of steps is on the order of…", options: ["O(1)", "O(log min(a,b))", "O(min(a,b))", "O(a·b)"], answer: 1, explanation: "Each step reduces the numbers geometrically." },
      { question: "Which inputs give the worst case?", options: ["Powers of two", "Consecutive Fibonacci numbers", "Equal numbers", "Primes"], answer: 1, explanation: "Consecutive Fibonacci numbers make the modulo shrink slowest." },
      { question: "lcm(a, b) equals…", options: ["a + b − gcd(a,b)", "a·b / gcd(a,b)", "gcd(a,b)²", "a·b·gcd(a,b)"], answer: 1, explanation: "The product divided by the GCD gives the least common multiple." },
    ],
  },
  inputFields: [
    { key: "a", label: "a", placeholder: "48" },
    { key: "b", label: "b", placeholder: "18" },
  ],
  defaultInput: (level, rng) => {
    const max = [0, 40, 100, 400, 1200, 4000][level] ?? 100;
    const a = rng.int(Math.floor(max / 2), max);
    const b = rng.int(2, Math.max(3, Math.floor(max / 2)));
    return { a: Math.max(a, b), b: Math.min(a, b) };
  },
  parseInput: (fields) => {
    const a = Number((fields.a ?? "").trim());
    const b = Number((fields.b ?? "").trim());
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) throw new Error("Enter two non-negative whole numbers.");
    if (a > 100000 || b > 100000) throw new Error("Keep values at most 100000.");
    if (a === 0 && b === 0) throw new Error("At least one value must be non-zero.");
    return { a: Math.max(a, b), b: Math.min(a, b) };
  },
  serializeInput: (input) => ({ a: String(input.a), b: String(input.b) }),
  generate,
};

export default mod;
