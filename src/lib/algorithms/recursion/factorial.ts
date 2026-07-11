import type { AlgorithmModule, CallStackFrame, CallStackItem, Step } from "@/lib/engine/types";

type Input = { n: number };

function generate(input: Input): Step<CallStackFrame>[] {
  const n = Math.max(0, Math.min(100, input.n));
  const steps: Step<CallStackFrame>[] = [];
  const stack: CallStackItem[] = [];
  let calls = 0;
  const output: (string | number)[] = [];

  const snap = (description: string, codeLine: number, topState?: CallStackItem["state"], descriptionAr?: string) => {
    const shown = stack.map((s, i) => ({ ...s, state: i === stack.length - 1 ? topState ?? s.state : s.state }));
    steps.push({ frame: { stack: shown, output: [...output] }, description, descriptionAr, codeLine, counters: { calls, depth: stack.length } });
  };

  snap(
    `Compute ${n}! recursively: factorial(n) = n × factorial(n−1).`,
    0,
    undefined,
    `احسب ${n}! عوديًا: factorial(n) = n × factorial(n−1).`,
  );

  // BigInt keeps every product exact — n! blows past Number.MAX_SAFE_INTEGER once n > 18.
  const fact = (k: number): bigint => {
    calls++;
    const item: CallStackItem = { id: `f${k}-${calls}`, label: `factorial(${k})`, state: "active" };
    stack.push(item);
    snap(
      `Call factorial(${k}). ${k <= 1 ? "This is the base case." : `Needs factorial(${k - 1}) first.`}`,
      1,
      "active",
      `استدعِ factorial(${k}). ${k <= 1 ? "هذه هي الحالة الأساسية." : `يحتاج إلى factorial(${k - 1}) أولًا.`}`,
    );
    let result: bigint;
    if (k <= 1) {
      result = BigInt(1);
      item.detail = `= 1`;
      snap(`Base case: factorial(${k}) returns 1.`, 2, "found", `الحالة الأساسية: factorial(${k}) تُعيد 1.`);
    } else {
      const sub = fact(k - 1);
      result = BigInt(k) * sub;
      item.detail = `${k} × ${sub} = ${result}`;
      snap(
        `Unwind: factorial(${k}) = ${k} × ${sub} = ${result}.`,
        4,
        "sorted",
        `التراجع: factorial(${k}) = ${k} × ${sub} = ${result}.`,
      );
    }
    stack.pop();
    return result;
  };

  const answer = fact(n);
  output.push(answer.toString());
  snap(
    `${n}! = ${answer}. The stack is empty again.`,
    5,
    undefined,
    `${n}! = ${answer}. أصبح المكدس فارغًا من جديد.`,
  );
  return steps;
}

