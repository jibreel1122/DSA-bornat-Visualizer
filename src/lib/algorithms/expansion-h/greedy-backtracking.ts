import type { ArrayFrame, CallStackFrame, GridFrame, Level, RNG, Step, TableFrame } from "@/lib/engine/types";
import { complexity, integer, integerList, makeHModule, pushBounded, table, traceStep } from "./shared";

const field = (key: string, label: string, labelAr: string, placeholder: string, list = false) => ({
  key, label, labelAr, placeholder, list,
  help: list ? "Comma-separated values." : "Enter a value using the shown format.",
  helpAr: list ? "قيم مفصولة بفواصل." : "أدخل قيمة بالتنسيق الموضح.",
});

// ---------------------------------------------------------------------------
// Gas station
// ---------------------------------------------------------------------------

type GasInput = { gas: number[]; cost: number[] };

function gasSteps(input: GasInput): Step<ArrayFrame>[] {
  const n = input.gas.length;
  let total = 0;
  let tank = 0;
  let start = 0;
  let resets = 0;
  const steps: Step<ArrayFrame>[] = [];
  const frame = (index: number, state: "active" | "discarded" | "found", note: string): ArrayFrame => ({
    values: [...input.gas],
    states: { [index]: state },
    pointers: [{ index: Math.min(start, n - 1), label: "candidate start" }, { index, label: "station" }],
    aux: [
      { label: "travel cost", values: input.cost },
      { label: "net fuel", values: input.gas.map((value, i) => value - input.cost[i]) },
    ],
    note,
  });
  for (let i = 0; i < n; i++) {
    const delta = input.gas[i] - input.cost[i];
    pushBounded(steps, traceStep(frame(i, "active", `tank ${tank} + ${delta}`),
      `At station ${i}, add net fuel ${delta} to the current tank ${tank}.`,
      `عند المحطة ${i} أضف صافي الوقود ${delta} إلى الخزان الحالي ${tank}.`,
      "accumulate", 2, { resets }));
    total += delta;
    tank += delta;
    if (tank < 0) {
      pushBounded(steps, traceStep(frame(i, "discarded", `tank=${tank}; starts 0..${i} fail`),
        `Tank became ${tank}; no start from ${start} through ${i} can cross this boundary.`,
        `أصبح الخزان ${tank}؛ لا يمكن لأي بداية من ${start} حتى ${i} عبور هذا الحد.`,
        "reject-prefix", 3, { resets }));
      start = i + 1;
      tank = 0;
      resets++;
      pushBounded(steps, traceStep(frame(i, "active", `new start=${start}; tank=0`),
        `Reset the candidate start to ${start} and the tank to 0.`,
        `أعد تعيين نقطة البداية إلى ${start} والخزان إلى 0.`,
        "reset", 4, { resets }));
    }
  }
  const answer = total >= 0 ? start % n : -1;
  pushBounded(steps, traceStep(frame(answer >= 0 ? answer : n - 1, answer >= 0 ? "found" : "discarded", `start=${answer}; total=${total}`),
    answer >= 0 ? `A complete circuit is possible from station ${answer}.` : "Total gas is insufficient; no start works.",
    answer >= 0 ? `يمكن إكمال الدورة من المحطة ${answer}.` : "إجمالي الوقود غير كافٍ؛ لا توجد بداية صالحة.",
    "result", 5, { resets }));
  return steps;
}

export const gasStation = makeHModule<ArrayFrame, GasInput>({
  slug: "gas-station",
  title: "Gas Station Circuit",
  titleAr: "دورة محطات الوقود",
  category: "greedy",
  difficulty: "Intermediate",
  tags: ["greedy", "prefix deficit", "circular array"],
  tagsAr: ["جشع", "عجز البادئة", "مصفوفة دائرية"],
  summary: "Finds a start that completes a circular gas route, or proves none exists.",
  summaryAr: "تجد بداية تكمل مسار الوقود الدائري أو تثبت عدم وجودها.",
  renderer: "array",
  pseudocode: ["start = 0; tank = total = 0", "for each station i", "  add gas[i] - cost[i]", "  if tank < 0 reject the current prefix", "  restart at i+1 with empty tank", "return start iff total >= 0"],
  inputFields: [field("gas", "Gas", "الوقود", "1,2,3,4,5", true), field("cost", "Travel costs", "كلفة الانتقال", "3,4,5,1,2", true)],
  defaultInput: (level, rng) => {
    const n = 3 + level;
    const gas = Array.from({ length: n }, () => rng.int(1, 8));
    const cost = Array.from({ length: n }, () => rng.int(1, 7));
    if (gas.reduce((a, b) => a + b, 0) < cost.reduce((a, b) => a + b, 0)) gas[0] += 8;
    return { gas, cost };
  },
  parseInput: (fields) => {
    const gas = integerList(fields.gas, "Gas", 1, 20, 0, 1_000);
    const cost = integerList(fields.cost, "Costs", gas.length, gas.length, 0, 1_000);
    return { gas, cost };
  },
  serializeInput: (input) => ({ gas: input.gas.join(","), cost: input.cost.join(",") }),
  generate: gasSteps,
  complexity: complexity.linear,
  applications: ["Circular route planning", "Resource feasibility", "Prefix-deficit analysis"],
  applicationsAr: ["تخطيط المسارات الدائرية", "صلاحية الموارد", "تحليل عجز البادئة"],
});

