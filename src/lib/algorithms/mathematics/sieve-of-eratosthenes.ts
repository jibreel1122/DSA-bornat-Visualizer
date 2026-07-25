import type { AlgorithmModule, CellState, GridFrame, Step } from "@/lib/engine/types";

type Input = { n: number };

function generate(input: Input): Step<GridFrame>[] {
  const n = Math.max(2, Math.min(3000, input.n));
  const cols = n <= 30 ? 6 : n <= 60 ? 10 : 12;
  const isPrime = new Array(n + 1).fill(true);
  isPrime[0] = false;
  if (n >= 1) isPrime[1] = false;
  const steps: Step<GridFrame>[] = [];
  let operations = 0;

  // grid holds numbers 2..n (index 0 = number 2)
  const total = n - 1;
  const rows = Math.ceil(total / cols);

  const buildGrid = (states: Record<number, CellState>): GridFrame => {
    const cells: GridFrame["cells"] = [];
    for (let r = 0; r < rows; r++) {
      const row: GridFrame["cells"][0] = [];
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const value = idx + 2;
        if (value > n) {
          row.push({ value: "" });
        } else {
          row.push({ value, state: states[value] });
        }
      }
      cells.push(row);
    }
    return { rows, cols, cells };
  };

  const primesFound = () => {
    const arr: number[] = [];
    for (let v = 2; v <= n; v++) if (isPrime[v]) arr.push(v);
    return arr;
  };

  const pushSnap = (states: Record<number, CellState>, description: string, codeLine: number, descriptionAr?: string) => {
    const frame = buildGrid(states);
    frame.aux = [{ label: "Primes", values: primesFound() }];
    frame.note = `sieving up to ${n}`;
    steps.push({ frame, description, descriptionAr, codeLine, counters: { operations, candidates: primesFound().length } });
  };

  pushSnap({}, `Sieve of Eratosthenes: list 2..${n}, then cross out multiples of each prime.`, 0, `غربال إراتوستينس: اسرد 2..${n}، ثم اشطب مضاعفات كل عدد أولي.`);

  for (let p = 2; p * p <= n; p++) {
    if (!isPrime[p]) continue;
    const baseStates: Record<number, CellState> = {};
    for (let v = 2; v <= n; v++) if (!isPrime[v]) baseStates[v] = "discarded";
    baseStates[p] = "pivot";
    pushSnap(baseStates, `${p} is prime. Cross out its multiples starting at ${p}².`, 1, `${p} عدد أولي. اشطب مضاعفاته بدءًا من ${p}².`);

    for (let m = p * p; m <= n; m += p) {
      operations++;
      if (isPrime[m]) {
        isPrime[m] = false;
        const states: Record<number, CellState> = {};
        for (let v = 2; v <= n; v++) if (!isPrime[v]) states[v] = "discarded";
        states[p] = "pivot";
        states[m] = "swap";
        pushSnap(states, `Cross out ${m} = ${p} × ${m / p}.`, 2, `اشطب ${m} = ${p} × ${m / p}.`);
      }
    }
  }

  const finalStates: Record<number, CellState> = {};
  for (let v = 2; v <= n; v++) finalStates[v] = isPrime[v] ? "sorted" : "discarded";
  pushSnap(finalStates, `Done! ${primesFound().length} primes ≤ ${n}: ${primesFound().join(", ")}.`, 4, `تم! ${primesFound().length} عددًا أوليًا ≤ ${n}: ${primesFound().join(", ")}.`);
  return steps;
}

