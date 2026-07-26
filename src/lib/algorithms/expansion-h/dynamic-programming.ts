import type { ArrayFrame, Level, RNG, Step, TableFrame } from "@/lib/engine/types";
import { complexity, integerList, makeHModule, matrix, pushBounded, table, traceStep } from "./shared";

const listField = (key: string, label: string, labelAr: string, placeholder: string) => ({
  key, label, labelAr, placeholder,
  help: "Comma-separated integers.",
  helpAr: "أعداد صحيحة مفصولة بفواصل.",
  list: true,
});
const textField = (key: string, label: string, labelAr: string, placeholder: string) => ({
  key, label, labelAr, placeholder,
  help: "Enter a value using the shown format.",
  helpAr: "أدخل قيمة بالتنسيق الموضح.",
});

// ---------------------------------------------------------------------------
// Held-Karp travelling salesman
// ---------------------------------------------------------------------------

type MatrixInput = { costs: number[][] };

function heldKarpSteps(input: MatrixInput): Step<TableFrame>[] {
  const costs = input.costs;
  const n = costs.length;
  const count = 1 << n;
  const dp = Array.from({ length: count }, () => Array<number | null>(n).fill(null));
  const parent = Array.from({ length: count }, () => Array<number | null>(n).fill(null));
  const steps: Step<TableFrame>[] = [];
  const rows = Array.from({ length: count }, (_, mask) => mask.toString(2).padStart(n, "0"));
  const cols = Array.from({ length: n }, (_, city) => `city ${city}`);
  let candidates = 0;
  let writes = 0;
  dp[1][0] = 0;
  writes++;
  pushBounded(steps, traceStep(table(dp, rows, cols, [1, 0], "Start at city 0."),
    "Base state: only city 0 is visited, with cost 0.", "حالة الأساس: زُرت المدينة 0 فقط بكلفة 0.", "base-write", 1, { candidates, writes }));
  for (let mask = 1; mask < count; mask++) {
    if ((mask & 1) === 0) continue;
    for (let last = 0; last < n; last++) {
      const current = dp[mask][last];
      if (current === null) continue;
      for (let next = 1; next < n; next++) {
        if ((mask & (1 << next)) !== 0) continue;
        const nextMask = mask | (1 << next);
        const candidate = current + costs[last][next];
        candidates++;
        if (!pushBounded(steps, traceStep(table(dp, rows, cols, [nextMask, next],
          `candidate=${current}+${costs[last][next]}=${candidate}`, [[mask, last]]),
        `Try extending state ${rows[mask]} from city ${last} to ${next}; candidate cost ${candidate}.`,
        `جرّب تمديد الحالة ${rows[mask]} من المدينة ${last} إلى ${next}؛ الكلفة المرشحة ${candidate}.`,
        "candidate", 4, { candidates, writes }))) return steps;
        if (dp[nextMask][next] === null || candidate < dp[nextMask][next]!) {
          dp[nextMask][next] = candidate;
          parent[nextMask][next] = last;
          writes++;
          pushBounded(steps, traceStep(table(dp, rows, cols, [nextMask, next],
            `Best predecessor of city ${next} is ${last}.`),
          `Commit dp[${rows[nextMask]}][${next}] = ${candidate}.`,
          `ثبّت dp[${rows[nextMask]}][${next}] = ${candidate}.`,
          "table-write", 5, { candidates, writes }));
        }
      }
    }
  }
  const full = count - 1;
  let best = Number.POSITIVE_INFINITY;
  let last = -1;
  for (let city = 1; city < n; city++) {
    if (dp[full][city] === null) continue;
    const candidate = dp[full][city]! + costs[city][0];
    candidates++;
    pushBounded(steps, traceStep(table(dp, rows, cols, [full, city], `return candidate=${candidate}`),
      `Close the tour from city ${city} to 0 for total ${candidate}.`,
      `أغلق الجولة من المدينة ${city} إلى 0 ليصبح المجموع ${candidate}.`,
      "close-tour", 6, { candidates, writes }));
    if (candidate < best) {
      best = candidate;
      last = city;
    }
  }
  const route = [0];
  if (last >= 0) {
    const reversed: number[] = [];
    let mask = full;
    let cursor = last;
    while (cursor !== 0) {
      reversed.push(cursor);
      const previous = parent[mask][cursor]!;
      mask ^= 1 << cursor;
      cursor = previous;
    }
    route.push(...reversed.reverse(), 0);
  }
  pushBounded(steps, traceStep(table(dp, rows, cols, [full, Math.max(last, 0)],
    `cost=${best}; route=${route.join("→")}`, [], [{ label: "tour", values: route }]),
  `Optimal tour ${route.join(" → ")} costs ${best}.`,
  `الجولة المثلى ${route.join(" ← ")} كلفتها ${best}.`,
  "result", 7, { candidates, writes }));
  return steps;
}