// ---------------------------------------------------------------------------
// Jump game
// ---------------------------------------------------------------------------

type ValuesInput = { values: number[] };

function jumpSteps(input: ValuesInput): Step<ArrayFrame>[] {
  const values = input.values;
  let farthest = 0;
  const steps: Step<ArrayFrame>[] = [];
  for (let i = 0; i < values.length; i++) {
    pushBounded(steps, traceStep({
      values: [...values],
      states: { [i]: i <= farthest ? "active" : "discarded" },
      pointers: [{ index: Math.min(farthest, values.length - 1), label: "farthest" }, { index: i, label: "i" }],
      range: { from: 0, to: Math.min(farthest, values.length - 1) },
      note: `before: farthest=${farthest}`,
    }, `Index ${i} is ${i <= farthest ? "reachable" : "outside the reachable prefix"}.`,
    `الفهرس ${i} ${i <= farthest ? "قابل للوصول" : "خارج البادئة القابلة للوصول"}.`,
    "reach-check", 1, { scanned: i }));
    if (i > farthest) {
      pushBounded(steps, traceStep({
        values: [...values], states: { [i]: "discarded" }, range: { from: 0, to: farthest }, note: "reachable=false",
      }, `Cannot reach index ${i}; the final index is impossible.`, `لا يمكن الوصول إلى الفهرس ${i}؛ الوصول للنهاية مستحيل.`,
      "result", 4, { scanned: i + 1 }));
      return steps;
    }
    const candidate = i + values[i];
    pushBounded(steps, traceStep({
      values: [...values], states: { [i]: "compare" },
      pointers: [{ index: Math.min(candidate, values.length - 1), label: "candidate reach" }],
      range: { from: 0, to: Math.min(farthest, values.length - 1) },
      note: `${i}+${values[i]}=${candidate}`,
    }, `Jump capacity ${values[i]} proposes reach ${candidate}.`, `سعة القفز ${values[i]} تقترح وصولاً إلى ${candidate}.`,
    "candidate", 2, { scanned: i + 1 }));
    farthest = Math.max(farthest, candidate);
    pushBounded(steps, traceStep({
      values: [...values], states: { [i]: "visited" },
      pointers: [{ index: Math.min(farthest, values.length - 1), label: "farthest" }],
      range: { from: 0, to: Math.min(farthest, values.length - 1) },
      note: `farthest=${farthest}`,
    }, `Commit farthest reachable index ${farthest}.`, `ثبّت أبعد فهرس قابل للوصول ${farthest}.`,
    "commit-reach", 3, { scanned: i + 1 }));
    if (farthest >= values.length - 1) break;
  }
  pushBounded(steps, traceStep({
    values: [...values], states: { [values.length - 1]: "found" }, range: { from: 0, to: values.length - 1 }, note: "reachable=true",
  }, "The final index is reachable.", "الفهرس الأخير قابل للوصول.", "result", 4));
  return steps;
}

export const jumpGame = makeHModule<ArrayFrame, ValuesInput>({
  slug: "jump-game",
  title: "Jump Game",
  titleAr: "لعبة القفز",
  category: "greedy",
  difficulty: "Beginner",
  tags: ["greedy", "arrays", "reachability"],
  tagsAr: ["جشع", "مصفوفات", "قابلية الوصول"],
  summary: "Maintains the farthest reachable index while scanning once.",
  summaryAr: "تحافظ على أبعد فهرس قابل للوصول أثناء مسح واحد.",
  renderer: "array",
  pseudocode: ["farthest = 0", "for each index i", "  if i > farthest return false", "  farthest = max(farthest, i + nums[i])", "return true when the last index is covered"],
  inputFields: [field("values", "Jump lengths", "أطوال القفز", "2,3,1,1,4", true)],
  defaultInput: (level, rng) => ({ values: Array.from({ length: 3 + level }, () => rng.int(0, Math.min(5, level + 2))) }),
  parseInput: (fields) => ({ values: integerList(fields.values, "Jump lengths", 1, 30, 0, 1_000) }),
  serializeInput: ({ values }) => ({ values: values.join(",") }),
  generate: jumpSteps,
  complexity: complexity.linear,
  applications: ["Reachability checks", "Coverage scans", "Game-state analysis"],
  applicationsAr: ["فحص الوصول", "مسح التغطية", "تحليل حالات الألعاب"],
});

// ---------------------------------------------------------------------------
// Task scheduler
// ---------------------------------------------------------------------------

