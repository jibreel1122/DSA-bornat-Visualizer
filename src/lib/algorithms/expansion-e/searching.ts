import { randomArray } from "@/lib/engine/random";
import type { ArrayFrame, Level, RNG, Step, TableFrame } from "@/lib/engine/types";
import {
  arrayFrame,
  makeModule,
  numberFields,
  parseNumbers,
  serializeSearchInput,
  step,
  tableFrame,
  targetFields,
  type SearchInput,
} from "./shared";

function rotatedDefault(level: Level, rng: RNG): SearchInput {
  const values = randomArray(level, rng, { min: -30, max: 80, sorted: true }).slice(0, 5 + level * 2);
  const pivot = rng.int(0, values.length - 1);
  const rotated = [...values.slice(pivot), ...values.slice(0, pivot)];
  return { values: rotated, target: rng.next() < 0.8 ? rng.pick(rotated) : 101 };
}

function isRotatedSorted(values: number[]): boolean {
  let descents = 0;
  for (let i = 0; i < values.length; i++) {
    if (values[i] > values[(i + 1) % values.length]) descents++;
  }
  return descents <= 1;
}

function parseTarget(fields: Record<string, string>, sorted = false, rotated = false): SearchInput {
  const values = parseNumbers(fields.values ?? "", { maxCount: 32 });
  if (sorted && values.some((value, index) => index > 0 && values[index - 1] > value)) {
    throw new Error("Values must be sorted in nondecreasing order.");
  }
  if (rotated && !isRotatedSorted(values)) {
    throw new Error("Values must be a rotation of a nondecreasing array.");
  }
  const target = Number((fields.target ?? "").trim());
  if (!Number.isInteger(target)) throw new Error("Target must be an integer.");
  return { values, target };
}

function rotatedArraySteps(input: SearchInput): Step<ArrayFrame>[] {
  const values = [...input.values];
  const steps: Step<ArrayFrame>[] = [];
  const counters = { comparisons: 0, discarded: 0, duplicateShrinks: 0 };
  let low = 0;
  let high = values.length - 1;
  let result = -1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    counters.comparisons++;
    steps.push(step(
      arrayFrame(values, { [low]: "active", [mid]: "compare", [high]: "active" }, {
        range: { from: low, to: high },
        pointers: [{ index: low, label: "low" }, { index: mid, label: "mid" }, { index: high, label: "high" }],
      }),
      `Inspect middle value ${values[mid]} inside rotated interval [${low}, ${high}].`,
      `افحص القيمة الوسطى ${values[mid]} داخل المجال الدوّار [${low}، ${high}].`,
      1,
      counters,
      "inspect-middle",
    ));
    if (values[mid] === input.target) {
      result = mid;
      steps.push(step(
        arrayFrame(values, { [mid]: "found" }, { range: { from: low, to: high }, aux: [{ label: "Result", values: [result] }] }),
        `Found ${input.target} at index ${mid}.`,
        `وُجدت ${input.target} في الموضع ${mid}.`,
        2,
        counters,
        "found",
      ));
      break;
    }
    if (values[low] === values[mid] && values[mid] === values[high]) {
      low++;
      high--;
      counters.duplicateShrinks++;
      counters.discarded += 2;
      steps.push(step(
        arrayFrame(values, {}, { range: low <= high ? { from: low, to: high } : null }),
        "Equal boundaries hide the sorted half; discard one duplicate from each end.",
        "تُخفي الحدود المتساوية النصف المرتب؛ تجاهل نسخة من كل طرف.",
        3,
        counters,
        "shrink-duplicates",
      ));
    } else if (values[low] <= values[mid]) {
      counters.comparisons += 2;
      if (values[low] <= input.target && input.target < values[mid]) {
        counters.discarded += high - mid + 1;
        high = mid - 1;
      } else {
        counters.discarded += mid - low + 1;
        low = mid + 1;
      }
      steps.push(step(
        arrayFrame(values, {}, { range: low <= high ? { from: low, to: high } : null }),
        "The left half is sorted; retain only the half that can contain the target.",
        "النصف الأيسر مرتب؛ أبقِ فقط النصف الذي يمكن أن يحتوي الهدف.",
        5,
        counters,
        "discard-half",
      ));
    } else {
      counters.comparisons += 2;
      if (values[mid] < input.target && input.target <= values[high]) {
        counters.discarded += mid - low + 1;
        low = mid + 1;
      } else {
        counters.discarded += high - mid + 1;
        high = mid - 1;
      }
      steps.push(step(
        arrayFrame(values, {}, { range: low <= high ? { from: low, to: high } : null }),
        "The right half is sorted; retain only the half that can contain the target.",
        "النصف الأيمن مرتب؛ أبقِ فقط النصف الذي يمكن أن يحتوي الهدف.",
        7,
        counters,
        "discard-half",
      ));
    }
  }
  if (result < 0) {
    steps.push(step(
      arrayFrame(values, {}, { range: null, aux: [{ label: "Result", values: [-1] }] }),
      `${input.target} is absent because the search interval is empty.`,
      `القيمة ${input.target} غير موجودة لأن مجال البحث أصبح فارغاً.`,
      7,
      counters,
      "not-found",
    ));
  }
  return steps;
}

