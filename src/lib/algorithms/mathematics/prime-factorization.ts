import type { AlgorithmModule, ArrayFrame, CellState, Step } from "@/lib/engine/types";

type Input = { n: number };

/** Primes up to `limit` via a simple sieve — used to keep the candidate bar chart short. */
function primesUpTo(limit: number): number[] {
  if (limit < 2) return [];
  const isComposite = new Array(limit + 1).fill(false);
  const primes: number[] = [];
  for (let i = 2; i <= limit; i++) {
    if (!isComposite[i]) {
      primes.push(i);
      for (let j = i * i; j <= limit; j += i) isComposite[j] = true;
    }
  }
  return primes;
}

function generate(input: Input): Step<ArrayFrame>[] {
  const original = input.n;
  const steps: Step<ArrayFrame>[] = [];
  let divisions = 0;
  const factors: number[] = [];

  // The bar chart shows candidate divisors up to √n. Trial division only ever needs to test
  // PRIME candidates (any composite divisor's own prime factors would already have been divided
  // out), so we sieve primes up to √n instead of listing every integer. This is both a real
  // algorithmic optimization (fewer, more meaningful divisions) and what keeps the bar chart
  // legible for large n — listing every integer 2..√n would need hundreds of bars long before
  // listing every prime does.
  const limit = Math.max(2, Math.floor(Math.sqrt(original)));
  const candidates: number[] = primesUpTo(limit);

  const snap = (
    states: Record<number, CellState>,
    remaining: number,
    description: string,
    codeLine: number,
    pointer?: number,
  ) => {
    steps.push({
      frame: {
        values: [...candidates],
        states: { ...states },
        pointers: pointer !== undefined ? [{ index: pointer, label: "d" }] : undefined,
        aux: [
          { label: "remaining n", values: [remaining] },
          { label: "factors", values: factors.length ? [...factors] : ["—"] },
        ],
        note: `Bars are the PRIME candidate divisors up to ⌊√${original}⌋ (composite candidates are skipped — they can never be the smallest remaining factor). A divisor found repeatedly is a prime factor with multiplicity.`,
      },
      description,
      codeLine,
      counters: { divisions, factors: factors.length },
    });
  };

  const doneStates: Record<number, CellState> = {};
  snap({}, original, `Factor ${original} by trial division: try divisors d = 2, 3, … up to √n. Every factor found is automatically prime.`, 0);

  let n = original;
  for (let i = 0; i < candidates.length && candidates[i] * candidates[i] <= n; i++) {
    const d = candidates[i];
    divisions++;
    if (n % d !== 0) {
      doneStates[i] = "discarded";
      snap({ ...doneStates, [i]: "compare" }, n, `${n} mod ${d} ≠ 0 — ${d} is not a factor. Move on.`, 2, i);
      doneStates[i] = "discarded";
      continue;
    }
    while (n % d === 0) {
      divisions++;
      n = n / d;
      factors.push(d);
      doneStates[i] = "found";
      snap({ ...doneStates, [i]: "found" }, n, `${d} divides: record factor ${d}, remaining n = ${n}.`, 3, i);
    }
  }

  if (n > 1) {
    factors.push(n);
    snap({ ...doneStates }, 1, `Remaining n = ${n} > 1 has no divisor ≤ √n, so it is itself prime — record it.`, 5);
  }

  const grouped = new Map<number, number>();
  for (const f of factors) grouped.set(f, (grouped.get(f) ?? 0) + 1);
  const pretty = [...grouped.entries()].map(([p, k]) => (k === 1 ? `${p}` : `${p}^${k}`)).join(" × ");
  snap({ ...doneStates }, 1, `Done: ${original} = ${pretty} (${divisions} trial divisions).`, 6);
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "prime-factorization",
  title: "Prime Factorization (Trial Division)",
  category: "mathematics",
  difficulty: "Beginner",
  tags: ["number theory", "primes", "trial division", "O(√n)"],
  summary: "Decomposes n into its prime factors by dividing out each candidate 2…√n; whatever remains above 1 is itself prime.",
  renderer: "array",
  pseudocode: [
    "procedure factorize(n)",
    "  for d = 2, 3, … while d·d <= n:",
    "    if n mod d != 0: next d",
    "    while n mod d == 0: record d; n = n / d",
    "  // loop ends when d exceeds √n",
    "  if n > 1: record n   // leftover prime",
    "  return factors",
  ],
  code: {
    pseudocode: `factors = []
for d = 2 while d*d <= n:
  while n mod d == 0:
    factors.append(d); n = n / d
if n > 1: factors.append(n)`,
    c: `void factorize(long long n) {
    for (long long d = 2; d * d <= n; d++) {
        while (n % d == 0) {
            printf("%lld ", d);
            n /= d;
        }
    }
    if (n > 1) printf("%lld", n);
}`,
    cpp: `vector<long long> factorize(long long n) {
    vector<long long> f;
    for (long long d = 2; d * d <= n; d++) {
        while (n % d == 0) { f.push_back(d); n /= d; }
    }
    if (n > 1) f.push_back(n);
    return f;
}`,
    java: `static List<Long> factorize(long n) {
    List<Long> f = new ArrayList<>();
    for (long d = 2; d * d <= n; d++) {
        while (n % d == 0) { f.add(d); n /= d; }
    }
    if (n > 1) f.add(n);
    return f;
}`,
    python: `def factorize(n: int) -> list[int]:
    factors = []
    d = 2
    while d * d <= n:
        while n % d == 0:
            factors.append(d)
            n //= d
        d += 1
    if n > 1:
        factors.append(n)
    return factors`,
    javascript: `function factorize(n) {
  const factors = [];
  for (let d = 2; d * d <= n; d++) {
    while (n % d === 0) { factors.push(d); n /= d; }
  }
  if (n > 1) factors.push(n);
  return factors;
}`,
    typescript: `function factorize(n: number): number[] {
  const factors: number[] = [];
  for (let d = 2; d * d <= n; d++) {
    while (n % d === 0) { factors.push(d); n /= d; }
  }
  if (n > 1) factors.push(n);
  return factors;
}`,
    csharp: `static List<long> Factorize(long n) {
    var f = new List<long>();
    for (long d = 2; d * d <= n; d++) {
        while (n % d == 0) { f.Add(d); n /= d; }
    }
    if (n > 1) f.Add(n);
    return f;
}`,
    go: `func factorize(n int64) []int64 {
	f := []int64{}
	for d := int64(2); d*d <= n; d++ {
		for n%d == 0 {
			f = append(f, d)
			n /= d
		}
	}
	if n > 1 {
		f = append(f, n)
	}
	return f
}`,
    rust: `fn factorize(mut n: u64) -> Vec<u64> {
    let mut f = Vec::new();
    let mut d = 2;
    while d * d <= n {
        while n % d == 0 {
            f.push(d);
            n /= d;
        }
        d += 1;
    }
    if n > 1 { f.push(n); }
    f
}`,
    kotlin: `fun factorize(num: Long): List<Long> {
    var n = num
    val f = mutableListOf<Long>()
    var d = 2L
    while (d * d <= n) {
        while (n % d == 0L) { f.add(d); n /= d }
        d++
    }
    if (n > 1) f.add(n)
    return f
}`,
    swift: `func factorize(_ num: Int) -> [Int] {
    var n = num
    var f: [Int] = []
    var d = 2
    while d * d <= n {
        while n % d == 0 { f.append(d); n /= d }
        d += 1
    }
    if n > 1 { f.append(n) }
    return f
}`,
  },
  content: {
    overview: `Every integer greater than 1 factors uniquely into primes — the Fundamental Theorem of Arithmetic. Trial division finds that factorization directly: try each candidate divisor d starting from 2, and whenever d divides n, divide it out repeatedly before moving on. Because smaller factors are removed first, any d that divides the remaining n must be prime — composites would have had their own prime factors removed already.

The key efficiency insight is the √n bound: if n has any factor larger than √n, it can have at most one (two factors > √n would multiply past n). So the loop only needs to run while d² ≤ n, and whatever remains above 1 afterward is the final — possibly large — prime factor. This makes trial division O(√n), perfectly practical up to around 10¹² even though industrial factoring (Pollard's rho, quadratic sieve) is needed beyond that.`,
    howItWorks: [
      "Start with d = 2, the smallest prime, and the number n to factor.",
      "If d divides n, divide it out repeatedly (recording d each time) until it no longer divides — this captures the multiplicity.",
      "Advance d and repeat while d² ≤ n; candidates that never divide are simply skipped.",
      "Every d that divides the remaining n is guaranteed prime, since all smaller primes were already divided out.",
      "When the loop ends, if n > 1 it is a single leftover prime factor larger than √(original n) — record it.",
    ],
    complexity: {
      time: { best: "O(log n)", average: "O(√n)", worst: "O(√n)" },
      space: "O(log n)",
      notes: "Best case: n is a power of 2 (only divisions by 2, log₂ n of them). Worst case: n is prime or a product of two similar-sized primes — the loop runs all the way to √n. At most log₂ n factors are stored.",
    },
    applications: [
      "Simplifying fractions and radicals; computing divisor counts and sums",
      "Computing Euler's totient φ(n) for RSA and number theory",
      "Finding LCM/GCD structure of many numbers in competitive programming",
      "Cryptographic intuition: RSA's security rests on factoring being hard for 600+ digit n",
    ],
    advantages: [
      "Dead simple to implement correctly",
      "O(√n) — fully practical for n up to ~10¹²",
      "Produces factors in sorted order with multiplicities, no post-processing",
    ],
    disadvantages: [
      "Hopeless for cryptographic-size numbers (hundreds of digits)",
      "Wastes time testing composite candidates (wheel factorization / precomputed primes help)",
      "Worst case hits exactly when n is prime — the whole √n scan confirms nothing divides",
    ],
    commonMistakes: [
      "Looping d up to n instead of √n — turns O(√n) into O(n).",
      "Using if instead of while for division — misses multiplicities (12 → 2, 3 instead of 2, 2, 3).",
      "Forgetting the leftover: if n > 1 after the loop, it IS a prime factor (e.g. 14 → 2, then 7 remains).",
      "Checking d ≤ √n with floating-point sqrt instead of d·d ≤ n (precision bugs on large n).",
    ],
    interviewQuestions: [
      "Why is every divisor found by trial division automatically prime?",
      "Prove that at most one prime factor of n can exceed √n.",
      "How would you speed up trial division by a constant factor (odd numbers only, 6k±1 wheel)?",
      "Given many queries, how does a smallest-prime-factor sieve beat repeated trial division?",
      "Why does RSA remain secure if this algorithm exists?",
    ],
    summary:
      "Trial division factors n by dividing out each candidate 2…√n with its full multiplicity; any remainder above 1 is a final large prime. It runs in O(√n) — the divide-out-smallest-first order guarantees every recorded divisor is prime, and the √n cutoff works because at most one factor can exceed it.",
    quiz: [
      { question: "Why can the trial-division loop stop at √n?", options: ["Factors above √n don't exist", "At most one factor can exceed √n, and it survives as the leftover", "√n is a convention", "Primes are all below √n"], answer: 1, explanation: "Two factors > √n would multiply to more than n, so after the loop at most one prime remains." },
      { question: "Why is each divisor found guaranteed to be prime?", options: ["We only test primes", "All smaller primes were already divided out, so a composite d can't divide the remainder", "It isn't guaranteed", "n is always prime"], answer: 1, explanation: "A composite d = a·b (a, b < d) can't divide n anymore — a and b were removed earlier." },
      { question: "Factoring 360 yields…", options: ["2³ × 3² × 5", "2² × 3³ × 5", "2 × 3 × 5", "6 × 60"], answer: 0, explanation: "360 = 8 × 45 = 2³ × 3² × 5; the while-loop records each prime with its multiplicity." },
      { question: "The worst case for trial division is when n is…", options: ["A power of 2", "Even", "Prime (or a product of two large primes)", "A perfect square"], answer: 2, explanation: "Then no candidate divides, and the loop must scan all the way to √n before concluding." },
      { question: "After the loop, a remaining n > 1 means…", options: ["A bug occurred", "n is a prime factor bigger than √(original n)", "n should be discarded", "The loop must restart"], answer: 1, explanation: "Example: 2 × 101 — after dividing out 2, the leftover 101 is prime and must be recorded." },
    ],
  },
  inputFields: [
    { key: "n", label: "Number n", placeholder: "360", help: "2–200,000." },
  ],
  defaultInput: (level, rng) => {
    const pools = [
      [12, 18, 20, 24, 36],
      [60, 84, 90, 96, 120],
      [360, 504, 720, 840, 900],
      [1001, 1234, 2310, 4620, 5040],
      [8192, 7920, 9240, 9973, 199999],
    ];
    const pool = pools[Math.min(level, 5) - 1] ?? pools[2];
    return { n: rng.pick(pool) };
  },
  parseInput: (fields) => {
    const n = Number((fields.n ?? "").trim());
    if (!Number.isInteger(n) || n < 2 || n > 200_000) throw new Error("Enter an integer between 2 and 200,000.");
    return { n };
  },
  serializeInput: (input) => ({ n: String(input.n) }),
  generate,
};

export default mod;
