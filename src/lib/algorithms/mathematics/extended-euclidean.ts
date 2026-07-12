import type { AlgorithmModule, CellState, Step, TableFrame } from "@/lib/engine/types";

type Input = { a: number; b: number };

interface Row {
  a: number;
  b: number;
  q: number | null;
  r: number | null;
  x: number | null;
  y: number | null;
}

function generate(input: Input): Step<TableFrame>[] {
  const steps: Step<TableFrame>[] = [];
  const rows: Row[] = [];
  let iterations = 0;

  const snap = (
    description: string,
    codeLine: number,
    hl?: { row: number; cols: number[]; state: CellState },
    descriptionAr?: string,
  ) => {
    const cells = rows.map((r, ri) =>
      [r.a, r.b, r.q, r.r, r.x, r.y].map((v, ci) => ({
        value: v,
        state: hl && hl.row === ri && hl.cols.includes(ci) ? hl.state : undefined,
      })),
    );
    steps.push({
      frame: {
        rowLabels: rows.map((_, i) => `step ${i}`),
        colLabels: ["a", "b", "q=⌊a/b⌋", "r=a−qb", "x", "y"],
        cells,
        note: "Down: Euclid's divisions. Up: back-substitute x, y so that a·x + b·y = gcd.",
      },
      description,
      descriptionAr,
      codeLine,
      counters: { iterations },
    });
  };

  // Phase 1: forward divisions
  let a = input.a;
  let b = input.b;
  rows.push({ a, b, q: null, r: null, x: null, y: null });
  snap(`Extended Euclid on (${a}, ${b}): find gcd AND coefficients x, y with ${input.a}·x + ${input.b}·y = gcd.`, 0, undefined, `إقليدس الموسّعة على (${a}, ${b}): جِد القاسم المشترك الأكبر ومعاملَي x، y بحيث ${input.a}·x + ${input.b}·y = gcd.`);

  while (b !== 0) {
    iterations++;
    const q = Math.floor(a / b);
    const r = a - q * b;
    const i = rows.length - 1;
    rows[i].q = q;
    rows[i].r = r;
    snap(`Divide: ${a} = ${q}·${b} + ${r}.`, 1, { row: i, cols: [2, 3], state: "active" }, `اقسِم: ${a} = ${q}·${b} + ${r}.`);
    a = b;
    b = r;
    rows.push({ a, b, q: null, r: null, x: null, y: null });
    snap(`Next pair: (${a}, ${b}).`, 2, { row: rows.length - 1, cols: [0, 1], state: "compare" }, `الزوج التالي: (${a}, ${b}).`);
  }

  const g = a;
  const last = rows.length - 1;
  rows[last].x = 1;
  rows[last].y = 0;
  snap(`b = 0 ⇒ gcd = ${g}. Base coefficients: ${g}·1 + 0·0 = ${g}, so x = 1, y = 0.`, 3, {
    row: last,
    cols: [4, 5],
    state: "found",
  }, `b = 0 ⇒ gcd = ${g}. المعاملات الأساسية: ${g}·1 + 0·0 = ${g}، إذًا x = 1، y = 0.`);

  // Phase 2: back-substitution
  for (let i = last - 1; i >= 0; i--) {
    const nx = rows[i + 1].y!;
    const ny = rows[i + 1].x! - rows[i].q! * rows[i + 1].y!;
    rows[i].x = nx;
    rows[i].y = ny;
    snap(
      `Back-substitute into step ${i}: x = y′ = ${nx}, y = x′ − q·y′ = ${rows[i + 1].x} − ${rows[i].q}·${rows[i + 1].y} = ${ny}. Check: ${rows[i].a}·${nx} + ${rows[i].b}·${ny} = ${rows[i].a * nx + rows[i].b * ny}.`,
      4,
      { row: i, cols: [4, 5], state: "swap" },
      `تعويض عكسي في الخطوة ${i}: x = y′ = ${nx}، y = x′ − q·y′ = ${rows[i + 1].x} − ${rows[i].q}·${rows[i + 1].y} = ${ny}. تحقّق: ${rows[i].a}·${nx} + ${rows[i].b}·${ny} = ${rows[i].a * nx + rows[i].b * ny}.`,
    );
  }

  const x = rows[0].x!;
  const y = rows[0].y!;
  snap(`Done: gcd(${input.a}, ${input.b}) = ${g} and ${input.a}·(${x}) + ${input.b}·(${y}) = ${input.a * x + input.b * y}. ✓ Bézout coefficients found.`, 5, {
    row: 0,
    cols: [4, 5],
    state: "found",
  }, `تم: gcd(${input.a}, ${input.b}) = ${g} و ${input.a}·(${x}) + ${input.b}·(${y}) = ${input.a * x + input.b * y}. ✓ عُثر على معاملات بيزو.`);
  return steps;
}

