import { circularLayout } from "@/lib/engine/random";
import {
  MAX_STEPS,
  type AlgorithmContent,
  type AlgorithmModule,
  type ArrayFrame,
  type CallStackFrame,
  type CellState,
  type GraphFrame,
  type GridFrame,
  type Language,
  type Level,
  type RNG,
  type Step,
  type TableFrame,
} from "@/lib/engine/types";

type VisualFrame = ArrayFrame | CallStackFrame | GraphFrame | GridFrame | TableFrame;
type ExpansionCategory = "dynamic-programming" | "greedy" | "backtracking";

type ModuleConfig<F extends VisualFrame, I> = {
  slug: string;
  title: string;
  titleAr: string;
  category: ExpansionCategory;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  tags: string[];
  tagsAr: string[];
  summary: string;
  summaryAr: string;
  renderer: "array" | "callstack" | "graph" | "grid" | "table";
  pseudocode: string[];
  recurrence: string;
  complexity: AlgorithmContent["complexity"];
  how: string[];
  howAr: string[];
  inputFields: AlgorithmModule<F, I>["inputFields"];
  defaultInput: (level: Level, rng: RNG) => I;
  parseInput: (fields: Record<string, string>) => I;
  serializeInput: (input: I) => Record<string, string>;
  generate: (input: I) => Step<F>[];
};

const AR_COMMON = {
  applications: ["التعلّم التفاعلي، وتحليل الخوارزميات، وحل مسائل التحسين والقيود."],
  advantages: ["يعرض كل قرار وتغيير في الحالة، لذلك يمكن مراجعة التنفيذ خطوة بخطوة."],
  disadvantages: ["قد يزداد عدد الخطوات بسرعة عندما يكبر الإدخال."],
  mistakes: ["خلط الحالة الحالية بالحالة السابقة، أو تطبيق العلاقة الانتقالية بترتيب غير صحيح."],
  interviews: ["اشرح الحالة، وعلاقة الانتقال، وحالات الأساس، ولماذا تكون النتيجة صحيحة."],
};

function contentFor(config: {
  title: string;
  titleAr: string;
  summary: string;
  summaryAr: string;
  how: string[];
  howAr: string[];
  complexity: AlgorithmContent["complexity"];
}): { content: AlgorithmContent; contentAr: AlgorithmContent } {
  const content: AlgorithmContent = {
    overview: `${config.title} solves the stated problem using the exact decisions shown in the visualization. ${config.summary}`,
    howItWorks: config.how,
    complexity: config.complexity,
    applications: ["Algorithm education, optimization, planning, and technical interview preparation."],
    advantages: ["Every state change is retained as an immutable frame, so forward and backward review is exact."],
    disadvantages: ["Detailed traces can grow quickly for large inputs, especially for exponential search."],
    commonMistakes: ["Using the wrong base case, transition, candidate order, or forgetting to undo a backtracking choice."],
    interviewQuestions: [`State the invariant or recurrence used by ${config.title} and justify its final answer.`],
    summary: config.summary,
    quiz: [{
      question: `What makes a ${config.title} step valid?`,
      options: ["It follows the stated recurrence or feasibility rule", "It changes hidden state without a frame", "It guesses the final answer"],
      answer: 0,
      explanation: "Every transition must follow the algorithm's recurrence, greedy feasibility rule, or backtracking invariant.",
    }],
  };
  const contentAr: AlgorithmContent = {
    overview: `${config.titleAr} يحل المسألة باستخدام القرارات الدقيقة الظاهرة في التصور. ${config.summaryAr}`,
    howItWorks: config.howAr,
    complexity: config.complexity,
    applications: AR_COMMON.applications,
    advantages: AR_COMMON.advantages,
    disadvantages: AR_COMMON.disadvantages,
    commonMistakes: AR_COMMON.mistakes,
    interviewQuestions: AR_COMMON.interviews,
    summary: config.summaryAr,
    quiz: [{
      question: `ما الذي يجعل خطوة ${config.titleAr} صحيحة؟`,
      options: ["اتباع العلاقة الانتقالية أو قاعدة الصلاحية", "تغيير حالة مخفية دون إطار", "تخمين النتيجة"],
      answer: 0,
      explanation: "يجب أن تتبع كل خطوة العلاقة الانتقالية أو قاعدة الاختيار الجشع أو ثابت التراجع.",
    }],
  };
  return { content, contentAr };
}

function codeBundle(title: string, recurrence: string): Record<Language, string> {
  const safe = title.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "").toLowerCase();
  const body = `state <- base cases\nfor each subproblem or candidate:\n  state <- ${recurrence}\nreturn state`;
  return {
    pseudocode: `procedure ${title}(input)\n  ${body}`,
    c: `/* ${recurrence} */\nint ${safe}(const int *input, int n) {\n  int state = 0;\n  for (int i = 0; i < n; ++i) state = transition(state, input[i]);\n  return state;\n}`,
    cpp: `// ${recurrence}\nint ${safe}(const vector<int>& input) {\n  int state = 0;\n  for (int value : input) state = transition(state, value);\n  return state;\n}`,
    java: `// ${recurrence}\nstatic int ${safe}(int[] input) {\n  int state = 0;\n  for (int value : input) state = transition(state, value);\n  return state;\n}`,
    python: `# ${recurrence}\ndef ${safe}(input_values):\n    state = 0\n    for value in input_values:\n        state = transition(state, value)\n    return state`,
    javascript: `// ${recurrence}\nfunction ${safe}(input) {\n  let state = 0;\n  for (const value of input) state = transition(state, value);\n  return state;\n}`,
    typescript: `// ${recurrence}\nfunction ${safe}(input: number[]): number {\n  let state = 0;\n  for (const value of input) state = transition(state, value);\n  return state;\n}`,
    csharp: `// ${recurrence}\nstatic int ${safe}(int[] input) {\n  int state = 0;\n  foreach (int value in input) state = Transition(state, value);\n  return state;\n}`,
    go: `// ${recurrence}\nfunc ${safe}(input []int) int {\n\tstate := 0\n\tfor _, value := range input { state = transition(state, value) }\n\treturn state\n}`,
    rust: `// ${recurrence}\nfn ${safe}(input: &[i32]) -> i32 {\n    input.iter().fold(0, |state, &value| transition(state, value))\n}`,
    kotlin: `// ${recurrence}\nfun ${safe}(input: IntArray): Int {\n  var state = 0\n  for (value in input) state = transition(state, value)\n  return state\n}`,
    swift: `// ${recurrence}\nfunc ${safe}(_ input: [Int]) -> Int {\n  var state = 0\n  for value in input { state = transition(state, value) }\n  return state\n}`,
  };
}

function makeModule<F extends VisualFrame, I>(config: ModuleConfig<F, I>): AlgorithmModule<F, I> {
  const educational = contentFor(config);
  return {
    slug: config.slug,
    title: config.title,
    titleAr: config.titleAr,
    category: config.category,
    difficulty: config.difficulty,
    tags: config.tags,
    tagsAr: config.tagsAr,
    summary: config.summary,
    summaryAr: config.summaryAr,
    renderer: config.renderer,
    pseudocode: config.pseudocode,
    code: codeBundle(config.title, config.recurrence),
    content: educational.content,
    contentAr: educational.contentAr,
    inputFields: config.inputFields,
    defaultInput: config.defaultInput,
    parseInput: config.parseInput,
    serializeInput: config.serializeInput,
    generate: config.generate,
  };
}

function numbers(raw: string, label: string, minCount = 1, maxCount = 12): number[] {
  const values = raw.split(",").map((part) => Number(part.trim()));
  if (values.length < minCount || values.length > maxCount || values.some((value) => !Number.isFinite(value) || !Number.isInteger(value))) {
    throw new Error(`${label} must contain ${minCount}-${maxCount} comma-separated integers.`);
  }
  return values;
}

function positiveNumbers(raw: string, label: string, minCount = 1, maxCount = 12): number[] {
  const values = numbers(raw, label, minCount, maxCount);
  if (values.some((value) => value <= 0)) throw new Error(`${label} values must be positive.`);
  return values;
}

function boundedInteger(raw: string, label: string, min: number, max: number): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${label} must be an integer from ${min} to ${max}.`);
  return value;
}

function cloneMatrix<T>(matrix: T[][]): T[][] {
  return matrix.map((row) => [...row]);
}

function tableFrame(
  matrix: (string | number | null)[][],
  rowLabels: string[],
  colLabels: string[],
  active: [number, number] | null,
  note: string,
  aux?: TableFrame["aux"],
  refs: [number, number][] = [],
): TableFrame {
  return {
    rowLabels,
    colLabels,
    cells: matrix.map((row, r) => row.map((value, c) => ({
      value,
      state: active?.[0] === r && active[1] === c
        ? "active"
        : refs.some(([rr, cc]) => rr === r && cc === c) ? "compare" : undefined,
    }))),
    aux,
    note,
  };
}

function step<F>(frame: F, description: string, descriptionAr: string, codeLine: number, counters: Record<string, number>, phase: string): Step<F> {
  return {
    frame,
    description,
    descriptionAr,
    codeLine,
    counters,
    phase,
    why: `This ${phase} transition follows the algorithm's visible state and preserves its invariant.`,
    whyAr: `تتبع خطوة ${phase} الحالة الظاهرة وتحافظ على ثابت الخوارزمية.`,
  };
}

function shuffledPositive(level: Level, rng: RNG, count = Math.min(3 + level, 7)): number[] {
  return Array.from({ length: count }, () => rng.int(1, 12));
}

// ---------------------------------------------------------------------------
// Dynamic programming
// ---------------------------------------------------------------------------

type MatrixChainInput = { dimensions: number[] };

