import type { AlgorithmModule, AuxRow, CellState, Step, TableFrame } from "@/lib/engine/types";

type Job = { id: string; deadline: number; profit: number };
type Input = { jobs: Job[] };

function generate(input: Input): Step<TableFrame>[] {
  const order = [...input.jobs].sort((a, b) => b.profit - a.profit);
  const maxD = Math.max(...order.map((j) => j.deadline));
  const slots: (string | null)[] = new Array(maxD).fill(null);
  const steps: Step<TableFrame>[] = [];
  let scheduled = 0;
  let totalProfit = 0;

  const rowLabels = order.map((j) => `job ${j.id}`);
  const colLabels = ["deadline", "profit", "slot"];
  const assignedSlot: (number | null | "—")[] = new Array(order.length).fill(null);

  const slotAux = (probing: number | null): AuxRow => {
    const states: Record<number, CellState> = {};
    for (let i = 0; i < maxD; i++) states[i] = slots[i] ? "sorted" : "default";
    if (probing !== null && probing >= 0 && probing < maxD) states[probing] = slots[probing] ? "swap" : "active";
    return {
      label: "time slots (t1…)",
      values: slots.map((s, i) => (s ? s : `t${i + 1}`)),
      states,
    };
  };

  const frame = (activeRow: number | null, probing: number | null, description: string, codeLine: number, descriptionAr?: string): void => {
    const cells = order.map((j, i) => {
      const rs: CellState | undefined = activeRow === i ? "active" : assignedSlot[i] === "—" ? "discarded" : assignedSlot[i] !== null ? "sorted" : undefined;
      return [
        { value: j.deadline, state: rs },
        { value: j.profit, state: rs },
        { value: assignedSlot[i] === null ? null : assignedSlot[i] === "—" ? "rejected" : `t${(assignedSlot[i] as number) + 1}`, state: rs },
      ];
    });
    steps.push({
      frame: {
        rowLabels,
        colLabels,
        cells,
        aux: [slotAux(probing), { label: "total profit", values: [totalProfit] }],
        note: `greedy: highest-profit jobs first; place each in the latest free slot ≤ its deadline`,
      },
      description,
      descriptionAr,
      codeLine,
      counters: { scheduled, profit: totalProfit },
    });
  };

  frame(
    null,
    null,
    `Job sequencing with deadlines. Sort jobs by profit (highest first); each job takes one time unit.`,
    1,
    `جدولة المهام بمواعيد نهائية. رتّب المهام حسب الربح (الأعلى أولًا)؛ كل مهمة تستغرق وحدة زمنية واحدة.`,
  );

  for (let i = 0; i < order.length; i++) {
    const j = order[i];
    frame(
      i,
      null,
      `Consider job ${j.id}: profit ${j.profit}, deadline ${j.deadline}. Look for a free slot at or before t${j.deadline}.`,
      3,
      `تأمّل المهمة ${j.id}: الربح ${j.profit}، الموعد النهائي ${j.deadline}. ابحث عن فتحة شاغرة عند t${j.deadline} أو قبلها.`,
    );
    let placed = false;
    for (let t = Math.min(maxD, j.deadline) - 1; t >= 0; t--) {
      frame(
        i,
        t,
        `Probe slot t${t + 1}: ${slots[t] ? `taken by ${slots[t]}` : "free"}.`,
        4,
        `افحص الفتحة t${t + 1}: ${slots[t] ? `مشغولة بواسطة ${slots[t]}` : "شاغرة"}.`,
      );
      if (slots[t] === null) {
        slots[t] = j.id;
        assignedSlot[i] = t;
        totalProfit += j.profit;
        scheduled++;
        placed = true;
        frame(
          i,
          t,
          `Place job ${j.id} in slot t${t + 1}. Profit +${j.profit} → ${totalProfit}.`,
          5,
          `ضع المهمة ${j.id} في الفتحة t${t + 1}. الربح +${j.profit} → ${totalProfit}.`,
        );
        break;
      }
    }
    if (!placed) {
      assignedSlot[i] = "—";
      frame(
        i,
        null,
        `No free slot ≤ deadline ${j.deadline} for job ${j.id} — it is rejected.`,
        6,
        `لا توجد فتحة شاغرة ≤ الموعد النهائي ${j.deadline} للمهمة ${j.id} — تُستبعد.`,
      );
    }
  }

  const seq = slots.map((s, i) => (s ? `t${i + 1}:${s}` : `t${i + 1}:—`)).join(", ");
  frame(
    null,
    null,
    `Done. Schedule: ${seq}. Maximum profit = ${totalProfit} from ${scheduled} job(s).`,
    6,
    `انتهى. الجدول: ${seq}. أقصى ربح = ${totalProfit} من ${scheduled} مهمة/مهام.`,
  );
  return steps;
}