const mod: AlgorithmModule<TableFrame, Input> = {
  slug: "extended-euclidean",
  title: "Extended Euclidean Algorithm",
  titleAr: "خوارزمية إقليدس الموسّعة",
  category: "mathematics",
  difficulty: "Advanced",
  tags: ["number theory", "Bézout identity", "modular inverse", "gcd"],
  tagsAr: ["نظرية الأعداد", "متطابقة بيزو", "المعكوس القياسي", "القاسم المشترك الأكبر"],
  summary: "Computes gcd(a, b) plus the Bézout coefficients x, y with a·x + b·y = gcd — the key to modular inverses.",
  summaryAr: "تحسب gcd(a, b) إضافة إلى معاملَي بيزو x، y بحيث a·x + b·y = gcd — مفتاح المعكوس القياسي.",
  renderer: "table",
  pseudocode: [
    "procedure extgcd(a, b) → (g, x, y)",
    "  divide: a = q·b + r         // forward pass",
    "  recurse on (b, r) until b = 0",
    "  base: gcd = a, x = 1, y = 0",
    "  back-substitute: (x, y) = (y′, x′ − q·y′)",
    "  return (g, x, y) with a·x + b·y = g",
  ],
  code: {
    pseudocode: `extgcd(a, b):
  if b == 0: return (a, 1, 0)
  (g, x1, y1) = extgcd(b, a mod b)
  return (g, y1, x1 - (a / b) * y1)`,
    c: `long long extgcd(long long a, long long b, long long* x, long long* y) {
    if (b == 0) { *x = 1; *y = 0; return a; }
    long long x1, y1;
    long long g = extgcd(b, a % b, &x1, &y1);
    *x = y1;
    *y = x1 - (a / b) * y1;
    return g;
}`,
    cpp: `long long extgcd(long long a, long long b, long long& x, long long& y) {
    if (b == 0) { x = 1; y = 0; return a; }
    long long x1, y1;
    long long g = extgcd(b, a % b, x1, y1);
    x = y1;
    y = x1 - (a / b) * y1;
    return g;
}`,
    java: `// returns {g, x, y} with a*x + b*y = g
static long[] extgcd(long a, long b) {
    if (b == 0) return new long[]{a, 1, 0};
    long[] r = extgcd(b, a % b);
    return new long[]{r[0], r[2], r[1] - (a / b) * r[2]};
}`,
    python: `def extgcd(a: int, b: int) -> tuple[int, int, int]:
    if b == 0:
        return a, 1, 0
    g, x1, y1 = extgcd(b, a % b)
    return g, y1, x1 - (a // b) * y1

def mod_inverse(a: int, m: int) -> int:
    g, x, _ = extgcd(a, m)
    if g != 1:
        raise ValueError("inverse does not exist")
    return x % m`,
    javascript: `function extgcd(a, b) {
  if (b === 0) return [a, 1, 0];
  const [g, x1, y1] = extgcd(b, a % b);
  return [g, y1, x1 - Math.floor(a / b) * y1];
}
function modInverse(a, m) {
  const [g, x] = extgcd(a, m);
  if (g !== 1) throw new Error("inverse does not exist");
  return ((x % m) + m) % m;
}`,
    typescript: `function extgcd(a: number, b: number): [number, number, number] {
  if (b === 0) return [a, 1, 0];
  const [g, x1, y1] = extgcd(b, a % b);
  return [g, y1, x1 - Math.floor(a / b) * y1];
}
function modInverse(a: number, m: number): number {
  const [g, x] = extgcd(a, m);
  if (g !== 1) throw new Error("inverse does not exist");
  return ((x % m) + m) % m;
}`,
    csharp: `static (long g, long x, long y) Extgcd(long a, long b) {
    if (b == 0) return (a, 1, 0);
    var (g, x1, y1) = Extgcd(b, a % b);
    return (g, y1, x1 - (a / b) * y1);
}`,
    go: `func extgcd(a, b int64) (g, x, y int64) {
	if b == 0 {
		return a, 1, 0
	}
	g, x1, y1 := extgcd(b, a%b)
	return g, y1, x1 - (a/b)*y1
}`,
    rust: `fn extgcd(a: i64, b: i64) -> (i64, i64, i64) {
    if b == 0 { return (a, 1, 0); }
    let (g, x1, y1) = extgcd(b, a % b);
    (g, y1, x1 - (a / b) * y1)
}`,
    kotlin: `fun extgcd(a: Long, b: Long): Triple<Long, Long, Long> {
    if (b == 0L) return Triple(a, 1L, 0L)
    val (g, x1, y1) = extgcd(b, a % b)
    return Triple(g, y1, x1 - (a / b) * y1)
}`,
    swift: `func extgcd(_ a: Int, _ b: Int) -> (g: Int, x: Int, y: Int) {
    if b == 0 { return (a, 1, 0) }
    let (g, x1, y1) = extgcd(b, a % b)
    return (g, y1, x1 - (a / b) * y1)
}`,
  },
  content: {
    overview: `The extended Euclidean algorithm strengthens the classic GCD computation: besides gcd(a, b), it produces integers x and y satisfying Bézout's identity a·x + b·y = gcd(a, b). Those coefficients are far from a curiosity — when gcd(a, m) = 1, the x it finds is precisely the modular inverse of a mod m, the operation at the heart of RSA key generation, modular division, and the Chinese Remainder Theorem.

The algorithm runs Euclid's divisions forward as usual (a = q·b + r, then recurse on (b, r)), and when it bottoms out at b = 0 with gcd = a, it seeds x = 1, y = 0 (trivially a·1 + 0·0 = a). Then it walks back up: at each level, the coefficients transform as (x, y) ← (y′, x′ − q·y′), where (x′, y′) came from the level below and q was that level's quotient. Each back-substitution preserves the identity, so the coefficients arriving at the top satisfy it for the original inputs.`,
    howItWorks: [
      "Forward pass: repeatedly divide, a = q·b + r, replacing (a, b) with (b, r) until b = 0 — recording every quotient q.",
      "At the bottom, gcd = a and the identity a·1 + 0·0 = gcd gives base coefficients x = 1, y = 0.",
      "Back-substitute one level at a time: new x = y′, new y = x′ − q·y′, using that level's stored quotient q.",
      "Each step preserves a·x + b·y = gcd for that level's (a, b) — verifiable at every row.",
      "The top-level x, y are the Bézout coefficients; if gcd(a, m) = 1, x mod m is the modular inverse of a.",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(log(min(a,b)))", worst: "O(log(min(a,b)))" },
      space: "O(log(min(a,b)))",
      notes: "Same division count as plain Euclid — Fibonacci pairs are the worst case. The back-substitution adds O(1) work per level; an iterative version carries (x, y) forward in O(1) space.",
    },
    applications: [
      "Modular inverse: solve a·x ≡ 1 (mod m) when gcd(a, m) = 1 (RSA private-key computation)",
      "Solving linear Diophantine equations a·x + b·y = c (solvable iff gcd | c)",
      "Chinese Remainder Theorem constructions",
      "Rational reconstruction and continued-fraction computations",
    ],
    advantages: [
      "Same O(log min(a,b)) cost as plain GCD but yields the certificate x, y",
      "Works for any integers — no primality requirement (unlike Fermat-based inverses)",
      "Every intermediate row is checkable: a·x + b·y = gcd holds at each level",
    ],
    disadvantages: [
      "Coefficients can be negative and need normalization (x mod m) for inverses",
      "Slightly fiddly recurrence — easy to swap x and y during back-substitution",
      "Intermediate coefficients can exceed the inputs' magnitude (bounded by max(a,b), but watch fixed-width overflow near limits)",
    ],
    commonMistakes: [
      "Returning (x, y) un-swapped: the recurrence is x = y′ and y = x′ − q·y′, not the reverse.",
      "Using the remainder r instead of the quotient q in the back-substitution.",
      "Forgetting to normalize a negative x with ((x % m) + m) % m when computing a modular inverse.",
      "Claiming an inverse exists when gcd(a, m) ≠ 1 — Bézout only gives a·x ≡ gcd, not 1.",
    ],
    interviewQuestions: [
      "State Bézout's identity and explain why extended Euclid proves it constructively.",
      "Derive the back-substitution recurrence (x, y) = (y′, x′ − q·y′).",
      "How do you compute a modular inverse with this algorithm, and when does one exist?",
      "Compare extended-Euclid inverses to Fermat's-little-theorem inverses (a^(m−2) mod m).",
      "How do you solve a·x + b·y = c for arbitrary c using the Bézout coefficients?",
    ],
    summary:
      "Extended Euclid runs the GCD divisions forward, then back-substitutes (x, y) ← (y′, x′ − q·y′) from the base case (1, 0) to produce Bézout coefficients with a·x + b·y = gcd(a, b) in O(log min(a, b)). Its headline use is computing modular inverses whenever gcd(a, m) = 1 — the core arithmetic behind RSA and CRT.",
    quiz: [
      { question: "Extended Euclid computes gcd(a, b) and…", options: ["The prime factors of a", "Integers x, y with a·x + b·y = gcd(a, b)", "a·b", "The LCM only"], answer: 1, explanation: "Those x, y are the Bézout coefficients — a constructive proof of Bézout's identity." },
      { question: "The base case coefficients when b = 0 are…", options: ["x = 0, y = 1", "x = 1, y = 0", "x = y = 1", "x = a, y = b"], answer: 1, explanation: "gcd = a there, and a·1 + 0·0 = a satisfies the identity trivially." },
      { question: "The back-substitution recurrence is…", options: ["(x, y) = (x′, y′)", "(x, y) = (y′, x′ − q·y′)", "(x, y) = (x′ − q, y′)", "(x, y) = (q·x′, q·y′)"], answer: 1, explanation: "Substituting r = a − q·b into the lower level's identity produces exactly this transformation." },
      { question: "The modular inverse of a mod m exists iff…", options: ["a is prime", "m is even", "gcd(a, m) = 1", "a < m"], answer: 2, explanation: "Then a·x + m·y = 1 gives a·x ≡ 1 (mod m); if gcd > 1, no x can work." },
      { question: "Extended Euclid's running time versus plain Euclid is…", options: ["Quadratically slower", "The same O(log min(a,b)), plus O(1) extra per level", "Exponential", "O(n) vs O(log n)"], answer: 1, explanation: "It performs the identical division chain and merely carries two extra numbers back up." },
    ],
  },
  contentAr: {
    overview: `تُعزّز خوارزمية إقليدس الموسّعة حساب القاسم المشترك الأكبر الكلاسيكي: فإلى جانب gcd(a, b)، تُنتج عددين صحيحين x و y يحقّقان متطابقة بيزو a·x + b·y = gcd(a, b). وهذان المعاملان ليسا مجرد طرافة — فحين يكون gcd(a, m) = 1، تكون x التي تجدها بالضبط هي المعكوس القياسي لـ a بترديد m، وهي العملية في صميم توليد مفاتيح RSA والقسمة القياسية ونظرية الباقي الصينية.

تُجري الخوارزمية قسمات إقليدس إلى الأمام كالمعتاد (a = q·b + r ثم استدعاء عودي على (b, r))، وعندما تنتهي عند b = 0 بقاسم مشترك أكبر gcd = a، تضع القيم الابتدائية x = 1، y = 0 (إذ a·1 + 0·0 = a بداهةً). ثم تصعد عكسيًا: في كل مستوى تتحوّل المعاملات وفق (x, y) ← (y′, x′ − q·y′)، حيث جاء (x′, y′) من المستوى الأدنى وكان q خارج القسمة في ذلك المستوى. وكل تعويض عكسي يحافظ على المتطابقة، فتحقّقها المعاملات الواصلة إلى القمة للمدخلات الأصلية.`,
    howItWorks: [
      "المرور الأمامي: اقسِم مرارًا، a = q·b + r، مستبدلًا (a, b) بـ (b, r) حتى تصبح b = 0 — مع تسجيل كل خارج قسمة q.",
      "في القاع، gcd = a والمتطابقة a·1 + 0·0 = gcd تعطي المعاملات الأساسية x = 1، y = 0.",
      "عوّض عكسيًا مستوى تلو الآخر: x الجديدة = y′، و y الجديدة = x′ − q·y′، مستعملًا خارج القسمة q المخزّن لذلك المستوى.",
      "كل خطوة تحافظ على a·x + b·y = gcd لـ (a, b) في ذلك المستوى — قابلة للتحقق عند كل صف.",
      "المعاملان x، y في المستوى الأعلى هما معاملا بيزو؛ وإذا كان gcd(a, m) = 1، فإن x بترديد m هي المعكوس القياسي لـ a.",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(log(min(a,b)))", worst: "O(log(min(a,b)))" },
      space: "O(log(min(a,b)))",
      notes: "عدد القسمات نفسه كإقليدس العادية — أزواج فيبوناتشي هي أسوأ حالة. يضيف التعويض العكسي عملًا بمقدار O(1) لكل مستوى؛ والنسخة التكرارية تحمل (x, y) إلى الأمام بفضاء O(1).",
    },
    applications: [
      "المعكوس القياسي: حُل a·x ≡ 1 (mod m) حين gcd(a, m) = 1 (حساب مفتاح RSA الخاص)",
      "حل معادلات ديوفانتين الخطية a·x + b·y = c (قابلة للحل إذا وفقط إذا قسم gcd العدد c)",
      "إنشاءات نظرية الباقي الصينية",
      "إعادة البناء النسبي وحسابات الكسور المستمرة",
    ],
    advantages: [
      "الكلفة نفسها O(log min(a,b)) كالقاسم المشترك الأكبر العادي لكنها تعطي الشهادة x، y",
      "تعمل مع أي أعداد صحيحة — لا تشترط الأولية (بخلاف المعكوس المبني على فيرما)",
      "كل صف وسيط قابل للتحقق: a·x + b·y = gcd يتحقق عند كل مستوى",
    ],
    disadvantages: [
      "قد تكون المعاملات سالبة وتحتاج تطبيعًا (x بترديد m) للمعكوس",
      "علاقة عودية دقيقة المراس — يسهل تبديل x و y أثناء التعويض العكسي",
      "قد تتجاوز المعاملات الوسيطة مقدار المدخلات (محدودة بـ max(a,b)، لكن احذر الفيضان ثابت العرض قرب الحدود)",
    ],
    commonMistakes: [
      "إعادة (x, y) دون تبديل: العلاقة هي x = y′ و y = x′ − q·y′، لا العكس.",
      "استخدام الباقي r بدل خارج القسمة q في التعويض العكسي.",
      "نسيان تطبيع x السالبة بـ ((x % m) + m) % m عند حساب المعكوس القياسي.",
      "ادّعاء وجود معكوس حين gcd(a, m) ≠ 1 — بيزو يعطي a·x ≡ gcd فقط، لا 1.",
    ],
    interviewQuestions: [
      "اذكر متطابقة بيزو واشرح لماذا تُثبتها إقليدس الموسّعة إنشائيًا.",
      "اشتق علاقة التعويض العكسي (x, y) = (y′, x′ − q·y′).",
      "كيف تحسب معكوسًا قياسيًا بهذه الخوارزمية، ومتى يوجد؟",
      "قارن معكوسات إقليدس الموسّعة بمعكوسات مبرهنة فيرما الصغرى (a^(m−2) mod m).",
      "كيف تحل a·x + b·y = c لأي c باستعمال معاملَي بيزو؟",
    ],
    summary:
      "تُجري إقليدس الموسّعة قسمات القاسم المشترك الأكبر إلى الأمام، ثم تُعوّض عكسيًا (x, y) ← (y′, x′ − q·y′) بدءًا من الحالة الأساسية (1, 0) لتُنتج معاملات بيزو بحيث a·x + b·y = gcd(a, b) بمقدار O(log min(a, b)). واستعمالها الأبرز حساب المعكوس القياسي كلما كان gcd(a, m) = 1 — الحساب الجوهري خلف RSA ونظرية الباقي الصينية.",
    quiz: [
      { question: "تحسب إقليدس الموسّعة gcd(a, b) و…", options: ["العوامل الأولية لـ a", "عددين صحيحين x، y بحيث a·x + b·y = gcd(a, b)", "‏a·b", "المضاعف المشترك الأصغر فقط"], answer: 1, explanation: "هذان x، y هما معاملا بيزو — إثبات إنشائي لمتطابقة بيزو." },
      { question: "المعاملان الأساسيان حين b = 0 هما…", options: ["x = 0، y = 1", "x = 1، y = 0", "x = y = 1", "x = a، y = b"], answer: 1, explanation: "‏gcd = a هناك، و a·1 + 0·0 = a يحقّق المتطابقة بداهةً." },
      { question: "علاقة التعويض العكسي هي…", options: ["(x, y) = (x′, y′)", "(x, y) = (y′, x′ − q·y′)", "(x, y) = (x′ − q, y′)", "(x, y) = (q·x′, q·y′)"], answer: 1, explanation: "تعويض r = a − q·b في متطابقة المستوى الأدنى يُنتج هذا التحويل بالضبط." },
      { question: "يوجد المعكوس القياسي لـ a بترديد m إذا وفقط إذا…", options: ["كان a أوليًا", "كان m زوجيًا", "‏gcd(a, m) = 1", "‏a < m"], answer: 2, explanation: "عندها a·x + m·y = 1 يعطي a·x ≡ 1 (mod m)؛ وإذا كان gcd > 1 فلا x يفي." },
      { question: "زمن تشغيل إقليدس الموسّعة مقابل إقليدس العادية هو…", options: ["أبطأ تربيعيًا", "نفسه O(log min(a,b))، مع O(1) إضافي لكل مستوى", "أسّي", "O(n) مقابل O(log n)"], answer: 1, explanation: "تُجري سلسلة القسمة نفسها وتكتفي بحمل عددين إضافيين إلى الأعلى." },
    ],
  },
  inputFields: [
    { key: "a", label: "a", placeholder: "240", help: "1–1,000,000,000,000." },
    { key: "b", label: "b", placeholder: "46", help: "1–1,000,000,000,000." },
  ],
  defaultInput: (level, rng) => {
    const pairs: [number, number][][] = [
      [[12, 8], [20, 12], [15, 10]],
      [[35, 15], [48, 18], [56, 42]],
      [[240, 46], [99, 78], [161, 28]],
      [[1071, 462], [612, 342], [270, 192]],
      [[6765, 4181], [9973, 2137], [4181, 2584]],
    ];
    const pool = pairs[Math.min(level, 5) - 1] ?? pairs[2];
    const [a, b] = rng.pick(pool);
    return { a, b };
  },
  parseInput: (fields) => {
    const a = Number((fields.a ?? "").trim());
    const b = Number((fields.b ?? "").trim());
    if (!Number.isInteger(a) || a < 1 || a > 1_000_000_000_000) throw new Error("a must be an integer between 1 and 1,000,000,000,000.");
    if (!Number.isInteger(b) || b < 1 || b > 1_000_000_000_000) throw new Error("b must be an integer between 1 and 1,000,000,000,000.");
    return { a, b };
  },
  serializeInput: (input) => ({ a: String(input.a), b: String(input.b) }),
  generate,
};

export default mod;