function matrixChainSteps(input: MatrixChainInput): Step<TableFrame>[] {
  const d = input.dimensions;
  const n = d.length - 1;
  const dp: (number | null)[][] = Array.from({ length: n }, () => Array<number | null>(n).fill(null));
  const split: (number | null)[][] = Array.from({ length: n }, () => Array<number | null>(n).fill(null));
  const steps: Step<TableFrame>[] = [];
  let writes = 0;
  let candidates = 0;
  const labels = Array.from({ length: n }, (_, i) => `A${i + 1}`);
  for (let i = 0; i < n; i++) {
    dp[i][i] = 0;
    writes++;
    steps.push(step(tableFrame(cloneMatrix(dp), labels, labels, [i, i], `dimensions: ${d.join("×")}`),
      `Write base case m[${i + 1},${i + 1}] = 0: one matrix needs no multiplication.`,
      `اكتب حالة الأساس m[${i + 1},${i + 1}] = 0: المصفوفة الواحدة لا تحتاج إلى ضرب.`,
      1, { writes, candidates }, "base-write"));
  }
  for (let length = 2; length <= n; length++) {
    for (let i = 0; i + length <= n; i++) {
      const j = i + length - 1;
      let best = Number.POSITIVE_INFINITY;
      for (let k = i; k < j; k++) {
        candidates++;
        const candidate = (dp[i][k] as number) + (dp[k + 1][j] as number) + d[i] * d[k + 1] * d[j + 1];
        steps.push(step(tableFrame(cloneMatrix(dp), labels, labels, [i, j], `candidate via k=${k + 1}: ${candidate}`, undefined, [[i, k], [k + 1, j]]),
          `Try split k=${k + 1}: ${dp[i][k]} + ${dp[k + 1][j]} + ${d[i]}×${d[k + 1]}×${d[j + 1]} = ${candidate}.`,
          `جرّب التقسيم k=${k + 1}: ${dp[i][k]} + ${dp[k + 1][j]} + ${d[i]}×${d[k + 1]}×${d[j + 1]} = ${candidate}.`,
          4, { writes, candidates }, "candidate"));
        if (candidate < best) {
          best = candidate;
          dp[i][j] = candidate;
          split[i][j] = k;
          writes++;
          steps.push(step(tableFrame(cloneMatrix(dp), labels, labels, [i, j], `best split: k=${k + 1}`, [{
            label: "split k",
            values: split[i].map((value) => value === null ? "·" : value + 1),
          }]),
          `Write m[${i + 1},${j + 1}] = ${candidate}; it is the best cost seen for this chain.`,
          `اكتب m[${i + 1},${j + 1}] = ${candidate}؛ إنها أفضل كلفة شوهدت لهذه السلسلة.`,
          5, { writes, candidates }, "table-write"));
        }
      }
    }
  }
  steps.push(step(tableFrame(cloneMatrix(dp), labels, labels, [0, n - 1], `minimum scalar multiplications = ${dp[0][n - 1]}`),
    `Finished: the minimum multiplication cost is ${dp[0][n - 1]}.`,
    `انتهى: أقل كلفة للضرب هي ${dp[0][n - 1]}.`,
    6, { writes, candidates }, "result"));
  return steps;
}

export const matrixChainMultiplication = makeModule<TableFrame, MatrixChainInput>({
  slug: "matrix-chain-multiplication",
  title: "Matrix Chain Multiplication",
  titleAr: "ضرب سلسلة المصفوفات",
  category: "dynamic-programming",
  difficulty: "Advanced",
  tags: ["dynamic programming", "interval DP", "parenthesization"],
  tagsAr: ["البرمجة الديناميكية", "برمجة الفترات", "ترتيب الأقواس"],
  summary: "Finds the parenthesization requiring the fewest scalar multiplications.",
  summaryAr: "يجد ترتيب الأقواس الذي يحتاج إلى أقل عدد من عمليات الضرب القياسية.",
  renderer: "table",
  pseudocode: ["procedure matrixChain(d)", "m[i,i] = 0", "for length = 2..n", "  for every interval (i,j)", "    q = m[i,k] + m[k+1,j] + d[i]d[k+1]d[j+1]", "    m[i,j] = min(m[i,j], q)", "return m[1,n]"],
  recurrence: "m[i,j] = min over k of m[i,k] + m[k+1,j] + d[i]d[k+1]d[j+1]",
  complexity: { time: { best: "O(n³)", average: "O(n³)", worst: "O(n³)" }, space: "O(n²)" },
  how: ["Initialize one-matrix intervals to zero.", "Grow interval length.", "Try every legal split and retain the least cost."],
  howAr: ["هيّئ فترات المصفوفة الواحدة بالصفر.", "زد طول الفترة.", "جرّب كل تقسيم صالح واحتفظ بأقل كلفة."],
  inputFields: [{ key: "dimensions", label: "Dimensions", labelAr: "الأبعاد", placeholder: "10,30,5,60", list: true }],
  defaultInput: (level, rng) => ({ dimensions: Array.from({ length: Math.min(3 + level, 7) }, () => rng.int(2, 20)) }),
  parseInput: (fields) => ({ dimensions: positiveNumbers(fields.dimensions ?? "", "Dimensions", 3, 8) }),
  serializeInput: (input) => ({ dimensions: input.dimensions.join(",") }),
  generate: matrixChainSteps,
});

type RodInput = { prices: number[]; length: number };

function rodCuttingSteps(input: RodInput): Step<TableFrame>[] {
  const dp: (number | null)[] = Array(input.length + 1).fill(null);
  const cut: (number | null)[] = Array(input.length + 1).fill(null);
  const steps: Step<TableFrame>[] = [];
  let writes = 0;
  let candidates = 0;
  dp[0] = 0;
  writes++;
  const frame = (active: number, note: string): TableFrame => tableFrame(
    [dp.map((value) => value), cut.map((value) => value)],
    ["best revenue", "first cut"],
    Array.from({ length: input.length + 1 }, (_, i) => String(i)),
    [0, active],
    note,
    [{ label: "prices", values: [0, ...input.prices].slice(0, input.length + 1) }],
  );
  steps.push(step(frame(0, "base revenue"), "Write revenue[0] = 0.", "اكتب revenue[0] = 0.", 1, { writes, candidates }, "base-write"));
  for (let length = 1; length <= input.length; length++) {
    let best = Number.NEGATIVE_INFINITY;
    for (let first = 1; first <= Math.min(length, input.prices.length); first++) {
      candidates++;
      const candidate = input.prices[first - 1] + (dp[length - first] as number);
      steps.push(step(frame(length, `try cut ${first}: ${candidate}`),
        `Try first cut ${first}: price ${input.prices[first - 1]} + revenue[${length - first}] ${(dp[length - first] as number)} = ${candidate}.`,
        `جرّب القطع الأول ${first}: السعر ${input.prices[first - 1]} + revenue[${length - first}] ${(dp[length - first] as number)} = ${candidate}.`,
        3, { writes, candidates }, "candidate"));
      if (candidate > best) {
        best = candidate;
        dp[length] = candidate;
        cut[length] = first;
        writes++;
        steps.push(step(frame(length, `best first cut ${first}`),
          `Write revenue[${length}] = ${candidate} with first cut ${first}.`,
          `اكتب revenue[${length}] = ${candidate} مع القطع الأول ${first}.`,
          4, { writes, candidates }, "table-write"));
      }
    }
  }
  steps.push(step(frame(input.length, `maximum revenue = ${dp[input.length]}`),
    `Finished: maximum revenue for length ${input.length} is ${dp[input.length]}.`,
    `انتهى: أكبر إيراد للطول ${input.length} هو ${dp[input.length]}.`,
    5, { writes, candidates }, "result"));
  return steps;
}

export const rodCutting = makeModule<TableFrame, RodInput>({
  slug: "rod-cutting",
  title: "Rod Cutting",
  titleAr: "تقطيع القضيب",
  category: "dynamic-programming",
  difficulty: "Intermediate",
  tags: ["dynamic programming", "unbounded choices", "optimization"],
  tagsAr: ["البرمجة الديناميكية", "اختيارات غير محدودة", "التحسين"],
  summary: "Maximizes sale revenue by choosing the best sequence of rod cuts.",
  summaryAr: "يعظّم إيراد البيع باختيار أفضل تسلسل لتقطيع القضيب.",
  renderer: "table",
  pseudocode: ["procedure cutRod(price, n)", "revenue[0] = 0", "for length = 1..n", "  try every first cut", "  revenue[length] = max(price[cut] + revenue[length-cut])", "return revenue[n]"],
  recurrence: "R[n] = max from i=1..n of price[i] + R[n-i]",
  complexity: { time: { best: "O(n²)", average: "O(n²)", worst: "O(n²)" }, space: "O(n)" },
  how: ["Solve shorter rod lengths first.", "Try every possible first cut.", "Store the best revenue and reconstructing cut."],
  howAr: ["حل الأطوال الأقصر أولاً.", "جرّب كل قطع أول ممكن.", "خزّن أفضل إيراد والقطع الذي يحققه."],
  inputFields: [
    { key: "prices", label: "Prices by length", labelAr: "الأسعار حسب الطول", placeholder: "1,5,8,9,10,17,17,20", list: true },
    { key: "length", label: "Rod length", labelAr: "طول القضيب", placeholder: "8" },
  ],
  defaultInput: (level, rng) => {
    const length = Math.min(3 + level, 8);
    return { prices: Array.from({ length }, (_, i) => (i + 1) * rng.int(1, 4)), length };
  },
  parseInput: (fields) => {
    const prices = positiveNumbers(fields.prices ?? "", "Prices", 1, 10);
    const length = boundedInteger(fields.length ?? "", "Length", 1, prices.length);
    return { prices, length };
  },
  serializeInput: (input) => ({ prices: input.prices.join(","), length: String(input.length) }),
  generate: rodCuttingSteps,
});

type SubsetDpInput = { values: number[]; target: number };

function subsetSumDpSteps(input: SubsetDpInput): Step<TableFrame>[] {
  const n = input.values.length;
  const dp: (number | null)[][] = Array.from({ length: n + 1 }, () => Array<number | null>(input.target + 1).fill(null));
  const steps: Step<TableFrame>[] = [];
  const rowLabels = ["∅", ...input.values.map((v, i) => `${i + 1}:${v}`)];
  const colLabels = Array.from({ length: input.target + 1 }, (_, i) => String(i));
  let writes = 0;
  for (let sum = 0; sum <= input.target; sum++) {
    dp[0][sum] = sum === 0 ? 1 : 0;
    writes++;
    steps.push(step(tableFrame(cloneMatrix(dp), rowLabels, colLabels, [0, sum], "1 = reachable, 0 = unreachable"),
      `Write dp[0,${sum}] = ${dp[0][sum]} for the empty set.`,
      `اكتب dp[0,${sum}] = ${dp[0][sum]} للمجموعة الفارغة.`,
      1, { writes }, "base-write"));
  }
  for (let i = 1; i <= n; i++) {
    for (let sum = 0; sum <= input.target; sum++) {
      const without = dp[i - 1][sum] === 1;
      const withValue = sum >= input.values[i - 1] && dp[i - 1][sum - input.values[i - 1]] === 1;
      dp[i][sum] = without || withValue ? 1 : 0;
      writes++;
      const refs: [number, number][] = [[i - 1, sum]];
      if (sum >= input.values[i - 1]) refs.push([i - 1, sum - input.values[i - 1]]);
      steps.push(step(tableFrame(cloneMatrix(dp), rowLabels, colLabels, [i, sum], `value ${input.values[i - 1]}`, undefined, refs),
        `Write dp[${i},${sum}] = ${dp[i][sum]}: exclude ${input.values[i - 1]}${sum >= input.values[i - 1] ? ` or include it after sum ${sum - input.values[i - 1]}` : ""}.`,
        `اكتب dp[${i},${sum}] = ${dp[i][sum]}: استبعد ${input.values[i - 1]}${sum >= input.values[i - 1] ? ` أو ضمّه بعد المجموع ${sum - input.values[i - 1]}` : ""}.`,
        3, { writes }, "table-write"));
    }
  }
  steps.push(step(tableFrame(cloneMatrix(dp), rowLabels, colLabels, [n, input.target], `target reachable = ${dp[n][input.target] === 1}`),
    `Finished: target ${input.target} is ${dp[n][input.target] === 1 ? "reachable" : "unreachable"}.`,
    `انتهى: الهدف ${input.target} ${dp[n][input.target] === 1 ? "قابل للتحقيق" : "غير قابل للتحقيق"}.`,
    4, { writes }, "result"));
  return steps;
}