function peakSteps(input: { values: number[] }): Step<ArrayFrame>[] {
  const values = [...input.values];
  const steps: Step<ArrayFrame>[] = [];
  const counters = { comparisons: 0, discarded: 0 };
  let low = 0;
  let high = values.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    counters.comparisons++;
    steps.push(step(
      arrayFrame(values, { [mid]: "compare", [mid + 1]: "compare" }, {
        range: { from: low, to: high },
        pointers: [{ index: mid, label: "mid" }, { index: mid + 1, label: "mid+1" }],
      }),
      `Compare slope values ${values[mid]} and ${values[mid + 1]}.`,
      `قارن قيمتي الميل ${values[mid]} و${values[mid + 1]}.`,
      2,
      counters,
      "slope",
    ));
    if (values[mid] < values[mid + 1]) {
      counters.discarded += mid - low + 1;
      low = mid + 1;
      steps.push(step(
        arrayFrame(values, {}, { range: { from: low, to: high } }),
        "The slope rises rightward, so a peak exists in the right interval.",
        "يرتفع الميل يميناً، لذا توجد قمة في المجال الأيمن.",
        3,
        counters,
        "move-right",
      ));
    } else {
      counters.discarded += high - mid;
      high = mid;
      steps.push(step(
        arrayFrame(values, {}, { range: { from: low, to: high } }),
        "The slope does not rise, so a peak exists at mid or to its left.",
        "لا يرتفع الميل، لذا توجد قمة عند الوسط أو إلى يساره.",
        4,
        counters,
        "move-left",
      ));
    }
  }
  steps.push(step(
    arrayFrame(values, { [low]: "found" }, { range: { from: low, to: low }, aux: [{ label: "Peak", values: [low, values[low]] }] }),
    `Index ${low} is a peak with value ${values[low]}.`,
    `الموضع ${low} قمة وقيمته ${values[low]}.`,
    4,
    counters,
    "result",
  ));
  return steps;
}

type MatrixInput = { matrix: number[][]; target: number };

const matrixFields = [
  {
    key: "matrix",
    label: "Sorted matrix",
    labelAr: "المصفوفة المرتبة",
    placeholder: "1,4,7; 2,5,8; 3,6,9",
    help: "Rows separated by semicolons; every row and column must be nondecreasing.",
    helpAr: "افصل الصفوف بفواصل منقوطة؛ يجب أن تكون الصفوف والأعمدة غير متناقصة.",
  },
  {
    key: "target",
    label: "Target",
    labelAr: "القيمة المطلوبة",
    placeholder: "5",
    search: true,
  },
];

function parseMatrix(fields: Record<string, string>): MatrixInput {
  const rawRows = (fields.matrix ?? "").split(/[;\n]+/).map((row) => row.trim()).filter(Boolean);
  if (rawRows.length < 1 || rawRows.length > 10) throw new Error("Matrix must have 1-10 rows.");
  const matrix = rawRows.map((row) => parseNumbers(row, { maxCount: 10 }));
  const columns = matrix[0].length;
  if (matrix.some((row) => row.length !== columns)) throw new Error("Every matrix row must have the same length.");
  for (let row = 0; row < matrix.length; row++) {
    for (let column = 0; column < columns; column++) {
      if (column > 0 && matrix[row][column - 1] > matrix[row][column]) throw new Error("Matrix rows must be nondecreasing.");
      if (row > 0 && matrix[row - 1][column] > matrix[row][column]) throw new Error("Matrix columns must be nondecreasing.");
    }
  }
  const target = Number((fields.target ?? "").trim());
  if (!Number.isInteger(target)) throw new Error("Target must be an integer.");
  return { matrix, target };
}