const mod: AlgorithmModule<GridFrame, Input> = {
  slug: "sieve-of-eratosthenes",
  title: "Sieve of Eratosthenes",
  titleAr: "غربال إراتوستينس",
  category: "mathematics",
  difficulty: "Beginner",
  tags: ["number theory", "primes", "sieve", "O(n log log n)"],
  tagsAr: ["نظرية الأعداد", "الأعداد الأولية", "غربال", "O(n log log n)"],
  summary: "Finds all primes up to n by repeatedly crossing out the multiples of each prime.",
  summaryAr: "يجد كل الأعداد الأولية حتى n بشطب مضاعفات كل عدد أولي تكرارًا.",
  renderer: "grid",
  pseudocode: [
    "procedure sieve(n)",
    "  for p = 2 while p*p <= n:",
    "    if p is still prime:",
    "      cross out p², p²+p, p²+2p, … up to n",
    "  // survivors are prime",
    "  return all uncrossed numbers",
  ],
  code: {
    pseudocode: `procedure sieve(n)
  isPrime[2..n] = true
  for p = 2 to sqrt(n):
    if isPrime[p]:
      for m = p*p to n step p:
        isPrime[m] = false
  return { p : isPrime[p] }`,
    c: `void sieve(int n) {
    bool is_prime[n + 1];
    for (int i = 2; i <= n; i++) is_prime[i] = true;
    for (int p = 2; p * p <= n; p++)
        if (is_prime[p])
            for (int m = p * p; m <= n; m += p) is_prime[m] = false;
    for (int p = 2; p <= n; p++) if (is_prime[p]) printf("%d ", p);
}`,
    cpp: `vector<int> sieve(int n) {
    vector<bool> isPrime(n + 1, true);
    vector<int> primes;
    for (int p = 2; p * p <= n; p++)
        if (isPrime[p])
            for (int m = p * p; m <= n; m += p) isPrime[m] = false;
    for (int p = 2; p <= n; p++) if (isPrime[p]) primes.push_back(p);
    return primes;
}`,
    java: `static List<Integer> sieve(int n) {
    boolean[] isPrime = new boolean[n + 1];
    Arrays.fill(isPrime, 2, n + 1, true);
    for (int p = 2; p * p <= n; p++)
        if (isPrime[p])
            for (int m = p * p; m <= n; m += p) isPrime[m] = false;
    List<Integer> primes = new ArrayList<>();
    for (int p = 2; p <= n; p++) if (isPrime[p]) primes.add(p);
    return primes;
}`,
    python: `def sieve(n: int) -> list[int]:
    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False
    for p in range(2, int(n ** 0.5) + 1):
        if is_prime[p]:
            for m in range(p * p, n + 1, p):
                is_prime[m] = False
    return [p for p in range(2, n + 1) if is_prime[p]]`,
    javascript: `function sieve(n) {
  const isPrime = new Array(n + 1).fill(true);
  isPrime[0] = isPrime[1] = false;
  for (let p = 2; p * p <= n; p++)
    if (isPrime[p])
      for (let m = p * p; m <= n; m += p) isPrime[m] = false;
  return [...Array(n + 1).keys()].filter((p) => p >= 2 && isPrime[p]);
}`,
    typescript: `function sieve(n: number): number[] {
  const isPrime = new Array(n + 1).fill(true);
  isPrime[0] = isPrime[1] = false;
  for (let p = 2; p * p <= n; p++)
    if (isPrime[p])
      for (let m = p * p; m <= n; m += p) isPrime[m] = false;
  const primes: number[] = [];
  for (let p = 2; p <= n; p++) if (isPrime[p]) primes.push(p);
  return primes;
}`,
    csharp: `static List<int> Sieve(int n) {
    var isPrime = new bool[n + 1];
    for (int i = 2; i <= n; i++) isPrime[i] = true;
    for (int p = 2; p * p <= n; p++)
        if (isPrime[p])
            for (int m = p * p; m <= n; m += p) isPrime[m] = false;
    var primes = new List<int>();
    for (int p = 2; p <= n; p++) if (isPrime[p]) primes.Add(p);
    return primes;
}`,
    go: `func sieve(n int) []int {
	isPrime := make([]bool, n+1)
	for i := 2; i <= n; i++ {
		isPrime[i] = true
	}
	for p := 2; p*p <= n; p++ {
		if isPrime[p] {
			for m := p * p; m <= n; m += p {
				isPrime[m] = false
			}
		}
	}
	primes := []int{}
	for p := 2; p <= n; p++ {
		if isPrime[p] {
			primes = append(primes, p)
		}
	}
	return primes
}`,
    rust: `fn sieve(n: usize) -> Vec<usize> {
    let mut is_prime = vec![true; n + 1];
    is_prime[0] = false;
    if n >= 1 { is_prime[1] = false; }
    let mut p = 2;
    while p * p <= n {
        if is_prime[p] {
            let mut m = p * p;
            while m <= n { is_prime[m] = false; m += p; }
        }
        p += 1;
    }
    (2..=n).filter(|&x| is_prime[x]).collect()
}`,
    kotlin: `fun sieve(n: Int): List<Int> {
    val isPrime = BooleanArray(n + 1) { it >= 2 }
    var p = 2
    while (p * p <= n) {
        if (isPrime[p]) {
            var m = p * p
            while (m <= n) { isPrime[m] = false; m += p }
        }
        p++
    }
    return (2..n).filter { isPrime[it] }
}`,
    swift: `func sieve(_ n: Int) -> [Int] {
    var isPrime = [Bool](repeating: true, count: n + 1)
    isPrime[0] = false
    if n >= 1 { isPrime[1] = false }
    var p = 2
    while p * p <= n {
        if isPrime[p] {
            var m = p * p
            while m <= n { isPrime[m] = false; m += p }
        }
        p += 1
    }
    return (2...n).filter { isPrime[$0] }
}`,
  },
  content: {
    overview: `The Sieve of Eratosthenes finds all prime numbers up to a limit n. Rather than testing each number for primality individually, it works by elimination: start with every number marked as potentially prime, then repeatedly take the next prime and cross out all of its multiples. Whatever survives is prime.

A key optimization is to start crossing out from p² rather than 2p: any smaller multiple of p (like 2p, 3p) has already been eliminated by a smaller prime factor. This, plus stopping the outer loop at √n, makes the sieve remarkably efficient at O(n log log n).`,
    howItWorks: [
      "Assume every number from 2 to n is prime.",
      "Take the smallest number still marked prime (starting at 2) — call it p.",
      "Cross out every multiple of p starting from p² up to n; they're composite.",
      "Move to the next uncrossed number and repeat, while p² ≤ n.",
      "All numbers that remain uncrossed are prime.",
    ],
    complexity: {
      time: { best: "O(n log log n)", average: "O(n log log n)", worst: "O(n log log n)" },
      space: "O(n)",
      notes: "The near-linear time comes from summing n/p over primes p ≤ n, which is O(n log log n). Space is O(n) for the boolean array; bit-packing or segmented sieves reduce memory.",
    },
    applications: [
      "Precomputing all primes up to a bound (competitive programming)",
      "Number-theoretic problems needing many primes",
      "Factorization tables and smallest-prime-factor sieves",
      "Cryptographic prime generation (as a pre-filter)",
    ],
    advantages: [
      "Very fast — near-linear O(n log log n)",
      "Simple, no divisions or primality tests per number",
      "Produces all primes up to n in one pass",
      "Easy to extend to smallest-prime-factor tables",
    ],
    disadvantages: [
      "O(n) memory limits the range on a single machine",
      "Finds all primes up to n — wasteful if you need just one",
      "Not ideal for testing a single very large number (use Miller-Rabin)",
    ],
    commonMistakes: [
      "Starting the inner crossing at 2p instead of p² (correct but slower).",
      "Marking 0 and 1 as prime.",
      "Running the outer loop to n instead of √n.",
      "Using O(n) memory naively for very large n instead of a segmented sieve.",
    ],
    interviewQuestions: [
      "Why can crossing out start at p² instead of 2p?",
      "Derive the O(n log log n) running time.",
      "How does a segmented sieve reduce memory usage?",
      "How would you build a smallest-prime-factor table with a sieve?",
      "When would you use Miller-Rabin instead of the sieve?",
    ],
    summary:
      "The Sieve of Eratosthenes marks all numbers up to n, then crosses out each prime's multiples from p² onward, leaving the primes. It runs in O(n log log n) time and O(n) space — the go-to method for generating many primes.",
    quiz: [
      { question: "The sieve finds primes by…", options: ["Trial-dividing each number", "Crossing out multiples of each prime", "Random testing", "Factoring every number"], answer: 1, explanation: "It eliminates composites as multiples, leaving primes uncrossed." },
      { question: "Crossing out multiples of p can start at…", options: ["2p", "p²", "p + 1", "n/2"], answer: 1, explanation: "Smaller multiples of p already got crossed by smaller prime factors." },
      { question: "The outer loop only needs to run while…", options: ["p ≤ n", "p² ≤ n", "p ≤ n/2", "p ≤ log n"], answer: 1, explanation: "Any composite ≤ n has a factor ≤ √n, so larger p find nothing new." },
      { question: "The sieve's time complexity is…", options: ["O(n)", "O(n log n)", "O(n log log n)", "O(n²)"], answer: 2, explanation: "Summing n/p over primes p gives O(n log log n)." },
      { question: "A drawback of the basic sieve is…", options: ["It misses some primes", "O(n) memory for large n", "It can't find 2", "It requires sorting"], answer: 1, explanation: "The boolean array of size n limits how large a range fits in memory." },
    ],
  },
  contentAr: {
    overview: `يجد غربال إراتوستينس كل الأعداد الأولية حتى الحدّ n. وبدل اختبار أولية كل عدد على حِدة، يعمل بالإقصاء: ابدأ بكل عدد مُعلَّمًا كأوليّ محتمل، ثم خذ العدد الأولي التالي مرارًا واشطب كل مضاعفاته. وما يبقى فهو أوليّ.

من التحسينات الأساسية بدء الشطب من p² بدل 2p: فأي مضاعف أصغر لـ p (مثل 2p، 3p) يكون قد أُقصي سلفًا بعامل أولي أصغر. هذا، مع إيقاف الحلقة الخارجية عند √n، يجعل الغربال فعّالًا بمقدار O(n log log n).`,
    howItWorks: [
      "افترض أن كل عدد من 2 إلى n أوليّ.",
      "خذ أصغر عدد لا يزال مُعلَّمًا أوليًا (بدءًا من 2) — سمِّه p.",
      "اشطب كل مضاعف لـ p بدءًا من p² حتى n؛ فهي مؤلَّفة.",
      "انتقل إلى العدد التالي غير المشطوب وكرّر، ما دام p² ≤ n.",
      "كل الأعداد التي تبقى غير مشطوبة هي أولية.",
    ],
    complexity: {
      time: { best: "O(n log log n)", average: "O(n log log n)", worst: "O(n log log n)" },
      space: "O(n)",
      notes: "الزمن شبه الخطي يأتي من جمع n/p على الأعداد الأولية p ≤ n، وهو O(n log log n). والفضاء O(n) للمصفوفة المنطقية؛ وحزم البتات أو الغرابيل المقسَّمة تخفض الذاكرة.",
    },
    applications: [
      "حساب كل الأعداد الأولية حتى حدّ مسبقًا (البرمجة التنافسية)",
      "مسائل نظرية الأعداد التي تحتاج أعدادًا أولية كثيرة",
      "جداول التحليل وغرابيل أصغر عامل أولي",
      "توليد الأعداد الأولية التعموية (كمرشِّح أولي)",
    ],
    advantages: [
      "سريع جدًا — شبه خطي O(n log log n)",
      "بسيط، بلا قسمات أو اختبارات أولية لكل عدد",
      "يُنتج كل الأعداد الأولية حتى n في مرور واحد",
      "يسهل تمديده إلى جداول أصغر عامل أولي",
    ],
    disadvantages: [
      "ذاكرة O(n) تحدّ المدى على جهاز واحد",
      "يجد كل الأعداد الأولية حتى n — مُبدِّد إن احتجت واحدًا فقط",
      "غير مثالي لاختبار عدد واحد كبير جدًا (استخدم ميلر-رابين)",
    ],
    commonMistakes: [
      "بدء الشطب الداخلي عند 2p بدل p² (صحيح لكن أبطأ).",
      "تعليم 0 و1 كأوليَّين.",
      "تشغيل الحلقة الخارجية حتى n بدل √n.",
      "استخدام ذاكرة O(n) بسذاجة لـ n كبير جدًا بدل غربال مقسَّم.",
    ],
    interviewQuestions: [
      "لماذا يمكن بدء الشطب عند p² بدل 2p؟",
      "اشتق زمن التشغيل O(n log log n).",
      "كيف يخفض الغربال المقسَّم استخدام الذاكرة؟",
      "كيف تبني جدول أصغر عامل أولي بغربال؟",
      "متى تستخدم ميلر-رابين بدل الغربال؟",
    ],
    summary:
      "يُعلّم غربال إراتوستينس كل الأعداد حتى n، ثم يشطب مضاعفات كل عدد أولي بدءًا من p² فصاعدًا، تاركًا الأعداد الأولية. يعمل بزمن O(n log log n) وفضاء O(n) — الطريقة المفضّلة لتوليد أعداد أولية كثيرة.",
    quiz: [
      { question: "يجد الغربال الأعداد الأولية بـ…", options: ["القسمة التجريبية لكل عدد", "شطب مضاعفات كل عدد أولي", "الاختبار العشوائي", "تحليل كل عدد"], answer: 1, explanation: "يُقصي الأعداد المؤلَّفة كمضاعفات، تاركًا الأعداد الأولية غير مشطوبة." },
      { question: "يمكن أن يبدأ شطب مضاعفات p عند…", options: ["2p", "p²", "p + 1", "n/2"], answer: 1, explanation: "المضاعفات الأصغر لـ p شُطبت سلفًا بعوامل أولية أصغر." },
      { question: "لا تحتاج الحلقة الخارجية أن تعمل إلا ما دام…", options: ["p ≤ n", "p² ≤ n", "p ≤ n/2", "p ≤ log n"], answer: 1, explanation: "أي عدد مؤلَّف ≤ n له عامل ≤ √n، فالأعداد الأكبر p لا تجد جديدًا." },
      { question: "التعقيد الزمني للغربال هو…", options: ["O(n)", "O(n log n)", "O(n log log n)", "O(n²)"], answer: 2, explanation: "جمع n/p على الأعداد الأولية p يعطي O(n log log n)." },
      { question: "من عيوب الغربال الأساسي…", options: ["يفوّت بعض الأعداد الأولية", "ذاكرة O(n) لـ n الكبير", "لا يجد 2", "يتطلب ترتيبًا"], answer: 1, explanation: "المصفوفة المنطقية بحجم n تحدّ حجم المدى الذي يتّسع في الذاكرة." },
    ],
  },
  inputFields: [{ key: "n", label: "Upper limit n", placeholder: "50", help: "2–3,000." }],
  defaultInput: (level) => ({ n: [0, 20, 40, 60, 90, 120][level] ?? 50 }),
  parseInput: (fields) => {
    const n = Number((fields.n ?? "").trim());
    if (!Number.isInteger(n) || n < 2 || n > 3000) throw new Error("Enter a whole number from 2 to 3,000.");
    return { n };
  },
  serializeInput: (input) => ({ n: String(input.n) }),
  generate,
};

export default mod;