export const heldKarpTsp = makeHModule<TableFrame, MatrixInput>({
  slug: "held-karp-tsp",
  title: "Held-Karp TSP",
  titleAr: "خوارزمية هيلد-كارب للبائع المتجول",
  category: "dynamic-programming",
  difficulty: "Advanced",
  tags: ["dynamic programming", "bitmask", "travelling salesman"],
  tagsAr: ["برمجة ديناميكية", "قناع بتات", "البائع المتجول"],
  summary: "Finds an exact minimum Hamiltonian cycle with subset dynamic programming.",
  summaryAr: "تجد دورة هاميلتونية دنيا بدقة باستخدام البرمجة الديناميكية للمجموعات الجزئية.",
  renderer: "table",
  pseudocode: ["dp[{0}][0] = 0", "for each subset containing 0", "  for each reachable last city", "    try every unvisited next city", "    relax dp[subset ∪ next][next]", "close each full path back to 0", "reconstruct the minimum tour", "return tour and cost"],
  inputFields: [textField("costs", "Cost matrix", "مصفوفة الكلفة", "0,10,15,20;10,0,35,25;15,35,0,30;20,25,30,0")],
  defaultInput: (level: Level, rng: RNG) => {
    const n = Math.min(3 + Math.floor(level / 2), 6);
    const costs = Array.from({ length: n }, () => Array(n).fill(0) as number[]);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) costs[i][j] = costs[j][i] = rng.int(2, 25);
    return { costs };
  },
  parseInput: (fields) => ({ costs: matrix(fields.costs, "Cost matrix", 2, 6) }),
  serializeInput: ({ costs }) => ({ costs: costs.map((row) => row.join(",")).join(";") }),
  generate: heldKarpSteps,
  complexity: complexity.exponential,
  applications: ["Exact route planning", "Small circuit layouts", "Benchmarking heuristics"],
  applicationsAr: ["تخطيط المسارات الدقيقة", "تصميم الدارات الصغيرة", "مقارنة الخوارزميات التقريبية"],
});

// ---------------------------------------------------------------------------
// Digit DP
// ---------------------------------------------------------------------------

type DigitInput = { upper: number; target: number };

function parseDigit(fields: Record<string, string>): DigitInput {
  const upper = integerList(fields.upper, "Upper bound", 1, 1, 0, 999_999_999)[0];
  const target = integerList(fields.target, "Digit sum", 1, 1, 0, 81)[0];
  return { upper, target };
}

function digitDpSteps(input: DigitInput): Step<TableFrame>[] {
  const digits = String(input.upper).split("").map(Number);
  const width = input.target + 1;
  const loose = Array.from({ length: digits.length + 1 }, () => Array<number>(width).fill(0));
  const tight = Array.from({ length: digits.length + 1 }, () => Array<number>(width).fill(0));
  tight[0][0] = 1;
  const steps: Step<TableFrame>[] = [];
  const combined = () => [
    ...tight.map((row) => row.map((value) => value)),
    ...loose.map((row) => row.map((value) => value)),
  ];
  const rowLabels = [
    ...digits.map((_, index) => `tight p${index}`), `tight p${digits.length}`,
    ...digits.map((_, index) => `loose p${index}`), `loose p${digits.length}`,
  ];
  const colLabels = Array.from({ length: width }, (_, sum) => `Σ${sum}`);
  let transitions = 0;
  let writes = 1;
  pushBounded(steps, traceStep(table(combined(), rowLabels, colLabels, [0, 0], `N=${input.upper}`),
    "Start before the first digit with sum 0 and the prefix still tight.",
    "ابدأ قبل الرقم الأول بمجموع 0 والبادئة ما زالت مطابقة للحد.",
    "base-write", 0, { transitions, writes }));
  for (let pos = 0; pos < digits.length; pos++) {
    for (const isTight of [1, 0] as const) {
      const source = isTight ? tight : loose;
      for (let sum = 0; sum <= input.target; sum++) {
        const ways = source[pos][sum];
        if (ways === 0) continue;
        const limit = isTight ? digits[pos] : 9;
        for (let digit = 0; digit <= limit && sum + digit <= input.target; digit++) {
          const nextTight = isTight === 1 && digit === limit;
          const targetTable = nextTight ? tight : loose;
          const targetRow = (nextTight ? 0 : digits.length + 1) + pos + 1;
          transitions++;
          if (!pushBounded(steps, traceStep(table(combined(), rowLabels, colLabels, [targetRow, sum + digit],
            `append ${digit}: ${ways} path(s)`, [[(isTight ? 0 : digits.length + 1) + pos, sum]]),
          `Append digit ${digit}; tight=${Boolean(isTight)} becomes tight=${nextTight}, sum ${sum} becomes ${sum + digit}.`,
          `أضف الرقم ${digit}؛ تتغير المطابقة من ${Boolean(isTight)} إلى ${nextTight} والمجموع من ${sum} إلى ${sum + digit}.`,
          "transition", 3, { transitions, writes }))) return steps;
          targetTable[pos + 1][sum + digit] += ways;
          writes++;
          pushBounded(steps, traceStep(table(combined(), rowLabels, colLabels, [targetRow, sum + digit]),
            `Add ${ways} to this DP state; it now stores ${targetTable[pos + 1][sum + digit]}.`,
            `أضف ${ways} إلى حالة DP؛ أصبحت تخزن ${targetTable[pos + 1][sum + digit]}.`,
            "table-write", 4, { transitions, writes }));
        }
      }
    }
  }
  const answer = tight[digits.length][input.target] + loose[digits.length][input.target];
  pushBounded(steps, traceStep(table(combined(), rowLabels, colLabels, [digits.length, input.target],
    `count=${answer}`), `There are ${answer} integers in [0, ${input.upper}] with digit sum ${input.target}.`,
  `يوجد ${answer} عددًا في [0، ${input.upper}] مجموع أرقامه ${input.target}.`,
  "result", 5, { transitions, writes }));
  return steps;
}