function randomInput(level: number, rng: { int: (a: number, b: number) => number }): Input {
  const n = Math.min(6, 3 + level);
  const jobs: Job[] = Array.from({ length: n }, (_, i) => ({
    id: String.fromCharCode(65 + i),
    deadline: rng.int(1, Math.min(n, 4)),
    profit: rng.int(10, 100),
  }));
  return { jobs };
}

const mod: AlgorithmModule<TableFrame, Input> = {
  slug: "job-sequencing",
  title: "Job Sequencing with Deadlines",
  titleAr: "جدولة المهام بمواعيد نهائية",
  category: "greedy",
  difficulty: "Intermediate",
  tags: ["greedy", "scheduling", "deadlines", "profit"],
  tagsAr: ["جشِع", "جدولة", "مواعيد نهائية", "ربح"],
  summary: "Schedules unit-time jobs to maximize profit by taking the most profitable jobs first and placing them in the latest free slot before their deadline.",
  summaryAr: "يجدول مهامًا أحادية الوحدة الزمنية لتعظيم الربح بأخذ المهام الأعلى ربحًا أولًا ووضعها في آخر فتحة زمنية شاغرة قبل موعدها النهائي.",
  renderer: "table",
  pseudocode: [
    "procedure jobSequencing(jobs)",
    "  sort jobs by profit descending",
    "  slots[1..maxDeadline] = empty",
    "  for each job in sorted order:",
    "    for t = min(maxDeadline, job.deadline) down to 1:",
    "      if slots[t] empty: place job there; break",
    "  return scheduled jobs and total profit",
  ],
  code: {
    pseudocode: `sort jobs by profit desc
slots[1..maxDeadline] = empty
for job in jobs:
  for t = min(maxD, job.deadline) downto 1:
    if slots[t] empty: slots[t] = job; break`,
    c: `void jobSequencing(Job* jobs, int n) {
    qsort(jobs, n, sizeof(Job), byProfitDesc);
    int maxD = maxDeadline(jobs, n);
    char slot[maxD + 1]; for (int i=1;i<=maxD;i++) slot[i]=0;
    for (int i = 0; i < n; i++)
        for (int t = jobs[i].deadline; t >= 1; t--)
            if (!slot[t]) { slot[t] = jobs[i].id; break; }
}`,
    cpp: `void jobSequencing(vector<Job>& jobs) {
    sort(jobs.begin(), jobs.end(), [](auto&a, auto&b){ return a.profit > b.profit; });
    int maxD = 0; for (auto& j : jobs) maxD = max(maxD, j.deadline);
    vector<int> slot(maxD + 1, -1);
    for (int i = 0; i < (int)jobs.size(); i++)
        for (int t = jobs[i].deadline; t >= 1; t--)
            if (slot[t] == -1) { slot[t] = i; break; }
}`,
    java: `void jobSequencing(Job[] jobs) {
    Arrays.sort(jobs, (a, b) -> b.profit - a.profit);
    int maxD = 0; for (Job j : jobs) maxD = Math.max(maxD, j.deadline);
    int[] slot = new int[maxD + 1]; Arrays.fill(slot, -1);
    for (int i = 0; i < jobs.length; i++)
        for (int t = jobs[i].deadline; t >= 1; t--)
            if (slot[t] == -1) { slot[t] = i; break; }
}`,
    python: `def job_sequencing(jobs):
    jobs.sort(key=lambda j: j['profit'], reverse=True)
    max_d = max(j['deadline'] for j in jobs)
    slot = [None] * (max_d + 1)
    total = 0
    for j in jobs:
        for t in range(min(max_d, j['deadline']), 0, -1):
            if slot[t] is None:
                slot[t] = j['id']; total += j['profit']; break
    return slot, total`,
    javascript: `function jobSequencing(jobs) {
  jobs.sort((a, b) => b.profit - a.profit);
  const maxD = Math.max(...jobs.map(j => j.deadline));
  const slot = new Array(maxD + 1).fill(null);
  let total = 0;
  for (const j of jobs)
    for (let t = Math.min(maxD, j.deadline); t >= 1; t--)
      if (slot[t] === null) { slot[t] = j.id; total += j.profit; break; }
  return { slot, total };
}`,
    typescript: `function jobSequencing(jobs: { id: string; deadline: number; profit: number }[]) {
  jobs.sort((a, b) => b.profit - a.profit);
  const maxD = Math.max(...jobs.map(j => j.deadline));
  const slot: (string | null)[] = new Array(maxD + 1).fill(null);
  let total = 0;
  for (const j of jobs)
    for (let t = Math.min(maxD, j.deadline); t >= 1; t--)
      if (slot[t] === null) { slot[t] = j.id; total += j.profit; break; }
  return { slot, total };
}`,
    csharp: `void JobSequencing(Job[] jobs) {
    Array.Sort(jobs, (a, b) => b.Profit - a.Profit);
    int maxD = jobs.Max(j => j.Deadline);
    var slot = new int[maxD + 1];
    Array.Fill(slot, -1);
    for (int i = 0; i < jobs.Length; i++)
        for (int t = jobs[i].Deadline; t >= 1; t--)
            if (slot[t] == -1) { slot[t] = i; break; }
}`,
    go: `func jobSequencing(jobs []Job) int {
	sort.Slice(jobs, func(i, j int) bool { return jobs[i].Profit > jobs[j].Profit })
	maxD := 0
	for _, j := range jobs { if j.Deadline > maxD { maxD = j.Deadline } }
	slot := make([]int, maxD+1)
	for i := range slot { slot[i] = -1 }
	total := 0
	for i, j := range jobs {
		for t := j.Deadline; t >= 1; t-- {
			if slot[t] == -1 { slot[t] = i; total += j.Profit; break }
		}
	}
	return total
}`,
    rust: `fn job_sequencing(mut jobs: Vec<(char, usize, i32)>) -> i32 {
    jobs.sort_by(|a, b| b.2.cmp(&a.2));
    let max_d = jobs.iter().map(|j| j.1).max().unwrap_or(0);
    let mut slot = vec![None; max_d + 1];
    let mut total = 0;
    for (id, deadline, profit) in jobs {
        for t in (1..=deadline).rev() {
            if slot[t].is_none() { slot[t] = Some(id); total += profit; break; }
        }
    }
    total
}`,
    kotlin: `fun jobSequencing(jobs: MutableList<Job>): Int {
    jobs.sortByDescending { it.profit }
    val maxD = jobs.maxOf { it.deadline }
    val slot = arrayOfNulls<String>(maxD + 1)
    var total = 0
    for (j in jobs)
        for (t in minOf(maxD, j.deadline) downTo 1)
            if (slot[t] == null) { slot[t] = j.id; total += j.profit; break }
    return total
}`,
    swift: `func jobSequencing(_ jobs0: [Job]) -> Int {
    let jobs = jobs0.sorted { $0.profit > $1.profit }
    let maxD = jobs.map { $0.deadline }.max() ?? 0
    var slot = [String?](repeating: nil, count: maxD + 1)
    var total = 0
    for j in jobs {
        for t in stride(from: min(maxD, j.deadline), through: 1, by: -1) {
            if slot[t] == nil { slot[t] = j.id; total += j.profit; break }
        }
    }
    return total
}`,
  },
  content: {
    overview: `In the job-sequencing-with-deadlines problem, each job takes exactly one unit of time, earns a profit, and must finish by a given deadline. Only one job can run at a time, and a job earns its profit only if it is scheduled in some slot at or before its deadline. The goal is to choose which jobs to run, and when, to maximize total profit.

The greedy insight is to prioritize money: consider jobs from most to least profitable, and for each, place it in the latest still-free time slot that is on or before its deadline. Scheduling a job as late as possible (rather than as early as possible) keeps earlier slots open for other jobs whose deadlines are tighter — this is what makes the greedy choice optimal. If no free slot exists up to a job's deadline, the job is skipped. The result is a schedule that maximizes profit within the deadline constraints.`,
    howItWorks: [
      "Sort all jobs by profit in descending order.",
      "Create empty time slots from 1 up to the maximum deadline.",
      "For each job (richest first), scan from its deadline slot backward toward slot 1.",
      "Place the job in the first free slot found (the latest one that meets its deadline).",
      "If every slot up to the deadline is full, reject the job; sum the profits of scheduled jobs.",
    ],
    complexity: {
      time: { best: "O(n log n)", average: "O(n²)", worst: "O(n²)" },
      space: "O(maxDeadline)",
      notes: "Sorting is O(n log n); the naive slot search is O(n·maxDeadline) ≈ O(n²). Using a disjoint-set (union-find) to find the next free slot reduces the placement to near O(n·α(n)).",
    },
    applications: [
      "single-machine profit-maximizing scheduling",
      "CPU/task scheduling with hard deadlines",
      "advertising slot and appointment allocation",
      "operations research and manufacturing job shops",
    ],
    advantages: [
      "Simple greedy rule with provable optimality",
      "Maximizes profit, not just job count",
      "Latest-slot placement leaves room for tight-deadline jobs",
      "Speedable to near-linear with union-find",
    ],
    disadvantages: [
      "Assumes unit-time jobs (equal durations)",
      "Naive slot search is O(n²)",
      "Only one machine / one job at a time",
      "Doesn't handle variable job lengths without modification",
    ],
    commonMistakes: [
      "Placing jobs in the earliest free slot instead of the latest, blocking tight-deadline jobs.",
      "Sorting by deadline instead of profit.",
      "Ignoring the cap at min(maxDeadline, job.deadline).",
      "Assuming all jobs can be scheduled regardless of deadline conflicts.",
    ],
    interviewQuestions: [
      "Why schedule each job in the latest possible slot rather than the earliest?",
      "How does union-find speed up finding the next free slot?",
      "How would you adapt the algorithm to jobs with different durations?",
      "Prove the greedy (highest profit first) choice is optimal.",
      "How do you also report which jobs were rejected?",
    ],
    summary:
      "Job sequencing with deadlines greedily schedules the most profitable unit-time jobs first, each in the latest free slot on or before its deadline, to maximize total profit. It runs in O(n²) naively (O(n log n) sort + slot search) and near-linearly with union-find.",
    quiz: [
      { question: "Jobs are considered in order of…", options: ["Earliest deadline", "Highest profit", "Shortest duration", "Arrival time"], answer: 1, explanation: "The greedy rule processes the most profitable jobs first." },
      { question: "Each selected job is placed in…", options: ["The earliest free slot", "The latest free slot ≤ its deadline", "Slot 1 always", "A random slot"], answer: 1, explanation: "Latest placement keeps earlier slots open for tighter deadlines." },
      { question: "Each job occupies…", options: ["Variable time", "Exactly one time unit", "Its deadline in units", "Zero time"], answer: 1, explanation: "The classic version assumes unit-time jobs." },
      { question: "The naive time complexity is about…", options: ["O(n)", "O(n log n) sort + O(n²) placement", "O(2^n)", "O(n³)"], answer: 1, explanation: "Sorting plus scanning slots per job gives O(n²) overall." },
      { question: "Union-Find is used to…", options: ["Sort jobs", "Quickly find the next free slot", "Compute profit", "Detect cycles"], answer: 1, explanation: "DSU points each slot to the next available earlier slot, speeding placement." },
    ],
  },
  contentAr: {
    overview: `في مسألة جدولة المهام بمواعيد نهائية، تستغرق كل مهمة وحدة زمنية واحدة بالضبط، وتجني ربحًا، ويجب أن تنتهي في موعد نهائي معيّن. يمكن تشغيل مهمة واحدة فقط في كل مرة، ولا تجني المهمة ربحها إلا إذا جُدولت في فتحة زمنية عند موعدها النهائي أو قبله. الهدف هو اختيار المهام التي ستُشغَّل ومتى، لتعظيم الربح الإجمالي.

الفكرة الجشعة هي إعطاء الأولوية للمال: تأمّل المهام من الأعلى ربحًا إلى الأدنى، وضع كل واحدة منها في آخر فتحة زمنية لا تزال شاغرة وتكون عند موعدها النهائي أو قبله. جدولة المهمة في أقصى وقت ممكن (بدلًا من أقرب وقت ممكن) تُبقي الفتحات المبكرة متاحة لمهام أخرى ذات مواعيد نهائية أضيق — وهذا ما يجعل الاختيار الجشع أمثل. إذا لم توجد فتحة شاغرة حتى موعد المهمة النهائي، تُستبعد المهمة. والنتيجة جدول يعظّم الربح ضمن قيود المواعيد النهائية.`,
    howItWorks: [
      "رتّب جميع المهام حسب الربح تنازليًا.",
      "أنشئ فتحات زمنية فارغة من 1 حتى أقصى موعد نهائي.",
      "لكل مهمة (الأعلى ربحًا أولًا)، امسح من فتحة موعدها النهائي إلى الوراء نحو الفتحة 1.",
      "ضع المهمة في أول فتحة شاغرة تجدها (وهي آخر فتحة تفي بموعدها النهائي).",
      "إذا كانت جميع الفتحات حتى الموعد النهائي ممتلئة، استبعد المهمة؛ اجمع أرباح المهام المجدولة.",
    ],
    complexity: {
      time: { best: "O(n log n)", average: "O(n²)", worst: "O(n²)" },
      space: "O(maxDeadline)",
      notes: "الترتيب تكلفته O(n log n)؛ أما البحث الساذج عن فتحة فتكلفته O(n·maxDeadline) ≈ O(n²). استخدام مجموعة منفصلة (اتحاد-بحث) لإيجاد الفتحة الشاغرة التالية يقلّص التوضيع إلى ما يقارب O(n·α(n)).",
    },
    applications: [
      "الجدولة على آلة واحدة لتعظيم الربح",
      "جدولة المعالج/المهام بمواعيد نهائية صارمة",
      "تخصيص فتحات الإعلانات ومواعيد الحجز",
      "بحوث العمليات وورش التصنيع",
    ],
    advantages: [
      "قاعدة جشعة بسيطة مع إثبات للمثالية",
      "يعظّم الربح، وليس عدد المهام فقط",
      "التوضيع في آخر فتحة يترك مجالًا للمهام ذات المواعيد الضيقة",
      "قابل للتسريع إلى شبه خطي باستخدام اتحاد-بحث",
    ],
    disadvantages: [
      "يفترض أن المهام أحادية الوحدة الزمنية (مدد متساوية)",
      "البحث الساذج عن الفتحة تكلفته O(n²)",
      "آلة واحدة فقط / مهمة واحدة في كل مرة",
      "لا يتعامل مع مدد المهام المتفاوتة دون تعديل",
    ],
    commonMistakes: [
      "وضع المهام في أقرب فتحة شاغرة بدلًا من الأبعد، مما يعيق المهام ذات المواعيد الضيقة.",
      "الترتيب حسب الموعد النهائي بدلًا من الربح.",
      "تجاهل الحدّ عند min(maxDeadline, job.deadline).",
      "افتراض أن جميع المهام يمكن جدولتها بغضّ النظر عن تعارض المواعيد النهائية.",
    ],
    interviewQuestions: [
      "لماذا تُجدول كل مهمة في آخر فتحة ممكنة بدلًا من أقربها؟",
      "كيف يسرّع اتحاد-بحث عملية إيجاد الفتحة الشاغرة التالية؟",
      "كيف تكيّف الخوارزمية للمهام ذات المدد المختلفة؟",
      "أثبت أن الاختيار الجشع (الأعلى ربحًا أولًا) أمثل.",
      "كيف تُبلغ أيضًا عن المهام التي استُبعدت؟",
    ],
    summary:
      "تجدول جدولة المهام بمواعيد نهائية أعلى المهام ربحًا أولًا (أحادية الوحدة الزمنية)، كلًا منها في آخر فتحة شاغرة عند موعدها النهائي أو قبله، لتعظيم الربح الإجمالي. تعمل بتعقيد O(n²) بالأسلوب الساذج (ترتيب O(n log n) + بحث عن فتحة) وشبه خطي باستخدام اتحاد-بحث.",
    quiz: [
      { question: "يُنظر إلى المهام بترتيب…", options: ["أقرب موعد نهائي", "أعلى ربح", "أقصر مدة", "وقت الوصول"], answer: 1, explanation: "تعالج القاعدة الجشعة المهام الأعلى ربحًا أولًا." },
      { question: "توضع كل مهمة مُختارة في…", options: ["أقرب فتحة شاغرة", "آخر فتحة شاغرة ≤ موعدها النهائي", "الفتحة 1 دائمًا", "فتحة عشوائية"], answer: 1, explanation: "التوضيع في آخر فتحة يُبقي الفتحات المبكرة متاحة للمواعيد الأضيق." },
      { question: "تشغل كل مهمة…", options: ["وقتًا متغيرًا", "وحدة زمنية واحدة بالضبط", "موعدها النهائي بالوحدات", "زمنًا صفريًا"], answer: 1, explanation: "تفترض النسخة الكلاسيكية أن المهام أحادية الوحدة الزمنية." },
      { question: "التعقيد الزمني الساذج يبلغ تقريبًا…", options: ["O(n)", "ترتيب O(n log n) + توضيع O(n²)", "O(2^n)", "O(n³)"], answer: 1, explanation: "الترتيب مع مسح الفتحات لكل مهمة يعطي O(n²) إجمالًا." },
      { question: "يُستخدم اتحاد-بحث من أجل…", options: ["ترتيب المهام", "إيجاد الفتحة الشاغرة التالية بسرعة", "حساب الربح", "اكتشاف الدورات"], answer: 1, explanation: "يشير كل فتحة إلى أقرب فتحة سابقة متاحة، مما يسرّع التوضيع." },
    ],
  },
  inputFields: [
    { key: "jobs", label: "Jobs (deadline:profit)", placeholder: "2:100, 1:19, 2:27, 1:25, 3:15", help: "Comma-separated deadline:profit pairs (2–12 jobs).", list: true },
  ],
  defaultInput: (level, rng) => randomInput(level, rng),
  parseInput: (fields) => {
    const parts = (fields.jobs ?? "").split(/[,\n]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) throw new Error("Enter at least 2 jobs as deadline:profit, e.g. 2:100.");
    if (parts.length > 12) throw new Error("Maximum 12 jobs.");
    const jobs: Job[] = parts.map((p, i) => {
      const m = p.match(/^(\d+)\s*[:x]\s*(\d+)$/);
      if (!m) throw new Error(`"${p}" is invalid. Use deadline:profit like 2:100.`);
      const deadline = Number(m[1]);
      const profit = Number(m[2]);
      if (deadline < 1 || deadline > 12) throw new Error("Deadlines must be between 1 and 12.");
      return { id: String.fromCharCode(65 + i), deadline, profit };
    });
    return { jobs };
  },
  serializeInput: (input) => ({ jobs: input.jobs.map((j) => `${j.deadline}:${j.profit}`).join(", ") }),
  generate,
};

export default mod;
