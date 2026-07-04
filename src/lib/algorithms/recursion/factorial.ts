import type { AlgorithmModule, CallStackFrame, CallStackItem, Step } from "@/lib/engine/types";

type Input = { n: number };

function generate(input: Input): Step<CallStackFrame>[] {
  const n = Math.max(0, Math.min(100, input.n));
  const steps: Step<CallStackFrame>[] = [];
  const stack: CallStackItem[] = [];
  let calls = 0;
  const output: (string | number)[] = [];

  const snap = (description: string, codeLine: number, topState?: CallStackItem["state"]) => {
    const shown = stack.map((s, i) => ({ ...s, state: i === stack.length - 1 ? topState ?? s.state : s.state }));
    steps.push({ frame: { stack: shown, output: [...output] }, description, codeLine, counters: { calls, depth: stack.length } });
  };

  snap(`Compute ${n}! recursively: factorial(n) = n × factorial(n−1).`, 0);

  // BigInt keeps every product exact — n! blows past Number.MAX_SAFE_INTEGER once n > 18.
  const fact = (k: number): bigint => {
    calls++;
    const item: CallStackItem = { id: `f${k}-${calls}`, label: `factorial(${k})`, state: "active" };
    stack.push(item);
    snap(`Call factorial(${k}). ${k <= 1 ? "This is the base case." : `Needs factorial(${k - 1}) first.`}`, 1, "active");
    let result: bigint;
    if (k <= 1) {
      result = BigInt(1);
      item.detail = `= 1`;
      snap(`Base case: factorial(${k}) returns 1.`, 2, "found");
    } else {
      const sub = fact(k - 1);
      result = BigInt(k) * sub;
      item.detail = `${k} × ${sub} = ${result}`;
      snap(`Unwind: factorial(${k}) = ${k} × ${sub} = ${result}.`, 4, "sorted");
    }
    stack.pop();
    return result;
  };

  const answer = fact(n);
  output.push(answer.toString());
  snap(`${n}! = ${answer}. The stack is empty again.`, 5);
  return steps;
}