export const digitDp = makeHModule<TableFrame, DigitInput>({
  slug: "digit-dp",
  title: "Digit DP",
  titleAr: "البرمجة الديناميكية على الأرقام",
  category: "dynamic-programming",
  difficulty: "Advanced",
  tags: ["dynamic programming", "digits", "tight state"],
  tagsAr: ["برمجة ديناميكية", "أرقام", "حالة المطابقة"],
  summary: "Counts bounded integers whose decimal digits satisfy a target sum.",
  summaryAr: "تعد الأعداد المحدودة التي تحقق أرقامها مجموعًا مستهدفًا.",
  renderer: "table",
  pseudocode: ["tight[0][0] = 1", "for each digit position", "  for tight/loose and every sum", "    append each legal next digit", "    add ways to the next state", "return tight + loose target counts"],
  inputFields: [textField("upper", "Upper bound", "الحد الأعلى", "250"), textField("target", "Digit sum", "مجموع الأرقام", "7")],
  defaultInput: (level, rng) => ({ upper: rng.int(50, 250 * level), target: rng.int(2, Math.min(18, 4 + level * 2)) }),
  parseInput: parseDigit,
  serializeInput: (input) => ({ upper: String(input.upper), target: String(input.target) }),
  generate: digitDpSteps,
  complexity: { time: { best: "O(d·S)", average: "O(d·S·10)", worst: "O(d·S·10)" }, space: "O(d·S)" },
  applications: ["Counting constrained identifiers", "Range digit statistics", "Combinatorics"],
  applicationsAr: ["عد المعرّفات المقيدة", "إحصاءات الأرقام ضمن مجال", "التوافقيات"],
});

// ---------------------------------------------------------------------------
// Bitmask assignment
// ---------------------------------------------------------------------------

function assignmentSteps(input: MatrixInput): Step<TableFrame>[] {
  const cost = input.costs;
  const n = cost.length;
  const count = 1 << n;
  const dp = Array<number | null>(count).fill(null);
  const parent = Array<{ previous: number; job: number } | null>(count).fill(null);
  dp[0] = 0;
  const view = () => [dp.map((value) => value)];
  const cols = Array.from({ length: count }, (_, mask) => mask.toString(2).padStart(n, "0"));
  const steps: Step<TableFrame>[] = [];
  let candidates = 0;
  let writes = 1;
  pushBounded(steps, traceStep(table(view(), ["minimum cost"], cols, [0, 0]), "No workers assigned costs 0.", "عدم إسناد أي عامل كلفته 0.", "base-write", 0, { candidates, writes }));
  for (let mask = 0; mask < count; mask++) {
    if (dp[mask] === null) continue;
    const worker = mask.toString(2).replaceAll("0", "").length;
    if (worker === n) continue;
    for (let job = 0; job < n; job++) {
      if ((mask & (1 << job)) !== 0) continue;
      const next = mask | (1 << job);
      const candidate = dp[mask]! + cost[worker][job];
      candidates++;
      pushBounded(steps, traceStep(table(view(), ["minimum cost"], cols, [0, next], `worker ${worker} → job ${job}`, [[0, mask]]),
        `Assign worker ${worker} to free job ${job}; candidate cost ${candidate}.`,
        `أسند العامل ${worker} إلى المهمة الحرة ${job}؛ الكلفة المرشحة ${candidate}.`,
        "candidate", 3, { candidates, writes }));
      if (dp[next] === null || candidate < dp[next]!) {
        dp[next] = candidate;
        parent[next] = { previous: mask, job };
        writes++;
        pushBounded(steps, traceStep(table(view(), ["minimum cost"], cols, [0, next]),
          `Commit minimum cost ${candidate} for mask ${cols[next]}.`,
          `ثبّت أقل كلفة ${candidate} للقناع ${cols[next]}.`,
          "table-write", 4, { candidates, writes }));
      }
    }
  }
  const assignment: number[] = Array(n);
  let mask = count - 1;
  for (let worker = n - 1; worker >= 0; worker--) {
    assignment[worker] = parent[mask]!.job;
    mask = parent[mask]!.previous;
  }
  pushBounded(steps, traceStep(table(view(), ["minimum cost"], cols, [0, count - 1],
    `cost=${dp[count - 1]}`, [], [{ label: "worker→job", values: assignment.map((job, worker) => `${worker}→${job}`) }]),
  `Minimum assignment cost is ${dp[count - 1]}.`,
  `أقل كلفة إسناد هي ${dp[count - 1]}.`, "result", 5, { candidates, writes }));
  return steps;
}

