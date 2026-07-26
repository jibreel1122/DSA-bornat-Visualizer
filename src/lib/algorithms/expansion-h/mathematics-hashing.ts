import type { ArrayFrame, HashFrame, Level, RNG, Step, TableFrame } from "@/lib/engine/types";
import { complexity, gcd, integer, integerList, makeHModule, modPow, pushBounded, table, traceStep } from "./shared";

const field = (key: string, label: string, labelAr: string, placeholder: string, list = false) => ({
  key, label, labelAr, placeholder, list,
  help: list ? "Comma-separated values." : "Enter a value using the shown format.",
  helpAr: list ? "قيم مفصولة بفواصل." : "أدخل قيمة بالتنسيق الموضح.",
});

type NumberInput = { n: number };

function isPrimeTrial(n: number): boolean {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let divisor = 3; divisor * divisor <= n; divisor += 2) if (n % divisor === 0) return false;
  return true;
}

function safeSquareAdd(value: number, add: number, modulus: number): number {
  return Number((BigInt(value) * BigInt(value) + BigInt(add)) % BigInt(modulus));
}

// ---------------------------------------------------------------------------
// Pollard's rho factorization
// ---------------------------------------------------------------------------

function pollardSteps(input: NumberInput): Step<ArrayFrame>[] {
  const n = input.n;
  const steps: Step<ArrayFrame>[] = [];
  let iterations = 0;
  const emit = (values: number[], states: ArrayFrame["states"], note: string, description: string, descriptionAr: string, phase: string, line: number) =>
    pushBounded(steps, traceStep({
      values,
      states,
      aux: [{ label: "meaning", values: ["x (tortoise)", "y (hare)", "|x-y|", "gcd"] }],
      note,
    }, description, descriptionAr, phase, line, { iterations }));
  if (n % 2 === 0) {
    emit([2, 0, 0, 2], { 3: "found" }, "factor=2", `${n} is even, so 2 is a nontrivial factor.`, `${n} زوجي، لذا 2 عامل غير تافه.`, "result", 0);
    return steps;
  }
  if (isPrimeTrial(n)) {
    emit([n, 0, 0, 1], { 0: "found" }, "prime=true", `${n} is prime; no nontrivial factor exists.`, `${n} أولي؛ لا يوجد عامل غير تافه.`, "result", 0);
    return steps;
  }
  for (let c = 1; c <= 20; c++) {
    let x = 2;
    let y = 2;
    let divisor = 1;
    emit([x, y, 0, divisor], { 0: "active", 1: "active" }, `f(z)=z²+${c} mod ${n}`,
      `Start a rho walk with polynomial constant c=${c}.`, `ابدأ مسار رو بثابت كثير الحدود c=${c}.`, "restart", 1);
    while (divisor === 1 && iterations < 4_000) {
      emit([x, y, Math.abs(x - y), divisor], { 0: "compare", 1: "compare" }, "before advancing pointers",
        "Advance the tortoise once and the hare twice.", "حرّك السلحفاة مرة والأرنب مرتين.", "advance", 2);
      x = safeSquareAdd(x, c, n);
      y = safeSquareAdd(safeSquareAdd(y, c, n), c, n);
      const difference = Math.abs(x - y);
      divisor = gcd(difference, n);
      iterations++;
      if (!emit([x, y, difference, divisor], { 2: "active", 3: divisor > 1 ? "found" : "compare" },
        `gcd(${difference},${n})=${divisor}`,
        `After moving, compute gcd(${difference}, ${n}) = ${divisor}.`,
        `بعد الحركة احسب gcd(${difference}، ${n}) = ${divisor}.`,
        "gcd-check", 3)) return steps;
    }
    if (divisor > 1 && divisor < n) {
      emit([x, y, Math.abs(x - y), divisor], { 3: "found" }, `factor=${divisor}; cofactor=${n / divisor}`,
        `Found nontrivial factor ${divisor}; the cofactor is ${n / divisor}.`,
        `وُجد العامل غير التافه ${divisor}؛ العامل المرافق ${n / divisor}.`,
        "result", 4);
      return steps;
    }
    emit([x, y, Math.abs(x - y), divisor], { 3: "discarded" }, `cycle failed for c=${c}`,
      `The walk produced gcd n, so retry with a different polynomial.`,
      `أنتج المسار القاسم n، لذا أعد المحاولة بكثير حدود مختلف.`,
      "cycle-retry", 5);
  }
  emit([0, 0, 0, n], { 3: "discarded" }, "factor not found within teaching bound",
    "The bounded teaching run did not find a factor.", "لم يجد التشغيل التعليمي المحدود عاملاً.", "failure", 5);
  return steps;
}

