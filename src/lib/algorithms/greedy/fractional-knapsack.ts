import type { AlgorithmModule, CellState, Step, TableFrame } from "@/lib/engine/types";

type Item = { w: number; v: number };
type Input = { items: Item[]; capacity: number };

function generate(input: Input): Step<TableFrame>[] {
  // Sort by value/weight ratio descending — the greedy order.
  const order = input.items
    .map((it, i) => ({ ...it, orig: i, ratio: it.v / it.w }))
    .sort((a, b) => b.ratio - a.ratio);
  const W = input.capacity;
  const steps: Step<TableFrame>[] = [];
  let picks = 0;

  const rowLabels = order.map((it, i) => `#${i + 1} (was ${it.orig + 1})`);
  const colLabels = ["weight", "value", "v/w", "take", "value +"];
  const taken: (number | null)[] = new Array(order.length).fill(null);
  const gained: (number | null)[] = new Array(order.length).fill(null);

  const frame = (activeRow: number | null, description: string, codeLine: number, remaining: number, total: number, descriptionAr?: string): void => {
    const cells = order.map((it, i) => {
      const rowState: CellState | undefined =
        activeRow === i ? "active" : taken[i] !== null ? (taken[i]! >= it.w ? "sorted" : "found") : undefined;
      const mk = (value: string | number | null, s?: CellState) => ({ value, state: s ?? rowState });
      return [
        mk(it.w),
        mk(it.v),
        mk(it.ratio.toFixed(2)),
        mk(taken[i] === null ? null : taken[i] === it.w ? "all" : taken[i] === 0 ? "none" : `${taken[i]}/${it.w}`),
        mk(gained[i] === null ? null : Number(gained[i]!.toFixed(2))),
      ];
    });
    steps.push({
      frame: {
        rowLabels,
        colLabels,
        cells,
        aux: [
          { label: "remaining capacity", values: [remaining] },
          { label: "total value", values: [Number(total.toFixed(2))] },
        ],
        note: `greedy: take items in decreasing value/weight ratio; split the last if it doesn't fully fit`,
      },
      description,
      descriptionAr,
      codeLine,
      counters: { picks, total: Number(total.toFixed(2)) },
    });
  };

  frame(
    null,
    `Fractional knapsack, capacity ${W}. Sort items by value/weight ratio (highest first), then greedily fill.`,
    1,
    W,
    0,
    `حقيبة ظهر كسرية بسعة ${W}. رتّب العناصر حسب نسبة القيمة إلى الوزن (الأعلى أولًا)، ثم املأها بأسلوب جشع.`,
  );

  let remaining = W;
  let total = 0;
  for (let i = 0; i < order.length; i++) {
    const it = order[i];
    if (remaining <= 0) {
      taken[i] = 0;
      gained[i] = 0;
      frame(
        i,
        `Knapsack is full — skip item (ratio ${it.ratio.toFixed(2)}).`,
        5,
        remaining,
        total,
        `الحقيبة ممتلئة — تخطَّ العنصر (نسبة ${it.ratio.toFixed(2)}).`,
      );
      continue;
    }
    if (it.w <= remaining) {
      taken[i] = it.w;
      gained[i] = it.v;
      remaining -= it.w;
      total += it.v;
      picks++;
      frame(
        i,
        `Item fits wholly: take all ${it.w} (value ${it.v}). Remaining capacity ${remaining}.`,
        3,
        remaining,
        total,
        `العنصر يسع بالكامل: خذ كل ${it.w} (بقيمة ${it.v}). السعة المتبقية ${remaining}.`,
      );
    } else {
      const frac = remaining;
      const value = it.ratio * frac;
      taken[i] = frac;
      gained[i] = value;
      total += value;
      picks++;
      frame(
        i,
        `Only ${remaining} capacity left: take fraction ${frac}/${it.w}, adding ${value.toFixed(2)} value.`,
        4,
        0,
        total,
        `تبقّت سعة ${remaining} فقط: خذ الكسر ${frac}/${it.w}، مضيفًا قيمة ${value.toFixed(2)}.`,
      );
      remaining = 0;
    }
  }

  frame(
    null,
    `Done. Maximum value = ${total.toFixed(2)} within capacity ${W}.`,
    6,
    remaining,
    total,
    `انتهى. القيمة القصوى = ${total.toFixed(2)} ضمن السعة ${W}.`,
  );
  return steps;
}