export const bitmaskAssignment = makeHModule<TableFrame, MatrixInput>({
  slug: "bitmask-assignment",
  title: "Bitmask Assignment DP",
  titleAr: "إسناد المهام باستخدام أقنعة البتات",
  category: "dynamic-programming",
  difficulty: "Advanced",
  tags: ["dynamic programming", "bitmask", "assignment"],
  tagsAr: ["برمجة ديناميكية", "قناع بتات", "إسناد"],
  summary: "Assigns each worker a unique job at minimum total cost.",
  summaryAr: "تسند لكل عامل مهمة فريدة بأقل كلفة كلية.",
  renderer: "table",
  pseudocode: ["dp[0] = 0", "worker = popcount(mask)", "for each unused job", "  candidate = dp[mask] + cost[worker][job]", "  relax dp[mask ∪ job]", "reconstruct assignments"],
  inputFields: [textField("costs", "Worker/job cost matrix", "مصفوفة كلفة العامل/المهمة", "9,2,7;6,4,3;5,8,1")],
  defaultInput: (level, rng) => {
    const n = Math.min(3 + Math.floor(level / 2), 6);
    return { costs: Array.from({ length: n }, () => Array.from({ length: n }, () => rng.int(1, 20))) };
  },
  parseInput: (fields) => ({ costs: matrix(fields.costs, "Cost matrix", 2, 6) }),
  serializeInput: ({ costs }) => ({ costs: costs.map((row) => row.join(",")).join(";") }),
  generate: assignmentSteps,
  complexity: { time: { best: "O(n·2ⁿ)", average: "O(n·2ⁿ)", worst: "O(n·2ⁿ)" }, space: "O(2ⁿ)" },
  applications: ["Staff assignment", "Small matching problems", "Resource allocation"],
  applicationsAr: ["إسناد الموظفين", "مسائل المطابقة الصغيرة", "توزيع الموارد"],
});

// ---------------------------------------------------------------------------
// Weighted interval scheduling
// ---------------------------------------------------------------------------

type Interval = { start: number; end: number; weight: number };
type IntervalInput = { intervals: Interval[] };

function parseIntervals(raw: string | undefined): Interval[] {
  const parts = (raw ?? "").split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 1 || parts.length > 14) throw new Error("Use 1-14 intervals.");
  return parts.map((part) => {
    const values = part.split("-").map(Number);
    if (values.length !== 3 || values.some((value) => !Number.isSafeInteger(value))) throw new Error("Each interval must be start-end-weight.");
    if (values[0] < 0 || values[1] <= values[0] || values[2] <= 0) throw new Error("Intervals need start < end and positive weight.");
    return { start: values[0], end: values[1], weight: values[2] };
  });
}