export const subsetSumDp = makeModule<TableFrame, SubsetDpInput>({
  slug: "subset-sum-dp",
  title: "Subset Sum DP",
  titleAr: "مجموع المجموعة الجزئية بالبرمجة الديناميكية",
  category: "dynamic-programming",
  difficulty: "Intermediate",
  tags: ["dynamic programming", "subset", "decision problem"],
  tagsAr: ["البرمجة الديناميكية", "مجموعة جزئية", "مسألة قرار"],
  summary: "Determines whether some subset reaches an exact nonnegative target.",
  summaryAr: "يحدد ما إذا كانت مجموعة جزئية تحقق هدفاً غير سالب بدقة.",
  renderer: "table",
  pseudocode: ["procedure subsetSum(values, target)", "dp[0,0] = true and dp[0,s>0] = false", "for each value i and sum s", "  dp[i,s] = dp[i-1,s] or dp[i-1,s-value[i]]", "return dp[n,target]"],
  recurrence: "dp[i,s] = dp[i-1,s] OR (s>=a[i] AND dp[i-1,s-a[i]])",
  complexity: { time: { best: "O(nT)", average: "O(nT)", worst: "O(nT)" }, space: "O(nT)" },
  how: ["Rows represent available values.", "Columns represent target sums.", "Each cell records exclusion or inclusion of the current value."],
  howAr: ["تمثل الصفوف القيم المتاحة.", "تمثل الأعمدة المجاميع المستهدفة.", "تسجل كل خلية استبعاد القيمة الحالية أو ضمها."],
  inputFields: [
    { key: "values", label: "Values", labelAr: "القيم", placeholder: "3,34,4,12,5,2", list: true },
    { key: "target", label: "Target", labelAr: "الهدف", placeholder: "9", search: true },
  ],
  defaultInput: (level, rng) => ({ values: shuffledPositive(level, rng, Math.min(3 + level, 7)), target: rng.int(4, Math.min(8 + level * 3, 20)) }),
  parseInput: (fields) => ({
    values: positiveNumbers(fields.values ?? "", "Values", 1, 9),
    target: boundedInteger(fields.target ?? "", "Target", 0, 40),
  }),
  serializeInput: (input) => ({ values: input.values.join(","), target: String(input.target) }),
  generate: subsetSumDpSteps,
});

type WordBreakInput = { text: string; dictionary: string[] };

function wordBreakSteps(input: WordBreakInput): Step<TableFrame>[] {
  const chars = [...input.text];
  const dp: (number | null)[] = Array(chars.length + 1).fill(null);
  const prev: (number | null)[] = Array(chars.length + 1).fill(null);
  const steps: Step<TableFrame>[] = [];
  let writes = 0;
  let checks = 0;
  const frame = (active: number, note: string): TableFrame => tableFrame(
    [dp, prev],
    ["breakable", "previous"],
    ["∅", ...chars],
    [0, active],
    note,
    [{ label: "dictionary", values: input.dictionary }],
  );
  dp[0] = 1;
  writes++;
  steps.push(step(frame(0, "empty prefix"), "Write dp[0] = 1 for the empty prefix.", "اكتب dp[0] = 1 للبادئة الفارغة.", 1, { writes, checks }, "base-write"));
  for (let end = 1; end <= chars.length; end++) {
    let source: number | null = null;
    for (let start = 0; start < end; start++) {
      checks++;
      const word = chars.slice(start, end).join("");
      steps.push(step(frame(end, `check "${word}"`),
        `Check split ${start}|${end}: dp[${start}] = ${dp[start] ?? 0}, word "${word}" is ${input.dictionary.includes(word) ? "present" : "absent"}.`,
        `افحص التقسيم ${start}|${end}: dp[${start}] = ${dp[start] ?? 0}، والكلمة "${word}" ${input.dictionary.includes(word) ? "موجودة" : "غير موجودة"}.`,
        3, { writes, checks }, "candidate"));
      if (dp[start] === 1 && input.dictionary.includes(word)) {
        source = start;
        break;
      }
    }
    dp[end] = source === null ? 0 : 1;
    prev[end] = source;
    writes++;
    steps.push(step(frame(end, source === null ? "no valid split" : `valid split from ${source}`),
      `Write dp[${end}] = ${dp[end]}${source === null ? "" : ` using prefix ${source}`}.`,
      `اكتب dp[${end}] = ${dp[end]}${source === null ? "" : ` باستخدام البادئة ${source}`}.`,
      4, { writes, checks }, "table-write"));
  }
  steps.push(step(frame(chars.length, `segmentable = ${dp[chars.length] === 1}`),
    `Finished: "${input.text}" is ${dp[chars.length] === 1 ? "segmentable" : "not segmentable"}.`,
    `انتهى: النص "${input.text}" ${dp[chars.length] === 1 ? "قابل للتقسيم" : "غير قابل للتقسيم"}.`,
    5, { writes, checks }, "result"));
  return steps;
}

export const wordBreak = makeModule<TableFrame, WordBreakInput>({
  slug: "word-break",
  title: "Word Break",
  titleAr: "تقسيم الكلمات",
  category: "dynamic-programming",
  difficulty: "Intermediate",
  tags: ["dynamic programming", "strings", "dictionary"],
  tagsAr: ["البرمجة الديناميكية", "السلاسل النصية", "القاموس"],
  summary: "Checks whether a string can be segmented entirely into dictionary words.",
  summaryAr: "يفحص إمكانية تقسيم النص بالكامل إلى كلمات موجودة في القاموس.",
  renderer: "table",
  pseudocode: ["procedure wordBreak(text, dictionary)", "dp[0] = true", "for end = 1..n", "  try every earlier start", "  dp[end] = dp[start] and text[start:end] in dictionary", "return dp[n]"],
  recurrence: "dp[end] = OR over start of dp[start] AND dictionary(text[start:end])",
  complexity: { time: { best: "O(n²)", average: "O(n²)", worst: "O(n²)" }, space: "O(n)" },
  how: ["Mark the empty prefix segmentable.", "Try every final word ending at each position.", "Store the first valid preceding boundary."],
  howAr: ["علّم البادئة الفارغة بأنها قابلة للتقسيم.", "جرّب كل كلمة أخيرة تنتهي عند كل موضع.", "خزّن أول حد سابق صالح."],
  inputFields: [
    { key: "text", label: "Text", labelAr: "النص", placeholder: "leetcode" },
    { key: "dictionary", label: "Dictionary", labelAr: "القاموس", placeholder: "leet,code", list: true },
  ],
  defaultInput: (level) => level <= 2
    ? { text: "applepenapple", dictionary: ["apple", "pen"] }
    : { text: "catsanddog", dictionary: ["cats", "cat", "and", "sand", "dog"] },
  parseInput: (fields) => {
    const text = (fields.text ?? "").trim();
    const dictionary = (fields.dictionary ?? "").split(",").map((word) => word.trim()).filter(Boolean);
    if (!text || text.length > 30) throw new Error("Text must contain 1-30 characters.");
    if (dictionary.length === 0 || dictionary.length > 15) throw new Error("Dictionary must contain 1-15 comma-separated words.");
    return { text, dictionary };
  },
  serializeInput: (input) => ({ text: input.text, dictionary: input.dictionary.join(",") }),
  generate: wordBreakSteps,
});

type EggInput = { eggs: number; floors: number };

function eggDroppingSteps(input: EggInput): Step<TableFrame>[] {
  const dp: (number | null)[][] = Array.from({ length: input.eggs + 1 }, () => Array<number | null>(input.floors + 1).fill(null));
  const steps: Step<TableFrame>[] = [];
  const rows = Array.from({ length: input.eggs + 1 }, (_, i) => `${i} egg${i === 1 ? "" : "s"}`);
  const cols = Array.from({ length: input.floors + 1 }, (_, i) => String(i));
  let writes = 0;
  let trials = 0;
  for (let e = 1; e <= input.eggs; e++) {
    dp[e][0] = 0;
    writes++;
    steps.push(step(tableFrame(cloneMatrix(dp), rows, cols, [e, 0], "zero floors"),
      `Write dp[${e},0] = 0.`, `اكتب dp[${e},0] = 0.`, 1, { writes, trials }, "base-write"));
  }
  for (let f = 1; f <= input.floors; f++) {
    dp[1][f] = f;
    writes++;
    steps.push(step(tableFrame(cloneMatrix(dp), rows, cols, [1, f], "one egg"),
      `Write dp[1,${f}] = ${f}: with one egg, test bottom-up.`,
      `اكتب dp[1,${f}] = ${f}: مع بيضة واحدة نختبر من الأسفل للأعلى.`,
      1, { writes, trials }, "base-write"));
  }
  for (let e = 2; e <= input.eggs; e++) {
    for (let f = 1; f <= input.floors; f++) {
      let best = Number.POSITIVE_INFINITY;
      for (let x = 1; x <= f; x++) {
        trials++;
        const breaks = dp[e - 1][x - 1] as number;
        const survives = dp[e][f - x] as number;
        const candidate = 1 + Math.max(breaks, survives);
        steps.push(step(tableFrame(cloneMatrix(dp), rows, cols, [e, f], `drop at floor ${x}: ${candidate}`, undefined, [[e - 1, x - 1], [e, f - x]]),
          `Try floor ${x}: 1 + max(breaks ${breaks}, survives ${survives}) = ${candidate}.`,
          `جرّب الطابق ${x}: 1 + max(تنكسر ${breaks}، تنجو ${survives}) = ${candidate}.`,
          3, { writes, trials }, "candidate"));
        if (candidate < best) {
          best = candidate;
          dp[e][f] = candidate;
          writes++;
          steps.push(step(tableFrame(cloneMatrix(dp), rows, cols, [e, f], `best trials = ${candidate}`),
            `Write dp[${e},${f}] = ${candidate}.`,
            `اكتب dp[${e},${f}] = ${candidate}.`,
            4, { writes, trials }, "table-write"));
        }
      }
    }
  }
  steps.push(step(tableFrame(cloneMatrix(dp), rows, cols, [input.eggs, input.floors], `minimum worst-case drops = ${dp[input.eggs][input.floors]}`),
    `Finished: ${dp[input.eggs][input.floors]} drops suffice in the worst case.`,
    `انتهى: تكفي ${dp[input.eggs][input.floors]} إسقاطات في أسوأ حالة.`,
    5, { writes, trials }, "result"));
  return steps;
}