export const pollardRho = makeHModule<ArrayFrame, NumberInput>({
  slug: "pollard-rho",
  title: "Pollard's Rho Factorization",
  titleAr: "تحليل بولارد رو",
  category: "mathematics",
  difficulty: "Advanced",
  tags: ["number theory", "factorization", "cycle detection", "gcd"],
  tagsAr: ["نظرية الأعداد", "تحليل العوامل", "كشف دورة", "قاسم مشترك"],
  summary: "Uses a pseudorandom modular walk and GCD cycle differences to find a factor.",
  summaryAr: "تستخدم مسارًا معياريًا شبه عشوائي وفروق الدورة مع القاسم المشترك لإيجاد عامل.",
  renderer: "array",
  pseudocode: ["handle even or prime n", "choose f(x)=x²+c mod n", "advance x once and y twice", "d = gcd(|x-y|, n)", "if 1<d<n return d", "if d=n retry another c"],
  inputFields: [field("n", "Composite number", "العدد المركب", "8051")],
  defaultInput: (level) => ({ n: [91, 8051, 10403, 19603, 104729 * 101][level - 1] }),
  parseInput: (fields) => ({ n: integer(fields.n, "Number", 2, 50_000_000) }),
  serializeInput: ({ n }) => ({ n: String(n) }),
  generate: pollardSteps,
  complexity: { time: { best: "O(1)", average: "O(√p)", worst: "probabilistic" }, space: "O(1)" },
  applications: ["Integer factorization", "Cryptanalysis education", "Number-theory tooling"],
  applicationsAr: ["تحليل الأعداد", "تعليم تحليل التشفير", "أدوات نظرية الأعداد"],
});

// ---------------------------------------------------------------------------
// Fermat primality test
// ---------------------------------------------------------------------------

type FermatInput = { n: number; bases: number[] };

function fermatSteps(input: FermatInput): Step<TableFrame>[] {
  const rows: (string | number | null)[][] = [];
  const steps: Step<TableFrame>[] = [];
  let tested = 0;
  let probable = input.n > 1;
  const frame = (active?: [number, number], note?: string) => table(rows, rows.map((_, i) => `test ${i + 1}`), ["base", "gcd", `a^(n-1) mod n`], active, note);
  if (input.n === 2 || input.n === 3) {
    rows.push([input.n, 1, 1]);
    pushBounded(steps, traceStep(frame([0, 2], "probable-prime=true"), `${input.n} is prime by the small-number base case.`, `${input.n} أولي بحالة الأعداد الصغيرة.`, "result", 0));
    return steps;
  }
  if (input.n < 2 || input.n % 2 === 0) {
    rows.push([2, gcd(2, input.n), 0]);
    pushBounded(steps, traceStep(frame([0, 1], "probable-prime=false"), `${input.n} is below 2 or even, so it is composite.`, `${input.n} أصغر من 2 أو زوجي، لذا هو مركب.`, "result", 0));
    return steps;
  }
  for (const rawBase of input.bases) {
    const base = 2 + (((rawBase - 2) % (input.n - 2)) + (input.n - 2)) % (input.n - 2);
    const divisor = gcd(base, input.n);
    rows.push([base, divisor, null]);
    const row = rows.length - 1;
    pushBounded(steps, traceStep(frame([row, 1], `gcd(${base},${input.n})=${divisor}`),
      `First verify that base ${base} is coprime to ${input.n}.`,
      `تحقق أولاً أن الأساس ${base} أولي نسبيًا مع ${input.n}.`,
      "gcd-check", 1, { tested }));
    if (divisor !== 1) {
      probable = false;
      pushBounded(steps, traceStep(frame([row, 1], `witness factor=${divisor}; probable-prime=false`),
        `GCD ${divisor} is a nontrivial factor, proving compositeness.`,
        `القاسم ${divisor} عامل غير تافه يثبت أن العدد مركب.`,
        "witness", 2, { tested }));
      break;
    }
    const residue = modPow(base, input.n - 1, input.n);
    rows[row][2] = residue;
    tested++;
    pushBounded(steps, traceStep(frame([row, 2], `${base}^${input.n - 1} mod ${input.n}=${residue}`),
      `Fermat residue for base ${base} is ${residue}.`,
      `باقي فيرما للأساس ${base} هو ${residue}.`,
      "power-check", 3, { tested }));
    if (residue !== 1) {
      probable = false;
      pushBounded(steps, traceStep(frame([row, 2], `witness=${base}; probable-prime=false`),
        `Base ${base} is a Fermat witness, proving ${input.n} composite.`,
        `الأساس ${base} شاهد فيرما يثبت أن ${input.n} مركب.`,
        "witness", 4, { tested }));
      break;
    }
  }
  pushBounded(steps, traceStep(frame(undefined, `probable-prime=${probable}; tests=${tested}`),
    probable
      ? `${input.n} passed all selected bases: probable prime, not a proof.`
      : `${input.n} is composite.`,
    probable
      ? `اجتاز ${input.n} كل الأسس المختارة: أولي محتمل وليس برهانًا.`
      : `${input.n} عدد مركب.`,
    "result", 5, { tested }));
  return steps;
}

