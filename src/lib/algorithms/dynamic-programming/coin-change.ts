import type { AlgorithmModule, CellState, Step, TableFrame } from "@/lib/engine/types";

type Input = { coins: number[]; amount: number };

const INF = Infinity;

function generate(input: Input): Step<TableFrame>[] {
  const coins = [...input.coins].sort((x, y) => x - y);
  const amount = input.amount;
  const n = coins.length;
  const steps: Step<TableFrame>[] = [];
  let comparisons = 0;

  // dp[i][a] = min coins to make amount a using the first i coin denominations
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(amount + 1).fill(INF));
  for (let i = 0; i <= n; i++) dp[i][0] = 0; // amount 0 needs 0 coins

  const rowLabels = ["∅", ...coins.map((c) => `coin ${c}`)];
  const colLabels = Array.from({ length: amount + 1 }, (_, a) => String(a));

  const show = (v: number) => (v === INF ? "∞" : v);

  const frame = (
    rowsDone: number,
    active: [number, number] | null,
    refs: [number, number][],
    description: string,
    codeLine: number,
    highlight?: Set<string>,
    descriptionAr?: string,
  ): void => {
    const cells = dp.map((row, i) =>
      row.map((val, a) => {
        let state: CellState | undefined;
        const key = `${i},${a}`;
        if (active && active[0] === i && active[1] === a) state = "active";
        else if (refs.some(([ri, ra]) => ri === i && ra === a)) state = "compare";
        else if (highlight?.has(key)) state = "found";
        else if (i < rowsDone) state = "sorted";
        const isFilled = i === 0 || i < rowsDone || (active && (i < active[0] || (i === active[0] && a <= active[1])));
        return { value: isFilled ? show(val) : null, state };
      }),
    );
    steps.push({ frame: { rowLabels, colLabels, cells, note: `target = ${amount}` }, description, descriptionAr, codeLine, counters: { comparisons } });
  };

  frame(1, null, [], `Coin change: fewest coins to make ${amount} from {${coins.join(", ")}}. Amount 0 needs 0 coins; the rest start at ∞.`, 1, undefined, `فكة العملات: أقل عدد من العملات لتكوين ${amount} من {${coins.join(", ")}}. المبلغ 0 يحتاج 0 عملة؛ والباقي يبدأ بـ ∞.`);

  for (let i = 1; i <= n; i++) {
    const coin = coins[i - 1];
    for (let a = 0; a <= amount; a++) {
      comparisons++;
      // Option 1: don't use coin i → inherit above.
      dp[i][a] = dp[i - 1][a];
      if (a >= coin && dp[i][a - coin] !== INF) {
        // Option 2: use coin i at least once → 1 + dp[i][a - coin] (unbounded).
        const useIt = 1 + dp[i][a - coin];
        if (useIt < dp[i][a]) dp[i][a] = useIt;
      }
      if (a === 0) continue; // already 0, keep noise low
      const refs: [number, number][] = [[i - 1, a]];
      if (a >= coin) refs.push([i, a - coin]);
      frame(
        i,
        [i, a],
        refs,
        a >= coin
          ? `Amount ${a} with coin ${coin}: min(skip ${show(dp[i - 1][a])}, 1+dp[${i}][${a - coin}]) = ${show(dp[i][a])}.`
          : `Amount ${a}: coin ${coin} too big, inherit ${show(dp[i][a])}.`,
        4,
        undefined,
        a >= coin
          ? `المبلغ ${a} بالعملة ${coin}: أصغر (تجاوز ${show(dp[i - 1][a])}، 1+dp[${i}][${a - coin}]) = ${show(dp[i][a])}.`
          : `المبلغ ${a}: العملة ${coin} كبيرة جدًا، رِث ${show(dp[i][a])}.`,
      );
    }
  }

  // Traceback which coins were used.
  const highlight = new Set<string>();
  const used: number[] = [];
  if (dp[n][amount] !== INF) {
    let i = n;
    let a = amount;
    while (a > 0) {
      highlight.add(`${i},${a}`);
      const coin = coins[i - 1];
      if (a >= coin && dp[i][a - coin] !== INF && dp[i][a] === 1 + dp[i][a - coin]) {
        used.push(coin);
        a -= coin;
      } else {
        i--;
        if (i === 0) break;
      }
    }
  }
  frame(
    n + 1,
    null,
    [],
    dp[n][amount] === INF
      ? `Amount ${amount} is not reachable with these coins.`
      : `Minimum ${dp[n][amount]} coins: ${used.sort((x, y) => x - y).join(" + ")}.`,
    6,
    highlight,
    dp[n][amount] === INF
      ? `المبلغ ${amount} غير قابل للتكوين بهذه العملات.`
      : `أقل عدد ${dp[n][amount]} عملة: ${used.join(" + ")}.`,
  );
  return steps;
}