export const eggDropping = makeModule<TableFrame, EggInput>({
  slug: "egg-dropping",
  title: "Egg Dropping",
  titleAr: "مسألة إسقاط البيض",
  category: "dynamic-programming",
  difficulty: "Advanced",
  tags: ["dynamic programming", "minimax", "decision"],
  tagsAr: ["البرمجة الديناميكية", "تصغير الأسوأ", "القرار"],
  summary: "Minimizes worst-case drops needed to locate a critical floor.",
  summaryAr: "يقلل عدد الإسقاطات في أسوأ حالة لتحديد الطابق الحرج.",
  renderer: "table",
  pseudocode: ["procedure eggDrop(eggs, floors)", "dp[e,0]=0 and dp[1,f]=f", "for e = 2..eggs and f = 1..floors", "  try dropping at every x", "  dp[e,f] = min(1 + max(dp[e-1,x-1], dp[e,f-x]))", "return dp[eggs,floors]"],
  recurrence: "dp[e,f] = 1 + min over x of max(dp[e-1,x-1], dp[e,f-x])",
  complexity: { time: { best: "O(EF²)", average: "O(EF²)", worst: "O(EF²)" }, space: "O(EF)" },
  how: ["Handle zero floors and one egg.", "Try each possible drop floor.", "Protect against the worse of breaking and surviving."],
  howAr: ["عالج صفر طوابق وبيضة واحدة.", "جرّب كل طابق إسقاط ممكن.", "استعد لأسوأ فرع بين الانكسار والنجاة."],
  inputFields: [
    { key: "eggs", label: "Eggs", labelAr: "البيض", placeholder: "2" },
    { key: "floors", label: "Floors", labelAr: "الطوابق", placeholder: "10" },
  ],
  defaultInput: (level) => ({ eggs: Math.min(2 + Math.floor(level / 3), 4), floors: 3 + level }),
  parseInput: (fields) => ({
    eggs: boundedInteger(fields.eggs ?? "", "Eggs", 1, 5),
    floors: boundedInteger(fields.floors ?? "", "Floors", 0, 15),
  }),
  serializeInput: (input) => ({ eggs: String(input.eggs), floors: String(input.floors) }),
  generate: eggDroppingSteps,
});

type TextInput = { text: string };

function parseShortText(fields: Record<string, string>): TextInput {
  const text = (fields.text ?? "").trim();
  if (!text || [...text].length > 14) throw new Error("Text must contain 1-14 characters.");
  return { text };
}

function lpsSteps(input: TextInput): Step<TableFrame>[] {
  const chars = [...input.text];
  const n = chars.length;
  const dp: (number | null)[][] = Array.from({ length: n }, () => Array<number | null>(n).fill(null));
  const labels = chars.map((ch, i) => `${i}:${ch}`);
  const steps: Step<TableFrame>[] = [];
  let writes = 0;
  for (let i = 0; i < n; i++) {
    dp[i][i] = 1;
    writes++;
    steps.push(step(tableFrame(cloneMatrix(dp), labels, labels, [i, i], input.text),
      `Write dp[${i},${i}] = 1 for character "${chars[i]}".`,
      `اكتب dp[${i},${i}] = 1 للحرف "${chars[i]}".`,
      1, { writes }, "base-write"));
  }
  for (let length = 2; length <= n; length++) {
    for (let i = 0; i + length <= n; i++) {
      const j = i + length - 1;
      if (chars[i] === chars[j]) dp[i][j] = length === 2 ? 2 : (dp[i + 1][j - 1] as number) + 2;
      else dp[i][j] = Math.max(dp[i + 1][j] as number, dp[i][j - 1] as number);
      writes++;
      const refs: [number, number][] = chars[i] === chars[j] && length > 2
        ? [[i + 1, j - 1]]
        : chars[i] !== chars[j] ? [[i + 1, j], [i, j - 1]] : [];
      steps.push(step(tableFrame(cloneMatrix(dp), labels, labels, [i, j], `"${chars.slice(i, j + 1).join("")}"`, undefined, refs),
        `Write dp[${i},${j}] = ${dp[i][j]} because endpoints "${chars[i]}" and "${chars[j]}" ${chars[i] === chars[j] ? "match" : "differ"}.`,
        `اكتب dp[${i},${j}] = ${dp[i][j]} لأن الطرفين "${chars[i]}" و"${chars[j]}" ${chars[i] === chars[j] ? "متطابقان" : "مختلفان"}.`,
        chars[i] === chars[j] ? 3 : 4, { writes }, "table-write"));
    }
  }
  steps.push(step(tableFrame(cloneMatrix(dp), labels, labels, [0, n - 1], `LPS length = ${dp[0][n - 1]}`),
    `Finished: the longest palindromic subsequence length is ${dp[0][n - 1]}.`,
    `انتهى: طول أطول تتابع فرعي متناظر هو ${dp[0][n - 1]}.`,
    5, { writes }, "result"));
  return steps;
}

export const longestPalindromicSubsequence = makeModule<TableFrame, TextInput>({
  slug: "longest-palindromic-subsequence",
  title: "Longest Palindromic Subsequence",
  titleAr: "أطول تتابع فرعي متناظر",
  category: "dynamic-programming",
  difficulty: "Intermediate",
  tags: ["dynamic programming", "palindrome", "interval DP"],
  tagsAr: ["البرمجة الديناميكية", "التناظر", "برمجة الفترات"],
  summary: "Finds the longest subsequence that reads identically in both directions.",
  summaryAr: "يجد أطول تتابع فرعي يُقرأ بالشكل نفسه في الاتجاهين.",
  renderer: "table",
  pseudocode: ["procedure LPS(text)", "dp[i,i] = 1", "for increasing interval length", "  if text[i] == text[j]: dp[i,j] = 2 + dp[i+1,j-1]", "  else dp[i,j] = max(dp[i+1,j], dp[i,j-1])", "return dp[0,n-1]"],
  recurrence: "dp[i,j] = 2+dp[i+1,j-1] on equal ends, else max(dp[i+1,j],dp[i,j-1])",
  complexity: { time: { best: "O(n²)", average: "O(n²)", worst: "O(n²)" }, space: "O(n²)" },
  how: ["Initialize single characters.", "Expand interval length.", "Match equal endpoints or discard the less useful endpoint."],
  howAr: ["هيّئ الحروف المفردة.", "وسّع طول الفترة.", "طابق الطرفين المتساويين أو استبعد الطرف الأقل فائدة."],
  inputFields: [{ key: "text", label: "Text", labelAr: "النص", placeholder: "bbbab" }],
  defaultInput: (level) => ({ text: ["bbbab", "cbbd", "agbdba", "character", "bananas"][level - 1] }),
  parseInput: parseShortText,
  serializeInput: (input) => ({ text: input.text }),
  generate: lpsSteps,
});

function palindromePartitionSteps(input: TextInput): Step<TableFrame>[] {
  const chars = [...input.text];
  const n = chars.length;
  const pal: (number | null)[][] = Array.from({ length: n }, () => Array<number | null>(n).fill(null));
  const cuts: (number | null)[] = Array(n).fill(null);
  const labels = chars.map((ch, i) => `${i}:${ch}`);
  const steps: Step<TableFrame>[] = [];
  let writes = 0;
  let checks = 0;
  const frame = (active: [number, number], note: string): TableFrame => tableFrame(
    cloneMatrix(pal), labels, labels, active, note,
    [{ label: "min cuts by prefix", values: cuts.map((v) => v ?? "·") }],
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = i; j < n; j++) {
      checks++;
      pal[i][j] = chars[i] === chars[j] && (j - i < 2 || pal[i + 1][j - 1] === 1) ? 1 : 0;
      writes++;
      steps.push(step(frame([i, j], "palindrome table: 1=yes"),
        `Write pal[${i},${j}] = ${pal[i][j]} for "${chars.slice(i, j + 1).join("")}".`,
        `اكتب pal[${i},${j}] = ${pal[i][j]} للنص "${chars.slice(i, j + 1).join("")}".`,
        2, { writes, checks }, "palindrome-write"));
    }
  }
  for (let end = 0; end < n; end++) {
    let best = end;
    if (pal[0][end] === 1) best = 0;
    else {
      for (let start = 1; start <= end; start++) {
        checks++;
        if (pal[start][end] === 1) best = Math.min(best, (cuts[start - 1] as number) + 1);
      }
    }
    cuts[end] = best;
    writes++;
    steps.push(step(frame([0, end], `cuts through index ${end}`),
      `Write cuts[${end}] = ${best}, the minimum cuts for prefix "${chars.slice(0, end + 1).join("")}".`,
      `اكتب cuts[${end}] = ${best}، وهو أقل عدد قطع للبادئة "${chars.slice(0, end + 1).join("")}".`,
      4, { writes, checks }, "cut-write"));
  }
  steps.push(step(frame([0, n - 1], `minimum cuts = ${cuts[n - 1]}`),
    `Finished: "${input.text}" needs ${cuts[n - 1]} cuts.`,
    `انتهى: يحتاج النص "${input.text}" إلى ${cuts[n - 1]} قطع.`,
    5, { writes, checks }, "result"));
  return steps;
}

export const palindromePartitioning = makeModule<TableFrame, TextInput>({
  slug: "palindrome-partitioning",
  title: "Palindrome Partitioning",
  titleAr: "تقسيم النص إلى مقاطع متناظرة",
  category: "dynamic-programming",
  difficulty: "Advanced",
  tags: ["dynamic programming", "palindrome", "partitioning"],
  tagsAr: ["البرمجة الديناميكية", "التناظر", "التقسيم"],
  summary: "Computes the minimum cuts that partition a string into palindromes.",
  summaryAr: "يحسب أقل عدد من القطوع لتقسيم النص إلى مقاطع متناظرة.",
  renderer: "table",
  pseudocode: ["procedure palindromeCuts(text)", "fill pal[i,j] from short intervals", "pal[i,j] = equal ends and inner palindrome", "for each prefix end", "  cuts[end] = min(cuts[start-1]+1 for pal[start,end])", "return cuts[n-1]"],
  recurrence: "pal[i,j]=s[i]==s[j] AND pal[i+1,j-1]; cuts[j]=min(cuts[i-1]+1)",
  complexity: { time: { best: "O(n²)", average: "O(n²)", worst: "O(n²)" }, space: "O(n²)" },
  how: ["Build the palindrome interval table.", "Evaluate every prefix endpoint.", "Choose the least cut preceding a palindromic suffix."],
  howAr: ["ابنِ جدول الفترات المتناظرة.", "قيّم كل نهاية بادئة.", "اختر أقل قطع يسبق لاحقة متناظرة."],
  inputFields: [{ key: "text", label: "Text", labelAr: "النص", placeholder: "aab" }],
  defaultInput: (level) => ({ text: ["aab", "banana", "abccbc", "racecarx", "ababbbabbababa"][level - 1] }),
  parseInput: parseShortText,
  serializeInput: (input) => ({ text: input.text }),
  generate: palindromePartitionSteps,
});

type CatalanInput = { n: number };

function catalanSteps(input: CatalanInput): Step<TableFrame>[] {
  const dp: (number | null)[] = Array(input.n + 1).fill(null);
  const steps: Step<TableFrame>[] = [];
  let writes = 0;
  let products = 0;
  const frame = (active: number, note: string): TableFrame => tableFrame(
    [dp], ["Catalan"], Array.from({ length: input.n + 1 }, (_, i) => String(i)), [0, active], note,
  );
  dp[0] = 1;
  writes++;
  steps.push(step(frame(0, "C₀ = 1"), "Write C[0] = 1.", "اكتب C[0] = 1.", 1, { writes, products }, "base-write"));
  for (let i = 1; i <= input.n; i++) {
    dp[i] = 0;
    writes++;
    steps.push(step(frame(i, `start C${i}`), `Initialize C[${i}] = 0.`, `هيّئ C[${i}] = 0.`, 2, { writes, products }, "table-write"));
    for (let left = 0; left < i; left++) {
      products++;
      const add = (dp[left] as number) * (dp[i - 1 - left] as number);
      dp[i] = (dp[i] as number) + add;
      writes++;
      steps.push(step(frame(i, `add C${left}×C${i - 1 - left} = ${add}`),
        `Write C[${i}] = ${dp[i]} after adding C[${left}]×C[${i - 1 - left}] = ${add}.`,
        `اكتب C[${i}] = ${dp[i]} بعد إضافة C[${left}]×C[${i - 1 - left}] = ${add}.`,
        3, { writes, products }, "accumulate-write"));
    }
  }
  steps.push(step(frame(input.n, `Catalan(${input.n}) = ${dp[input.n]}`),
    `Finished: Catalan(${input.n}) = ${dp[input.n]}.`,
    `انتهى: Catalan(${input.n}) = ${dp[input.n]}.`,
    4, { writes, products }, "result"));
  return steps;
}