function randomItems(level: number, rng: { int: (a: number, b: number) => number }): Input {
  const n = Math.min(6, 3 + Math.floor(level / 2));
  const items: Item[] = Array.from({ length: n }, () => ({ w: rng.int(1, 8), v: rng.int(2, 20) }));
  const capacity = Math.min(15, 5 + level * 2);
  return { items, capacity };
}

const mod: AlgorithmModule<TableFrame, Input> = {
  slug: "fractional-knapsack",
  title: "Fractional Knapsack",
  titleAr: "حقيبة الظهر الكسرية",
  category: "greedy",
  difficulty: "Intermediate",
  tags: ["greedy", "optimization", "ratio", "knapsack"],
  tagsAr: ["جشِع", "تحسين", "نسبة", "حقيبة الظهر"],
  summary: "Maximizes value under a weight limit when items can be split, by greedily taking the highest value/weight ratio first.",
  summaryAr: "يعظّم القيمة ضمن حدّ وزن معيّن عندما يمكن تقسيم العناصر، بأخذ أعلى نسبة قيمة إلى وزن أولًا بأسلوب جشع.",
  renderer: "table",
  pseudocode: [
    "procedure fractionalKnapsack(items, W)",
    "  sort items by value/weight descending",
    "  total = 0",
    "  for each item in sorted order:",
    "    if item.weight <= remaining: take all",
    "    else: take fraction (remaining/weight); stop",
    "  return total",
  ],
  code: {
    pseudocode: `sort items by v/w desc
for item in items:
  if w <= remaining: take all; remaining -= w; total += v
  else: total += ratio * remaining; remaining = 0; break
return total`,
    c: `double fracKnap(double w[], double v[], int n, double W) {
    // assume arrays pre-sorted by v/w descending
    double total = 0;
    for (int i = 0; i < n && W > 0; i++) {
        if (w[i] <= W) { W -= w[i]; total += v[i]; }
        else { total += v[i] * (W / w[i]); W = 0; }
    }
    return total;
}`,
    cpp: `double fracKnap(vector<pair<double,double>> items, double W) {
    sort(items.begin(), items.end(), [](auto&a, auto&b){
        return a.second/a.first > b.second/b.first; });
    double total = 0;
    for (auto& [w, v] : items) {
        if (W <= 0) break;
        if (w <= W) { W -= w; total += v; }
        else { total += v * (W / w); W = 0; }
    }
    return total;
}`,
    java: `double fracKnap(double[][] items, double W) {
    Arrays.sort(items, (a, b) -> Double.compare(b[1]/b[0], a[1]/a[0]));
    double total = 0;
    for (double[] it : items) {
        if (W <= 0) break;
        if (it[0] <= W) { W -= it[0]; total += it[1]; }
        else { total += it[1] * (W / it[0]); W = 0; }
    }
    return total;
}`,
    python: `def fractional_knapsack(items, W):
    items.sort(key=lambda it: it[1] / it[0], reverse=True)
    total = 0.0
    for w, v in items:
        if W <= 0:
            break
        if w <= W:
            W -= w; total += v
        else:
            total += v * (W / w); W = 0
    return total`,
    javascript: `function fractionalKnapsack(items, W) {
  items.sort((a, b) => b.v / b.w - a.v / a.w);
  let total = 0;
  for (const { w, v } of items) {
    if (W <= 0) break;
    if (w <= W) { W -= w; total += v; }
    else { total += v * (W / w); W = 0; }
  }
  return total;
}`,
    typescript: `function fractionalKnapsack(items: { w: number; v: number }[], W: number): number {
  items.sort((a, b) => b.v / b.w - a.v / a.w);
  let total = 0;
  for (const { w, v } of items) {
    if (W <= 0) break;
    if (w <= W) { W -= w; total += v; }
    else { total += v * (W / w); W = 0; }
  }
  return total;
}`,
    csharp: `double FracKnap((double w, double v)[] items, double W) {
    Array.Sort(items, (a, b) => (b.v / b.w).CompareTo(a.v / a.w));
    double total = 0;
    foreach (var (w, v) in items) {
        if (W <= 0) break;
        if (w <= W) { W -= w; total += v; }
        else { total += v * (W / w); W = 0; }
    }
    return total;
}`,
    go: `func fracKnap(items [][2]float64, W float64) float64 {
	sort.Slice(items, func(i, j int) bool {
		return items[i][1]/items[i][0] > items[j][1]/items[j][0]
	})
	total := 0.0
	for _, it := range items {
		if W <= 0 { break }
		if it[0] <= W { W -= it[0]; total += it[1] } else {
			total += it[1] * (W / it[0]); W = 0
		}
	}
	return total
}`,
    rust: `fn frac_knap(mut items: Vec<(f64, f64)>, mut w: f64) -> f64 {
    items.sort_by(|a, b| (b.1 / b.0).partial_cmp(&(a.1 / a.0)).unwrap());
    let mut total = 0.0;
    for (wi, vi) in items {
        if w <= 0.0 { break; }
        if wi <= w { w -= wi; total += vi; }
        else { total += vi * (w / wi); w = 0.0; }
    }
    total
}`,
    kotlin: `fun fracKnap(items: MutableList<Pair<Double, Double>>, W0: Double): Double {
    items.sortByDescending { it.second / it.first }
    var W = W0; var total = 0.0
    for ((w, v) in items) {
        if (W <= 0) break
        if (w <= W) { W -= w; total += v } else { total += v * (W / w); W = 0.0 }
    }
    return total
}`,
    swift: `func fracKnap(_ items: [(w: Double, v: Double)], _ W0: Double) -> Double {
    let sorted = items.sorted { $0.v / $0.w > $1.v / $1.w }
    var W = W0, total = 0.0
    for it in sorted {
        if W <= 0 { break }
        if it.w <= W { W -= it.w; total += it.v }
        else { total += it.v * (W / it.w); W = 0 }
    }
    return total
}`,
  },
  content: {
    overview: `The fractional knapsack problem is the "divisible" cousin of the 0/1 knapsack: you have a bag with a weight limit and items each with a weight and a value, but here you may take any fraction of an item — think of a thief filling a sack with gold dust, grain, or liquid rather than indivisible objects. The goal is the same: maximize the total value carried.

Unlike 0/1 knapsack (which needs dynamic programming), fractional knapsack is solved optimally by a simple greedy strategy: always prefer the item with the highest value-per-unit-weight (value/weight ratio). Sort items by that ratio, take whole items greedily while they fit, and when the next item doesn't fully fit, take just the fraction that fills the remaining capacity. Because value is perfectly divisible, this local "best ratio first" choice is provably globally optimal — an exchange argument shows any solution can be improved toward this one.`,
    howItWorks: [
      "Compute each item's value/weight ratio.",
      "Sort the items by ratio in descending order.",
      "Walk the sorted list, taking each whole item while it fits in the remaining capacity.",
      "When an item doesn't fully fit, take the fraction that exactly fills the remaining capacity.",
      "Stop once the knapsack is full; the accumulated value is optimal.",
    ],
    complexity: {
      time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)" },
      space: "O(1)",
      notes: "The sort by ratio dominates at O(n log n); the greedy fill is O(n). A selection-based (median-of-medians) variant can reach O(n). Space is O(1) beyond the item list.",
    },
    applications: [
      "allocating divisible resources (bandwidth, budget, raw materials)",
      "cutting-stock and blending problems with continuous quantities",
      "portfolio allocation proportional to return/risk",
      "approximation subroutines for harder knapsack variants",
    ],
    advantages: [
      "Simple greedy algorithm with a clean proof of optimality",
      "Fast: O(n log n), dominated by sorting",
      "Constant extra space",
      "Handles continuous/divisible quantities naturally",
    ],
    disadvantages: [
      "Only optimal when items are divisible (fails for 0/1)",
      "Requires a full sort (or clever selection) upfront",
      "Ratios with ties can require careful ordering",
      "Not applicable to indivisible or all-or-nothing constraints",
    ],
    commonMistakes: [
      "Applying the greedy ratio strategy to 0/1 knapsack, where it is not optimal.",
      "Sorting by value or weight alone instead of the value/weight ratio.",
      "Forgetting to take a fraction of the last item that partially fits.",
      "Integer-dividing the fraction and losing precision.",
    ],
    interviewQuestions: [
      "Why does the greedy ratio strategy work for fractional but not 0/1 knapsack?",
      "Prove the greedy choice is optimal using an exchange argument.",
      "How can you solve fractional knapsack in O(n) instead of O(n log n)?",
      "How do ties in the value/weight ratio affect the solution?",
      "How would you adapt this when items have a minimum take quantity?",
    ],
    summary:
      "Fractional knapsack maximizes value under a weight cap by greedily taking items in decreasing value/weight ratio and splitting the last partial item. It is optimal in O(n log n) time precisely because items are divisible, unlike the 0/1 version which needs DP.",
    quiz: [
      { question: "Fractional knapsack is solved optimally by…", options: ["Dynamic programming", "A greedy value/weight ratio strategy", "Backtracking", "Brute force only"], answer: 1, explanation: "Divisibility makes the greedy ratio choice globally optimal." },
      { question: "Items are sorted by…", options: ["Weight ascending", "Value descending", "Value/weight ratio descending", "Random order"], answer: 2, explanation: "Highest value per unit weight is taken first." },
      { question: "The time complexity is dominated by…", options: ["The greedy fill", "Sorting: O(n log n)", "O(n·W)", "O(2^n)"], answer: 1, explanation: "Sorting by ratio is the costly step." },
      { question: "The greedy strategy fails for…", options: ["Fractional knapsack", "0/1 (indivisible) knapsack", "Sorted input", "Small inputs"], answer: 1, explanation: "Without fractions, the highest-ratio item can crowd out a better combination." },
      { question: "When the next item doesn't fully fit, you…", options: ["Skip it entirely", "Take the fraction that fills remaining capacity", "Remove a previous item", "Double the capacity"], answer: 1, explanation: "Partial capacity is filled with a fraction of that item." },
    ],
  },
  contentAr: {
    overview: `مسألة حقيبة الظهر الكسرية هي "الشقيقة القابلة للتجزئة" لمسألة حقيبة الظهر 0/1: لديك حقيبة بحدّ وزن أقصى، وعناصر لكل منها وزن وقيمة، لكن هنا يمكنك أخذ أي جزء كسري من العنصر — تخيّل لصًا يملأ كيسًا بغبار الذهب أو الحبوب أو سائل بدلًا من أجسام غير قابلة للتجزئة. الهدف نفسه: تعظيم القيمة الإجمالية المحمولة.

على عكس حقيبة الظهر 0/1 (التي تحتاج إلى البرمجة الديناميكية)، تُحل حقيبة الظهر الكسرية بشكل أمثل باستراتيجية جشعة بسيطة: فضّل دائمًا العنصر ذا أعلى قيمة لكل وحدة وزن (نسبة القيمة إلى الوزن). رتّب العناصر حسب هذه النسبة، خذ العناصر الكاملة بأسلوب جشع طالما أنها تسع، وعندما لا يسع العنصر التالي بالكامل، خذ فقط الجزء الذي يملأ السعة المتبقية. ولأن القيمة قابلة للتجزئة تمامًا، فإن هذا الاختيار المحلي "الأفضل نسبةً أولًا" يُثبت أنه أمثل على المستوى الكلي — تُظهر حجة التبادل أن أي حل آخر يمكن تحسينه ليصبح هذا الحل.`,
    howItWorks: [
      "احسب نسبة القيمة إلى الوزن لكل عنصر.",
      "رتّب العناصر حسب النسبة تنازليًا.",
      "اجتز القائمة المرتّبة، وخذ كل عنصر كامل طالما يسع ضمن السعة المتبقية.",
      "عندما لا يسع عنصر بالكامل، خذ الجزء الذي يملأ السعة المتبقية تمامًا.",
      "توقف عند امتلاء الحقيبة؛ القيمة المتراكمة تكون مثلى.",
    ],
    complexity: {
      time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)" },
      space: "O(1)",
      notes: "يهيمن الترتيب حسب النسبة بتكلفة O(n log n)؛ أما الملء الجشع فتكلفته O(n). يمكن لنسخة قائمة على الاختيار (median-of-medians) أن تصل إلى O(n). المساحة O(1) بخلاف قائمة العناصر.",
    },
    applications: [
      "توزيع الموارد القابلة للتجزئة (النطاق الترددي، الميزانية، المواد الخام)",
      "مسائل قطع المخزون والمزج بكميات متصلة",
      "توزيع المحفظة الاستثمارية بما يتناسب مع العائد/المخاطرة",
      "خوارزميات فرعية تقريبية لمتغيرات أصعب من حقيبة الظهر",
    ],
    advantages: [
      "خوارزمية جشعة بسيطة مع إثبات واضح للمثالية",
      "سريعة: O(n log n)، محكومة بالترتيب",
      "مساحة إضافية ثابتة",
      "تتعامل بشكل طبيعي مع الكميات المتصلة/القابلة للتجزئة",
    ],
    disadvantages: [
      "أمثل فقط عندما تكون العناصر قابلة للتجزئة (تفشل في حالة 0/1)",
      "تتطلب ترتيبًا كاملًا مسبقًا (أو اختيارًا ذكيًا)",
      "التعادل في النسب قد يتطلب ترتيبًا دقيقًا",
      "لا تنطبق على القيود غير القابلة للتجزئة أو من نوع الكل أو لا شيء",
    ],
    commonMistakes: [
      "تطبيق استراتيجية النسبة الجشعة على حقيبة الظهر 0/1، حيث لا تكون مثلى.",
      "الترتيب حسب القيمة أو الوزن فقط بدلًا من نسبة القيمة إلى الوزن.",
      "نسيان أخذ جزء كسري من العنصر الأخير الذي يسع جزئيًا.",
      "استخدام القسمة الصحيحة للجزء الكسري وفقدان الدقة.",
    ],
    interviewQuestions: [
      "لماذا تنجح استراتيجية النسبة الجشعة في الحقيبة الكسرية ولا تنجح في حقيبة 0/1؟",
      "أثبت أن الاختيار الجشع أمثل باستخدام حجة التبادل.",
      "كيف يمكن حل حقيبة الظهر الكسرية بتعقيد O(n) بدلًا من O(n log n)؟",
      "كيف يؤثر التعادل في نسبة القيمة إلى الوزن على الحل؟",
      "كيف تكيّف الخوارزمية عندما يكون للعناصر حد أدنى لكمية الأخذ؟",
    ],
    summary:
      "تعظّم حقيبة الظهر الكسرية القيمة ضمن حدّ وزن معيّن بأخذ العناصر بأسلوب جشع حسب نسبة القيمة إلى الوزن تنازليًا وتقسيم العنصر الجزئي الأخير. وهي مثلى بتعقيد O(n log n) تحديدًا لأن العناصر قابلة للتجزئة، على عكس نسخة 0/1 التي تحتاج إلى البرمجة الديناميكية.",
    quiz: [
      { question: "تُحل حقيبة الظهر الكسرية بشكل أمثل باستخدام…", options: ["البرمجة الديناميكية", "استراتيجية جشعة قائمة على نسبة القيمة إلى الوزن", "التراجع", "القوة الغاشمة فقط"], answer: 1, explanation: "قابلية التجزئة تجعل اختيار النسبة الجشع أمثل على المستوى الكلي." },
      { question: "تُرتَّب العناصر حسب…", options: ["الوزن تصاعديًا", "القيمة تنازليًا", "نسبة القيمة إلى الوزن تنازليًا", "ترتيب عشوائي"], answer: 2, explanation: "تُؤخذ أعلى قيمة لكل وحدة وزن أولًا." },
      { question: "يهيمن على التعقيد الزمني…", options: ["الملء الجشع", "الترتيب: O(n log n)", "O(n·W)", "O(2^n)"], answer: 1, explanation: "الترتيب حسب النسبة هو الخطوة الأعلى تكلفة." },
      { question: "تفشل الاستراتيجية الجشعة في حالة…", options: ["حقيبة الظهر الكسرية", "حقيبة الظهر 0/1 (غير القابلة للتجزئة)", "الإدخال المرتّب", "المدخلات الصغيرة"], answer: 1, explanation: "بدون التجزئة، قد يزاحم العنصر ذو أعلى نسبة تركيبةً أفضل." },
      { question: "عندما لا يسع العنصر التالي بالكامل، فإنك…", options: ["تتخطاه كليًا", "تأخذ الجزء الذي يملأ السعة المتبقية", "تزيل عنصرًا سابقًا", "تضاعف السعة"], answer: 1, explanation: "تُملأ السعة المتبقية بجزء كسري من ذلك العنصر." },
    ],
  },
  inputFields: [
    { key: "items", label: "Items (weight:value)", placeholder: "10:60, 20:100, 30:120", help: "Comma-separated weight:value pairs (up to 12).", list: true },
    { key: "capacity", label: "Capacity W", placeholder: "50", help: "1–30." },
  ],
  defaultInput: (level, rng) => randomItems(level, rng),
  parseInput: (fields) => {
    const parts = (fields.items ?? "").split(/[,\n]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 1) throw new Error("Enter at least one item as weight:value, e.g. 10:60.");
    if (parts.length > 12) throw new Error("Maximum 12 items.");
    const items: Item[] = parts.map((p) => {
      const m = p.match(/^(\d+)\s*[:x]\s*(\d+)$/);
      if (!m) throw new Error(`"${p}" is invalid. Use weight:value like 10:60.`);
      const w = Number(m[1]);
      const v = Number(m[2]);
      if (w < 1) throw new Error("Weights must be at least 1.");
      return { w, v };
    });
    const capacity = Number((fields.capacity ?? "").trim());
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 30) throw new Error("Capacity must be a whole number from 1 to 30.");
    return { items, capacity };
  },
  serializeInput: (input) => ({ items: input.items.map((it) => `${it.w}:${it.v}`).join(", "), capacity: String(input.capacity) }),
  generate,
};

export default mod;