type SchedulerInput = { tasks: string[]; cooldown: number };

function schedulerSteps(input: SchedulerInput): Step<TableFrame>[] {
  const remaining = new Map<string, number>();
  for (const task of input.tasks) remaining.set(task, (remaining.get(task) ?? 0) + 1);
  const readyAt = new Map<string, number>();
  const timeline: string[] = [];
  const steps: Step<TableFrame>[] = [];
  const names = [...remaining.keys()].sort();
  const view = () => [
    names.map((name) => remaining.get(name) ?? 0),
    names.map((name) => readyAt.get(name) ?? 0),
  ];
  let time = 0;
  let executed = 0;
  while (executed < input.tasks.length) {
    const available = names
      .filter((name) => (remaining.get(name) ?? 0) > 0 && (readyAt.get(name) ?? 0) <= time)
      .sort((a, b) => (remaining.get(b)! - remaining.get(a)!) || a.localeCompare(b));
    pushBounded(steps, traceStep(table(view(), ["remaining", "ready at"], names, undefined,
      `time=${time}; available=${available.join(",") || "none"}`, [], [{ label: "timeline", values: timeline }]),
    available.length ? `At time ${time}, choose among available tasks ${available.join(", ")}.` : `At time ${time}, every remaining task is cooling down.`,
    available.length ? `عند الزمن ${time} اختر من المهام المتاحة ${available.join("، ")}.` : `عند الزمن ${time} كل المهام المتبقية في فترة تهدئة.`,
    "select", 2, { time, executed }));
    if (available.length === 0) {
      timeline.push("idle");
      time++;
      pushBounded(steps, traceStep(table(view(), ["remaining", "ready at"], names, undefined,
        `idle; time=${time}`, [], [{ label: "timeline", values: timeline }]),
      "Insert one idle slot; no legal task can run yet.", "أضف خانة خمول واحدة؛ لا توجد مهمة قانونية الآن.",
      "idle", 3, { time, executed }));
      continue;
    }
    const task = available[0];
    remaining.set(task, remaining.get(task)! - 1);
    readyAt.set(task, time + input.cooldown + 1);
    timeline.push(task);
    executed++;
    pushBounded(steps, traceStep(table(view(), ["remaining", "ready at"], names, [0, names.indexOf(task)],
      `run ${task}; next ready=${readyAt.get(task)}`, [], [{ label: "timeline", values: timeline }]),
    `Run ${task}; it cannot run again before time ${readyAt.get(task)}.`,
    `نفّذ ${task}؛ لا يمكن تنفيذها مجددًا قبل الزمن ${readyAt.get(task)}.`,
    "execute", 4, { time: time + 1, executed }));
    time++;
  }
  pushBounded(steps, traceStep(table(view(), ["remaining", "ready at"], names, undefined,
    `length=${timeline.length}`, [], [{ label: "timeline", values: timeline }]),
  `All tasks finish in ${timeline.length} slots.`, `تنتهي كل المهام في ${timeline.length} خانات.`,
  "result", 5, { time, executed }));
  return steps;
}

export const taskScheduler = makeHModule<TableFrame, SchedulerInput>({
  slug: "task-scheduler",
  title: "Task Scheduler",
  titleAr: "مجدول المهام",
  category: "greedy",
  difficulty: "Intermediate",
  tags: ["greedy", "priority queue", "cooldown"],
  tagsAr: ["جشع", "طابور أولوية", "فترة تهدئة"],
  summary: "Schedules repeated tasks with a mandatory cooldown and minimum idle time.",
  summaryAr: "تجدول المهام المتكررة مع فترة تهدئة إلزامية وأقل وقت خمول.",
  renderer: "table",
  pseudocode: ["count every task", "while tasks remain", "  collect tasks whose cooldown expired", "  if none, append idle", "  else run the most frequent available task", "  set its next ready time", "return timeline length"],
  inputFields: [field("tasks", "Tasks", "المهام", "A,A,A,B,B,B", true), field("cooldown", "Cooldown", "فترة التهدئة", "2")],
  defaultInput: (level, rng) => {
    const kinds = ["A", "B", "C", "D"].slice(0, Math.min(2 + Math.floor(level / 2), 4));
    return { tasks: Array.from({ length: 4 + level }, () => rng.pick(kinds)), cooldown: Math.min(3, level) };
  },
  parseInput: (fields) => {
    const tasks = (fields.tasks ?? "").split(",").map((task) => task.trim()).filter(Boolean);
    if (tasks.length < 1 || tasks.length > 30 || tasks.some((task) => !/^[A-Za-z0-9]$/.test(task))) throw new Error("Use 1-30 one-character task names.");
    return { tasks, cooldown: integer(fields.cooldown, "Cooldown", 0, 10) };
  },
  serializeInput: (input) => ({ tasks: input.tasks.join(","), cooldown: String(input.cooldown) }),
  generate: schedulerSteps,
  complexity: { time: { best: "O(n)", average: "O(n log k)", worst: "O(n log k)" }, space: "O(k+n)" },
  applications: ["CPU scheduling", "Rate-limited jobs", "Batch processing"],
  applicationsAr: ["جدولة المعالج", "مهام محدودة المعدل", "المعالجة الدفعية"],
});