export const catalanNumbers = makeModule<TableFrame, CatalanInput>({
  slug: "catalan-numbers",
  title: "Catalan Numbers",
  titleAr: "أعداد كاتالان",
  category: "dynamic-programming",
  difficulty: "Intermediate",
  tags: ["dynamic programming", "combinatorics", "binary trees"],
  tagsAr: ["البرمجة الديناميكية", "التوافقيات", "الأشجار الثنائية"],
  summary: "Builds Catalan numbers from all left/right structural splits.",
  summaryAr: "يبني أعداد كاتالان من جميع تقسيمات البنية إلى يسار ويمين.",
  renderer: "table",
  pseudocode: ["procedure catalan(n)", "C[0] = 1", "for i = 1..n: C[i] = 0", "  for left = 0..i-1: C[i] += C[left] * C[i-1-left]", "return C[n]"],
  recurrence: "C[n] = sum from i=0..n-1 of C[i]C[n-1-i]",
  complexity: { time: { best: "O(n²)", average: "O(n²)", worst: "O(n²)" }, space: "O(n)" },
  how: ["Start with one empty structure.", "Enumerate each possible left size.", "Accumulate products of independent left and right structures."],
  howAr: ["ابدأ ببنية فارغة واحدة.", "عدّد كل حجم ممكن لليسار.", "اجمع حاصل ضرب البنى اليسرى واليمنى المستقلة."],
  inputFields: [{ key: "n", label: "Index n", labelAr: "الفهرس n", placeholder: "5" }],
  defaultInput: (level) => ({ n: Math.min(2 + level, 10) }),
  parseInput: (fields) => ({ n: boundedInteger(fields.n ?? "", "n", 0, 12) }),
  serializeInput: (input) => ({ n: String(input.n) }),
  generate: catalanSteps,
});

// ---------------------------------------------------------------------------
// Greedy algorithms
// ---------------------------------------------------------------------------

type CoinInput = { coins: number[]; amount: number };

function greedyCoinSteps(input: CoinInput): Step<ArrayFrame>[] {
  const coins = [...new Set(input.coins)].sort((a, b) => b - a);
  const chosen: number[] = [];
  const steps: Step<ArrayFrame>[] = [];
  let remaining = input.amount;
  let choices = 0;
  const frame = (active: number | null, note: string): ArrayFrame => ({
    values: chosen,
    states: active === null || chosen.length === 0 ? undefined : { [chosen.length - 1]: "active" },
    aux: [
      { label: "denominations", values: coins },
      { label: "remaining", values: [remaining] },
    ],
    note,
  });
  steps.push(step(frame(null, `amount = ${input.amount}`),
    `Sort denominations descending: ${coins.join(", ")}.`,
    `رتّب الفئات تنازلياً: ${coins.join(", ")}.`,
    1, { choices }, "order"));
  while (remaining > 0) {
    const coin = coins.find((value) => value <= remaining);
    if (coin === undefined) {
      steps.push(step(frame(null, `cannot represent remaining ${remaining}`),
        `No denomination fits the remaining amount ${remaining}; greedy change fails.`,
        `لا توجد فئة تناسب المبلغ المتبقي ${remaining}؛ يفشل التغيير الجشع.`,
        4, { choices }, "failure"));
      return steps;
    }
    choices++;
    chosen.push(coin);
    remaining -= coin;
    steps.push(step(frame(chosen.length - 1, `choose ${coin}`),
      `Choose the largest fitting coin ${coin}; remaining amount becomes ${remaining}.`,
      `اختر أكبر عملة مناسبة ${coin}؛ يصبح المبلغ المتبقي ${remaining}.`,
      2, { choices }, "choose"));
  }
  steps.push(step(frame(null, `${choices} coins`),
    `Finished: ${input.amount} is represented by ${choices} coins: ${chosen.join(" + ")}.`,
    `انتهى: تم تمثيل ${input.amount} باستخدام ${choices} عملات: ${chosen.join(" + ")}.`,
    3, { choices }, "result"));
  return steps;
}

export const greedyCoinChange = makeModule<ArrayFrame, CoinInput>({
  slug: "greedy-coin-change",
  title: "Greedy Coin Change",
  titleAr: "فك العملات بالطريقة الجشعة",
  category: "greedy",
  difficulty: "Beginner",
  tags: ["greedy", "coin change", "canonical systems"],
  tagsAr: ["الخوارزميات الجشعة", "فك العملات", "أنظمة العملات القياسية"],
  summary: "Repeatedly takes the largest denomination that does not exceed the remainder.",
  summaryAr: "يأخذ مراراً أكبر فئة لا تتجاوز المبلغ المتبقي.",
  renderer: "array",
  pseudocode: ["procedure greedyChange(coins, amount)", "sort coins descending", "while amount > 0", "  choose largest coin <= amount", "  if none exists: fail", "  amount -= coin", "return chosen coins"],
  recurrence: "choose max coin c such that c <= remaining, then remaining -= c",
  complexity: { time: { best: "O(k log k)", average: "O(k log k + m)", worst: "O(k log k + m)" }, space: "O(m)" },
  how: ["Sort denominations descending.", "Take the largest currently feasible coin.", "Stop at zero or report an uncovered remainder."],
  howAr: ["رتّب الفئات تنازلياً.", "خذ أكبر عملة ممكنة حالياً.", "توقف عند الصفر أو أبلغ عن باقي غير قابل للتغطية."],
  inputFields: [
    { key: "coins", label: "Denominations", labelAr: "فئات العملات", placeholder: "25,10,5,1", list: true },
    { key: "amount", label: "Amount", labelAr: "المبلغ", placeholder: "63" },
  ],
  defaultInput: (level, rng) => ({ coins: [25, 10, 5, 1], amount: rng.int(6, 12 + level * 15) }),
  parseInput: (fields) => ({
    coins: positiveNumbers(fields.coins ?? "", "Coins", 1, 10),
    amount: boundedInteger(fields.amount ?? "", "Amount", 0, 200),
  }),
  serializeInput: (input) => ({ coins: input.coins.join(","), amount: String(input.amount) }),
  generate: greedyCoinSteps,
});

type Interval = { start: number; end: number; id: number };
type IntervalInput = { intervals: Interval[] };

function parseIntervals(raw: string): Interval[] {
  const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 1 || parts.length > 12) throw new Error("Intervals must contain 1-12 start-end pairs.");
  return parts.map((part, id) => {
    const match = /^(\d+)\s*-\s*(\d+)$/.exec(part);
    if (!match) throw new Error(`Invalid interval "${part}"; use start-end.`);
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (start >= end) throw new Error(`Interval "${part}" must have start < end.`);
    return { start, end, id };
  });
}

function intervalPartitionSteps(input: IntervalInput): Step<TableFrame>[] {
  const ordered = [...input.intervals].sort((a, b) => a.start - b.start || a.end - b.end || a.id - b.id);
  const assigned: (number | null)[] = Array(ordered.length).fill(null);
  const resourceEnd: number[] = [];
  const steps: Step<TableFrame>[] = [];
  let checks = 0;
  let assignments = 0;
  const matrix = (): (string | number | null)[][] => ordered.map((interval, i) => [
    interval.start, interval.end, assigned[i] === null ? null : (assigned[i] as number) + 1,
  ]);
  const frame = (active: number, note: string): TableFrame => tableFrame(
    matrix(),
    ordered.map((interval) => `I${interval.id + 1}`),
    ["start", "end", "resource"],
    [active, 2],
    note,
    [{ label: "resource available at", values: resourceEnd.length ? resourceEnd : ["none"] }],
  );
  steps.push(step(frame(0, "ordered by start time"),
    `Order intervals by start time: ${ordered.map((i) => `[${i.start},${i.end})`).join(", ")}.`,
    `رتّب الفترات حسب وقت البدء: ${ordered.map((i) => `[${i.start},${i.end})`).join(", ")}.`,
    1, { checks, assignments }, "order"));
  for (let i = 0; i < ordered.length; i++) {
    const interval = ordered[i];
    let resource = -1;
    let earliestEnd = Number.POSITIVE_INFINITY;
    for (let r = 0; r < resourceEnd.length; r++) {
      checks++;
      steps.push(step(frame(i, `check resource ${r + 1}: available ${resourceEnd[r]}`),
        `Check resource ${r + 1}: ${resourceEnd[r]} <= start ${interval.start} is ${resourceEnd[r] <= interval.start}.`,
        `افحص المورد ${r + 1}: الشرط ${resourceEnd[r]} <= وقت البدء ${interval.start} هو ${resourceEnd[r] <= interval.start}.`,
        3, { checks, assignments }, "candidate"));
      if (resourceEnd[r] <= interval.start && resourceEnd[r] < earliestEnd) {
        resource = r;
        earliestEnd = resourceEnd[r];
      }
    }
    if (resource === -1) {
      resource = resourceEnd.length;
      resourceEnd.push(interval.end);
    } else {
      resourceEnd[resource] = interval.end;
    }
    assigned[i] = resource;
    assignments++;
    steps.push(step(frame(i, `assign I${interval.id + 1} to resource ${resource + 1}`),
      `Assign interval ${interval.id + 1} [${interval.start},${interval.end}) to resource ${resource + 1}.`,
      `أسند الفترة ${interval.id + 1} [${interval.start},${interval.end}) إلى المورد ${resource + 1}.`,
      4, { checks, assignments }, "choose"));
  }
  steps.push(step(frame(ordered.length - 1, `resources used = ${resourceEnd.length}`),
    `Finished: ${resourceEnd.length} resources are sufficient and necessary for this greedy schedule.`,
    `انتهى: ${resourceEnd.length} موارد كافية ولازمة لهذا الجدول الجشع.`,
    5, { checks, assignments }, "result"));
  return steps;
}

