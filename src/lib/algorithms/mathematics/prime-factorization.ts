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
    descriptionAr?: string,
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
      descriptionAr,
      codeLine,
      counters: { divisions, factors: factors.length },
    });
  };

  const doneStates: Record<number, CellState> = {};
  snap({}, original, `Factor ${original} by trial division: try divisors d = 2, 3, … up to √n. Every factor found is automatically prime.`, 0, undefined, `حلّل ${original} بالقسمة التجريبية: جرّب القواسم d = 2، 3، … حتى √n. كل عامل يُعثر عليه أوليٌّ تلقائيًا.`);

  let n = original;
  for (let i = 0; i < candidates.length && candidates[i] * candidates[i] <= n; i++) {
    const d = candidates[i];
    divisions++;
    if (n % d !== 0) {
      doneStates[i] = "discarded";
      snap({ ...doneStates, [i]: "compare" }, n, `${n} mod ${d} ≠ 0 — ${d} is not a factor. Move on.`, 2, i, `${n} mod ${d} ≠ 0 — ${d} ليس عاملًا. تابِع.`);
      doneStates[i] = "discarded";
      continue;
    }
    while (n % d === 0) {
      divisions++;
      n = n / d;
      factors.push(d);
      doneStates[i] = "found";
      snap({ ...doneStates, [i]: "found" }, n, `${d} divides: record factor ${d}, remaining n = ${n}.`, 3, i, `${d} يقسم: سجّل العامل ${d}، والمتبقي n = ${n}.`);
    }
  }

  if (n > 1) {
    factors.push(n);
    snap({ ...doneStates }, 1, `Remaining n = ${n} > 1 has no divisor ≤ √n, so it is itself prime — record it.`, 5, undefined, `المتبقي n = ${n} > 1 ليس له قاسم ≤ √n، فهو نفسه أوليّ — سجّله.`);
  }

  const grouped = new Map<number, number>();
  for (const f of factors) grouped.set(f, (grouped.get(f) ?? 0) + 1);
  const pretty = [...grouped.entries()].map(([p, k]) => (k === 1 ? `${p}` : `${p}^${k}`)).join(" × ");
  snap({ ...doneStates }, 1, `Done: ${original} = ${pretty} (${divisions} trial divisions).`, 6, undefined, `تم: ${original} = ${pretty} (${divisions} قسمة تجريبية).`);
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "prime-factorization",
  title: "Prime Factorization (Trial Division)",
  titleAr: "التحليل إلى عوامل أولية (القسمة التجريبية)",
  category: "mathematics",
  difficulty: "Beginner",
  tags: ["number theory", "primes", "trial division", "O(√n)"],
  tagsAr: ["نظرية الأعداد", "الأعداد الأولية", "القسمة التجريبية", "O(√n)"],
  summary: "Decomposes n into its prime factors by dividing out each candidate 2…√n; whatever remains above 1 is itself prime.",
  summaryAr: "يحلّل n إلى عوامله الأولية بقسمة كل قاسم مرشّح 2…√n؛ وما يتبقّى فوق 1 يكون أوليًا بذاته.",
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
  contentAr: {
    overview: `كل عدد صحيح أكبر من 1 يتحلّل تحليلًا وحيدًا إلى أعداد أولية — المبرهنة الأساسية في الحساب. تجد القسمة التجريبية هذا التحليل مباشرةً: جرّب كل قاسم مرشّح d بدءًا من 2، وكلما قسم d العدد n اقسِمه مرارًا قبل الانتقال. ولأن العوامل الأصغر تُزال أولًا، فأي d يقسم n المتبقي لا بد أن يكون أوليًا — فالأعداد المؤلَّفة كانت عواملها الأولية قد أُزيلت سلفًا.

والفكرة الأساسية في الكفاءة هي حدّ √n: إذا كان لـ n أي عامل أكبر من √n فلا يمكن أن يكون له إلا واحد (عاملان > √n سيضربان إلى ما يفوق n). فالحلقة تحتاج أن تعمل فقط ما دام d² ≤ n، وما تبقّى فوق 1 بعدها هو العامل الأولي الأخير — الذي قد يكون كبيرًا. هذا يجعل القسمة التجريبية O(√n)، عملية تمامًا حتى نحو 10¹² رغم أن التحليل الصناعي (رو لبولارد، الغربال التربيعي) لازم بعد ذلك.`,
    howItWorks: [
      "ابدأ بـ d = 2، أصغر عدد أولي، والعدد n المراد تحليله.",
      "إذا قسم d العدد n فاقسِمه مرارًا (مع تسجيل d كل مرة) حتى لا يعود يقسمه — وهذا يلتقط التعدّدية.",
      "زِد d وكرّر ما دام d² ≤ n؛ والمرشّحات التي لا تقسم أبدًا تُتخطّى ببساطة.",
      "كل d يقسم n المتبقي مضمون الأولية، لأن كل الأعداد الأولية الأصغر قد قُسمت سلفًا.",
      "عند انتهاء الحلقة، إن كان n > 1 فهو عامل أولي وحيد متبقٍّ أكبر من √(n الأصلي) — سجّله.",
    ],
    complexity: {
      time: { best: "O(log n)", average: "O(√n)", worst: "O(√n)" },
      space: "O(log n)",
      notes: "أفضل حالة: n قوة للعدد 2 (قسمات على 2 فقط، عددها log₂ n). أسوأ حالة: n أوليّ أو حاصل ضرب عددين أوليين متقاربين — تعمل الحلقة حتى √n كاملة. ويُخزَّن على الأكثر log₂ n عاملًا.",
    },
    applications: [
      "تبسيط الكسور والجذور؛ وحساب عدد القواسم ومجاميعها",
      "حساب دالة أويلر φ(n) لـ RSA ونظرية الأعداد",
      "إيجاد بنية المضاعف/القاسم المشترك لأعداد كثيرة في البرمجة التنافسية",
      "الحدس التعموي: أمان RSA يقوم على صعوبة تحليل n بأكثر من 600 رقم",
    ],
    advantages: [
      "بسيطة جدًا في التنفيذ الصحيح",
      "‏O(√n) — عملية تمامًا لـ n حتى نحو 10¹²",
      "تُنتج العوامل مرتّبة مع تعدّدياتها، بلا معالجة لاحقة",
    ],
    disadvantages: [
      "عاجزة أمام أعداد بحجم التعمية (مئات الأرقام)",
      "تُبدّد الوقت باختبار المرشّحات المؤلَّفة (التحليل بالعجلة/الأعداد الأولية المحسوبة مسبقًا يساعدان)",
      "أسوأ حالة تقع بالضبط حين يكون n أوليًا — يؤكّد مسح √n كامل أن لا شيء يقسمه",
    ],
    commonMistakes: [
      "تكرار d حتى n بدل √n — يحوّل O(√n) إلى O(n).",
      "استخدام if بدل while للقسمة — يفوّت التعدّديات (12 ← 2، 3 بدل 2، 2، 3).",
      "نسيان المتبقّي: إن كان n > 1 بعد الحلقة فهو عامل أولي (مثلًا 14 ← 2، ثم يتبقّى 7).",
      "فحص d ≤ √n بجذر ذي فاصلة عائمة بدل d·d ≤ n (علل دقّة على n الكبير).",
    ],
    interviewQuestions: [
      "لماذا يكون كل قاسم تجده القسمة التجريبية أوليًا تلقائيًا؟",
      "أثبت أن عاملًا أوليًا واحدًا على الأكثر من n يمكن أن يتجاوز √n.",
      "كيف تُسرّع القسمة التجريبية بعامل ثابت (الأعداد الفردية فقط، عجلة 6k±1)؟",
      "مع استعلامات كثيرة، كيف يتفوّق غربال أصغر عامل أولي على القسمة التجريبية المتكررة؟",
      "لماذا تبقى RSA آمنة إذا كانت هذه الخوارزمية موجودة؟",
    ],
    summary:
      "تحلّل القسمة التجريبية n بقسمة كل مرشّح 2…√n بكامل تعدّديته؛ وأي متبقٍّ فوق 1 عامل أولي كبير أخير. تعمل بمقدار O(√n) — وترتيب القسمة على الأصغر أولًا يضمن أولية كل قاسم مسجّل، وحدّ √n يعمل لأن عاملًا واحدًا على الأكثر يمكن أن يتجاوزه.",
    quiz: [
      { question: "لماذا يمكن لحلقة القسمة التجريبية أن تتوقف عند √n؟", options: ["العوامل فوق √n غير موجودة", "عامل واحد على الأكثر يمكن أن يتجاوز √n، ويبقى كمتبقٍّ", "‏√n اصطلاح", "الأعداد الأولية كلها دون √n"], answer: 1, explanation: "عاملان > √n سيضربان إلى أكثر من n، فيبقى بعد الحلقة عدد أولي واحد على الأكثر." },
      { question: "لماذا يُضمن أن يكون كل قاسم يُعثر عليه أوليًا؟", options: ["نختبر الأعداد الأولية فقط", "كل الأعداد الأولية الأصغر قُسمت سلفًا، فلا يقسم قاسم مؤلَّف d المتبقّي", "غير مضمون", "‏n دائمًا أوليّ"], answer: 1, explanation: "قاسم مؤلَّف d = a·b (‏a، b < d) لا يعود يقسم n — فقد أُزيل a و b سابقًا." },
      { question: "تحليل 360 يعطي…", options: ["2³ × 3² × 5", "2² × 3³ × 5", "2 × 3 × 5", "6 × 60"], answer: 0, explanation: "‏360 = 8 × 45 = 2³ × 3² × 5؛ وحلقة while تُسجّل كل عدد أولي بتعدّديته." },
      { question: "أسوأ حالة للقسمة التجريبية حين يكون n…", options: ["قوة للعدد 2", "زوجيًا", "أوليًا (أو حاصل ضرب عددين أوليين كبيرين)", "مربعًا كاملًا"], answer: 2, explanation: "عندها لا يقسم أي مرشّح، وعلى الحلقة أن تمسح حتى √n كاملة قبل أن تخلص." },
      { question: "بعد الحلقة، متبقٍّ n > 1 يعني…", options: ["حدثت علّة", "‏n عامل أولي أكبر من √(n الأصلي)", "يجب إهمال n", "يجب إعادة تشغيل الحلقة"], answer: 1, explanation: "مثال: 2 × 101 — بعد قسمة 2 يكون المتبقّي 101 أوليًا ويجب تسجيله." },
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
