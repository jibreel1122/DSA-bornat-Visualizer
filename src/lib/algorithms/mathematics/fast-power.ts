import type { AlgorithmModule, CallStackFrame, CallStackItem, Step } from "@/lib/engine/types";

type Input = { base: number; exp: number; mod?: number };

function generate(input: Input): Step<CallStackFrame>[] {
  const { base, exp, mod: m } = input;
  // BigInt keeps every intermediate product exact, no matter how large base/exp/mod are —
  // only the recursion depth (O(log exp)) affects step count, not the magnitude of the numbers.
  const baseB = BigInt(base);
  const expB = BigInt(exp);
  const modB = m !== undefined ? BigInt(m) : undefined;
  const steps: Step<CallStackFrame>[] = [];
  const stack: CallStackItem[] = [];
  let mults = 0;
  let uid = 0;

  const reduce = (x: bigint) => (modB !== undefined ? ((x % modB) + modB) % modB : x);

  const snap = (description: string, codeLine: number, topState?: CallStackItem["state"]) => {
    const shown = stack.map((s, i) => ({ ...s, state: i === stack.length - 1 ? topState ?? s.state : s.state }));
    steps.push({
      frame: {
        stack: shown,
        aux: [{ label: "multiplications", values: [mults] }],
        note: modB !== undefined ? `All arithmetic is done mod ${modB}.` : undefined,
      },
      description,
      codeLine,
      counters: { multiplications: mults, depth: stack.length },
    });
  };

  snap(
    modB !== undefined
      ? `Compute ${base}^${exp} mod ${m} by squaring: x^e = (x^(e/2))² for even e, x·x^(e-1) for odd e.`
      : `Compute ${base}^${exp} by squaring: x^e = (x^(e/2))² for even e, x·x^(e-1) for odd e.`,
    0,
  );

  const ZERO = BigInt(0);
  const ONE = BigInt(1);
  const TWO = BigInt(2);

  const power = (b: bigint, e: bigint): bigint => {
    const item: CallStackItem = { id: `p${uid++}`, label: `power(${b}, ${e})`, state: "active" };
    stack.push(item);
    snap(`Call power(${b}, ${e}).`, 1, "active");
    if (e === ZERO) {
      item.detail = "= 1";
      snap(`Base case: anything^0 = 1.`, 2, "found");
      stack.pop();
      return ONE;
    }
    const half = power(b, e / TWO);
    let result: bigint;
    if (e % TWO === ZERO) {
      mults++;
      result = reduce(half * half);
      item.detail = `${half}² = ${result}`;
      snap(`e = ${e} is even: square the half → ${half}² ${modB !== undefined ? `mod ${m} ` : ""}= ${result}.`, 3, "sorted");
    } else {
      mults += 2;
      result = reduce(reduce(half * half) * b);
      item.detail = `${half}²·${b} = ${result}`;
      snap(`e = ${e} is odd: square the half and multiply by ${b} → ${half}²·${b} ${modB !== undefined ? `mod ${m} ` : ""}= ${result}.`, 4, "sorted");
    }
    stack.pop();
    return result;
  };

  const result = power(reduce(baseB), expB);
  const naiveMults = exp > 0 ? exp - 1 : 0;
  snap(
    modB !== undefined
      ? `${base}^${exp} mod ${m} = ${result}, using only ${mults} multiplications instead of ${naiveMults}.`
      : `${base}^${exp} = ${result}, using only ${mults} multiplications instead of ${naiveMults}.`,
    5,
  );
  return steps;
}