export const fermatPrimality = makeHModule<TableFrame, FermatInput>({
  slug: "fermat-primality",
  title: "Fermat Primality Test",
  titleAr: "اختبار فيرما للأولية",
  category: "mathematics",
  difficulty: "Intermediate",
  tags: ["number theory", "primality", "modular exponentiation", "probabilistic"],
  tagsAr: ["نظرية الأعداد", "أولية", "أس معياري", "احتمالي"],
  summary: "Checks Fermat congruences and reports probable prime rather than claiming proof.",
  summaryAr: "تفحص توافقات فيرما وتبلغ عن أولي محتمل بدلاً من ادعاء البرهان.",
  renderer: "table",
  pseudocode: ["handle n < 4", "for each selected base a", "  if gcd(a,n)>1 return composite", "  compute a^(n-1) mod n", "  if residue != 1 return composite", "return probable prime"],
  inputFields: [field("n", "Number", "العدد", "561"), field("bases", "Bases", "الأسس", "2,3,5", true)],
  defaultInput: (level, rng) => ({ n: [17, 91, 341, 561, 1105][level - 1], bases: Array.from({ length: Math.min(2 + level, 6) }, (_, i) => i === 0 ? 2 : rng.int(3, 20)) }),
  parseInput: (fields) => ({ n: integer(fields.n, "Number", 2, 50_000_000), bases: integerList(fields.bases, "Bases", 1, 12, 2, 49_999_999) }),
  serializeInput: (input) => ({ n: String(input.n), bases: input.bases.join(",") }),
  generate: fermatSteps,
  complexity: { time: { best: "O(log n)", average: "O(k log n)", worst: "O(k log n)" }, space: "O(1)" },
  applications: ["Primality prefilters", "Number theory education", "Probabilistic algorithms"],
  applicationsAr: ["مرشحات أولية", "تعليم نظرية الأعداد", "الخوارزميات الاحتمالية"],
});

// ---------------------------------------------------------------------------
// Lucas theorem
// ---------------------------------------------------------------------------

type LucasInput = { n: number; k: number; prime: number };

function chooseSmall(n: number, k: number, p: number): number {
  if (k < 0 || k > n) return 0;
  let numerator = 1;
  let denominator = 1;
  for (let i = 1; i <= k; i++) {
    numerator = (numerator * (n - i + 1)) % p;
    denominator = (denominator * i) % p;
  }
  return (numerator * modPow(denominator, p - 2, p)) % p;
}

function lucasSteps(input: LucasInput): Step<TableFrame>[] {
  let n = input.n;
  let k = input.k;
  let product = 1;
  const rows: (string | number | null)[][] = [];
  const steps: Step<TableFrame>[] = [];
  let position = 0;
  while (n > 0 || k > 0) {
    const ni = n % input.prime;
    const ki = k % input.prime;
    rows.push([position, ni, ki, null, product]);
    const row = rows.length - 1;
    const frame = (active: [number, number], note: string) => table(rows, rows.map((_, i) => `digit ${i}`), ["position", "nᵢ", "kᵢ", "C(nᵢ,kᵢ)", "product"], active, note);
    pushBounded(steps, traceStep(frame([row, 2], `base ${input.prime} digits ${ni},${ki}`),
      `Read base ${input.prime} digits nᵢ=${ni}, kᵢ=${ki}.`,
      `اقرأ رقمي الأساس ${input.prime}: nᵢ=${ni} وkᵢ=${ki}.`,
      "digit", 1, { position }));
    if (ki > ni) {
      rows[row][3] = 0;
      rows[row][4] = 0;
      product = 0;
      pushBounded(steps, traceStep(frame([row, 3], "kᵢ>nᵢ, result=0"),
        "This digit asks for more choices than available, so the binomial coefficient is 0 modulo p.",
        "هذا الرقم يطلب اختيارات أكثر من المتاح، لذا معامل ثنائي الحدين يساوي 0 بترديد p.",
        "zero-digit", 2, { position: position + 1 }));
      break;
    }
    const local = chooseSmall(ni, ki, input.prime);
    product = (product * local) % input.prime;
    rows[row][3] = local;
    rows[row][4] = product;
    pushBounded(steps, traceStep(frame([row, 4], `local=${local}; product=${product}`),
      `Multiply by C(${ni},${ki})=${local}; running product is ${product}.`,
      `اضرب في C(${ni}،${ki})=${local}؛ الناتج الجاري ${product}.`,
      "multiply", 3, { position: position + 1 }));
    n = Math.floor(n / input.prime);
    k = Math.floor(k / input.prime);
    position++;
  }
  if (rows.length === 0) rows.push([0, 0, 0, 1, 1]);
  pushBounded(steps, traceStep(table(rows, rows.map((_, i) => `digit ${i}`), ["position", "nᵢ", "kᵢ", "C(nᵢ,kᵢ)", "product"], [rows.length - 1, 4], `result=${product}`),
    `C(${input.n},${input.k}) mod ${input.prime} = ${product}.`,
    `C(${input.n}،${input.k}) بترديد ${input.prime} = ${product}.`,
    "result", 4, { position: rows.length }));
  return steps;
}