const mod: AlgorithmModule<CallStackFrame, Input> = {
  slug: "factorial",
  title: "Factorial (Recursion)",
  category: "recursion",
  difficulty: "Beginner",
  tags: ["recursion", "base case", "call stack"],
  summary: "Computes n! by recursion, showing the call stack winding up to the base case and unwinding with results.",
  renderer: "callstack",
  pseudocode: [
    "procedure factorial(n)",
    "  call factorial(n)",
    "  if n <= 1: return 1        // base case",
    "  else:",
    "    return n * factorial(n-1)  // recursive case",
    "  // result returned to caller",
  ],
  code: {
    pseudocode: `procedure factorial(n)
  if n <= 1: return 1
  return n * factorial(n - 1)`,
    c: `long factorial(int n) {
    if (n <= 1) return 1;
    return (long)n * factorial(n - 1);
}`,
    cpp: `long long factorial(int n) {
    if (n <= 1) return 1;
    return 1LL * n * factorial(n - 1);
}`,
    java: `static long factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}`,
    python: `def factorial(n: int) -> int:
    if n <= 1:
        return 1
    return n * factorial(n - 1)`,
    javascript: `function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}`,
    typescript: `function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}`,
    csharp: `static long Factorial(int n) {
    if (n <= 1) return 1;
    return n * Factorial(n - 1);
}`,
    go: `func factorial(n int) int {
	if n <= 1 {
		return 1
	}
	return n * factorial(n-1)
}`,
    rust: `fn factorial(n: u64) -> u64 {
    if n <= 1 { 1 } else { n * factorial(n - 1) }
}`,
    kotlin: `fun factorial(n: Int): Long =
    if (n <= 1) 1 else n * factorial(n - 1)`,
    swift: `func factorial(_ n: Int) -> Int {
    n <= 1 ? 1 : n * factorial(n - 1)
}`,
  },
  content: {
    overview: `The factorial n! = n × (n−1) × … × 1 is the canonical first recursive function. Its definition is naturally recursive: factorial(n) = n × factorial(n−1), with the base case factorial(0) = factorial(1) = 1 that stops the recursion.

Watching it run reveals two phases. The "wind-up" phase pushes a new stack frame for each call as n decreases toward the base case, with each frame paused waiting for its subproblem. The "unwind" phase pops frames one by one, each multiplying its n by the value returned from below — a clear picture of how the call stack stores pending work.`,
    howItWorks: [
      "Call factorial(n).",
      "If n ≤ 1, return 1 immediately — the base case.",
      "Otherwise, recursively call factorial(n−1), pausing the current frame.",
      "Each deeper call pushes a new stack frame until the base case is reached.",
      "As calls return, each frame multiplies n by the returned value and pops.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n)", worst: "O(n)" },
      space: "O(n)",
      notes: "n recursive calls, each O(1) work → O(n) time. The call stack holds up to n frames → O(n) space (an iterative or tail-recursive version reduces this to O(1)).",
    },
    applications: [
      "Teaching recursion, base cases, and the call stack",
      "Combinatorics — permutations, combinations, binomial coefficients",
      "Probability and series expansions (e.g. Taylor series terms)",
      "Foundation for understanding memoization and dynamic programming",
    ],
    advantages: [
      "Directly mirrors the mathematical definition",
      "Simple and easy to verify",
      "Excellent vehicle for teaching recursion and stack frames",
    ],
    disadvantages: [
      "O(n) stack space can overflow for large n without tail-call optimization",
      "Overflows numeric types quickly (21! exceeds 64-bit range)",
      "An iterative loop is just as fast and uses O(1) space",
    ],
    commonMistakes: [
      "Omitting or mis-specifying the base case, causing infinite recursion / stack overflow.",
      "Using factorial(0) = 0 instead of 1.",
      "Ignoring integer overflow for even modest n.",
      "Assuming recursion is 'free' — each call consumes a stack frame.",
    ],
    interviewQuestions: [
      "What is the base case of factorial, and why is factorial(0) = 1?",
      "Convert the recursive factorial to an iterative version — what changes in space usage?",
      "What is tail recursion, and can factorial be written tail-recursively?",
      "At roughly what n does 64-bit factorial overflow?",
    ],
    summary:
      "Recursive factorial computes n! via factorial(n) = n × factorial(n−1) down to the base case, using O(n) time and O(n) stack space. It's the clearest demonstration of how recursion winds up and unwinds through the call stack.",
    quiz: [
      { question: "What is the base case of the recursive factorial?", options: ["n == 0 returns 0", "n <= 1 returns 1", "n == 2 returns 2", "There is none"], answer: 1, explanation: "factorial(0) and factorial(1) both equal 1, stopping the recursion." },
      { question: "How much stack space does recursive factorial(n) use?", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 2, explanation: "It builds up n nested frames before any returns." },
      { question: "The recursive calls reach the base case during which phase?", options: ["Wind-up (descending)", "Unwind (ascending)", "Both simultaneously", "Neither"], answer: 0, explanation: "n decreases on the way down; the base case is hit at the bottom before unwinding." },
      { question: "Why can factorial overflow quickly?", options: ["Recursion is slow", "Factorials grow faster than exponentials", "The base case is wrong", "It uses floats"], answer: 1, explanation: "n! grows super-exponentially, exceeding 64-bit integers by 21!." },
      { question: "An iterative factorial improves on the recursive one by…", options: ["Being asymptotically faster", "Using O(1) stack space", "Avoiding overflow", "Returning a different value"], answer: 1, explanation: "A loop avoids the O(n) call-stack frames while computing the same value in O(n) time." },
    ],
  },
  inputFields: [{ key: "n", label: "n", placeholder: "5", help: "0–100 (computed exactly with BigInt; the call stack scrolls for larger n)." }],
  defaultInput: (level) => ({ n: Math.min(10, 3 + level) }),
  parseInput: (fields) => {
    const n = Number((fields.n ?? "").trim());
    if (!Number.isInteger(n) || n < 0 || n > 100) throw new Error("Enter a whole number from 0 to 100.");
    return { n };
  },
  serializeInput: (input) => ({ n: String(input.n) }),
  generate,
};

export default mod;