function weightedSteps(input: IntervalInput): Step<TableFrame>[] {
  const intervals = [...input.intervals].sort((a, b) => a.end - b.end || a.start - b.start);
  const n = intervals.length;
  const previous = intervals.map((interval, i) => {
    let result = -1;
    for (let j = 0; j < i; j++) if (intervals[j].end <= interval.start) result = j;
    return result;
  });
  const dp = Array<number>(n + 1).fill(0);
  const choose = Array<boolean>(n + 1).fill(false);
  const steps: Step<TableFrame>[] = [];
  const values = () => [
    ["-", ...intervals.map((item) => `${item.start}-${item.end}(${item.weight})`)],
    dp,
    ["-", ...previous.map((value) => value + 1)],
  ];
  const cols = ["0", ...Array.from({ length: n }, (_, i) => String(i + 1))];
  let comparisons = 0;
  pushBounded(steps, traceStep(table(values(), ["interval", "best", "p(i)"], cols, [1, 0]), "The empty schedule has weight 0.", "الجدول الفارغ وزنه 0.", "base-write", 0, { comparisons }));
  for (let i = 1; i <= n; i++) {
    const include = intervals[i - 1].weight + dp[previous[i - 1] + 1];
    const exclude = dp[i - 1];
    comparisons++;
    pushBounded(steps, traceStep(table(values(), ["interval", "best", "p(i)"], cols, [1, i], `include=${include}, exclude=${exclude}`, [[1, i - 1], [1, previous[i - 1] + 1]]),
      `For interval ${i}, compare include ${include} with exclude ${exclude}.`,
      `للفترة ${i} قارن التضمين ${include} بالاستبعاد ${exclude}.`,
      "candidate", 3, { comparisons }));
    dp[i] = Math.max(include, exclude);
    choose[i] = include > exclude;
    pushBounded(steps, traceStep(table(values(), ["interval", "best", "p(i)"], cols, [1, i]),
      `Write dp[${i}] = ${dp[i]} (${choose[i] ? "include" : "exclude"} interval ${i}).`,
      `اكتب dp[${i}] = ${dp[i]} (${choose[i] ? "ضم" : "استبعد"} الفترة ${i}).`,
      "table-write", 4, { comparisons }));
  }
  const selected: string[] = [];
  for (let i = n; i > 0;) {
    if (choose[i] && intervals[i - 1].weight + dp[previous[i - 1] + 1] >= dp[i - 1]) {
      selected.push(`${intervals[i - 1].start}-${intervals[i - 1].end}`);
      i = previous[i - 1] + 1;
    } else i--;
  }
  selected.reverse();
  pushBounded(steps, traceStep(table(values(), ["interval", "best", "p(i)"], cols, [1, n], `weight=${dp[n]}`, [], [{ label: "selected", values: selected }]),
    `Optimal compatible weight is ${dp[n]}.`, `الوزن الأمثل للفترات المتوافقة هو ${dp[n]}.`, "result", 5, { comparisons }));
  return steps;
}

export const weightedIntervalScheduling = makeHModule<TableFrame, IntervalInput>({
  slug: "weighted-interval-scheduling",
  title: "Weighted Interval Scheduling",
  titleAr: "جدولة الفترات الموزونة",
  category: "dynamic-programming",
  difficulty: "Intermediate",
  tags: ["dynamic programming", "intervals", "binary search"],
  tagsAr: ["برمجة ديناميكية", "فترات", "بحث ثنائي"],
  summary: "Selects a maximum-weight compatible subset of intervals.",
  summaryAr: "تختار مجموعة متوافقة من الفترات ذات أكبر وزن.",
  renderer: "table",
  pseudocode: ["sort intervals by finish time", "compute previous compatible p(i)", "dp[0] = 0", "dp[i] = max(weight[i]+dp[p(i)], dp[i-1])", "record include/exclude choice", "reconstruct selected intervals"],
  inputFields: [textField("intervals", "Intervals start-end-weight", "الفترات بداية-نهاية-وزن", "1-3-5,2-5-6,4-6-5,6-7-4")],
  defaultInput: (level, rng) => ({ intervals: Array.from({ length: 3 + level }, (_, i) => {
    const start = i + rng.int(0, 2);
    return { start, end: start + rng.int(1, 4), weight: rng.int(1, 12) };
  }) }),
  parseInput: (fields) => ({ intervals: parseIntervals(fields.intervals) }),
  serializeInput: ({ intervals }) => ({ intervals: intervals.map((item) => `${item.start}-${item.end}-${item.weight}`).join(",") }),
  generate: weightedSteps,
  complexity: { time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)" }, space: "O(n)" },
  applications: ["Job scheduling", "Bandwidth allocation", "Project selection"],
  applicationsAr: ["جدولة الوظائف", "توزيع عرض النطاق", "اختيار المشاريع"],
});

// ---------------------------------------------------------------------------
// Optimal binary search tree
// ---------------------------------------------------------------------------

type OptimalBstInput = { keys: number[]; frequencies: number[] };