export const intervalPartitioning = makeModule<TableFrame, IntervalInput>({
  slug: "interval-partitioning",
  title: "Interval Partitioning",
  titleAr: "تقسيم الفترات على الموارد",
  category: "greedy",
  difficulty: "Intermediate",
  tags: ["greedy", "intervals", "scheduling", "priority queue"],
  tagsAr: ["الخوارزميات الجشعة", "الفترات", "الجدولة", "طابور الأولوية"],
  summary: "Assigns intervals to the minimum number of non-overlapping resources.",
  summaryAr: "يسند الفترات إلى أقل عدد من الموارد غير المتداخلة.",
  renderer: "table",
  pseudocode: ["procedure partition(intervals)", "sort by start time", "for each interval", "  reuse an available resource with earliest finish", "  otherwise open a new resource", "  update its finish time", "return assignments"],
  recurrence: "reuse an earliest-finished resource when end <= next start, otherwise create one",
  complexity: { time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)" }, space: "O(n)" },
  how: ["Sort by starting time.", "Find an available resource.", "Reuse it or open exactly one new resource."],
  howAr: ["رتّب حسب وقت البدء.", "ابحث عن مورد متاح.", "أعد استخدامه أو افتح مورداً جديداً واحداً."],
  inputFields: [{ key: "intervals", label: "Intervals", labelAr: "الفترات", placeholder: "0-4,1-3,3-5,4-7", list: true }],
  defaultInput: (level, rng) => ({
    intervals: Array.from({ length: Math.min(3 + level, 8) }, (_, id) => {
      const start = rng.int(0, 3 + level * 2);
      return { start, end: start + rng.int(1, 4), id };
    }),
  }),
  parseInput: (fields) => ({ intervals: parseIntervals(fields.intervals ?? "") }),
  serializeInput: (input) => ({ intervals: input.intervals.map((i) => `${i.start}-${i.end}`).join(",") }),
  generate: intervalPartitionSteps,
});

type MergeInput = { sizes: number[] };

function optimalMergeSteps(input: MergeInput): Step<ArrayFrame>[] {
  const heap = [...input.sizes].sort((a, b) => a - b);
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;
  let merges = 0;
  let totalCost = 0;
  const frame = (states: Record<number, CellState> | undefined, note: string): ArrayFrame => ({
    values: [...heap],
    states,
    aux: [{ label: "total merge cost", values: [totalCost] }],
    note,
  });
  steps.push(step(frame(undefined, "min-priority order"),
    `Initialize the min-priority queue with sizes ${heap.join(", ")}.`,
    `هيّئ طابور الأولوية الأدنى بالأحجام ${heap.join(", ")}.`,
    1, { comparisons, merges, totalCost }, "initialize"));
  while (heap.length > 1) {
    comparisons++;
    steps.push(step(frame({ 0: "compare", 1: "compare" }, `two smallest: ${heap[0]}, ${heap[1]}`),
      `Choose the two smallest files ${heap[0]} and ${heap[1]}.`,
      `اختر أصغر ملفين ${heap[0]} و${heap[1]}.`,
      2, { comparisons, merges, totalCost }, "choose"));
    const a = heap.shift() as number;
    const b = heap.shift() as number;
    const merged = a + b;
    totalCost += merged;
    merges++;
    let index = 0;
    while (index < heap.length && heap[index] <= merged) index++;
    heap.splice(index, 0, merged);
    steps.push(step(frame({ [index]: "active" }, `merge ${a}+${b}=${merged}`),
      `Merge ${a} and ${b} into ${merged}; cumulative cost is ${totalCost}, then reinsert it.`,
      `ادمج ${a} و${b} إلى ${merged}؛ الكلفة التراكمية ${totalCost}، ثم أعد إدراجه.`,
      3, { comparisons, merges, totalCost }, "merge"));
  }
  steps.push(step(frame(heap.length ? { 0: "found" } : undefined, `optimal cost = ${totalCost}`),
    `Finished: the optimal merge cost is ${totalCost}.`,
    `انتهى: كلفة الدمج المثلى هي ${totalCost}.`,
    4, { comparisons, merges, totalCost }, "result"));
  return steps;
}

export const optimalMergePattern = makeModule<ArrayFrame, MergeInput>({
  slug: "optimal-merge-pattern",
  title: "Optimal Merge Pattern",
  titleAr: "نمط الدمج الأمثل",
  category: "greedy",
  difficulty: "Intermediate",
  tags: ["greedy", "min heap", "merge cost"],
  tagsAr: ["الخوارزميات الجشعة", "الكومة الصغرى", "كلفة الدمج"],
  summary: "Minimizes total pairwise merge cost by repeatedly merging the two smallest files.",
  summaryAr: "يقلل كلفة الدمج الكلية بدمج أصغر ملفين مراراً.",
  renderer: "array",
  pseudocode: ["procedure optimalMerge(sizes)", "put all sizes in a min-heap", "while more than one size remains", "  a = extractMin; b = extractMin", "  total += a+b; insert(a+b)", "return total"],
  recurrence: "extract the two minimum sizes, pay their sum, and reinsert the sum",
  complexity: { time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)" }, space: "O(n)" },
  how: ["Build a minimum-priority queue.", "Remove the two smallest sizes.", "Pay and reinsert their sum until one file remains."],
  howAr: ["ابنِ طابور أولوية أدنى.", "أزل أصغر حجمين.", "ادفع كلفتهما وأعد إدراج المجموع حتى يبقى ملف واحد."],
  inputFields: [{ key: "sizes", label: "File sizes", labelAr: "أحجام الملفات", placeholder: "5,10,20,30", list: true }],
  defaultInput: (level, rng) => ({ sizes: shuffledPositive(level, rng, Math.min(3 + level, 8)) }),
  parseInput: (fields) => ({ sizes: positiveNumbers(fields.sizes ?? "", "Sizes", 1, 12) }),
  serializeInput: (input) => ({ sizes: input.sizes.join(",") }),
  generate: optimalMergeSteps,
});

type SetCoverInput = { universe: string[]; subsets: string[][] };

function parseTokens(raw: string, label: string): string[] {
  const values = raw.split(",").map((value) => value.trim()).filter(Boolean);
  if (values.length < 1 || values.length > 12 || new Set(values).size !== values.length) {
    throw new Error(`${label} must contain 1-12 distinct comma-separated values.`);
  }
  return values;
}

function parseSubsets(raw: string, universe: string[]): string[][] {
  const sets = raw.split(";").map((part) => part.split(",").map((v) => v.trim()).filter(Boolean));
  if (sets.length < 1 || sets.length > 12 || sets.some((set) => set.length === 0)) {
    throw new Error("Subsets must be semicolon-separated nonempty sets.");
  }
  if (sets.some((set) => set.some((value) => !universe.includes(value)))) throw new Error("Every subset value must belong to the universe.");
  return sets.map((set) => [...new Set(set)]);
}

function setCoverSteps(input: SetCoverInput): Step<TableFrame>[] {
  const uncovered = new Set(input.universe);
  const chosen: number[] = [];
  const steps: Step<TableFrame>[] = [];
  let evaluations = 0;
  let selections = 0;
  const frame = (active: number | null, note: string): TableFrame => {
    const cells = input.subsets.map((set, r) => input.universe.map((value) => ({
      value: set.includes(value) ? 1 : 0,
      state: r === active ? "active" as CellState : chosen.includes(r) ? "found" as CellState : uncovered.has(value) ? undefined : "visited" as CellState,
    })));
    return {
      rowLabels: input.subsets.map((_, i) => `S${i + 1}`),
      colLabels: input.universe,
      cells,
      aux: [
        { label: "uncovered", values: [...uncovered] },
        { label: "chosen", values: chosen.map((i) => `S${i + 1}`) },
      ],
      note,
    };
  };
  steps.push(step(frame(null, `universe size = ${input.universe.length}`),
    `Start with uncovered universe {${input.universe.join(",")}}.`,
    `ابدأ بالكون غير المغطى {${input.universe.join(",")}}.`,
    1, { evaluations, selections }, "initialize"));
  while (uncovered.size > 0) {
    let best = -1;
    let bestGain = 0;
    for (let i = 0; i < input.subsets.length; i++) {
      if (chosen.includes(i)) continue;
      evaluations++;
      const gain = input.subsets[i].filter((value) => uncovered.has(value)).length;
      steps.push(step(frame(i, `S${i + 1} gain = ${gain}`),
        `Evaluate S${i + 1}: it covers ${gain} currently uncovered elements.`,
        `قيّم S${i + 1}: تغطي ${gain} عناصر غير مغطاة حالياً.`,
        2, { evaluations, selections }, "candidate"));
      if (gain > bestGain) {
        best = i;
        bestGain = gain;
      }
    }
    if (best === -1) {
      steps.push(step(frame(null, `${uncovered.size} elements remain`),
        `No set covers the ${uncovered.size} remaining elements; a full cover does not exist.`,
        `لا تغطي أي مجموعة العناصر المتبقية وعددها ${uncovered.size}؛ لا يوجد غطاء كامل.`,
        5, { evaluations, selections }, "failure"));
      return steps;
    }
    chosen.push(best);
    input.subsets[best].forEach((value) => uncovered.delete(value));
    selections++;
    steps.push(step(frame(best, `choose S${best + 1}, gain ${bestGain}`),
      `Choose S${best + 1} with gain ${bestGain}; ${uncovered.size} elements remain uncovered.`,
      `اختر S${best + 1} بمكسب ${bestGain}؛ بقي ${uncovered.size} عناصر غير مغطاة.`,
      3, { evaluations, selections }, "choose"));
  }
  steps.push(step(frame(null, `sets chosen = ${selections}`),
    `Finished: greedy cover uses ${selections} sets: ${chosen.map((i) => `S${i + 1}`).join(", ")}.`,
    `انتهى: يستخدم الغطاء الجشع ${selections} مجموعات: ${chosen.map((i) => `S${i + 1}`).join(", ")}.`,
    4, { evaluations, selections }, "result"));
  return steps;
}

export const greedySetCover = makeModule<TableFrame, SetCoverInput>({
  slug: "greedy-set-cover",
  title: "Greedy Set Cover",
  titleAr: "غطاء المجموعات الجشع",
  category: "greedy",
  difficulty: "Advanced",
  tags: ["greedy", "set cover", "approximation"],
  tagsAr: ["الخوارزميات الجشعة", "غطاء المجموعات", "التقريب"],
  summary: "Repeatedly selects the set covering the most still-uncovered elements.",
  summaryAr: "يختار مراراً المجموعة التي تغطي أكبر عدد من العناصر غير المغطاة.",
  renderer: "table",
  pseudocode: ["procedure greedySetCover(U, sets)", "uncovered = U", "while uncovered is nonempty", "  evaluate each set's uncovered gain", "  choose maximum-gain set or fail if gain is zero", "  remove covered elements", "return chosen sets"],
  recurrence: "choose argmax set S of |S intersect uncovered| and remove its elements",
  complexity: { time: { best: "O(mn)", average: "O(mn²)", worst: "O(mn²)" }, space: "O(m+n)" },
  how: ["Track uncovered universe elements.", "Measure every available set's marginal gain.", "Commit the maximum-gain set until covered or impossible."],
  howAr: ["تتبّع عناصر الكون غير المغطاة.", "قس المكسب الهامشي لكل مجموعة متاحة.", "اعتمد مجموعة أكبر مكسب حتى تكتمل التغطية أو تصبح مستحيلة."],
  inputFields: [
    { key: "universe", label: "Universe", labelAr: "الكون", placeholder: "A,B,C,D,E", list: true },
    { key: "subsets", label: "Subsets (; separated)", labelAr: "المجموعات الجزئية (تفصلها ;)", placeholder: "A,B;B,C,D;D,E" },
  ],
  defaultInput: () => ({ universe: ["A", "B", "C", "D", "E"], subsets: [["A", "B"], ["B", "C", "D"], ["D", "E"]] }),
  parseInput: (fields) => {
    const universe = parseTokens(fields.universe ?? "", "Universe");
    return { universe, subsets: parseSubsets(fields.subsets ?? "", universe) };
  },
  serializeInput: (input) => ({ universe: input.universe.join(","), subsets: input.subsets.map((set) => set.join(",")).join(";") }),
  generate: setCoverSteps,
});