export const lucasTheorem = makeHModule<TableFrame, LucasInput>({
  slug: "lucas-theorem",
  title: "Lucas' Theorem",
  titleAr: "مبرهنة لوكاس",
  category: "mathematics",
  difficulty: "Advanced",
  tags: ["number theory", "binomial coefficient", "modular arithmetic"],
  tagsAr: ["نظرية الأعداد", "معامل ثنائي الحدين", "حساب معياري"],
  summary: "Computes a binomial coefficient modulo a prime from base-p digits.",
  summaryAr: "تحسب معامل ثنائي الحدين بترديد عدد أولي من أرقام الأساس p.",
  renderer: "table",
  pseudocode: ["answer = 1", "while n or k has digits", "  ni=n mod p; ki=k mod p", "  if ki>ni return 0", "  answer *= C(ni,ki) mod p", "  divide n and k by p", "return answer"],
  inputFields: [field("n", "n", "n", "100"), field("k", "k", "k", "20"), field("prime", "Prime modulus", "المعيار الأولي", "13")],
  defaultInput: (level) => ({ n: [10, 25, 100, 250, 1000][level - 1], k: [3, 9, 20, 80, 337][level - 1], prime: [5, 7, 13, 17, 19][level - 1] }),
  parseInput: (fields) => {
    const n = integer(fields.n, "n", 0, 1_000_000_000);
    const k = integer(fields.k, "k", 0, n);
    const prime = integer(fields.prime, "Prime", 2, 97);
    if (!isPrimeTrial(prime)) throw new Error("Modulus must be prime.");
    return { n, k, prime };
  },
  serializeInput: (input) => ({ n: String(input.n), k: String(input.k), prime: String(input.prime) }),
  generate: lucasSteps,
  complexity: { time: { best: "O(1)", average: "O(logₚ n · p)", worst: "O(logₚ n · p)" }, space: "O(1)" },
  applications: ["Combinatorics modulo primes", "Competitive programming", "Finite fields"],
  applicationsAr: ["التوافقيات بترديد أولي", "البرمجة التنافسية", "الحقول المنتهية"],
});

// ---------------------------------------------------------------------------
// Matrix exponentiation
// ---------------------------------------------------------------------------

type MatrixPowerInput = { matrix: [number, number, number, number]; exponent: number; modulus: number };
type Matrix2 = [number, number, number, number];

function multiply2(a: Matrix2, b: Matrix2, modulus: number): Matrix2 {
  const m = BigInt(modulus);
  const value = (x: bigint) => Number(((x % m) + m) % m);
  return [
    value(BigInt(a[0]) * BigInt(b[0]) + BigInt(a[1]) * BigInt(b[2])),
    value(BigInt(a[0]) * BigInt(b[1]) + BigInt(a[1]) * BigInt(b[3])),
    value(BigInt(a[2]) * BigInt(b[0]) + BigInt(a[3]) * BigInt(b[2])),
    value(BigInt(a[2]) * BigInt(b[1]) + BigInt(a[3]) * BigInt(b[3])),
  ];
}