function optimalBstSteps(input: OptimalBstInput): Step<TableFrame>[] {
  const paired = input.keys.map((key, i) => ({ key, frequency: input.frequencies[i] })).sort((a, b) => a.key - b.key);
  const n = paired.length;
  const dp = Array.from({ length: n }, () => Array<number | null>(n).fill(null));
  const root = Array.from({ length: n }, () => Array<number | null>(n).fill(null));
  const labels = paired.map((item) => String(item.key));
  const steps: Step<TableFrame>[] = [];
  let candidates = 0;
  let writes = 0;
  const frequencySum = (i: number, j: number) => paired.slice(i, j + 1).reduce((sum, item) => sum + item.frequency, 0);
  for (let i = 0; i < n; i++) {
    dp[i][i] = paired[i].frequency;
    root[i][i] = i;
    writes++;
    pushBounded(steps, traceStep(table(dp, labels, labels, [i, i], `root=${paired[i].key}`),
      `Single key ${paired[i].key} costs its frequency ${paired[i].frequency}.`,
      `المفتاح الوحيد ${paired[i].key} كلفته تكراره ${paired[i].frequency}.`,
      "base-write", 0, { candidates, writes }));
  }
  for (let length = 2; length <= n; length++) {
    for (let i = 0; i + length <= n; i++) {
      const j = i + length - 1;
      const sum = frequencySum(i, j);
      let best = Number.POSITIVE_INFINITY;
      for (let candidateRoot = i; candidateRoot <= j; candidateRoot++) {
        const left = candidateRoot > i ? dp[i][candidateRoot - 1]! : 0;
        const right = candidateRoot < j ? dp[candidateRoot + 1][j]! : 0;
        const candidate = left + right + sum;
        candidates++;
        pushBounded(steps, traceStep(table(dp, labels, labels, [i, j],
          `root=${paired[candidateRoot].key}; ${left}+${right}+${sum}=${candidate}`),
        `Try key ${paired[candidateRoot].key} as root of [${labels[i]}, ${labels[j]}].`,
        `جرّب المفتاح ${paired[candidateRoot].key} جذرًا للفترة [${labels[i]}، ${labels[j]}].`,
        "candidate", 3, { candidates, writes }));
        if (candidate < best) {
          best = candidate;
          dp[i][j] = candidate;
          root[i][j] = candidateRoot;
          writes++;
          pushBounded(steps, traceStep(table(dp, labels, labels, [i, j], `best root=${paired[candidateRoot].key}`),
            `Commit cost ${candidate} with root ${paired[candidateRoot].key}.`,
            `ثبّت الكلفة ${candidate} مع الجذر ${paired[candidateRoot].key}.`,
            "table-write", 4, { candidates, writes }));
        }
      }
    }
  }
  pushBounded(steps, traceStep(table(dp, labels, labels, [0, n - 1],
    `cost=${dp[0][n - 1]}; root=${paired[root[0][n - 1]!].key}`),
  `Minimum expected search cost is ${dp[0][n - 1]}.`,
  `أقل كلفة بحث متوقعة هي ${dp[0][n - 1]}.`, "result", 5, { candidates, writes }));
  return steps;
}

export const optimalBst = makeHModule<TableFrame, OptimalBstInput>({
  slug: "optimal-bst",
  title: "Optimal Binary Search Tree",
  titleAr: "شجرة البحث الثنائية المثلى",
  category: "dynamic-programming",
  difficulty: "Advanced",
  tags: ["dynamic programming", "binary search tree", "interval DP"],
  tagsAr: ["برمجة ديناميكية", "شجرة بحث ثنائية", "برمجة الفترات"],
  summary: "Chooses roots that minimize frequency-weighted search cost.",
  summaryAr: "تختار الجذور التي تقلل كلفة البحث الموزونة بالتكرار.",
  renderer: "table",
  pseudocode: ["dp[i][i] = frequency[i]", "for increasing interval length", "  try every key r as root", "  cost = left + right + interval frequencies", "  retain the minimum root", "return dp[0][n-1]"],
  inputFields: [listField("keys", "Sorted keys", "المفاتيح", "10,20,30,40"), listField("frequencies", "Frequencies", "التكرارات", "4,2,6,3")],
  defaultInput: (level, rng) => {
    const n = 3 + Math.min(level, 4);
    return { keys: Array.from({ length: n }, (_, i) => (i + 1) * 10), frequencies: Array.from({ length: n }, () => rng.int(1, 9)) };
  },
  parseInput: (fields) => {
    const keys = integerList(fields.keys, "Keys", 1, 8);
    const frequencies = integerList(fields.frequencies, "Frequencies", keys.length, keys.length, 1, 999);
    if (new Set(keys).size !== keys.length) throw new Error("Keys must be unique.");
    return { keys, frequencies };
  },
  serializeInput: (input) => ({ keys: input.keys.join(","), frequencies: input.frequencies.join(",") }),
  generate: optimalBstSteps,
  complexity: { time: { best: "O(n³)", average: "O(n³)", worst: "O(n³)" }, space: "O(n²)" },
  applications: ["Static dictionaries", "Compiler symbol tables", "Search optimization"],
  applicationsAr: ["القواميس الثابتة", "جداول رموز المترجم", "تحسين البحث"],
});

// ---------------------------------------------------------------------------
// Regular expression matching DP
// ---------------------------------------------------------------------------

type RegexInput = { text: string; pattern: string };