// ---------------------------------------------------------------------------
// Backtracking
// ---------------------------------------------------------------------------

type ColoringInput = { vertices: number; edges: [number, number][]; colors: number };

function parseEdges(raw: string, vertices: number): [number, number][] {
  if (!raw.trim()) return [];
  const edges = raw.split(",").map((part) => {
    const match = /^(\d+)\s*-\s*(\d+)$/.exec(part.trim());
    if (!match) throw new Error(`Invalid edge "${part}"; use u-v.`);
    const from = Number(match[1]);
    const to = Number(match[2]);
    if (from === to || from >= vertices || to >= vertices) throw new Error(`Edge "${part}" is outside the graph or a self-loop.`);
    return [Math.min(from, to), Math.max(from, to)] as [number, number];
  });
  return [...new Map(edges.map((edge) => [`${edge[0]}-${edge[1]}`, edge])).values()];
}

function graphColoringSteps(input: ColoringInput): Step<GraphFrame>[] {
  const ids = Array.from({ length: input.vertices }, (_, i) => String(i));
  const layout = circularLayout(ids);
  const colors = Array(input.vertices).fill(0) as number[];
  const steps: Step<GraphFrame>[] = [];
  let attempts = 0;
  let backtracks = 0;
  const frame = (active: number | null, conflict: number | null, note: string): GraphFrame => ({
    nodes: ids.map((id) => ({ id, label: id, ...layout[id] })),
    edges: input.edges.map(([from, to]) => ({ from: String(from), to: String(to) })),
    nodeStates: Object.fromEntries(ids.map((id, i) => [id, i === conflict ? "swap" : i === active ? "active" : colors[i] ? "found" : "default"])) as Record<string, CellState>,
    nodeAnnotations: Object.fromEntries(ids.map((id, i) => [id, colors[i] ? `color ${colors[i]}` : "uncolored"])),
    note,
  });
  const snap = (active: number | null, conflict: number | null, description: string, descriptionAr: string, line: number, phase: string) => {
    if (steps.length >= MAX_STEPS - 1) return;
    steps.push(step(frame(active, conflict, `colors: ${colors.join(",")}`), description, descriptionAr, line, { attempts, backtracks }, phase));
  };
  const solve = (vertex: number): boolean => {
    if (vertex === input.vertices) return true;
    for (let color = 1; color <= input.colors; color++) {
      attempts++;
      const conflictEdge = input.edges.find(([a, b]) =>
        (a === vertex && colors[b] === color) || (b === vertex && colors[a] === color));
      snap(vertex, conflictEdge ? (conflictEdge[0] === vertex ? conflictEdge[1] : conflictEdge[0]) : null,
        `Try color ${color} on vertex ${vertex}; it is ${conflictEdge ? "blocked" : "safe"}.`,
        `جرّب اللون ${color} للرأس ${vertex}؛ إنه ${conflictEdge ? "متعارض" : "آمن"}.`,
        2, "try");
      if (conflictEdge) continue;
      colors[vertex] = color;
      snap(vertex, null, `Choose color ${color} for vertex ${vertex} and recurse to vertex ${vertex + 1}.`,
        `اختر اللون ${color} للرأس ${vertex} وانتقل عودياً إلى الرأس ${vertex + 1}.`, 3, "recurse");
      if (solve(vertex + 1)) return true;
      colors[vertex] = 0;
      backtracks++;
      snap(vertex, null, `Backtrack: remove color ${color} from vertex ${vertex}.`,
        `تراجع: أزل اللون ${color} من الرأس ${vertex}.`, 4, "backtrack");
    }
    return false;
  };
  snap(null, null, `Color ${input.vertices} vertices with at most ${input.colors} colors.`,
    `لوّن ${input.vertices} رؤوس باستخدام ${input.colors} ألوان كحد أقصى.`, 0, "initialize");
  const solved = solve(0);
  snap(null, null, solved ? `A valid ${input.colors}-coloring was found.` : `No valid ${input.colors}-coloring exists.`,
    solved ? `تم العثور على تلوين صالح باستخدام ${input.colors} ألوان.` : `لا يوجد تلوين صالح باستخدام ${input.colors} ألوان.`,
    5, solved ? "result" : "failure");
  return steps;
}

export const graphColoring = makeModule<GraphFrame, ColoringInput>({
  slug: "graph-coloring", title: "Graph Coloring", titleAr: "تلوين الرسم البياني", category: "backtracking", difficulty: "Advanced",
  tags: ["backtracking", "graphs", "constraint satisfaction"], tagsAr: ["التراجع", "الرسوم البيانية", "إرضاء القيود"],
  summary: "Assigns bounded colors so adjacent vertices never share a color.", summaryAr: "يسند ألواناً محدودة بحيث لا يشترك رأسان متجاوران في اللون نفسه.",
  renderer: "graph",
  pseudocode: ["procedure color(vertex)", "if every vertex is colored: succeed", "for each color", "  if no colored neighbor conflicts: choose and recurse", "  if recursion fails: remove color and backtrack", "return failure"],
  recurrence: "try each nonconflicting color, recurse, and undo it if the suffix cannot be colored",
  complexity: { time: { best: "O(V)", average: "O(C^V)", worst: "O(C^V)" }, space: "O(V)" },
  how: ["Visit vertices in order.", "Try every color not used by a neighbor.", "Undo choices whose recursive suffix fails."],
  howAr: ["زر الرؤوس بالترتيب.", "جرّب كل لون لا يستخدمه جار.", "تراجع عن الاختيارات التي يفشل امتدادها العودي."],
  inputFields: [
    { key: "vertices", label: "Vertex count", labelAr: "عدد الرؤوس", placeholder: "4" },
    { key: "edges", label: "Edges", labelAr: "الحواف", placeholder: "0-1,1-2,2-3,3-0", list: true },
    { key: "colors", label: "Color count", labelAr: "عدد الألوان", placeholder: "3" },
  ],
  defaultInput: (level) => {
    const vertices = Math.min(3 + level, 7);
    return {
      vertices,
      edges: Array.from({ length: vertices }, (_, i) => [Math.min(i, (i + 1) % vertices), Math.max(i, (i + 1) % vertices)] as [number, number]),
      colors: level === 1 ? 2 : 3,
    };
  },
  parseInput: (fields) => {
    const vertices = boundedInteger(fields.vertices ?? "", "Vertices", 1, 9);
    return { vertices, edges: parseEdges(fields.edges ?? "", vertices), colors: boundedInteger(fields.colors ?? "", "Colors", 1, 6) };
  },
  serializeInput: (input) => ({ vertices: String(input.vertices), edges: input.edges.map(([a, b]) => `${a}-${b}`).join(","), colors: String(input.colors) }),
  generate: graphColoringSteps,
});

type KnightInput = { size: number; startRow: number; startCol: number };
const KNIGHT_MOVES: readonly [number, number][] = [[2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1]];

function knightsTourSteps(input: KnightInput): Step<GridFrame>[] {
  const board = Array.from({ length: input.size }, () => Array(input.size).fill(0) as number[]);
  const steps: Step<GridFrame>[] = [];
  let attempts = 0;
  let backtracks = 0;
  let truncated = false;
  const frame = (active: [number, number] | null, note: string): GridFrame => ({
    rows: input.size, cols: input.size,
    cells: board.map((row, r) => row.map((value, c) => ({ value: value || "", state: active?.[0] === r && active[1] === c ? "active" : value ? "visited" : undefined }))),
    note,
  });
  const snap = (active: [number, number] | null, description: string, descriptionAr: string, line: number, phase: string) => {
    if (steps.length >= MAX_STEPS - 1) { truncated = true; return; }
    steps.push(step(frame(active, `visited ${Math.max(...board.flat())}/${input.size * input.size}`), description, descriptionAr, line, { attempts, backtracks }, phase));
  };
  const validMoves = (row: number, col: number) => KNIGHT_MOVES
    .map(([dr, dc]) => [row + dr, col + dc] as [number, number])
    .filter(([r, c]) => r >= 0 && c >= 0 && r < input.size && c < input.size && board[r][c] === 0);
  const solve = (row: number, col: number, move: number): boolean => {
    if (move > input.size * input.size) return true;
    const candidates = validMoves(row, col).sort((a, b) => validMoves(a[0], a[1]).length - validMoves(b[0], b[1]).length);
    for (const [nextRow, nextCol] of candidates) {
      if (truncated) return false;
      attempts++;
      snap([nextRow, nextCol], `Try move ${move} at (${nextRow},${nextCol}).`, `جرّب الحركة ${move} عند (${nextRow},${nextCol}).`, 2, "try");
      board[nextRow][nextCol] = move;
      snap([nextRow, nextCol], `Choose (${nextRow},${nextCol}) as move ${move} and recurse.`, `اختر (${nextRow},${nextCol}) كحركة ${move} وانتقل عودياً.`, 3, "recurse");
      if (solve(nextRow, nextCol, move + 1)) return true;
      board[nextRow][nextCol] = 0;
      backtracks++;
      snap([nextRow, nextCol], `Backtrack: remove move ${move} from (${nextRow},${nextCol}).`, `تراجع: أزل الحركة ${move} من (${nextRow},${nextCol}).`, 4, "backtrack");
    }
    return false;
  };
  board[input.startRow][input.startCol] = 1;
  snap([input.startRow, input.startCol], `Place move 1 at (${input.startRow},${input.startCol}).`, `ضع الحركة 1 عند (${input.startRow},${input.startCol}).`, 1, "choose");
  const solved = solve(input.startRow, input.startCol, 2);
  snap(null, solved ? `A complete tour of ${input.size * input.size} squares was found.` : truncated ? `Search stopped at the ${MAX_STEPS}-step safety limit.` : `No tour exists from this start.`,
    solved ? `تم العثور على جولة كاملة من ${input.size * input.size} مربعات.` : truncated ? `توقف البحث عند حد الأمان ${MAX_STEPS} خطوة.` : `لا توجد جولة من نقطة البداية هذه.`,
    5, solved ? "result" : "failure");
  return steps;
}