function matrixPowerSteps(input: MatrixPowerInput): Step<TableFrame>[] {
  let result: Matrix2 = [1, 0, 0, 1];
  let base: Matrix2 = [...input.matrix];
  let exponent = input.exponent;
  const steps: Step<TableFrame>[] = [];
  let multiplications = 0;
  const frame = (active?: [number, number], note?: string) => table(
    [[result[0], base[0]], [result[1], base[1]], [result[2], base[2]], [result[3], base[3]]],
    ["(0,0)", "(0,1)", "(1,0)", "(1,1)"], ["result", "base"], active, note,
  );
  pushBounded(steps, traceStep(frame(undefined, `exponent=${exponent}; modulus=${input.modulus}`),
    "Initialize result to the identity matrix.", "هيّئ الناتج إلى مصفوفة الوحدة.", "base-write", 0, { multiplications }));
  while (exponent > 0) {
    pushBounded(steps, traceStep(frame(undefined, `exponent=${exponent}; bit=${exponent % 2}`),
      `Inspect the least-significant exponent bit: ${exponent % 2}.`,
      `افحص أقل بت في الأس: ${exponent % 2}.`,
      "bit-check", 1, { multiplications }));
    if (exponent % 2 === 1) {
      pushBounded(steps, traceStep(frame(undefined, "candidate=result×base"),
        "The bit is 1, so prepare result × base.", "البت يساوي 1، لذا حضّر الناتج × الأساس.",
        "multiply-candidate", 2, { multiplications }));
      result = multiply2(result, base, input.modulus);
      multiplications++;
      pushBounded(steps, traceStep(frame([0, 0], `committed result; exponent=${exponent}`),
        "Commit the matrix multiplication into result.", "ثبّت حاصل ضرب المصفوفات في الناتج.",
        "multiply-commit", 2, { multiplications }));
    }
    exponent = Math.floor(exponent / 2);
    if (exponent > 0) {
      pushBounded(steps, traceStep(frame(undefined, "candidate=base²"),
        "Prepare to square the base for the next bit.", "حضّر تربيع الأساس للبت التالي.",
        "square-candidate", 3, { multiplications }));
      base = multiply2(base, base, input.modulus);
      multiplications++;
      pushBounded(steps, traceStep(frame([0, 1], `committed square; next exponent=${exponent}`),
        "Commit the squared base.", "ثبّت الأساس المربع.",
        "square-commit", 3, { multiplications }));
    }
  }
  pushBounded(steps, traceStep(frame([0, 0], `result=${result.join(",")}`),
    `Matrix power result is [${result.join(", ")}] modulo ${input.modulus}.`,
    `نتيجة قوة المصفوفة هي [${result.join("، ")}] بترديد ${input.modulus}.`,
    "result", 4, { multiplications }));
  return steps;
}

export const matrixExponentiation = makeHModule<TableFrame, MatrixPowerInput>({
  slug: "matrix-exponentiation",
  title: "Matrix Exponentiation",
  titleAr: "رفع المصفوفة إلى قوة",
  category: "mathematics",
  difficulty: "Intermediate",
  tags: ["mathematics", "matrices", "binary exponentiation"],
  tagsAr: ["رياضيات", "مصفوفات", "أس ثنائي"],
  summary: "Raises a 2×2 matrix by repeated squaring with an optional modulus.",
  summaryAr: "ترفع مصفوفة 2×2 بالتربيع المتكرر مع معيار اختياري.",
  renderer: "table",
  pseudocode: ["result = identity", "while exponent > 0", "  if low bit is 1: result *= base", "  exponent = floor(exponent/2)", "  if more bits remain: base *= base", "return result"],
  inputFields: [field("matrix", "Matrix a,b,c,d", "المصفوفة a,b,c,d", "1,1,1,0", true), field("exponent", "Exponent", "الأس", "10"), field("modulus", "Modulus", "المعيار", "1000000007")],
  defaultInput: (level, rng) => ({ matrix: [1, 1, 1, 0], exponent: 3 + level * 2, modulus: rng.pick([97, 1_000_000_007]) }),
  parseInput: (fields) => {
    const values = integerList(fields.matrix, "Matrix", 4, 4, -1_000_000, 1_000_000);
    return {
      matrix: values as Matrix2,
      exponent: integer(fields.exponent, "Exponent", 0, 1_000_000_000),
      modulus: integer(fields.modulus, "Modulus", 2, 2_000_000_000),
    };
  },
  serializeInput: (input) => ({ matrix: input.matrix.join(","), exponent: String(input.exponent), modulus: String(input.modulus) }),
  generate: matrixPowerSteps,
  complexity: { time: { best: "O(1)", average: "O(log e)", worst: "O(log e)" }, space: "O(1)" },
  applications: ["Linear recurrences", "Graph walk counting", "Fast transformations"],
  applicationsAr: ["العلاقات الخطية", "عد مسارات الرسم", "التحويلات السريعة"],
});

// ---------------------------------------------------------------------------
// LRU and LFU caches
// ---------------------------------------------------------------------------

type CacheOperation = { kind: "put"; key: string; value: number } | { kind: "get"; key: string };
type CacheInput = { capacity: number; operations: CacheOperation[] };