// ---------------------------------------------------------------------------
// Alphametic solver
// ---------------------------------------------------------------------------

type AlphameticInput = { addends: string[]; result: string };

function alphameticSteps(input: AlphameticInput): Step<CallStackFrame>[] {
  const addends = input.addends.map((word) => word.toUpperCase());
  const result = input.result.toUpperCase();
  const leading = new Set([...addends, result].filter((word) => word.length > 1).map((word) => word[0]));
  const assignment = new Map<string, number>();
  const used = new Set<number>();
  const stack: { id: string; label: string; detail: string }[] = [];
  const steps: Step<CallStackFrame>[] = [];
  let attempts = 0;
  let solved = false;
  const emit = (description: string, descriptionAr: string, phase: string, active?: string) => {
    const output = [...assignment.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([letter, digit]) => `${letter}=${digit}`);
    return pushBounded(steps, traceStep({
      stack: stack.map((item) => ({ ...item, state: item.id === active ? "active" : undefined })),
      output,
      aux: [{ label: "used digits", values: [...used].sort((a, b) => a - b) }],
      note: solved ? `solution=${output.join(",")}` : `attempts=${attempts}`,
    }, description, descriptionAr, phase, phase === "choose" ? 2 : phase === "backtrack" ? 5 : 3, { attempts, assigned: assignment.size }));
  };
  const assign = (letter: string, digit: number): boolean => {
    if (used.has(digit) || (digit === 0 && leading.has(letter))) return false;
    assignment.set(letter, digit);
    used.add(digit);
    return true;
  };
  const undo = (letter: string) => {
    const digit = assignment.get(letter);
    if (digit !== undefined) used.delete(digit);
    assignment.delete(letter);
  };
  const solveColumn = (column: number, row: number, carry: number, sum: number): boolean => {
    if (steps.length >= 4990) return false;
    if (column === result.length) {
      solved = carry === 0 && addends.every((word) => column >= word.length);
      emit(solved ? "Every column and final carry agree." : "A nonzero carry remains past the result.", solved ? "توافقت كل الأعمدة والحمل النهائي." : "بقي حمل غير صفري بعد نهاية الناتج.", solved ? "result" : "reject");
      return solved;
    }
    if (row < addends.length) {
      const word = addends[row];
      const index = word.length - 1 - column;
      if (index < 0) return solveColumn(column, row + 1, carry, sum);
      const letter = word[index];
      const known = assignment.get(letter);
      if (known !== undefined) return solveColumn(column, row + 1, carry, sum + known);
      const resultIndex = result.length - 1 - column;
      const resultLetter = result[resultIndex];
      const knownResult = assignment.get(resultLetter);
      if (row === addends.length - 1 && knownResult !== undefined) {
        const digit = ((knownResult - carry - sum) % 10 + 10) % 10;
        attempts++;
        stack.push({ id: `${column}-${row}-${letter}`, label: `${letter}=${digit}`, detail: `forced by ${resultLetter}=${knownResult}` });
        if (used.has(digit) || (digit === 0 && leading.has(letter))) {
          emit(
            `Column ${column} forces ${letter}=${digit}, but that digit is unavailable.`,
            `يفرض العمود ${column} القيمة ${letter}=${digit}، لكن الرقم غير متاح.`,
            "reject",
            `${column}-${row}-${letter}`,
          );
          stack.pop();
          return false;
        }
        assignment.set(letter, digit);
        used.add(digit);
        emit(
          `Column arithmetic forces ${letter}=${digit} from ${resultLetter}=${knownResult}.`,
          `يفرض حساب العمود ${letter}=${digit} من ${resultLetter}=${knownResult}.`,
          "choose",
          `${column}-${row}-${letter}`,
        );
        if (solveColumn(column, row + 1, carry, sum + digit)) return true;
        emit(`Undo forced ${letter}=${digit}.`, `تراجع عن القيمة المفروضة ${letter}=${digit}.`, "backtrack", `${column}-${row}-${letter}`);
        undo(letter);
        stack.pop();
        return false;
      }
      for (let digit = 0; digit <= 9; digit++) {
        attempts++;
        // Used digits and a leading zero are not search states: no assignment
        // or recursion occurs, so skip them without manufacturing a frame.
        if (used.has(digit) || (digit === 0 && leading.has(letter))) continue;
        stack.push({ id: `${column}-${row}-${letter}`, label: `${letter}=${digit}`, detail: `column ${column}` });
        assignment.set(letter, digit);
        used.add(digit);
        emit(`Choose ${letter}=${digit} in column ${column}.`, `اختر ${letter}=${digit} في العمود ${column}.`, "choose", `${column}-${row}-${letter}`);
        if (solveColumn(column, row + 1, carry, sum + digit)) return true;
        emit(`Undo ${letter}=${digit}; this branch cannot satisfy the column.`, `تراجع عن ${letter}=${digit}؛ هذا الفرع لا يحقق العمود.`, "backtrack", `${column}-${row}-${letter}`);
        undo(letter);
        stack.pop();
      }
      return false;
    }
    const total = sum + carry;
    const required = total % 10;
    const nextCarry = Math.floor(total / 10);
    const resultIndex = result.length - 1 - column;
    if (resultIndex < 0) return false;
    const letter = result[resultIndex];
    const known = assignment.get(letter);
    stack.push({ id: `result-${column}`, label: `column ${column}`, detail: `${total} → digit ${required}, carry ${nextCarry}` });
    emit(`Column ${column} requires ${letter}=${required} and carry ${nextCarry}.`, `العمود ${column} يتطلب ${letter}=${required} وحملاً ${nextCarry}.`, "column-check", `result-${column}`);
    if (known !== undefined) {
      const ok = known === required && solveColumn(column + 1, 0, nextCarry, 0);
      if (!ok) emit(`Assigned ${letter}=${known}, so required digit ${required} rejects this branch.`, `القيمة المعينة ${letter}=${known} لا تطابق الرقم المطلوب ${required}.`, "reject", `result-${column}`);
      stack.pop();
      return ok;
    }
    if (!assign(letter, required)) {
      emit(`Cannot assign required ${letter}=${required}.`, `لا يمكن تعيين القيمة المطلوبة ${letter}=${required}.`, "reject", `result-${column}`);
      stack.pop();
      return false;
    }
    emit(`Commit result digit ${letter}=${required}.`, `ثبّت رقم الناتج ${letter}=${required}.`, "choose", `result-${column}`);
    if (solveColumn(column + 1, 0, nextCarry, 0)) return true;
    emit(`Undo result digit ${letter}=${required}.`, `تراجع عن رقم الناتج ${letter}=${required}.`, "backtrack", `result-${column}`);
    undo(letter);
    stack.pop();
    return false;
  };
  emit(`Solve ${addends.join(" + ")} = ${result} from right to left.`, `حل ${addends.join(" + ")} = ${result} من اليمين إلى اليسار.`, "start");
  const longestAddend = Math.max(...addends.map((word) => word.length));
  if (addends.length === 2 && result.length === longestAddend + 1) {
    const carryLetter = result[0];
    assignment.set(carryLetter, 1);
    used.add(1);
    emit(
      `The result has one extra digit, so the final carry forces ${carryLetter}=1.`,
      `للناتج رقم إضافي واحد، لذا يفرض الحمل النهائي ${carryLetter}=1.`,
      "forced-carry",
    );
  }
  solveColumn(0, 0, 0, 0);
  if (!solved) emit("No assignment satisfies every column.", "لا يوجد تعيين يحقق كل الأعمدة.", "failure");
  return steps;
}