function regexSteps(input: RegexInput): Step<TableFrame>[] {
  const textChars = [...input.text];
  const patternChars = [...input.pattern];
  const dp = Array.from({ length: textChars.length + 1 }, () => Array<boolean>(patternChars.length + 1).fill(false));
  dp[0][0] = true;
  const view = () => dp.map((row) => row.map((value) => value ? "T" : "F"));
  const rows = ["ε", ...textChars];
  const cols = ["ε", ...patternChars];
  const steps: Step<TableFrame>[] = [];
  let writes = 1;
  pushBounded(steps, traceStep(table(view(), rows, cols, [0, 0]), "Empty pattern matches empty text.", "النمط الفارغ يطابق النص الفارغ.", "base-write", 0, { writes }));
  for (let j = 2; j <= patternChars.length; j++) {
    if (patternChars[j - 1] === "*") {
      dp[0][j] = dp[0][j - 2];
      writes++;
      pushBounded(steps, traceStep(table(view(), rows, cols, [0, j], "zero repetitions"),
        `Pattern prefix through ${j} matches empty text by taking zero repetitions.`,
        `بادئة النمط حتى ${j} تطابق النص الفارغ بأخذ صفر تكرارات.`,
        "base-write", 1, { writes }));
    }
  }
  for (let i = 1; i <= textChars.length; i++) {
    for (let j = 1; j <= patternChars.length; j++) {
      const patternChar = patternChars[j - 1];
      const matches = patternChar === "." || patternChar === textChars[i - 1];
      if (patternChar === "*" && j >= 2) {
        const previousPattern = patternChars[j - 2];
        const repeatedMatches = previousPattern === "." || previousPattern === textChars[i - 1];
        pushBounded(steps, traceStep(table(view(), rows, cols, [i, j],
          `zero=${dp[i][j - 2]}, repeat=${repeatedMatches && dp[i - 1][j]}`, [[i, j - 2], [i - 1, j]]),
        `At '*', compare zero copies with consuming '${textChars[i - 1]}' as another repetition.`,
        `عند '*' قارن صفر نسخ مع استهلاك '${textChars[i - 1]}' كتكرار آخر.`,
        "candidate", 3, { writes }));
        dp[i][j] = dp[i][j - 2] || (repeatedMatches && dp[i - 1][j]);
      } else {
        pushBounded(steps, traceStep(table(view(), rows, cols, [i, j], `character match=${matches}`, [[i - 1, j - 1]]),
          `Compare text '${textChars[i - 1]}' with pattern '${patternChar}'.`,
          `قارن حرف النص '${textChars[i - 1]}' بحرف النمط '${patternChar}'.`,
          "candidate", 2, { writes }));
        dp[i][j] = matches && dp[i - 1][j - 1];
      }
      writes++;
      pushBounded(steps, traceStep(table(view(), rows, cols, [i, j]),
        `Write dp[${i}][${j}] = ${dp[i][j]}.`, `اكتب dp[${i}][${j}] = ${dp[i][j]}.`,
        "table-write", 4, { writes }));
    }
  }
  const result = dp[textChars.length][patternChars.length];
  pushBounded(steps, traceStep(table(view(), rows, cols, [textChars.length, patternChars.length], `match=${result}`),
    `Full-string match is ${result}.`, `نتيجة مطابقة النص الكامل هي ${result}.`, "result", 5, { writes }));
  return steps;
}

export const regexMatchingDp = makeHModule<TableFrame, RegexInput>({
  slug: "regex-matching-dp",
  title: "Regular Expression Matching DP",
  titleAr: "مطابقة التعبير النمطي بالبرمجة الديناميكية",
  category: "dynamic-programming",
  difficulty: "Advanced",
  tags: ["dynamic programming", "strings", "regex", "wildcards"],
  tagsAr: ["برمجة ديناميكية", "سلاسل نصية", "تعبير نمطي", "محارف بديلة"],
  summary: "Matches an entire string against '.' and '*' using a Boolean table.",
  summaryAr: "تطابق نصًا كاملاً مع '.' و'*' باستخدام جدول منطقي.",
  renderer: "table",
  pseudocode: ["dp[0][0] = true", "initialize x* prefixes against empty text", "if chars match, copy diagonal", "if pattern is *, try zero or another copy", "write each Boolean state", "return bottom-right state"],
  inputFields: [textField("text", "Text", "النص", "aab"), textField("pattern", "Pattern (. and *)", "النمط (. و*)", "c*a*b")],
  defaultInput: (level) => [
    { text: "aa", pattern: "a*" }, { text: "aab", pattern: "c*a*b" }, { text: "mississippi", pattern: "mis*is*p*." },
    { text: "ab", pattern: ".*" }, { text: "aaaab", pattern: "a*b" },
  ][level - 1],
  parseInput: (fields) => {
    const text = fields.text ?? "";
    const pattern = fields.pattern ?? "";
    if (text.length > 16 || pattern.length > 16) throw new Error("Text and pattern must use at most 16 characters.");
    if (/^\*|\*\*/.test(pattern)) throw new Error("'*' must follow a token and cannot repeat.");
    return { text, pattern };
  },
  serializeInput: (input) => ({ ...input }),
  generate: regexSteps,
  complexity: complexity.quadratic,
  applications: ["Pattern engines", "Input validation", "Text filters"],
  applicationsAr: ["محركات الأنماط", "التحقق من الإدخال", "مرشحات النصوص"],
});