function parseCache(fields: Record<string, string>): CacheInput {
  const capacity = integer(fields.capacity, "Capacity", 1, 10);
  const tokens = (fields.operations ?? "").split(",").map((token) => token.trim()).filter(Boolean);
  if (tokens.length < 1 || tokens.length > 40) throw new Error("Use 1-40 cache operations.");
  const operations = tokens.map((token): CacheOperation => {
    const parts = token.split(":").map((part) => part.trim());
    if (parts[0]?.toLowerCase() === "get" && parts.length === 2 && /^[A-Za-z0-9_]+$/.test(parts[1])) return { kind: "get", key: parts[1] };
    if (parts[0]?.toLowerCase() === "put" && parts.length === 3 && /^[A-Za-z0-9_]+$/.test(parts[1])) {
      return { kind: "put", key: parts[1], value: integer(parts[2], "Cache value", -1_000_000, 1_000_000) };
    }
    throw new Error(`Invalid operation "${token}". Use put:key:value or get:key.`);
  });
  return { capacity, operations };
}

function serializeCache(input: CacheInput): Record<string, string> {
  return {
    capacity: String(input.capacity),
    operations: input.operations.map((operation) => operation.kind === "get" ? `get:${operation.key}` : `put:${operation.key}:${operation.value}`).join(","),
  };
}

function cacheFrame(
  entries: { key: string; value: number; frequency?: number }[],
  state: "active" | "compare" | "discarded" | "found" | undefined,
  activeKey: string | undefined,
  orderLabel: string,
  note: string,
): HashFrame {
  return {
    buckets: entries.map((entry, index) => ({
      index,
      items: [{ key: `${entry.key}:${entry.value}`, state: entry.key === activeKey ? state : undefined }],
      state: entry.key === activeKey ? state : undefined,
    })),
    chained: false,
    aux: [
      { label: orderLabel, values: entries.map((entry) => entry.key) },
      { label: "frequency", values: entries.map((entry) => entry.frequency ?? "-") },
    ],
    note,
  };
}

function lruSteps(input: CacheInput): Step<HashFrame>[] {
  const values = new Map<string, number>();
  let order: string[] = [];
  const outputs: (string | number)[] = [];
  const steps: Step<HashFrame>[] = [];
  let hits = 0;
  let misses = 0;
  let evictions = 0;
  const entries = () => order.map((key) => ({ key, value: values.get(key)! }));
  for (const operation of input.operations) {
    pushBounded(steps, traceStep(cacheFrame(entries(), "compare", operation.key, "LRU → MRU", `${operation.kind}:${operation.key}; before`),
      `Read operation ${operation.kind}(${operation.key}) against the current cache.`,
      `اقرأ العملية ${operation.kind}(${operation.key}) على الذاكرة الحالية.`,
      "operation", 1, { hits, misses, evictions, size: values.size }));
    if (operation.kind === "get") {
      if (!values.has(operation.key)) {
        misses++;
        outputs.push(-1);
        pushBounded(steps, traceStep(cacheFrame(entries(), "discarded", operation.key, "LRU → MRU", `get=${operation.key}; output=-1`),
          `${operation.key} is absent; return -1 without changing recency.`,
          `${operation.key} غير موجود؛ أرجع -1 دون تغيير ترتيب الحداثة.`,
          "miss", 2, { hits, misses, evictions, size: values.size }));
      } else {
        hits++;
        const value = values.get(operation.key)!;
        order = order.filter((key) => key !== operation.key);
        order.push(operation.key);
        outputs.push(value);
        pushBounded(steps, traceStep(cacheFrame(entries(), "found", operation.key, "LRU → MRU", `get=${operation.key}; output=${value}`),
          `Return ${value} and move ${operation.key} to most recently used.`,
          `أرجع ${value} وانقل ${operation.key} إلى الأحدث استخدامًا.`,
          "hit-move", 3, { hits, misses, evictions, size: values.size }, { kind: "reorder", label: "LRU recency update" }));
      }
      continue;
    }
    if (values.has(operation.key)) {
      values.set(operation.key, operation.value);
      order = order.filter((key) => key !== operation.key);
      order.push(operation.key);
      pushBounded(steps, traceStep(cacheFrame(entries(), "active", operation.key, "LRU → MRU", `update=${operation.key}:${operation.value}`),
        `Update ${operation.key} and move it to most recently used.`,
        `حدّث ${operation.key} وانقله إلى الأحدث استخدامًا.`,
        "update-move", 4, { hits, misses, evictions, size: values.size }, { kind: "reorder", label: "LRU update" }));
      continue;
    }
    if (values.size === input.capacity) {
      const victim = order[0];
      pushBounded(steps, traceStep(cacheFrame(entries(), "discarded", victim, "LRU → MRU", `evict candidate=${victim}`),
        `${victim} is the least recently used entry and must be evicted.`,
        `${victim} هو الأقل استخدامًا حديثًا ويجب إخلاؤه.`,
        "evict-candidate", 5, { hits, misses, evictions, size: values.size }));
      order.shift();
      values.delete(victim);
      evictions++;
      pushBounded(steps, traceStep(cacheFrame(entries(), undefined, undefined, "LRU → MRU", `evicted=${victim}`),
        `Remove ${victim}; one slot is now free.`, `احذف ${victim}؛ أصبحت خانة واحدة حرة.`,
        "evict", 5, { hits, misses, evictions, size: values.size }, { kind: "other", label: "LRU eviction" }));
    }
    values.set(operation.key, operation.value);
    order.push(operation.key);
    pushBounded(steps, traceStep(cacheFrame(entries(), "found", operation.key, "LRU → MRU", `put=${operation.key}:${operation.value}`),
      `Insert ${operation.key}:${operation.value} as most recently used.`,
      `أدرج ${operation.key}:${operation.value} بوصفه الأحدث استخدامًا.`,
      "insert", 6, { hits, misses, evictions, size: values.size }));
  }
  pushBounded(steps, traceStep(cacheFrame(entries(), undefined, undefined, "LRU → MRU", `outputs=${outputs.join(",")}; order=${order.join(",")}`),
    `Finished with outputs [${outputs.join(", ")}].`, `انتهى التنفيذ بالمخرجات [${outputs.join("، ")}].`,
    "result", 6, { hits, misses, evictions, size: values.size }));
  return steps;
}