export const alphameticSolver = makeHModule<CallStackFrame, AlphameticInput>({
  slug: "alphametic-solver",
  title: "Alphametic Solver",
  titleAr: "حل الألغاز الحسابية الحرفية",
  category: "backtracking",
  difficulty: "Advanced",
  tags: ["backtracking", "constraint satisfaction", "arithmetic"],
  tagsAr: ["تراجع", "إرضاء القيود", "حساب"],
  summary: "Assigns distinct digits to letters while enforcing addition column by column.",
  summaryAr: "تسند أرقامًا مختلفة للحروف مع فرض صحة الجمع عمودًا بعد عمود.",
  renderer: "callstack",
  pseudocode: ["process columns from right to left", "choose an unused digit for each addend letter", "sum the column with carry", "force the result digit", "recurse to the next column", "undo assignments on failure", "return the first full solution"],
  inputFields: [field("addends", "Addends", "الكلمات المضافة", "SEND,MORE", true), field("result", "Result", "الناتج", "MONEY")],
  defaultInput: (level) => [
    { addends: ["I", "BB"], result: "ILL" },
    { addends: ["TWO", "TWO"], result: "FOUR" },
    { addends: ["SEND", "MORE"], result: "MONEY" },
    { addends: ["BASE", "BALL"], result: "GAMES" },
    { addends: ["CROSS", "ROADS"], result: "DANGER" },
  ][level - 1],
  parseInput: (fields) => {
    const addends = (fields.addends ?? "").split(",").map((word) => word.trim().toUpperCase()).filter(Boolean);
    const result = (fields.result ?? "").trim().toUpperCase();
    if (addends.length < 2 || addends.length > 4 || !result || [...addends, result].some((word) => !/^[A-Z]+$/.test(word) || word.length > 7)) throw new Error("Use 2-4 alphabetic addends and one result, each at most 7 letters.");
    if (new Set([...addends.join(""), ...result]).size > 10) throw new Error("At most ten distinct letters are possible.");
    if (result.length < Math.max(...addends.map((word) => word.length)) || result.length > Math.max(...addends.map((word) => word.length)) + 1) throw new Error("Result length is incompatible with addition.");
    return { addends, result };
  },
  serializeInput: (input) => ({ addends: input.addends.join(","), result: input.result }),
  generate: alphameticSteps,
  complexity: complexity.backtracking,
  applications: ["Constraint-solving education", "Cryptarithm puzzles", "Search pruning"],
  applicationsAr: ["تعليم حل القيود", "ألغاز الحساب الحرفي", "تشذيب البحث"],
});