function randomInput(level: number, rng: { int: (a: number, b: number) => number; shuffle: <T>(a: readonly T[]) => T[] }): Input {
  const pools = [[1, 2, 5], [1, 3, 4], [1, 2, 5, 10], [1, 4, 6, 9], [2, 3, 5, 7]];
  const coins = pools[Math.min(level - 1, pools.length - 1)];
  const amount = Math.min(18, 5 + level * 2 + rng.int(0, 2));
  return { coins: [...coins], amount };
}

const mod: AlgorithmModule<TableFrame, Input> = {
  slug: "coin-change",
  title: "Coin Change (Minimum Coins)",
  titleAr: "فكة العملات (أقل عدد من العملات)",
  category: "dynamic-programming",
  difficulty: "Intermediate",
  tags: ["dynamic programming", "unbounded knapsack", "optimization", "tabulation"],
  tagsAr: ["البرمجة الديناميكية", "حقيبة غير محدودة", "تحسين", "الجدولة"],
  summary: "Finds the fewest coins that sum to a target amount, allowing each denomination to be reused any number of times.",
  summaryAr: "يجد أقل عدد من العملات التي يبلغ مجموعها مبلغًا مستهدفًا، مع السماح بإعادة استخدام كل فئة أي عدد من المرات.",
  renderer: "table",
  pseudocode: [
    "procedure coinChange(coins, amount)",
    "  dp[*][0] = 0;  dp[*][a>0] = ∞",
    "  for each coin i, for a = 0..amount:",
    "    dp[i][a] = dp[i-1][a]              // skip this coin",
    "    if a >= coin and dp[i][a-coin] < ∞:",
    "      dp[i][a] = min(dp[i][a], 1 + dp[i][a-coin])",
    "  return dp[n][amount]  (∞ ⇒ impossible)",
  ],
  code: {
    pseudocode: `dp[0] = 0; dp[a>0] = INF
for coin in coins:
  for a in coin..amount:
    dp[a] = min(dp[a], 1 + dp[a-coin])
return dp[amount]`,
    c: `int coinChange(int* coins, int n, int amount) {
    int INF = amount + 1;
    int dp[amount + 1];
    for (int a = 0; a <= amount; a++) dp[a] = INF;
    dp[0] = 0;
    for (int i = 0; i < n; i++)
        for (int a = coins[i]; a <= amount; a++)
            if (dp[a - coins[i]] + 1 < dp[a]) dp[a] = dp[a - coins[i]] + 1;
    return dp[amount] > amount ? -1 : dp[amount];
}`,
    cpp: `int coinChange(vector<int>& coins, int amount) {
    vector<int> dp(amount + 1, amount + 1);
    dp[0] = 0;
    for (int coin : coins)
        for (int a = coin; a <= amount; a++)
            dp[a] = min(dp[a], dp[a - coin] + 1);
    return dp[amount] > amount ? -1 : dp[amount];
}`,
    java: `int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, amount + 1);
    dp[0] = 0;
    for (int coin : coins)
        for (int a = coin; a <= amount; a++)
            dp[a] = Math.min(dp[a], dp[a - coin] + 1);
    return dp[amount] > amount ? -1 : dp[amount];
}`,
    python: `def coin_change(coins, amount):
    INF = amount + 1
    dp = [INF] * (amount + 1)
    dp[0] = 0
    for coin in coins:
        for a in range(coin, amount + 1):
            dp[a] = min(dp[a], dp[a - coin] + 1)
    return -1 if dp[amount] > amount else dp[amount]`,
    javascript: `function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(amount + 1);
  dp[0] = 0;
  for (const coin of coins)
    for (let a = coin; a <= amount; a++)
      dp[a] = Math.min(dp[a], dp[a - coin] + 1);
  return dp[amount] > amount ? -1 : dp[amount];
}`,
    typescript: `function coinChange(coins: number[], amount: number): number {
  const dp = new Array(amount + 1).fill(amount + 1);
  dp[0] = 0;
  for (const coin of coins)
    for (let a = coin; a <= amount; a++)
      dp[a] = Math.min(dp[a], dp[a - coin] + 1);
  return dp[amount] > amount ? -1 : dp[amount];
}`,
    csharp: `int CoinChange(int[] coins, int amount) {
    var dp = new int[amount + 1];
    Array.Fill(dp, amount + 1);
    dp[0] = 0;
    foreach (int coin in coins)
        for (int a = coin; a <= amount; a++)
            dp[a] = Math.Min(dp[a], dp[a - coin] + 1);
    return dp[amount] > amount ? -1 : dp[amount];
}`,
    go: `func coinChange(coins []int, amount int) int {
	dp := make([]int, amount+1)
	for a := 1; a <= amount; a++ { dp[a] = amount + 1 }
	for _, coin := range coins {
		for a := coin; a <= amount; a++ {
			if dp[a-coin]+1 < dp[a] { dp[a] = dp[a-coin] + 1 }
		}
	}
	if dp[amount] > amount { return -1 }
	return dp[amount]
}`,
    rust: `fn coin_change(coins: &[usize], amount: usize) -> i32 {
    let inf = amount + 1;
    let mut dp = vec![inf; amount + 1];
    dp[0] = 0;
    for &coin in coins {
        for a in coin..=amount {
            dp[a] = dp[a].min(dp[a - coin] + 1);
        }
    }
    if dp[amount] > amount { -1 } else { dp[amount] as i32 }
}`,
    kotlin: `fun coinChange(coins: IntArray, amount: Int): Int {
    val dp = IntArray(amount + 1) { amount + 1 }
    dp[0] = 0
    for (coin in coins)
        for (a in coin..amount)
            dp[a] = minOf(dp[a], dp[a - coin] + 1)
    return if (dp[amount] > amount) -1 else dp[amount]
}`,
    swift: `func coinChange(_ coins: [Int], _ amount: Int) -> Int {
    var dp = Array(repeating: amount + 1, count: amount + 1)
    dp[0] = 0
    for coin in coins {
        if coin > amount { continue }
        for a in coin...amount {
            dp[a] = min(dp[a], dp[a - coin] + 1)
        }
    }
    return dp[amount] > amount ? -1 : dp[amount]
}`,
  },
  content: {
    overview: `The coin-change problem asks for the minimum number of coins that add up to a target amount, given an unlimited supply of each denomination. With coins {1, 3, 4} and target 6, the greedy "largest first" answer (4 + 1 + 1 = 3 coins) is beaten by the optimal 3 + 3 = 2 coins — which is exactly why this needs dynamic programming rather than greed.

The DP builds up answers for every amount from 0 to the target. dp[a] holds the fewest coins to form amount a; it starts at 0 for a = 0 and "infinity" (unreachable) otherwise. For each coin, every amount a ≥ coin can be improved to 1 + dp[a − coin]. Because a coin may be reused, the inner loop runs forward — this is the unbounded-knapsack pattern. The 2-D view shown here adds one coin denomination per row so you can watch each amount's best count improve as more coins become available.`,
    howItWorks: [
      "Set dp[0] = 0 (no coins make amount 0) and every other dp[a] = ∞.",
      "Consider each coin denomination in turn.",
      "For each amount a from coin up to target, try using this coin: candidate = 1 + dp[a − coin].",
      "Keep the smaller of skipping the coin and using it: dp[a] = min(dp[a], candidate).",
      "dp[amount] is the answer; if it is still ∞ the target is unreachable (return −1). Trace back to list the coins.",
    ],
    complexity: {
      time: { best: "O(amount · coins)", average: "O(amount · coins)", worst: "O(amount · coins)" },
      space: "O(amount)",
      notes: "The 1-D array reuses each coin unboundedly by scanning amounts left-to-right. The 2-D table shown here uses O(coins · amount) space for clarity of the traceback.",
    },
    applications: [
      "making change with the fewest coins/notes in cash systems",
      "minimum-stamp / minimum-weight combination problems",
      "resource packing where units are reusable",
      "as the canonical unbounded-knapsack teaching example",
    ],
    advantages: [
      "Always finds the true minimum, where greedy can fail",
      "Handles arbitrary, non-canonical coin systems",
      "Linear space in the target with the 1-D array",
      "Traceback recovers which coins to use",
    ],
    disadvantages: [
      "Pseudo-polynomial — cost scales with the numeric target, not input size",
      "Impractical for very large target amounts",
      "Only counts coins; a separate pass is needed to list them",
    ],
    commonMistakes: [
      "Using a greedy largest-coin-first strategy, which is wrong for non-canonical systems.",
      "Iterating amounts right-to-left, which turns it into the 0/1 (each coin once) variant.",
      "Forgetting to set unreachable amounts to infinity, corrupting the min.",
      "Confusing 'minimum coins' with 'number of ways' (a different DP recurrence).",
    ],
    interviewQuestions: [
      "Why does the greedy approach fail for coins like {1, 3, 4} and amount 6?",
      "How does the loop direction distinguish unbounded from 0/1 coin usage?",
      "How would you instead count the number of distinct ways to make the amount?",
      "How do you reconstruct which coins were used?",
      "When is the greedy algorithm actually optimal (canonical coin systems)?",
    ],
    summary:
      "Coin change finds the fewest reusable coins summing to a target via dp[a] = min(dp[a], 1 + dp[a − coin]), an unbounded-knapsack recurrence, in O(amount · coins) time. It's the standard example where greedy fails but DP is provably optimal.",
    quiz: [
      { question: "Coin change (min coins) allows each denomination to be used…", options: ["Exactly once", "At most twice", "Any number of times", "Never twice"], answer: 2, explanation: "It's the unbounded version — coins can be reused freely." },
      { question: "The base case dp[0] equals…", options: ["∞", "1", "0", "the number of coins"], answer: 2, explanation: "Amount zero requires zero coins." },
      { question: "The recurrence for using a coin is…", options: ["dp[a] = dp[a-coin]", "dp[a] = 1 + dp[a-coin]", "dp[a] = dp[a] + coin", "dp[a] = coin"], answer: 1, explanation: "Using one coin adds 1 to the best count for the remaining amount." },
      { question: "Greedy largest-first is unreliable because…", options: ["It is too slow", "Non-canonical coin sets can make it suboptimal", "It uses too much memory", "It cannot handle coin 1"], answer: 1, explanation: "For sets like {1,3,4}, greedy misses the optimal combination." },
      { question: "If dp[amount] stays at infinity, it means…", options: ["The amount is reachable", "The target cannot be formed", "There is a bug", "The answer is zero"], answer: 1, explanation: "Infinity signals no combination of coins reaches that amount." },
    ],
  },
  contentAr: {
    overview: `تطرح مسألة فكة العملات السؤال التالي: ما أقل عدد من العملات يبلغ مجموعها مبلغًا مستهدفًا، بمعلومية إمداد غير محدود من كل فئة؟ بالعملات {1, 3, 4} والهدف 6، فإن جواب الجشِع "الأكبر أولًا" (4 + 1 + 1 = 3 عملات) يُهزم أمام الأمثل 3 + 3 = عملتين — وهذا بالضبط سبب حاجة هذه المسألة إلى البرمجة الديناميكية بدلًا من الجشِع.

تبني البرمجة الديناميكية أجوبة لكل مبلغ من 0 إلى الهدف. تحمل dp[a] أقل عدد من العملات لتكوين المبلغ a؛ تبدأ بـ 0 عند a = 0 و"اللانهاية" (غير قابل للتكوين) في باقي الحالات. لكل عملة، يمكن تحسين كل مبلغ a ≥ العملة إلى 1 + dp[a − العملة]. ولأن العملة قد تُستخدم مرارًا، تسير الحلقة الداخلية للأمام — وهذا نمط الحقيبة غير المحدودة. العرض ثنائي الأبعاد هنا يضيف فئة عملة واحدة لكل صف كي تُشاهد أفضل عدد لكل مبلغ يتحسن مع توفر مزيد من العملات.`,
    howItWorks: [
      "اجعل dp[0] = 0 (لا عملات تكوّن المبلغ 0) وكل dp[a] الأخرى = ∞.",
      "اعتبر كل فئة عملة بدورها.",
      "لكل مبلغ a من العملة حتى الهدف، جرّب استخدام هذه العملة: المرشح = 1 + dp[a − العملة].",
      "احتفظ بالأصغر بين تجاوز العملة واستخدامها: dp[a] = min(dp[a], المرشح).",
      "dp[amount] هو الجواب؛ إذا بقي ∞ فالهدف غير قابل للتكوين (أعِد −1). تتبّع رجوعًا لسرد العملات.",
    ],
    complexity: {
      time: { best: "O(amount · coins)", average: "O(amount · coins)", worst: "O(amount · coins)" },
      space: "O(amount)",
      notes: "تعيد المصفوفة أحادية البعد استخدام كل عملة دون حد بمسح المبالغ من اليسار لليمين. الجدول ثنائي الأبعاد المعروض هنا يستخدم مساحة O(coins · amount) لوضوح التتبع الرجعي.",
    },
    applications: [
      "إعطاء الفكة بأقل عدد من العملات/الأوراق في الأنظمة النقدية",
      "مسائل أقل عدد من الطوابع/الأوزان في التوليفات",
      "تعبئة الموارد حيث الوحدات قابلة لإعادة الاستخدام",
      "المثال التعليمي الكلاسيكي للحقيبة غير المحدودة",
    ],
    advantages: [
      "يجد دائمًا الحد الأدنى الحقيقي، حيث قد يفشل الجشِع",
      "يتعامل مع أنظمة عملات عشوائية غير قانونية (non-canonical)",
      "مساحة خطية في الهدف باستخدام المصفوفة أحادية البعد",
      "التتبع الرجعي يستعيد العملات الواجب استخدامها",
    ],
    disadvantages: [
      "شبه كثيرة الحدود — تتناسب التكلفة مع القيمة العددية للهدف لا حجم المدخلات",
      "غير عملي لمبالغ هدف كبيرة جدًا",
      "يحسب العملات فقط؛ يلزم تمرير منفصل لسردها",
    ],
    commonMistakes: [
      "استخدام استراتيجية الجشِع بالعملة الأكبر أولًا، وهي خاطئة للأنظمة غير القانونية.",
      "تكرار المبالغ من اليمين لليسار، مما يحوّلها إلى نسخة 0/1 (كل عملة مرة واحدة).",
      "نسيان تعيين المبالغ غير القابلة للتكوين إلى اللانهاية، مما يفسد الحد الأدنى.",
      "الخلط بين 'أقل عدد عملات' و'عدد الطرق' (علاقة تكرارية مختلفة للبرمجة الديناميكية).",
    ],
    interviewQuestions: [
      "لماذا يفشل النهج الجشِع مع عملات مثل {1, 3, 4} ومبلغ 6؟",
      "كيف يميز اتجاه الحلقة بين الاستخدام غير المحدود واستخدام 0/1 للعملة؟",
      "كيف تحسب بدلًا من ذلك عدد الطرق المميزة لتكوين المبلغ؟",
      "كيف تعيد بناء العملات التي استُخدمت؟",
      "متى يكون النهج الجشِع فعلًا أمثل (أنظمة العملات القانونية)؟",
    ],
    summary:
      "تجد فكة العملات أقل عدد من العملات القابلة لإعادة الاستخدام والتي يبلغ مجموعها هدفًا عبر dp[a] = min(dp[a], 1 + dp[a − العملة])، وهي علاقة تكرارية للحقيبة غير المحدودة، بزمن O(amount · coins). إنها المثال القياسي الذي يفشل فيه الجشِع بينما تكون البرمجة الديناميكية مثلى إثباتًا.",
    quiz: [
      { question: "تسمح فكة العملات (أقل عدد عملات) باستخدام كل فئة…", options: ["مرة واحدة بالضبط", "مرتين على الأكثر", "أي عدد من المرات", "أبدًا مرتين"], answer: 2, explanation: "إنها النسخة غير المحدودة — يمكن إعادة استخدام العملات بحرية." },
      { question: "الحالة الأساسية dp[0] تساوي…", options: ["∞", "1", "0", "عدد العملات"], answer: 2, explanation: "المبلغ صفر يتطلب صفر عملة." },
      { question: "العلاقة التكرارية لاستخدام عملة هي…", options: ["dp[a] = dp[a-coin]", "dp[a] = 1 + dp[a-coin]", "dp[a] = dp[a] + coin", "dp[a] = coin"], answer: 1, explanation: "استخدام عملة واحدة يضيف 1 إلى أفضل عدد للمبلغ المتبقي." },
      { question: "الجشِع بالعملة الأكبر أولًا غير موثوق لأن…", options: ["إنه بطيء جدًا", "أنظمة العملات غير القانونية قد تجعله غير أمثل", "يستخدم ذاكرة كثيرة", "لا يتعامل مع العملة 1"], answer: 1, explanation: "لأنظمة مثل {1,3,4}، يفوّت الجشِع التوليفة المثلى." },
      { question: "إذا بقيت dp[amount] عند اللانهاية، فهذا يعني…", options: ["المبلغ قابل للتكوين", "لا يمكن تكوين الهدف", "يوجد خطأ برمجي", "الجواب صفر"], answer: 1, explanation: "اللانهاية تشير إلى عدم وجود توليفة عملات تصل إلى ذلك المبلغ." },
    ],
  },
  inputFields: [
    { key: "coins", label: "Coin denominations", placeholder: "1, 3, 4", help: "Comma-separated positive integers (up to 10).", list: true },
    { key: "amount", label: "Target amount", placeholder: "6", help: "0–40." },
  ],
  defaultInput: (level, rng) => randomInput(level, rng),
  parseInput: (fields) => {
    const coins = (fields.coins ?? "")
      .split(/[,\s]+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const v = Number(p);
        if (!Number.isInteger(v) || v < 1) throw new Error(`"${p}" is not a positive whole coin value.`);
        return v;
      });
    if (coins.length < 1) throw new Error("Enter at least one coin value.");
    if (coins.length > 10) throw new Error("Maximum 10 coin denominations.");
    if (new Set(coins).size !== coins.length) throw new Error("Coin denominations must be distinct.");
    const amount = Number((fields.amount ?? "").trim());
    if (!Number.isInteger(amount) || amount < 0 || amount > 40) throw new Error("Amount must be a whole number from 0 to 40.");
    return { coins, amount };
  },
  serializeInput: (input) => ({ coins: input.coins.join(", "), amount: String(input.amount) }),
  generate,
};

export default mod;