function matrixDefault(level: Level, rng: RNG): MatrixInput {
  const size = Math.min(2 + level, 6);
  const values: number[] = [];
  let current = rng.int(-20, 0);
  for (let i = 0; i < size * size; i++) {
    current += rng.int(0, 4);
    values.push(current);
  }
  const matrix = Array.from({ length: size }, (_, row) => values.slice(row * size, (row + 1) * size));
  return { matrix, target: rng.next() < 0.8 ? rng.pick(values) : current + 5 };
}

function matrixSteps(input: MatrixInput): Step<TableFrame>[] {
  const matrix = input.matrix.map((row) => [...row]);
  const rowLabels = matrix.map((_, index) => `r${index}`);
  const colLabels = matrix[0].map((_, index) => `c${index}`);
  const steps: Step<TableFrame>[] = [];
  const counters = { comparisons: 0, discardedCells: 0 };
  let row = 0;
  let column = matrix[0].length - 1;
  let found: [number, number] | null = null;
  while (row < matrix.length && column >= 0) {
    counters.comparisons++;
    steps.push(step(
      tableFrame(rowLabels, colLabels, matrix, {
        active: [row, column],
        aux: [{ label: "Target", values: [input.target] }],
      }),
      `Compare top-right candidate matrix[${row}][${column}] = ${matrix[row][column]} with ${input.target}.`,
      `قارن مرشح أعلى اليمين matrix[${row}][${column}] = ${matrix[row][column]} مع ${input.target}.`,
      2,
      counters,
      "compare",
    ));
    if (matrix[row][column] === input.target) {
      found = [row, column];
      break;
    }
    if (matrix[row][column] > input.target) {
      counters.discardedCells += matrix.length - row;
      column--;
      steps.push(step(
        tableFrame(rowLabels, colLabels, matrix, {
          active: column >= 0 ? [row, column] : null,
          aux: [{ label: "Move", values: ["left"] }],
        }),
        "The candidate is too large, so discard its entire column suffix and move left.",
        "المرشح أكبر من الهدف، لذا تجاهل بقية عموده وانتقل يساراً.",
        4,
        counters,
        "move-left",
      ));
    } else {
      counters.discardedCells += column + 1;
      row++;
      steps.push(step(
        tableFrame(rowLabels, colLabels, matrix, {
          active: row < matrix.length ? [row, column] : null,
          aux: [{ label: "Move", values: ["down"] }],
        }),
        "The candidate is too small, so discard its row prefix and move down.",
        "المرشح أصغر من الهدف، لذا تجاهل بادئة صفه وانتقل إلى الأسفل.",
        5,
        counters,
        "move-down",
      ));
    }
  }
  steps.push(step(
    tableFrame(rowLabels, colLabels, matrix, {
      active: found,
      aux: [{ label: "Result", values: found ?? [-1, -1] }],
    }),
    found ? `Found ${input.target} at row ${found[0]}, column ${found[1]}.` : `${input.target} is absent from the matrix.`,
    found ? `وُجدت ${input.target} في الصف ${found[0]} والعمود ${found[1]}.` : `القيمة ${input.target} غير موجودة في المصفوفة.`,
    5,
    counters,
    found ? "found" : "not-found",
  ));
  return steps;
}

function boundsDefault(level: Level, rng: RNG): SearchInput {
  const values = randomArray(level, rng, { min: -20, max: 50, sorted: true }).slice(0, 5 + level * 2);
  if (values.length >= 3) values[Math.floor(values.length / 2)] = values[Math.floor(values.length / 2) - 1];
  values.sort((a, b) => a - b);
  return { values, target: rng.next() < 0.8 ? rng.pick(values) : 51 };
}

function boundSearch(values: number[], target: number, upper: boolean, steps: Step<ArrayFrame>[], counters: { comparisons: number; windows: number }, label: string): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    counters.comparisons++;
    counters.windows++;
    steps.push(step(
      arrayFrame(values, { [mid]: "compare" }, {
        range: low < high ? { from: low, to: high - 1 } : null,
        pointers: [{ index: low, label: "low" }, { index: mid, label: "mid" }, { index: high, label: "exclusive high" }],
      }),
      `${label}: compare ${values[mid]} with ${target}.`,
      `${label}: قارن ${values[mid]} مع ${target}.`,
      upper ? 5 : 2,
      counters,
      upper ? "upper-bound" : "lower-bound",
    ));
    if (values[mid] < target || (upper && values[mid] === target)) low = mid + 1;
    else high = mid;
  }
  return low;
}