// ---------------------------------------------------------------------------
// Algorithm X / dancing links exact cover
// ---------------------------------------------------------------------------

type ExactCoverInput = { rows: number[][] };

function exactCoverSteps(input: ExactCoverInput): Step<TableFrame>[] {
  const matrixValues = input.rows;
  const rowCount = matrixValues.length;
  const colCount = matrixValues[0].length;
  let activeRows = new Set(Array.from({ length: rowCount }, (_, i) => i));
  let activeCols = new Set(Array.from({ length: colCount }, (_, i) => i));
  const selected: number[] = [];
  const steps: Step<TableFrame>[] = [];
  let branches = 0;
  let solved = false;
  const view = (active?: [number, number], note?: string) => table(
    matrixValues.map((row, r) => row.map((value, c) => activeRows.has(r) && activeCols.has(c) ? value : "·")),
    Array.from({ length: rowCount }, (_, r) => `R${r}`),
    Array.from({ length: colCount }, (_, c) => `C${c}`),
    active,
    note,
    [],
    [{ label: "selected rows", values: selected.map((row) => `R${row}`) }],
  );
  const search = (): boolean => {
    if (activeCols.size === 0) {
      solved = true;
      pushBounded(steps, traceStep(view(undefined, `solution=${selected.join(",")}`), "Every column is covered exactly once.", "غُطي كل عمود مرة واحدة بالضبط.", "result", 6, { branches, depth: selected.length }));
      return true;
    }
    let column = -1;
    let candidates: number[] = [];
    for (const c of activeCols) {
      const rows = [...activeRows].filter((r) => matrixValues[r][c] === 1);
      if (column < 0 || rows.length < candidates.length) {
        column = c;
        candidates = rows;
      }
    }
    pushBounded(steps, traceStep(view(candidates.length ? [candidates[0], column] : undefined, `column=C${column}; candidates=${candidates.length}`),
      `Choose active column C${column}, which has ${candidates.length} candidate rows.`,
      `اختر العمود النشط C${column} وله ${candidates.length} صفوف مرشحة.`,
      "choose-column", 1, { branches, depth: selected.length }));
    if (candidates.length === 0) {
      pushBounded(steps, traceStep(view(undefined, `dead column=C${column}`), `Column C${column} has no covering row.`, `العمود C${column} بلا صف يغطيه.`, "reject", 2, { branches, depth: selected.length }));
      return false;
    }
    for (const row of candidates) {
      branches++;
      selected.push(row);
      pushBounded(steps, traceStep(view([row, column], `choose R${row}`), `Choose row R${row}.`, `اختر الصف R${row}.`, "choose-row", 3, { branches, depth: selected.length }));
      const columnsToCover = [...activeCols].filter((c) => matrixValues[row][c] === 1);
      const coverSnapshots: { column: number; rows: Set<number>; columns: Set<number> }[] = [];
      for (const covered of columnsToCover) {
        coverSnapshots.push({ column: covered, rows: new Set(activeRows), columns: new Set(activeCols) });
        const conflicts = [...activeRows].filter((r) => matrixValues[r][covered] === 1);
        activeCols.delete(covered);
        for (const conflict of conflicts) activeRows.delete(conflict);
        pushBounded(steps, traceStep(view(undefined, `cover C${covered}; remove ${conflicts.map((r) => `R${r}`).join(",")}`),
          `Cover C${covered} and unlink every row that also contains it.`,
          `غطّ C${covered} وافصل كل صف يحتويه أيضًا.`,
          "cover", 4, { branches, depth: selected.length }, { kind: "other", label: "DLX cover" }));
      }
      if (search()) return true;
      for (let index = coverSnapshots.length - 1; index >= 0; index--) {
        const snapshot = coverSnapshots[index];
        activeRows = snapshot.rows;
        activeCols = snapshot.columns;
        pushBounded(steps, traceStep(view([row, snapshot.column], `restore C${snapshot.column} after R${row}`),
          `Uncover C${snapshot.column}; restore exactly the rows and columns removed by that cover.`,
          `اكشف C${snapshot.column}؛ استعد بالضبط الصفوف والأعمدة التي أزالتها خطوة التغطية.`,
          "uncover", 5, { branches, depth: selected.length }, { kind: "other", label: "DLX uncover" }));
      }
      selected.pop();
      pushBounded(steps, traceStep(view(undefined, `backtrack R${row}`), `Backtrack from R${row}.`, `تراجع عن R${row}.`, "backtrack", 5, { branches, depth: selected.length }));
    }
    return false;
  };
  pushBounded(steps, traceStep(view(undefined, "all rows and columns active"), "Start with the complete sparse matrix.", "ابدأ بالمصفوفة المتناثرة الكاملة.", "start", 0));
  search();
  if (!solved) pushBounded(steps, traceStep(view(undefined, "no exact cover"), "No exact cover exists.", "لا يوجد غطاء تام.", "failure", 6, { branches }));
  return steps;
}