export const lruCache = makeHModule<HashFrame, CacheInput>({
  slug: "lru-cache",
  title: "LRU Cache",
  titleAr: "ذاكرة الأقل استخدامًا حديثًا",
  category: "hashing",
  difficulty: "Intermediate",
  tags: ["hashing", "cache", "LRU", "linked order"],
  tagsAr: ["تجزئة", "ذاكرة مخبأة", "الأقل حداثة", "ترتيب مرتبط"],
  summary: "Combines lookup with recency order and evicts the least recently used key.",
  summaryAr: "تجمع البحث مع ترتيب الحداثة وتخلي المفتاح الأقل استخدامًا حديثًا.",
  renderer: "hash",
  pseudocode: ["for each operation", "  get: return value and move key to MRU", "  miss: return -1", "  put existing: update and move to MRU", "  if full, evict LRU", "  insert new key as MRU", "return get outputs"],
  inputFields: [field("capacity", "Capacity", "السعة", "2"), field("operations", "Operations", "العمليات", "put:a:1,put:b:2,get:a,put:c:3,get:b", true)],
  defaultInput: (level, rng) => ({
    capacity: Math.min(2 + Math.floor(level / 2), 4),
    operations: [
      { kind: "put" as const, key: "a", value: rng.int(1, 9) },
      { kind: "put" as const, key: "b", value: rng.int(1, 9) },
      { kind: "get" as const, key: "a" },
      { kind: "put" as const, key: "c", value: rng.int(1, 9) },
      { kind: "get" as const, key: "b" },
    ],
  }),
  parseInput: parseCache,
  serializeInput: serializeCache,
  generate: lruSteps,
  complexity: complexity.constantCache,
  applications: ["Web caches", "Page replacement", "Memoization stores"],
  applicationsAr: ["ذاكرة الويب", "استبدال الصفحات", "مخازن الحفظ"],
});

type LfuEntry = { key: string; value: number; frequency: number; tick: number };