function boundsSteps(input: SearchInput): Step<ArrayFrame>[] {
  const values = [...input.values];
  const steps: Step<ArrayFrame>[] = [];
  const counters = { comparisons: 0, windows: 0 };
  const lower = boundSearch(values, input.target, false, steps, counters, "lower_bound");
  steps.push(step(
    arrayFrame(values, lower < values.length ? { [lower]: "found" } : {}, {
      pointers: [{ index: lower, label: "lower" }],
      aux: [{ label: "Lower bound", values: [lower] }],
    }),
    `Lower bound is index ${lower}, the first position whose value is not less than ${input.target}.`,
    `الحد الأدنى هو الموضع ${lower}، أول موضع لا تقل قيمته عن ${input.target}.`,
    3,
    counters,
    "lower-result",
  ));
  const upper = boundSearch(values, input.target, true, steps, counters, "upper_bound");
  steps.push(step(
    arrayFrame(values, Object.fromEntries([lower, upper].filter((index) => index < values.length).map((index) => [index, "found"])), {
      pointers: [{ index: lower, label: "lower" }, { index: upper, label: "upper" }],
      aux: [{ label: "Bounds", values: [lower, upper] }, { label: "Equal range", values: values.slice(lower, upper) }],
    }),
    `Upper bound is index ${upper}; equal values occupy [${lower}, ${upper}).`,
    `الحد الأعلى هو الموضع ${upper}؛ تشغل القيم المساوية المجال [${lower}، ${upper}).`,
    6,
    counters,
    "result",
  ));
  return steps;
}

export const rotatedArraySearch = makeModule({
  slug: "rotated-array-search",
  title: "Rotated Array Search",
  titleAr: "البحث في مصفوفة مدوّرة",
  category: "searching",
  difficulty: "Intermediate",
  tags: ["searching", "binary search", "rotated array"],
  tagsAr: ["بحث", "بحث ثنائي", "مصفوفة مدوّرة"],
  summary: "Finds a target by identifying the sorted half of each rotated search interval.",
  summaryAr: "يجد الهدف بتحديد النصف المرتب من كل مجال بحث مدوّر.",
  renderer: "array",
  pseudocode: [
    "While low <= high, inspect mid",
    "Return mid when target matches",
    "Shrink equal duplicate boundaries",
    "If the left half is sorted",
    "Keep it only when target lies inside",
    "Otherwise the right half is sorted",
    "Keep it only when target lies inside",
    "Return not found",
  ],
  complexity: { time: { best: "O(1)", average: "O(log n)", worst: "O(n)" }, space: "O(1)", notes: "Duplicates can force linear shrinking." },
  invariant: "If the target exists, it remains inside the retained interval.",
  invariantAr: "إذا كان الهدف موجوداً فإنه يبقى داخل المجال المحتفظ به.",
  how: ["Inspect the midpoint.", "Identify a sorted half.", "Discard only a half that cannot contain the target."],
  howAr: ["افحص المنتصف.", "حدد نصفاً مرتباً.", "تجاهل فقط النصف الذي لا يمكن أن يحتوي الهدف."],
  inputFields: targetFields,
  defaultInput: rotatedDefault,
  parseInput: (fields) => parseTarget(fields, false, true),
  serializeInput: serializeSearchInput,
  generate: rotatedArraySteps,
});