export const dancingLinksExactCover = makeHModule<TableFrame, ExactCoverInput>({
  slug: "dancing-links-exact-cover",
  title: "Dancing Links Exact Cover",
  titleAr: "الروابط الراقصة للغطاء التام",
  category: "backtracking",
  difficulty: "Advanced",
  tags: ["backtracking", "Algorithm X", "exact cover", "dancing links"],
  tagsAr: ["تراجع", "خوارزمية X", "غطاء تام", "روابط راقصة"],
  summary: "Uses Algorithm X cover/uncover choices to select rows covering every column once.",
  summaryAr: "تستخدم اختيارات التغطية والاستعادة في خوارزمية X لاختيار صفوف تغطي كل عمود مرة.",
  renderer: "table",
  pseudocode: ["choose the active column with fewest rows", "if it has no row, fail", "for each candidate row", "  cover every column in that row", "  recurse", "  uncover in reverse on failure", "succeed when no columns remain"],
  inputFields: [field("rows", "Binary rows separated by ';'", "الصفوف الثنائية مفصولة بـ ';'", "1,0,0,1;0,1,1,0;1,0,1,0;0,1,0,1")],
  defaultInput: (level) => ({
    rows: level <= 2
      ? [[1, 0, 0, 1], [0, 1, 1, 0], [1, 0, 1, 0], [0, 1, 0, 1]]
      : [[0, 0, 1, 0, 1, 1, 0], [1, 0, 0, 1, 0, 0, 1], [0, 1, 1, 0, 0, 1, 0], [1, 0, 0, 1, 0, 0, 0], [0, 1, 0, 0, 0, 0, 1], [0, 0, 0, 1, 1, 0, 1]],
  }),
  parseInput: (fields) => {
    const rows = (fields.rows ?? "").split(";").map((row) => integerList(row, "Binary row", 1, 12, 0, 1));
    if (rows.length < 1 || rows.length > 20 || rows.some((row) => row.length !== rows[0].length)) throw new Error("Use 1-20 equal-length binary rows.");
    if (rows[0].length > 12) throw new Error("Use at most 12 columns.");
    return { rows };
  },
  serializeInput: ({ rows }) => ({ rows: rows.map((row) => row.join(",")).join(";") }),
  generate: exactCoverSteps,
  complexity: complexity.backtracking,
  applications: ["Sudoku solvers", "Polyomino tiling", "Exact resource selection"],
  applicationsAr: ["حل السودوكو", "تبليط الأشكال", "اختيار الموارد الدقيق"],
});

// ---------------------------------------------------------------------------
// Rectangular Kakuro special case (all cells are fillable)
// ---------------------------------------------------------------------------

type KakuroInput = { rows: number; cols: number; rowSums: number[]; colSums: number[] };