const mod: AlgorithmModule<CallStackFrame, Input> = {
  slug: "factorial",
  title: "Factorial (Recursion)",
  titleAr: "المضروب (عوديًا)",
  category: "recursion",
  difficulty: "Beginner",
  tags: ["recursion", "base case", "call stack"],
  tagsAr: ["العودية", "الحالة الأساسية", "مكدس الاستدعاءات"],
  summary: "Computes n! by recursion, showing the call stack winding up to the base case and unwinding with results.",
  summaryAr: "يحسب n! بالعودية، ويعرض مكدس الاستدعاءات وهو يتصاعد حتى الحالة الأساسية ثم يتراجع بالنتائج.",
  renderer: "callstack",
  pseudocode: [
    "procedure factorial(n)",
    "  call factorial(n)",
    "  if n <= 1: return 1        // base case",
    "  else:",
    "    return n * factorial(n-1)  // recursive case",
    "  // result returned to caller",
  ],
  code: {
    pseudocode: `procedure factorial(n)
  if n <= 1: return 1
  return n * factorial(n - 1)`,
    c: `long factorial(int n) {
    if (n <= 1) return 1;
    return (long)n * factorial(n - 1);
}`,
    cpp: `long long factorial(int n) {
    if (n <= 1) return 1;
    return 1LL * n * factorial(n - 1);
}`,
    java: `static long factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}`,
    python: `def factorial(n: int) -> int:
    if n <= 1:
        return 1
    return n * factorial(n - 1)`,
    javascript: `function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}`,
    typescript: `function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}`,
    csharp: `static long Factorial(int n) {
    if (n <= 1) return 1;
    return n * Factorial(n - 1);
}`,
    go: `func factorial(n int) int {
	if n <= 1 {
		return 1
	}
	return n * factorial(n-1)
}`,
    rust: `fn factorial(n: u64) -> u64 {
    if n <= 1 { 1 } else { n * factorial(n - 1) }
}`,
    kotlin: `fun factorial(n: Int): Long =
    if (n <= 1) 1 else n * factorial(n - 1)`,
    swift: `func factorial(_ n: Int) -> Int {
    n <= 1 ? 1 : n * factorial(n - 1)
}`,
  },
  content: {
    overview: `The factorial n! = n × (n−1) × … × 1 is the canonical first recursive function. Its definition is naturally recursive: factorial(n) = n × factorial(n−1), with the base case factorial(0) = factorial(1) = 1 that stops the recursion.

Watching it run reveals two phases. The "wind-up" phase pushes a new stack frame for each call as n decreases toward the base case, with each frame paused waiting for its subproblem. The "unwind" phase pops frames one by one, each multiplying its n by the value returned from below — a clear picture of how the call stack stores pending work.`,
    howItWorks: [
      "Call factorial(n).",
      "If n ≤ 1, return 1 immediately — the base case.",
      "Otherwise, recursively call factorial(n−1), pausing the current frame.",
      "Each deeper call pushes a new stack frame until the base case is reached.",
      "As calls return, each frame multiplies n by the returned value and pops.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n)", worst: "O(n)" },
      space: "O(n)",
      notes: "n recursive calls, each O(1) work → O(n) time. The call stack holds up to n frames → O(n) space (an iterative or tail-recursive version reduces this to O(1)).",
    },
    applications: [
      "Teaching recursion, base cases, and the call stack",
      "Combinatorics — permutations, combinations, binomial coefficients",
      "Probability and series expansions (e.g. Taylor series terms)",
      "Foundation for understanding memoization and dynamic programming",
    ],
    advantages: [
      "Directly mirrors the mathematical definition",
      "Simple and easy to verify",
      "Excellent vehicle for teaching recursion and stack frames",
    ],
    disadvantages: [
      "O(n) stack space can overflow for large n without tail-call optimization",
      "Overflows numeric types quickly (21! exceeds 64-bit range)",
      "An iterative loop is just as fast and uses O(1) space",
    ],
    commonMistakes: [
      "Omitting or mis-specifying the base case, causing infinite recursion / stack overflow.",
      "Using factorial(0) = 0 instead of 1.",
      "Ignoring integer overflow for even modest n.",
      "Assuming recursion is 'free' — each call consumes a stack frame.",
    ],
    interviewQuestions: [
      "What is the base case of factorial, and why is factorial(0) = 1?",
      "Convert the recursive factorial to an iterative version — what changes in space usage?",
      "What is tail recursion, and can factorial be written tail-recursively?",
      "At roughly what n does 64-bit factorial overflow?",
    ],
    summary:
      "Recursive factorial computes n! via factorial(n) = n × factorial(n−1) down to the base case, using O(n) time and O(n) stack space. It's the clearest demonstration of how recursion winds up and unwinds through the call stack.",
    quiz: [
      { question: "What is the base case of the recursive factorial?", options: ["n == 0 returns 0", "n <= 1 returns 1", "n == 2 returns 2", "There is none"], answer: 1, explanation: "factorial(0) and factorial(1) both equal 1, stopping the recursion." },
      { question: "How much stack space does recursive factorial(n) use?", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 2, explanation: "It builds up n nested frames before any returns." },
      { question: "The recursive calls reach the base case during which phase?", options: ["Wind-up (descending)", "Unwind (ascending)", "Both simultaneously", "Neither"], answer: 0, explanation: "n decreases on the way down; the base case is hit at the bottom before unwinding." },
      { question: "Why can factorial overflow quickly?", options: ["Recursion is slow", "Factorials grow faster than exponentials", "The base case is wrong", "It uses floats"], answer: 1, explanation: "n! grows super-exponentially, exceeding 64-bit integers by 21!." },
      { question: "An iterative factorial improves on the recursive one by…", options: ["Being asymptotically faster", "Using O(1) stack space", "Avoiding overflow", "Returning a different value"], answer: 1, explanation: "A loop avoids the O(n) call-stack frames while computing the same value in O(n) time." },
    ],
  },
  contentAr: {
    overview: `المضروب n! = n × (n−1) × … × 1 هو أول مثال كلاسيكي على الدوال العودية. تعريفه عودي بطبيعته: factorial(n) = n × factorial(n−1)، مع الحالة الأساسية factorial(0) = factorial(1) = 1 التي توقف العودية.

مشاهدة تنفيذه تكشف عن مرحلتين. مرحلة "الصعود" تدفع إطار مكدس جديدًا مع كل استدعاء بينما يتناقص n نحو الحالة الأساسية، وكل إطار يبقى متوقفًا في انتظار مسألته الفرعية. مرحلة "التراجع" تُخرِج الإطارات واحدًا تلو الآخر، وكل إطار يضرب قيمة n الخاصة به في القيمة العائدة من الأسفل — وهي صورة واضحة لكيفية تخزين مكدس الاستدعاءات للعمل المُعلَّق.`,
    howItWorks: [
      "استدعِ factorial(n).",
      "إذا كان n ≤ 1، أعِد 1 فورًا — وهذه هي الحالة الأساسية.",
      "خلاف ذلك، استدعِ factorial(n−1) عوديًا، مع إيقاف الإطار الحالي مؤقتًا.",
      "كل استدعاء أعمق يدفع إطار مكدس جديدًا حتى الوصول إلى الحالة الأساسية.",
      "مع عودة الاستدعاءات، يضرب كل إطار قيمة n في القيمة العائدة ثم يُخرَج من المكدس.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n)", worst: "O(n)" },
      space: "O(n)",
      notes: "n استدعاء عودي، كل واحد منها بعمل O(1) ← زمن O(n). يحتفظ مكدس الاستدعاءات بما يصل إلى n إطارًا ← مساحة O(n) (النسخة التكرارية أو ذيلية العودية تختزل هذا إلى O(1)).",
    },
    applications: [
      "تدريس العودية والحالات الأساسية ومكدس الاستدعاءات",
      "التوافيقيات — التباديل والتوافيق ومعاملات ذات الحدين",
      "الاحتمالات وتوسيعات المتسلسلات (مثل حدود متسلسلة تايلور)",
      "أساس لفهم التخزين المؤقت للنتائج والبرمجة الديناميكية",
    ],
    advantages: [
      "يعكس التعريف الرياضي مباشرة",
      "بسيط وسهل التحقق منه",
      "وسيلة ممتازة لتدريس العودية وإطارات المكدس",
    ],
    disadvantages: [
      "مساحة المكدس O(n) قد تفيض عند n كبيرة دون تحسين الاستدعاء الذيلي",
      "يتجاوز حدود الأنواع العددية بسرعة (21! يتجاوز نطاق 64 بت)",
      "الحلقة التكرارية بنفس السرعة وتستخدم مساحة O(1)",
    ],
    commonMistakes: [
      "حذف الحالة الأساسية أو تحديدها بشكل خاطئ، مما يسبب عودية لا نهائية / فيضان المكدس.",
      "استخدام factorial(0) = 0 بدلًا من 1.",
      "تجاهل فيضان الأعداد الصحيحة حتى عند قيم n متواضعة.",
      "افتراض أن العودية 'مجانية' — كل استدعاء يستهلك إطار مكدس.",
    ],
    interviewQuestions: [
      "ما الحالة الأساسية للمضروب، ولماذا factorial(0) = 1؟",
      "حوّل المضروب العودي إلى نسخة تكرارية — ما الذي يتغير في استخدام المساحة؟",
      "ما هي العودية الذيلية، وهل يمكن كتابة المضروب بأسلوب عودي ذيلي؟",
      "عند أي قيمة تقريبية لـ n يفيض مضروب 64 بت؟",
    ],
    summary:
      "يحسب المضروب العودي n! عبر factorial(n) = n × factorial(n−1) وصولًا إلى الحالة الأساسية، مستخدمًا زمن O(n) ومساحة مكدس O(n). وهو أوضح توضيح لكيفية صعود العودية وتراجعها عبر مكدس الاستدعاءات.",
    quiz: [
      { question: "ما الحالة الأساسية للمضروب العودي؟", options: ["n == 0 تُعيد 0", "n <= 1 تُعيد 1", "n == 2 تُعيد 2", "لا توجد حالة أساسية"], answer: 1, explanation: "factorial(0) و factorial(1) كلاهما يساوي 1، مما يوقف العودية." },
      { question: "كم مساحة مكدس يستخدمها factorial(n) العودي؟", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 2, explanation: "يبني n إطارًا متداخلًا قبل أن تبدأ أي عملية إرجاع." },
      { question: "في أي مرحلة تصل الاستدعاءات العودية إلى الحالة الأساسية؟", options: ["الصعود (التناقص)", "التراجع (التصاعد)", "كلتاهما في آن واحد", "لا هذه ولا تلك"], answer: 0, explanation: "تتناقص n في الطريق إلى الأسفل؛ وتُصادَف الحالة الأساسية في القاع قبل بدء التراجع." },
      { question: "لماذا يمكن أن يفيض المضروب بسرعة؟", options: ["العودية بطيئة", "المضروب ينمو أسرع من الدوال الأسية", "الحالة الأساسية خاطئة", "يستخدم أعدادًا عشرية"], answer: 1, explanation: "ينمو n! بمعدل يفوق النمو الأسي، فيتجاوز الأعداد الصحيحة 64 بت عند 21!." },
      { question: "يتفوق المضروب التكراري على العودي من خلال…", options: ["كونه أسرع تقاربيًا", "استخدام مساحة مكدس O(1)", "تجنب الفيضان", "إعادة قيمة مختلفة"], answer: 1, explanation: "الحلقة تتجنب إطارات مكدس الاستدعاءات O(n) بينما تحسب نفس القيمة في زمن O(n)." },
    ],
  },
  inputFields: [{ key: "n", label: "n", placeholder: "5", help: "0–100 (computed exactly with BigInt; the call stack scrolls for larger n)." }],
  defaultInput: (level) => ({ n: Math.min(10, 3 + level) }),
  parseInput: (fields) => {
    const n = Number((fields.n ?? "").trim());
    if (!Number.isInteger(n) || n < 0 || n > 100) throw new Error("Enter a whole number from 0 to 100.");
    return { n };
  },
  serializeInput: (input) => ({ n: String(input.n) }),
  generate,
};

export default mod;