export const peakFinding = makeModule({
  slug: "peak-finding",
  title: "Peak Finding",
  titleAr: "إيجاد القمة",
  category: "searching",
  difficulty: "Intermediate",
  tags: ["searching", "binary search", "peak"],
  tagsAr: ["بحث", "بحث ثنائي", "قمة"],
  summary: "Uses the local slope to locate an element not smaller than its neighbors.",
  summaryAr: "يستخدم الميل المحلي لإيجاد عنصر لا يقل عن جيرانه.",
  renderer: "array",
  pseudocode: [
    "Set low and high to array boundaries",
    "While low < high, choose mid",
    "If values[mid] < values[mid+1], move low right",
    "Otherwise move high to mid",
    "Return low as a peak",
  ],
  complexity: { time: { best: "O(1)", average: "O(log n)", worst: "O(log n)" }, space: "O(1)" },
  invariant: "The retained interval always contains at least one peak.",
  invariantAr: "يحتوي المجال المحتفظ به دائماً على قمة واحدة على الأقل.",
  how: ["Compare a midpoint with its right neighbor.", "Follow a rising slope; otherwise retain the left side."],
  howAr: ["قارن المنتصف بجاره الأيمن.", "اتبع الميل الصاعد؛ وإلا احتفظ بالجانب الأيسر."],
  inputFields: numberFields,
  defaultInput: (level, rng) => ({ values: randomArray(level, rng, { min: -30, max: 70 }).slice(0, 5 + level * 2) }),
  parseInput: (fields) => ({ values: parseNumbers(fields.values ?? "", { maxCount: 40 }) }),
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate: peakSteps,
});

export const matrixSearch = makeModule({
  slug: "matrix-search",
  title: "Sorted Matrix Search",
  titleAr: "البحث في مصفوفة مرتبة",
  category: "searching",
  difficulty: "Intermediate",
  tags: ["searching", "matrix", "staircase"],
  tagsAr: ["بحث", "مصفوفة", "مسار سُلّمي"],
  summary: "Walks from the top-right corner of a row- and column-sorted matrix.",
  summaryAr: "يسير من الزاوية العليا اليمنى لمصفوفة مرتبة صفياً وعمودياً.",
  renderer: "table",
  pseudocode: [
    "Start at top-right",
    "Compare the current cell with target",
    "Return its coordinates if equal",
    "Move left when the cell is too large",
    "Move down when the cell is too small",
    "Return not found after leaving the matrix",
  ],
  complexity: { time: { best: "O(1)", average: "O(rows + cols)", worst: "O(rows + cols)" }, space: "O(1)" },
  invariant: "All cells that could still match lie in the rectangle below and left of the cursor.",
  invariantAr: "تقع كل الخلايا التي قد تطابق الهدف في المستطيل أسفل المؤشر ويساره.",
  how: ["Begin at top-right.", "Move left for a large value and down for a small value."],
  howAr: ["ابدأ من أعلى اليمين.", "انتقل يساراً للقيمة الكبيرة وأسفل للقيمة الصغيرة."],
  inputFields: matrixFields,
  defaultInput: matrixDefault,
  parseInput: parseMatrix,
  serializeInput: (input) => ({
    matrix: input.matrix.map((row) => row.join(", ")).join("; "),
    target: String(input.target),
  }),
  generate: matrixSteps,
});

export const lowerUpperBound = makeModule({
  slug: "lower-upper-bound",
  title: "Lower and Upper Bound",
  titleAr: "الحد الأدنى والحد الأعلى",
  category: "searching",
  difficulty: "Intermediate",
  tags: ["searching", "binary search", "equal range"],
  tagsAr: ["بحث", "بحث ثنائي", "مجال القيم المتساوية"],
  summary: "Computes the first position not below the target and the first position above it.",
  summaryAr: "يحسب أول موضع لا يقل عن الهدف وأول موضع يزيد عليه.",
  renderer: "array",
  pseudocode: [
    "Binary-search first value >= target",
    "Move low when mid value is smaller",
    "Save low as lower_bound",
    "Binary-search first value > target",
    "Move low when mid value is <= target",
    "Save low as upper_bound",
    "Return [lower_bound, upper_bound)",
  ],
  complexity: { time: { best: "O(log n)", average: "O(log n)", worst: "O(log n)" }, space: "O(1)" },
  invariant: "Indices below low fail the bound predicate and indices at or above high satisfy it.",
  invariantAr: "تفشل الفهارس قبل low شرط الحد وتحققه الفهارس عند high أو بعده.",
  how: ["Run two boundary binary searches.", "Interpret their half-open interval as all equal values."],
  howAr: ["نفّذ بحثين ثنائيين للحدود.", "اعتبر مجالهما نصف المفتوح جميع القيم المتساوية."],
  inputFields: targetFields,
  defaultInput: boundsDefault,
  parseInput: (fields) => parseTarget(fields, true),
  serializeInput: serializeSearchInput,
  generate: boundsSteps,
});

export const searchingModules = [
  rotatedArraySearch,
  peakFinding,
  matrixSearch,
  lowerUpperBound,
] as const;