function kakuroSteps(input: KakuroInput): Step<GridFrame>[] {
  const board = Array.from({ length: input.rows }, () => Array<number>(input.cols).fill(0));
  const steps: Step<GridFrame>[] = [];
  const rowUsed = Array.from({ length: input.rows }, () => new Set<number>());
  const colUsed = Array.from({ length: input.cols }, () => new Set<number>());
  let attempts = 0;
  let solved = false;
  const frame = (active?: [number, number], state: "active" | "compare" | "discarded" | "found" = "active", note = ""): GridFrame => ({
    rows: input.rows,
    cols: input.cols,
    cells: board.map((row, r) => row.map((value, c) => ({ value: value || "", state: active?.[0] === r && active[1] === c ? state : value ? "visited" : undefined }))),
    aux: [
      { label: "row targets", values: input.rowSums },
      { label: "column targets", values: input.colSums },
    ],
    note,
  });
  const valid = (r: number, c: number, digit: number): boolean => {
    if (rowUsed[r].has(digit) || colUsed[c].has(digit)) return false;
    const rowPartial = board[r].reduce((sum, value) => sum + value, 0) + digit;
    const colPartial = board.reduce((sum, row) => sum + row[c], 0) + digit;
    if (rowPartial > input.rowSums[r] || colPartial > input.colSums[c]) return false;
    if (c === input.cols - 1 && rowPartial !== input.rowSums[r]) return false;
    if (r === input.rows - 1 && colPartial !== input.colSums[c]) return false;
    return true;
  };
  const solve = (index: number): boolean => {
    if (index === input.rows * input.cols) {
      solved = true;
      pushBounded(steps, traceStep(frame(undefined, "found", "all runs satisfied"), "Every row and column run satisfies its clue.", "كل مسارات الصفوف والأعمدة تحقق تلميحاتها.", "result", 6, { attempts }));
      return true;
    }
    const r = Math.floor(index / input.cols);
    const c = index % input.cols;
    for (let digit = 1; digit <= 9; digit++) {
      attempts++;
      pushBounded(steps, traceStep(frame([r, c], "compare", `try ${digit}`), `Try digit ${digit} at (${r}, ${c}).`, `جرّب الرقم ${digit} في (${r}، ${c}).`, "candidate", 2, { attempts }));
      if (!valid(r, c, digit)) {
        pushBounded(steps, traceStep(frame([r, c], "discarded", `reject ${digit}`), `Reject ${digit}: uniqueness, partial sum, or completed clue would fail.`, `ارفض ${digit}: سيفشل التفرد أو المجموع الجزئي أو التلميح المكتمل.`, "reject", 3, { attempts }));
        continue;
      }
      board[r][c] = digit;
      rowUsed[r].add(digit);
      colUsed[c].add(digit);
      pushBounded(steps, traceStep(frame([r, c], "active", `place ${digit}`), `Place ${digit}; all visible partial sums remain feasible.`, `ضع ${digit}؛ تبقى كل المجاميع الجزئية الظاهرة ممكنة.`, "place", 4, { attempts }));
      if (solve(index + 1)) return true;
      board[r][c] = 0;
      rowUsed[r].delete(digit);
      colUsed[c].delete(digit);
      pushBounded(steps, traceStep(frame([r, c], "discarded", `remove ${digit}`), `Remove ${digit} and try the next candidate.`, `احذف ${digit} وجرّب المرشح التالي.`, "backtrack", 5, { attempts }));
      if (steps.length >= 4990) return false;
    }
    return false;
  };
  pushBounded(steps, traceStep(frame(undefined, "active", "empty puzzle"), "Start with every fillable cell empty.", "ابدأ بكل الخلايا القابلة للملء فارغة.", "start", 0));
  solve(0);
  if (!solved) pushBounded(steps, traceStep(frame(undefined, "discarded", "no solution"), "No filling satisfies every clue.", "لا يوجد ملء يحقق كل التلميحات.", "failure", 6, { attempts }));
  return steps;
}

export const kakuroSolver = makeHModule<GridFrame, KakuroInput>({
  slug: "kakuro-solver",
  title: "Kakuro Solver",
  titleAr: "حل كاكورو",
  category: "backtracking",
  difficulty: "Advanced",
  tags: ["backtracking", "Kakuro", "constraint satisfaction", "grid"],
  tagsAr: ["تراجع", "كاكورو", "إرضاء القيود", "شبكة"],
  summary: "Fills a rectangular Kakuro run grid with unique digits matching row and column clues.",
  summaryAr: "تملأ شبكة مسارات كاكورو مستطيلة بأرقام فريدة تطابق تلميحات الصفوف والأعمدة.",
  renderer: "grid",
  pseudocode: ["visit the next empty cell", "try digits 1 through 9", "reject row/column duplicates", "reject impossible partial or completed sums", "place a feasible digit and recurse", "remove it on failure", "succeed when every clue is exact"],
  inputFields: [field("rows", "Rows", "الصفوف", "3"), field("cols", "Columns", "الأعمدة", "3"), field("rowSums", "Row clues", "تلميحات الصفوف", "6,9,12", true), field("colSums", "Column clues", "تلميحات الأعمدة", "6,9,12", true)],
  defaultInput: (level: Level, rng: RNG) => {
    const size = Math.min(2 + Math.floor(level / 2), 4);
    const offset = rng.int(0, 2);
    const solution = Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => ((r + c + offset) % size) + 1));
    return {
      rows: size,
      cols: size,
      rowSums: solution.map((row) => row.reduce((sum, value) => sum + value, 0)),
      colSums: Array.from({ length: size }, (_, c) => solution.reduce((sum, row) => sum + row[c], 0)),
    };
  },
  parseInput: (fields) => {
    const rows = integer(fields.rows, "Rows", 1, 4);
    const cols = integer(fields.cols, "Columns", 1, 4);
    const rowSums = integerList(fields.rowSums, "Row clues", rows, rows, 1, 45);
    const colSums = integerList(fields.colSums, "Column clues", cols, cols, 1, 45);
    return { rows, cols, rowSums, colSums };
  },
  serializeInput: (input) => ({ rows: String(input.rows), cols: String(input.cols), rowSums: input.rowSums.join(","), colSums: input.colSums.join(",") }),
  generate: kakuroSteps,
  complexity: complexity.backtracking,
  applications: ["Puzzle solving", "Constraint propagation", "Backtracking education"],
  applicationsAr: ["حل الألغاز", "نشر القيود", "تعليم التراجع"],
});