function lfuSteps(input: CacheInput): Step<HashFrame>[] {
  const values = new Map<string, LfuEntry>();
  const outputs: (string | number)[] = [];
  const steps: Step<HashFrame>[] = [];
  let tick = 0;
  let hits = 0;
  let misses = 0;
  let evictions = 0;
  const ordered = () => [...values.values()].sort((a, b) => a.frequency - b.frequency || a.tick - b.tick || a.key.localeCompare(b.key));
  for (const operation of input.operations) {
    tick++;
    pushBounded(steps, traceStep(cacheFrame(ordered(), "compare", operation.key, "LFU then LRU", `${operation.kind}:${operation.key}; before`),
      `Read ${operation.kind}(${operation.key}); frequency is primary and recency breaks ties.`,
      `اقرأ ${operation.kind}(${operation.key})؛ التكرار أولاً والحداثة تكسر التعادل.`,
      "operation", 1, { hits, misses, evictions, size: values.size }));
    const existing = values.get(operation.key);
    if (operation.kind === "get") {
      if (!existing) {
        misses++;
        outputs.push(-1);
        pushBounded(steps, traceStep(cacheFrame(ordered(), "discarded", operation.key, "LFU then LRU", `output=-1`),
          `${operation.key} misses; no frequency changes.`, `${operation.key} غير موجود؛ لا يتغير أي تكرار.`,
          "miss", 2, { hits, misses, evictions, size: values.size }));
      } else {
        hits++;
        existing.frequency++;
        existing.tick = tick;
        outputs.push(existing.value);
        pushBounded(steps, traceStep(cacheFrame(ordered(), "found", operation.key, "LFU then LRU", `output=${existing.value}; frequency=${existing.frequency}`),
          `Return ${existing.value}, raise frequency to ${existing.frequency}, and refresh recency.`,
          `أرجع ${existing.value} وارفع التكرار إلى ${existing.frequency} وحدّث الحداثة.`,
          "hit-promote", 3, { hits, misses, evictions, size: values.size }, { kind: "reorder", label: "LFU promotion" }));
      }
      continue;
    }
    if (existing) {
      existing.value = operation.value;
      existing.frequency++;
      existing.tick = tick;
      pushBounded(steps, traceStep(cacheFrame(ordered(), "active", operation.key, "LFU then LRU", `updated; frequency=${existing.frequency}`),
        `Update ${operation.key} and count the put as another use.`,
        `حدّث ${operation.key} واعتبر الإدراج استخدامًا إضافيًا.`,
        "update-promote", 4, { hits, misses, evictions, size: values.size }, { kind: "reorder", label: "LFU update" }));
      continue;
    }
    if (values.size === input.capacity) {
      const victim = ordered()[0];
      pushBounded(steps, traceStep(cacheFrame(ordered(), "discarded", victim.key, "LFU then LRU", `victim=${victim.key}; frequency=${victim.frequency}`),
        `Select ${victim.key}: minimum frequency, then oldest among ties.`,
        `اختر ${victim.key}: أقل تكرار ثم الأقدم عند التعادل.`,
        "evict-candidate", 5, { hits, misses, evictions, size: values.size }));
      values.delete(victim.key);
      evictions++;
      pushBounded(steps, traceStep(cacheFrame(ordered(), undefined, undefined, "LFU then LRU", `evicted=${victim.key}`),
        `Evict ${victim.key}.`, `أخلِ ${victim.key}.`,
        "evict", 5, { hits, misses, evictions, size: values.size }, { kind: "other", label: "LFU eviction" }));
    }
    values.set(operation.key, { key: operation.key, value: operation.value, frequency: 1, tick });
    pushBounded(steps, traceStep(cacheFrame(ordered(), "found", operation.key, "LFU then LRU", `insert frequency=1`),
      `Insert ${operation.key}:${operation.value} with frequency 1.`,
      `أدرج ${operation.key}:${operation.value} بتكرار 1.`,
      "insert", 6, { hits, misses, evictions, size: values.size }));
  }
  pushBounded(steps, traceStep(cacheFrame(ordered(), undefined, undefined, "LFU then LRU", `outputs=${outputs.join(",")}; keys=${ordered().map((entry) => entry.key).join(",")}`),
    `Finished with outputs [${outputs.join(", ")}].`, `انتهى التنفيذ بالمخرجات [${outputs.join("، ")}].`,
    "result", 6, { hits, misses, evictions, size: values.size }));
  return steps;
}

export const lfuCache = makeHModule<HashFrame, CacheInput>({
  slug: "lfu-cache",
  title: "LFU Cache",
  titleAr: "ذاكرة الأقل تكرارًا",
  category: "hashing",
  difficulty: "Advanced",
  tags: ["hashing", "cache", "LFU", "frequency buckets"],
  tagsAr: ["تجزئة", "ذاكرة مخبأة", "الأقل تكرارًا", "حاويات التكرار"],
  summary: "Evicts the least frequently used key, breaking equal-frequency ties by recency.",
  summaryAr: "تخلي المفتاح الأقل تكرارًا وتكسر تعادل التكرار بالحداثة.",
  renderer: "hash",
  pseudocode: ["for each operation", "  get: return value and increment frequency", "  miss: return -1", "  put existing: update and increment frequency", "  if full, evict minimum-frequency oldest key", "  insert new key with frequency 1", "return get outputs"],
  inputFields: [field("capacity", "Capacity", "السعة", "2"), field("operations", "Operations", "العمليات", "put:a:1,put:b:2,get:a,put:c:3,get:b,get:c", true)],
  defaultInput: (level: Level, rng: RNG) => ({
    capacity: Math.min(2 + Math.floor(level / 2), 4),
    operations: [
      { kind: "put" as const, key: "a", value: rng.int(1, 9) },
      { kind: "put" as const, key: "b", value: rng.int(1, 9) },
      { kind: "get" as const, key: "a" },
      { kind: "put" as const, key: "c", value: rng.int(1, 9) },
      { kind: "get" as const, key: "b" },
      { kind: "get" as const, key: "c" },
    ],
  }),
  parseInput: parseCache,
  serializeInput: serializeCache,
  generate: lfuSteps,
  complexity: complexity.constantCache,
  applications: ["Database page caches", "Content caches", "Adaptive memoization"],
  applicationsAr: ["ذاكرة صفحات قواعد البيانات", "ذاكرة المحتوى", "الحفظ التكيفي"],
});