const mod: AlgorithmModule<CallStackFrame, Input> = {
  slug: "fast-power",
  title: "Fast Power (Binary Exponentiation)",
  category: "mathematics",
  difficulty: "Intermediate",
  tags: ["number theory", "divide & conquer", "modular arithmetic", "O(log n)"],
  summary: "Computes xⁿ (optionally mod m) in O(log n) multiplications by repeatedly squaring — the engine behind modular exponentiation in cryptography.",
  renderer: "callstack",
  pseudocode: [
    "procedure power(x, e)   // optionally mod m",
    "  call power(x, e)",
    "  if e == 0: return 1            // base case",
    "  h = power(x, e/2); if e even: return h·h",
    "  else: return h·h·x             // odd exponent",
    "  // O(log e) recursion depth",
  ],
  code: {
    pseudocode: `procedure power(x, e):
  if e == 0: return 1
  h = power(x, floor(e/2))
  if e is even: return h*h
  else: return h*h*x
// with modulus m: reduce every product mod m`,
    c: `long long power(long long x, long long e, long long m) {
    if (e == 0) return 1;
    long long h = power(x, e / 2, m);
    h = (h * h) % m;
    if (e % 2) h = (h * x) % m;
    return h;
}`,
    cpp: `long long power(long long x, long long e, long long m) {
    if (e == 0) return 1;
    long long h = power(x, e / 2, m);
    h = (h * h) % m;
    if (e % 2) h = (h * x) % m;
    return h;
}`,
    java: `static long power(long x, long e, long m) {
    if (e == 0) return 1;
    long h = power(x, e / 2, m);
    h = (h * h) % m;
    if (e % 2 == 1) h = (h * x) % m;
    return h;
}`,
    python: `def power(x: int, e: int, m: int | None = None) -> int:
    if e == 0:
        return 1
    h = power(x, e // 2, m)
    h = h * h
    if e % 2:
        h *= x
    return h % m if m else h
# built-in: pow(x, e, m) does exactly this`,
    javascript: `function power(x, e, m) {
  if (e === 0) return 1;
  let h = power(x, Math.floor(e / 2), m);
  h = m ? (h * h) % m : h * h;
  if (e % 2) h = m ? (h * x) % m : h * x;
  return h;
}`,
    typescript: `function power(x: number, e: number, m?: number): number {
  if (e === 0) return 1;
  let h = power(x, Math.floor(e / 2), m);
  h = m ? (h * h) % m : h * h;
  if (e % 2) h = m ? (h * x) % m : h * x;
  return h;
}`,
    csharp: `static long Power(long x, long e, long m) {
    if (e == 0) return 1;
    long h = Power(x, e / 2, m);
    h = h * h % m;
    if (e % 2 == 1) h = h * x % m;
    return h;
}`,
    go: `func power(x, e, m int64) int64 {
	if e == 0 {
		return 1
	}
	h := power(x, e/2, m)
	h = h * h % m
	if e%2 == 1 {
		h = h * x % m
	}
	return h
}`,
    rust: `fn power(x: u64, e: u64, m: u64) -> u64 {
    if e == 0 { return 1; }
    let h = power(x, e / 2, m);
    let mut r = h * h % m;
    if e % 2 == 1 { r = r * x % m; }
    r
}`,
    kotlin: `fun power(x: Long, e: Long, m: Long): Long {
    if (e == 0L) return 1
    var h = power(x, e / 2, m)
    h = h * h % m
    if (e % 2 == 1L) h = h * x % m
    return h
}`,
    swift: `func power(_ x: Int, _ e: Int, _ m: Int) -> Int {
    if e == 0 { return 1 }
    var h = power(x, e / 2, m)
    h = h * h % m
    if e % 2 == 1 { h = h * x % m }
    return h
}`,
  },
  content: {
    overview: `Computing xⁿ naively takes n − 1 multiplications. Binary exponentiation (also "exponentiation by squaring" or "fast power") does it in O(log n) by exploiting the identity xⁿ = (x^(n/2))² for even n and xⁿ = x·xⁿ⁻¹ for odd n. Each recursive step halves the exponent, so 2¹⁰⁰⁰ needs about 10–15 multiplications, not a thousand.

Combined with a modulus — reducing every intermediate product mod m — this becomes modular exponentiation, the workhorse of modern cryptography: RSA encryption/decryption, Diffie-Hellman key exchange, and primality tests (Fermat, Miller-Rabin) all compute aᵉ mod m on numbers hundreds of digits long, which is only feasible because the multiplication count is logarithmic and intermediates stay bounded by m².`,
    howItWorks: [
      "To compute power(x, e): if e = 0, return 1 (base case).",
      "Recursively compute h = power(x, ⌊e/2⌋) — a single subproblem, half the size.",
      "If e is even, the answer is h·h (one multiplication).",
      "If e is odd, the answer is h·h·x (two multiplications).",
      "For modular exponentiation, reduce every product mod m so numbers never exceed m².",
    ],
    complexity: {
      time: { best: "O(log n)", average: "O(log n)", worst: "O(log n)" },
      space: "O(log n)",
      notes: "The exponent halves each call, giving ⌈log₂ n⌉ levels with 1–2 multiplications each. The iterative bit-scanning version uses O(1) space.",
    },
    applications: [
      "RSA and Diffie-Hellman (modular exponentiation on huge numbers)",
      "Miller-Rabin and Fermat primality testing",
      "Fast matrix exponentiation (e.g., Fibonacci in O(log n))",
      "Computing modular inverses via Fermat's little theorem (a^(p−2) mod p)",
    ],
    advantages: [
      "O(log n) multiplications versus O(n) for the naive loop",
      "With a modulus, intermediate values stay small (< m²) — no overflow blowup",
      "The same skeleton powers matrix exponentiation and other monoid powers",
    ],
    disadvantages: [
      "Recursive form uses O(log n) stack (the iterative version fixes this)",
      "Without a modulus, results overflow fixed-width integers very quickly",
      "Slightly trickier to get right than the obvious loop (odd/even split)",
    ],
    commonMistakes: [
      "Multiplying h·h·x but forgetting to reduce mod m between the two multiplications (overflow).",
      "Recursing twice — power(x, e/2) called two times turns O(log n) into O(n).",
      "Treating negative exponents or 0^0 without defining them explicitly.",
      "Using pow() from a math library on integers and losing precision to floating point.",
    ],
    interviewQuestions: [
      "Why is binary exponentiation O(log n), and what goes wrong if you recurse twice?",
      "How does modular reduction at each step prevent overflow?",
      "Write the iterative version that scans the exponent's bits.",
      "How would you compute the n-th Fibonacci number in O(log n) with this technique?",
      "How does RSA rely on modular exponentiation being fast?",
    ],
    summary:
      "Binary exponentiation computes xⁿ in O(log n) multiplications by halving the exponent — square the half-result, times x once more when the exponent is odd. Reducing every product mod m yields modular exponentiation, the foundation of RSA, Diffie-Hellman, and primality testing.",
    quiz: [
      { question: "Fast power computes x¹⁰²⁴ using about…", options: ["1023 multiplications", "10 multiplications", "512 multiplications", "2 multiplications"], answer: 1, explanation: "1024 = 2¹⁰, so ten squarings suffice: log₂(1024) = 10." },
      { question: "For odd e, power(x, e) equals…", options: ["h·h where h = power(x, e/2)", "h·h·x where h = power(x, ⌊e/2⌋)", "x·power(x, e/2)", "h + h"], answer: 1, explanation: "⌊e/2⌋ loses the odd unit, so one extra factor of x restores it." },
      { question: "The classic bug that destroys the O(log n) bound is…", options: ["Using a loop", "Calling power(x, e/2) twice instead of reusing h", "Reducing mod m", "Checking e == 0"], answer: 1, explanation: "Two recursive calls per level makes the call tree 2^depth = O(n) nodes." },
      { question: "In modular exponentiation, intermediates stay bounded by…", options: ["m²", "x^e", "2m", "They grow unbounded"], answer: 0, explanation: "Each operand is < m after reduction, so any product is < m² before its own reduction." },
      { question: "Which cryptosystem depends directly on fast modular exponentiation?", options: ["Huffman coding", "RSA", "Quicksort", "CRC32"], answer: 1, explanation: "RSA encrypts/decrypts by computing message^key mod n on numbers with hundreds of digits." },
    ],
  },
  inputFields: [
    { key: "base", label: "Base x", placeholder: "3", help: "1–1,000,000." },
    { key: "exp", label: "Exponent n", placeholder: "13", help: "0–1,000,000." },
    { key: "mod", label: "Modulus m (optional)", placeholder: "1000003", help: "Leave empty for plain xⁿ (result must fit safely); set for modular exponentiation. Max 1,000,000,000,000 — arithmetic uses BigInt internally, so it stays exact." },
  ],
  defaultInput: (level, rng) => {
    const base = rng.int(2, 5 + level * 2);
    const exp = rng.int(4, 6 + level * 4);
    return level >= 3 ? { base, exp, mod: 1_000_003 } : { base, exp };
  },
  parseInput: (fields) => {
    const base = Number((fields.base ?? "").trim());
    const exp = Number((fields.exp ?? "").trim());
    const modRaw = (fields.mod ?? "").trim();
    if (!Number.isInteger(base) || base < 1 || base > 1_000_000) throw new Error("Base must be an integer between 1 and 1,000,000.");
    if (!Number.isInteger(exp) || exp < 0 || exp > 1_000_000) throw new Error("Exponent must be an integer between 0 and 1,000,000.");
    if (modRaw === "") {
      // Without a modulus the raw result xⁿ is shown in full, so keep it representable —
      // BigInt has no ceiling, but an astronomically long digit string isn't useful to look at.
      const digits = exp === 0 ? 1 : Math.ceil(exp * Math.log10(Math.max(base, 1) || 1));
      if (digits > 1000) throw new Error("xⁿ would have over 1000 digits without a modulus — add one (e.g. 1000000007) to keep results readable.");
      return { base, exp };
    }
    const m = Number(modRaw);
    if (!Number.isInteger(m) || m < 2) throw new Error("Modulus must be an integer ≥ 2.");
    if (m > 1_000_000_000_000) throw new Error("Keep the modulus at most 1,000,000,000,000.");
    return { base, exp, mod: m };
  },
  serializeInput: (input) => ({
    base: String(input.base),
    exp: String(input.exp),
    mod: input.mod !== undefined ? String(input.mod) : "",
  }),
  generate,
};

export default mod;