// ---------------------------------------------------------------------------
// Maximum product subarray
// ---------------------------------------------------------------------------

type ValuesInput = { values: number[] };

function maximumProductSteps(input: ValuesInput): Step<ArrayFrame>[] {
  const values = input.values;
  let currentMax = values[0];
  let currentMin = values[0];
  let best = values[0];
  const steps: Step<ArrayFrame>[] = [];
  const frame = (index: number, note: string): ArrayFrame => ({
    values: [...values],
    states: { [index]: "active" },
    range: { from: 0, to: index },
    aux: [
      { label: "current max", values: values.map((_, i) => i === index ? currentMax : "·") },
      { label: "current min", values: values.map((_, i) => i === index ? currentMin : "·") },
      { label: "global best", values: values.map((_, i) => i === index ? best : "·") },
    ],
    note,
  });
  pushBounded(steps, traceStep(frame(0, `best=${best}`), `Initialize all three products to ${values[0]}.`, `هيّئ القيم الثلاث إلى ${values[0]}.`, "base-write", 0));
  for (let i = 1; i < values.length; i++) {
    const value = values[i];
    const candidates = [value, value * currentMax, value * currentMin];
    pushBounded(steps, traceStep(frame(i, `candidates=${candidates.join(",")}`),
      `At ${value}, consider starting fresh, extending the maximum, and extending the minimum.`,
      `عند ${value} جرّب البدء من جديد وتمديد الأكبر وتمديد الأصغر.`,
      "candidate", 2, { processed: i }));
    currentMax = Math.max(...candidates);
    currentMin = Math.min(...candidates);
    best = Math.max(best, currentMax);
    pushBounded(steps, traceStep(frame(i, `max=${currentMax}; min=${currentMin}; best=${best}`),
      `Commit current max ${currentMax}, current min ${currentMin}, global best ${best}.`,
      `ثبّت الأكبر الحالي ${currentMax} والأصغر الحالي ${currentMin} والأفضل ${best}.`,
      "state-write", 3, { processed: i + 1 }));
  }
  pushBounded(steps, traceStep(frame(values.length - 1, `result=${best}`),
    `Maximum contiguous product is ${best}.`, `أكبر حاصل ضرب متصل هو ${best}.`, "result", 4, { processed: values.length }));
  return steps;
}

export const maximumProductSubarray = makeHModule<ArrayFrame, ValuesInput>({
  slug: "maximum-product-subarray",
  title: "Maximum Product Subarray",
  titleAr: "أكبر حاصل ضرب لمصفوفة فرعية",
  category: "dynamic-programming",
  difficulty: "Intermediate",
  tags: ["dynamic programming", "arrays", "negative values"],
  tagsAr: ["برمجة ديناميكية", "مصفوفات", "قيم سالبة"],
  summary: "Tracks both maximum and minimum ending products to handle sign changes.",
  summaryAr: "تتبع أكبر وأصغر حاصل ضرب منتهٍ للتعامل مع تغير الإشارة.",
  renderer: "array",
  pseudocode: ["maxEnding = minEnding = answer = a[0]", "for each next value x", "  candidates = x, x·maxEnding, x·minEnding", "  update maxEnding and minEnding", "  answer = max(answer, maxEnding)", "return answer"],
  inputFields: [listField("values", "Values", "القيم", "2,3,-2,4")],
  defaultInput: (level, rng) => ({ values: Array.from({ length: 3 + level }, () => rng.int(-5, 6)) }),
  parseInput: (fields) => {
    const values = integerList(fields.values, "Values", 1, 16, -1_000, 1_000);
    for (let left = 0; left < values.length; left++) {
      let product = 1;
      for (let right = left; right < values.length; right++) {
        product *= values[right];
        if (!Number.isSafeInteger(product)) throw new Error("Contiguous products must stay within JavaScript's safe-integer range.");
      }
    }
    return { values };
  },
  serializeInput: ({ values }) => ({ values: values.join(",") }),
  generate: maximumProductSteps,
  complexity: complexity.linear,
  applications: ["Financial sequence analysis", "Signal processing", "Array optimization"],
  applicationsAr: ["تحليل المتتاليات المالية", "معالجة الإشارات", "تحسين المصفوفات"],
});