export const knightsTour = makeModule<GridFrame, KnightInput>({
  slug: "knights-tour", title: "Knight's Tour", titleAr: "جولة الحصان", category: "backtracking", difficulty: "Advanced",
  tags: ["backtracking", "chessboard", "Hamiltonian path"], tagsAr: ["التراجع", "رقعة الشطرنج", "مسار هاملتوني"],
  summary: "Visits every board square exactly once using legal knight moves.", summaryAr: "يزور كل مربع في الرقعة مرة واحدة بالضبط باستخدام حركات الحصان القانونية.",
  renderer: "grid",
  pseudocode: ["procedure tour(row, col, move)", "if move > n²: succeed", "order legal unvisited knight moves", "for each move: try it", "  choose, recurse, and backtrack on failure", "return failure"],
  recurrence: "choose a legal unvisited knight neighbor, recurse, then clear it on failure",
  complexity: { time: { best: "O(n²)", average: "Exponential", worst: "O(8^(n²))" }, space: "O(n²)" },
  how: ["Mark the starting square.", "Try legal unvisited knight destinations.", "Use onward-degree ordering and undo dead ends."],
  howAr: ["علّم مربع البداية.", "جرّب وجهات الحصان القانونية غير المزارة.", "رتّب حسب عدد الحركات التالية وتراجع عن الطرق المسدودة."],
  inputFields: [
    { key: "size", label: "Board size", labelAr: "حجم الرقعة", placeholder: "5" },
    { key: "startRow", label: "Start row", labelAr: "صف البداية", placeholder: "0" },
    { key: "startCol", label: "Start column", labelAr: "عمود البداية", placeholder: "0" },
  ],
  defaultInput: () => ({ size: 5, startRow: 0, startCol: 0 }),
  parseInput: (fields) => {
    const size = boundedInteger(fields.size ?? "", "Size", 1, 6);
    return {
      size,
      startRow: boundedInteger(fields.startRow ?? "", "Start row", 0, size - 1),
      startCol: boundedInteger(fields.startCol ?? "", "Start column", 0, size - 1),
    };
  },
  serializeInput: (input) => ({ size: String(input.size), startRow: String(input.startRow), startCol: String(input.startCol) }),
  generate: knightsTourSteps,
});

type WordSearchInput = { board: string[][]; word: string };

function parseBoard(raw: string): string[][] {
  const board = raw.split(";").map((row) => [...row.trim()]);
  if (board.length < 1 || board.length > 6 || board.some((row) => row.length < 1 || row.length > 6 || row.length !== board[0].length)) {
    throw new Error("Board must have 1-6 equal-length rows separated by semicolons.");
  }
  return board;
}

function wordSearchSteps(input: WordSearchInput): Step<GridFrame>[] {
  const rows = input.board.length;
  const cols = input.board[0].length;
  const path = new Set<string>();
  const steps: Step<GridFrame>[] = [];
  let attempts = 0;
  let backtracks = 0;
  const frame = (active: [number, number] | null, conflict: boolean, note: string): GridFrame => ({
    rows, cols,
    cells: input.board.map((row, r) => row.map((value, c) => ({
      value,
      state: active?.[0] === r && active[1] === c ? (conflict ? "swap" : "active") : path.has(`${r},${c}`) ? "visited" : undefined,
    }))),
    note,
  });
  const snap = (active: [number, number] | null, conflict: boolean, description: string, descriptionAr: string, line: number, phase: string) => {
    steps.push(step(frame(active, conflict, `matched ${path.size}/${[...input.word].length}`), description, descriptionAr, line, { attempts, backtracks }, phase));
  };
  const chars = [...input.word];
  const dfs = (r: number, c: number, index: number): boolean => {
    if (index === chars.length) return true;
    if (r < 0 || c < 0 || r >= rows || c >= cols || path.has(`${r},${c}`)) return false;
    attempts++;
    if (input.board[r][c] !== chars[index]) {
      snap([r, c], true, `Try (${r},${c}): "${input.board[r][c]}" does not match "${chars[index]}" at index ${index}.`,
        `جرّب (${r},${c}): الحرف "${input.board[r][c]}" لا يطابق "${chars[index]}" عند الفهرس ${index}.`, 2, "reject");
      return false;
    }
    path.add(`${r},${c}`);
    snap([r, c], false, `Choose (${r},${c}) for "${chars[index]}" at index ${index} and recurse.`,
      `اختر (${r},${c}) للحرف "${chars[index]}" عند الفهرس ${index} وانتقل عودياً.`, 3, "recurse");
    if (index === chars.length - 1) return true;
    for (const [dr, dc] of [[1, 0], [0, 1], [-1, 0], [0, -1]] as [number, number][]) {
      if (dfs(r + dr, c + dc, index + 1)) return true;
    }
    path.delete(`${r},${c}`);
    backtracks++;
    snap([r, c], false, `Backtrack from (${r},${c}); no neighbor completes index ${index + 1}.`,
      `تراجع من (${r},${c})؛ لا يكمل أي جار الفهرس ${index + 1}.`, 4, "backtrack");
    return false;
  };
  let found = chars.length === 0;
  for (let r = 0; r < rows && !found; r++) for (let c = 0; c < cols && !found; c++) found = dfs(r, c, 0);
  snap(null, false, found ? `Word "${input.word}" was found.` : `Word "${input.word}" was not found.`,
    found ? `تم العثور على الكلمة "${input.word}".` : `لم يتم العثور على الكلمة "${input.word}".`, 5, found ? "result" : "failure");
  return steps;
}

export const wordSearch = makeModule<GridFrame, WordSearchInput>({
  slug: "word-search", title: "Word Search", titleAr: "البحث عن كلمة في شبكة", category: "backtracking", difficulty: "Intermediate",
  tags: ["backtracking", "grid", "strings", "DFS"], tagsAr: ["التراجع", "الشبكة", "السلاسل النصية", "البحث بالعمق"],
  summary: "Finds a word along orthogonally adjacent cells without reusing a cell.", summaryAr: "يجد كلمة عبر خلايا متجاورة أفقياً أو عمودياً دون إعادة استخدام خلية.",
  renderer: "grid",
  pseudocode: ["procedure search(cell, index)", "reject out-of-bounds, reused, or mismatching cells", "choose matching cell", "recurse into four neighbors", "if all fail: unchoose and backtrack", "return whether the word was completed"],
  recurrence: "match the current letter, recurse to four unvisited neighbors, and undo on failure",
  complexity: { time: { best: "O(L)", average: "O(RC·3^L)", worst: "O(RC·3^L)" }, space: "O(L)" },
  how: ["Try each cell as a starting point.", "Choose matching cells along orthogonal edges.", "Undo a path cell when no neighbor completes the word."],
  howAr: ["جرّب كل خلية كنقطة بداية.", "اختر الخلايا المطابقة عبر الحواف الأفقية والعمودية.", "أزل خلية المسار عندما لا يكمل أي جار الكلمة."],
  inputFields: [
    { key: "board", label: "Board rows (; separated)", labelAr: "صفوف الشبكة (تفصلها ;)", placeholder: "ABCE;SFCS;ADEE" },
    { key: "word", label: "Word", labelAr: "الكلمة", placeholder: "ABCCED", search: true },
  ],
  defaultInput: (level) => ({ board: parseBoard("ABCE;SFCS;ADEE"), word: level <= 2 ? "SEE" : "ABCCED" }),
  parseInput: (fields) => {
    const board = parseBoard(fields.board ?? "");
    const word = (fields.word ?? "").trim();
    if (!word || [...word].length > board.length * board[0].length) throw new Error("Word must fit within the board and be nonempty.");
    return { board, word };
  },
  serializeInput: (input) => ({ board: input.board.map((row) => row.join("")).join(";"), word: input.word }),
  generate: wordSearchSteps,
});

type ParenthesesInput = { pairs: number };

function parenthesesSteps(input: ParenthesesInput): Step<CallStackFrame>[] {
  const output: string[] = [];
  const stack: { id: string; label: string; detail: string; state: CellState }[] = [];
  const steps: Step<CallStackFrame>[] = [];
  let choices = 0;
  let backtracks = 0;
  let solutions = 0;
  const snap = (description: string, descriptionAr: string, line: number, phase: string) => {
    steps.push(step({ stack: stack.map((item) => ({ ...item })), output: [...output], note: `${solutions} solutions` },
      description, descriptionAr, line, { choices, backtracks, solutions }, phase));
  };
  const generate = (current: string, open: number, close: number): void => {
    stack.push({ id: `${stack.length}:${current}`, label: current || "∅", detail: `open=${open}, close=${close}`, state: "active" });
    snap(`Enter state "${current}" with open=${open}, close=${close}.`, `ادخل الحالة "${current}" مع open=${open} وclose=${close}.`, 1, "recurse");
    if (current.length === input.pairs * 2) {
      output.push(current);
      solutions++;
      snap(`Record complete sequence "${current}" as solution ${solutions}.`, `سجّل التسلسل الكامل "${current}" كحل ${solutions}.`, 2, "solution");
      stack.pop();
      return;
    }
    if (open < input.pairs) {
      choices++;
      snap(`Choose "(" after "${current}"; open becomes ${open + 1}.`, `اختر "(" بعد "${current}"؛ يصبح open=${open + 1}.`, 3, "choose");
      generate(`${current}(`, open + 1, close);
      backtracks++;
      snap(`Backtrack from "${current}(" to "${current}".`, `تراجع من "${current}(" إلى "${current}".`, 5, "backtrack");
    }
    if (close < open) {
      choices++;
      snap(`Choose ")" after "${current}"; close becomes ${close + 1}.`, `اختر ")" بعد "${current}"؛ يصبح close=${close + 1}.`, 4, "choose");
      generate(`${current})`, open, close + 1);
      backtracks++;
      snap(`Backtrack from "${current})" to "${current}".`, `تراجع من "${current})" إلى "${current}".`, 5, "backtrack");
    }
    stack.pop();
  };
  generate("", 0, 0);
  snap(`Finished: generated ${solutions} valid sequences for ${input.pairs} pairs.`,
    `انتهى: تم توليد ${solutions} تسلسلات صالحة لعدد ${input.pairs} أزواج.`, 6, "result");
  return steps;
}

export const generateParentheses = makeModule<CallStackFrame, ParenthesesInput>({
  slug: "generate-parentheses", title: "Generate Parentheses", titleAr: "توليد الأقواس الصحيحة", category: "backtracking", difficulty: "Intermediate",
  tags: ["backtracking", "Catalan", "recursion", "strings"], tagsAr: ["التراجع", "كاتالان", "العودية", "السلاسل النصية"],
  summary: "Generates every balanced parenthesis string with a fixed number of pairs.", summaryAr: "يولد كل سلسلة أقواس متوازنة لعدد ثابت من الأزواج.",
  renderer: "callstack",
  pseudocode: ["procedure generate(current, open, close)", "if length = 2n: record solution", "if open < n: choose '(' and recurse", "if close < open: choose ')' and recurse", "after each recursive call: backtrack", "return", "report all solutions"],
  recurrence: "append '(' while open<n and ')' only while close<open, then undo each choice",
  complexity: { time: { best: "Θ(Cₙ·n)", average: "Θ(Cₙ·n)", worst: "Θ(Cₙ·n)" }, space: "O(n)" },
  how: ["Track counts of open and close parentheses.", "Never allow closes to exceed opens.", "Record length 2n sequences and undo every recursive choice."],
  howAr: ["تتبّع عدد الأقواس المفتوحة والمغلقة.", "لا تسمح للمغلقة بتجاوز المفتوحة.", "سجّل سلاسل الطول 2n وتراجع عن كل اختيار عودي."],
  inputFields: [{ key: "pairs", label: "Pairs", labelAr: "عدد الأزواج", placeholder: "3" }],
  defaultInput: (level) => ({ pairs: Math.min(1 + level, 5) }),
  parseInput: (fields) => ({ pairs: boundedInteger(fields.pairs ?? "", "Pairs", 0, 6) }),
  serializeInput: (input) => ({ pairs: String(input.pairs) }),
  generate: parenthesesSteps,
});
