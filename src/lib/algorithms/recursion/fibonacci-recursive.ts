import type { AlgorithmModule, CallStackFrame, CallStackItem, Step } from "@/lib/engine/types";

type Input = { n: number };

function generate(input: Input): Step<CallStackFrame>[] {
  const n = Math.max(0, Math.min(14, input.n));
  const steps: Step<CallStackFrame>[] = [];
  const stack: CallStackItem[] = [];
  let calls = 0;
  const output: (string | number)[] = [];

  const snap = (description: string, codeLine: number, topState?: CallStackItem["state"], descriptionAr?: string) => {
    const shown = stack.map((s, i) => ({ ...s, state: i === stack.length - 1 ? topState ?? s.state : s.state }));
    steps.push({
      frame: { stack: shown, output: [...output] },
      description,
      descriptionAr,
      codeLine,
      counters: { calls, depth: stack.length },
    });
  };

  snap(
    `Compute fib(${n}) recursively: fib(n) = fib(n−1) + fib(n−2), with base cases fib(0)=0, fib(1)=1. Watch how the same subproblems get recomputed many times — this is why naive recursion is exponential.`,
    0,
    undefined,
    `احسب fib(${n}) عوديًا: fib(n) = fib(n−1) + fib(n−2)، مع الحالتين الأساسيتين fib(0)=0 و fib(1)=1. لاحظ كيف تُعاد حسابات نفس المسائل الفرعية مرارًا — لهذا السبب تكون العودية الساذجة أسية.`,
  );

  const fib = (k: number): number => {
    calls++;
    const item: CallStackItem = { id: `f${k}-${calls}`, label: `fib(${k})`, state: "active" };
    stack.push(item);
    snap(
      `Call fib(${k}). ${k <= 1 ? "This is a base case." : `Needs fib(${k - 1}) and fib(${k - 2}).`}`,
      1,
      "active",
      `استدعِ fib(${k}). ${k <= 1 ? "هذه حالة أساسية." : `يحتاج إلى fib(${k - 1}) و fib(${k - 2}).`}`,
    );
    let result: number;
    if (k <= 1) {
      result = k;
      item.detail = `= ${k}`;
      snap(`Base case: fib(${k}) returns ${k}.`, 2, "found", `الحالة الأساسية: fib(${k}) تُعيد ${k}.`);
    } else {
      const left = fib(k - 1);
      item.detail = `fib(${k - 1}) = ${left}, waiting on fib(${k - 2})`;
      snap(
        `fib(${k - 1}) = ${left}. Now compute fib(${k - 2}).`,
        3,
        "active",
        `fib(${k - 1}) = ${left}. الآن احسب fib(${k - 2}).`,
      );
      const right = fib(k - 2);
      result = left + right;
      item.detail = `${left} + ${right} = ${result}`;
      snap(
        `Unwind: fib(${k}) = fib(${k - 1}) + fib(${k - 2}) = ${left} + ${right} = ${result}.`,
        4,
        "sorted",
        `التراجع: fib(${k}) = fib(${k - 1}) + fib(${k - 2}) = ${left} + ${right} = ${result}.`,
      );
    }
    stack.pop();
    return result;
  };

  const answer = fib(n);
  output.push(answer);
  snap(
    `fib(${n}) = ${answer}, computed with ${calls} total calls (naive recursion is O(2ⁿ); memoization or bottom-up DP brings this to O(n)).`,
    5,
    undefined,
    `fib(${n}) = ${answer}، محسوبة بإجمالي ${calls} استدعاء (العودية الساذجة O(2ⁿ)؛ التخزين المؤقت للنتائج أو البرمجة الديناميكية التصاعدية تختزل هذا إلى O(n)).`,
  );
  return steps;
}

const mod: AlgorithmModule<CallStackFrame, Input> = {
  slug: "fibonacci-recursive",
  title: "Fibonacci (Naive Recursion)",
  titleAr: "فيبوناتشي (عودية ساذجة)",
  category: "recursion",
  difficulty: "Beginner",
  tags: ["recursion", "call stack", "exponential", "overlapping subproblems"],
  tagsAr: ["العودية", "مكدس الاستدعاءات", "أسي", "مسائل فرعية متداخلة"],
  summary: "Computes fib(n) = fib(n−1) + fib(n−2) directly by recursion — simple, but exponential because subproblems are solved again and again.",
  summaryAr: "يحسب fib(n) = fib(n−1) + fib(n−2) مباشرة بالعودية — بسيط، لكنه أسي لأن المسائل الفرعية تُحل مرارًا وتكرارًا.",
  renderer: "callstack",
  pseudocode: [
    "procedure fib(n)",
    "  call fib(n)",
    "  if n <= 1: return n            // base case",
    "  left = fib(n-1)",
    "  right = fib(n-2)",
    "  return left + right            // recursive case",
    "  // fib(n-2) is recomputed inside fib(n-1) too!",
  ],
  code: {
    pseudocode: `procedure fib(n)
  if n <= 1: return n
  return fib(n-1) + fib(n-2)`,
    c: `int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}`,
    cpp: `int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}`,
    java: `static int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}`,
    python: `def fib(n: int) -> int:
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)`,
    javascript: `function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}`,
    typescript: `function fib(n: number): number {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}`,
    csharp: `static int Fib(int n) {
    if (n <= 1) return n;
    return Fib(n - 1) + Fib(n - 2);
}`,
    go: `func fib(n int) int {
	if n <= 1 {
		return n
	}
	return fib(n-1) + fib(n-2)
}`,
    rust: `fn fib(n: u64) -> u64 {
    if n <= 1 { n } else { fib(n - 1) + fib(n - 2) }
}`,
    kotlin: `fun fib(n: Int): Int = if (n <= 1) n else fib(n - 1) + fib(n - 2)`,
    swift: `func fib(_ n: Int) -> Int {
    n <= 1 ? n : fib(n - 1) + fib(n - 2)
}`,
  },
  content: {
    overview: `The Fibonacci sequence (0, 1, 1, 2, 3, 5, 8, 13, …) has the textbook recursive definition fib(n) = fib(n−1) + fib(n−2). Translating that definition directly into code is completely correct and instructive — but ruinously slow. Each call to fib(n) spawns two more calls, and those spawn more, forming a call tree with about 2ⁿ nodes.

The real cost is overlapping subproblems: fib(5) calls fib(4) and fib(3), but fib(4) also calls fib(3) — the exact same subproblem gets solved twice, and this doubling compounds at every level. This module exists specifically to make that redundancy visible in the call stack; it is the canonical motivating example for memoization and bottom-up dynamic programming, which solve each subproblem exactly once.`,
    howItWorks: [
      "To compute fib(n): if n ≤ 1, return n directly (base case).",
      "Otherwise, recursively compute left = fib(n−1).",
      "Recursively compute right = fib(n−2) — a call that (for n−1 ≥ 2) recomputes work already done inside the fib(n−1) branch.",
      "Return left + right.",
      "The call tree has depth n but roughly 2ⁿ total nodes, because each subproblem below the top level is solved multiple times.",
    ],
    complexity: {
      time: { best: "O(2ⁿ)", average: "O(2ⁿ)", worst: "O(2ⁿ)" },
      space: "O(n)",
      notes: "More precisely O(φⁿ) where φ ≈ 1.618 (the golden ratio) — still exponential. Stack depth is only O(n) even though the total call count is exponential, since the tree's depth is n.",
    },
    applications: [
      "Canonical teaching example for recursion and for the cost of overlapping subproblems",
      "Motivates memoization: caching fib(k) the first time it's computed turns this into O(n)",
      "Motivates bottom-up dynamic programming (see: Fibonacci DP in this app)",
      "Illustrates why 'correct but naive' recursion can still be practically unusable",
    ],
    advantages: [
      "Directly mirrors the mathematical definition — easiest possible fib to write and prove correct",
      "No auxiliary data structures needed",
      "Great teaching tool for call trees and recursion depth vs. total call count",
    ],
    disadvantages: [
      "Exponential time — fib(40) alone takes billions of calls",
      "Massively redundant: fib(k) for small k gets recomputed exponentially many times",
      "Practically unusable beyond roughly n ≈ 35–40 without memoization",
    ],
    commonMistakes: [
      "Assuming recursion depth (O(n)) is the same as total work (O(2ⁿ)) — they are very different here.",
      "Not recognizing overlapping subproblems as the specific inefficiency (as opposed to just 'recursion is slow').",
      "Forgetting the base case for n = 0 (returning 1 instead of 0, off-by-one in the sequence).",
      "Reaching for this version in production code instead of memoized or iterative fib.",
    ],
    interviewQuestions: [
      "Why is naive recursive Fibonacci O(2ⁿ) despite only O(n) recursion depth?",
      "What are 'overlapping subproblems' and how does this example demonstrate them?",
      "How would memoization change the time complexity, and what extra space would it cost?",
      "Derive the exact growth rate (why is it O(φⁿ)) rather than just 'exponential'?",
      "Convert this into an O(n) bottom-up iterative solution.",
    ],
    summary:
      "Naive recursive Fibonacci directly implements fib(n) = fib(n−1) + fib(n−2), which is correct but exponential (~O(φⁿ)) because it resolves the same overlapping subproblems repeatedly. It's the canonical example that motivates memoization and bottom-up dynamic programming, both of which drop the complexity to O(n) by solving each subproblem exactly once.",
    quiz: [
      { question: "Naive recursive Fibonacci's time complexity is…", options: ["O(n)", "O(n²)", "O(2ⁿ) (more precisely O(φⁿ))", "O(log n)"], answer: 2, explanation: "Every call spawns two more, forming a call tree whose size grows exponentially with n." },
      { question: "The core inefficiency is called…", options: ["Tail recursion", "Overlapping subproblems", "Memoization", "Divide and conquer"], answer: 1, explanation: "The same fib(k) gets computed repeatedly across different branches of the call tree." },
      { question: "The recursion's maximum stack depth is…", options: ["O(2ⁿ)", "O(n)", "O(1)", "O(n²)"], answer: 1, explanation: "The deepest single call chain only goes from n down to the base case — depth n, even though total calls are exponential." },
      { question: "Which technique fixes the exponential blowup while keeping the recursive structure?", options: ["Tail call removal", "Memoization (caching each fib(k) the first time it's computed)", "Increasing the base case", "Using floats"], answer: 1, explanation: "Caching results turns the exponential call tree into O(n) distinct subproblems solved once each." },
      { question: "fib(0) and fib(1) are defined as…", options: ["1 and 1", "0 and 1", "0 and 0", "1 and 0"], answer: 1, explanation: "The sequence 0, 1, 1, 2, 3, 5, … starts with fib(0) = 0 and fib(1) = 1." },
    ],
  },
  contentAr: {
    overview: `متتالية فيبوناتشي (0، 1، 1، 2، 3، 5، 8، 13، …) لها التعريف العودي المدرسي fib(n) = fib(n−1) + fib(n−2). تحويل هذا التعريف مباشرة إلى كود صحيح تمامًا وتعليمي — لكنه بطيء بشكل مدمر. كل استدعاء لـ fib(n) يُطلِق استدعاءين آخرين، وهما يُطلِقان المزيد، مكوّنَين شجرة استدعاءات بها نحو 2ⁿ عقدة.

التكلفة الحقيقية سببها المسائل الفرعية المتداخلة: fib(5) يستدعي fib(4) و fib(3)، لكن fib(4) يستدعي fib(3) أيضًا — نفس المسألة الفرعية تُحل مرتين، وهذا التضاعف يتراكم في كل مستوى. توجد هذه الوحدة تحديدًا لإظهار هذا التكرار في مكدس الاستدعاءات؛ وهي المثال التحفيزي الكلاسيكي للتخزين المؤقت للنتائج والبرمجة الديناميكية التصاعدية، اللذين يحلان كل مسألة فرعية مرة واحدة فقط.`,
    howItWorks: [
      "لحساب fib(n): إذا كان n ≤ 1، أعِد n مباشرة (الحالة الأساسية).",
      "خلاف ذلك، احسب عوديًا left = fib(n−1).",
      "احسب عوديًا right = fib(n−2) — استدعاء يعيد (عند n−1 ≥ 2) حساب عمل تم إنجازه بالفعل داخل فرع fib(n−1).",
      "أعِد left + right.",
      "عمق شجرة الاستدعاءات هو n لكن عدد عقدها الإجمالي يقارب 2ⁿ، لأن كل مسألة فرعية دون المستوى الأعلى تُحل عدة مرات.",
    ],
    complexity: {
      time: { best: "O(2ⁿ)", average: "O(2ⁿ)", worst: "O(2ⁿ)" },
      space: "O(n)",
      notes: "بدقة أكبر O(φⁿ) حيث φ ≈ 1.618 (النسبة الذهبية) — ما زال أسيًا. عمق المكدس هو O(n) فقط رغم أن إجمالي الاستدعاءات أسي، لأن عمق الشجرة هو n.",
    },
    applications: [
      "المثال التعليمي الكلاسيكي للعودية ولتكلفة المسائل الفرعية المتداخلة",
      "يحفّز التخزين المؤقت للنتائج: تخزين fib(k) عند أول حساب له يحوّل هذا إلى O(n)",
      "يحفّز البرمجة الديناميكية التصاعدية (انظر: فيبوناتشي بالبرمجة الديناميكية في هذا التطبيق)",
      "يوضح كيف يمكن للعودية 'الصحيحة لكن الساذجة' أن تظل غير قابلة للاستخدام عمليًا",
    ],
    advantages: [
      "يعكس التعريف الرياضي مباشرة — أبسط طريقة ممكنة لكتابة فيبوناتشي وإثبات صحتها",
      "لا يحتاج هياكل بيانات مساعدة",
      "أداة تعليمية ممتازة لأشجار الاستدعاءات مقابل عمق العودية وإجمالي عدد الاستدعاءات",
    ],
    disadvantages: [
      "زمن أسي — fib(40) وحدها تستغرق مليارات الاستدعاءات",
      "تكرار هائل: fib(k) للقيم الصغيرة يُعاد حسابه عددًا أسيًا من المرات",
      "غير قابل للاستخدام عمليًا بعد نحو n ≈ 35–40 دون تخزين مؤقت للنتائج",
    ],
    commonMistakes: [
      "افتراض أن عمق العودية (O(n)) هو نفسه إجمالي العمل (O(2ⁿ)) — وهما مختلفان تمامًا هنا.",
      "عدم التعرف على المسائل الفرعية المتداخلة كسبب محدد لعدم الكفاءة (بدلًا من مجرد اعتبار 'العودية بطيئة').",
      "نسيان الحالة الأساسية لـ n = 0 (إعادة 1 بدلًا من 0، خطأ بواحد في المتتالية).",
      "اللجوء إلى هذه النسخة في كود الإنتاج بدلًا من فيبوناتشي بالتخزين المؤقت أو التكراري.",
    ],
    interviewQuestions: [
      "لماذا يكون فيبوناتشي العودي الساذج O(2ⁿ) رغم أن عمق العودية O(n) فقط؟",
      "ما هي 'المسائل الفرعية المتداخلة' وكيف يوضحها هذا المثال؟",
      "كيف يغيّر التخزين المؤقت للنتائج التعقيد الزمني، وما المساحة الإضافية التي يكلفها؟",
      "استنتج معدل النمو الدقيق (لماذا هو O(φⁿ)) بدلًا من مجرد 'أسي'؟",
      "حوّل هذا إلى حل تكراري تصاعدي بزمن O(n).",
    ],
    summary:
      "فيبوناتشي العودي الساذج يطبّق مباشرة fib(n) = fib(n−1) + fib(n−2)، وهو صحيح لكنه أسي (~O(φⁿ)) لأنه يحل نفس المسائل الفرعية المتداخلة مرارًا. وهو المثال الكلاسيكي المحفِّز للتخزين المؤقت للنتائج والبرمجة الديناميكية التصاعدية، وكلاهما يُنزل التعقيد إلى O(n) بحل كل مسألة فرعية مرة واحدة فقط.",
    quiz: [
      { question: "التعقيد الزمني لفيبوناتشي العودي الساذج هو…", options: ["O(n)", "O(n²)", "O(2ⁿ) (بدقة أكبر O(φⁿ))", "O(log n)"], answer: 2, explanation: "كل استدعاء يُطلِق استدعاءين آخرين، مكوّنًا شجرة استدعاءات ينمو حجمها أسيًا مع n." },
      { question: "عدم الكفاءة الجوهري هنا يُسمى…", options: ["العودية الذيلية", "المسائل الفرعية المتداخلة", "التخزين المؤقت للنتائج", "فرّق تسد"], answer: 1, explanation: "نفس fib(k) يُحسب مرارًا عبر فروع مختلفة من شجرة الاستدعاءات." },
      { question: "أقصى عمق لمكدس هذه العودية هو…", options: ["O(2ⁿ)", "O(n)", "O(1)", "O(n²)"], answer: 1, explanation: "أعمق سلسلة استدعاءات واحدة تذهب فقط من n إلى الحالة الأساسية — عمق n، رغم أن إجمالي الاستدعاءات أسي." },
      { question: "أي تقنية تعالج الانفجار الأسي مع الحفاظ على البنية العودية؟", options: ["إزالة الاستدعاء الذيلي", "التخزين المؤقت للنتائج (تخزين كل fib(k) عند أول حساب له)", "زيادة الحالة الأساسية", "استخدام أعداد عشرية"], answer: 1, explanation: "تخزين النتائج يحوّل شجرة الاستدعاءات الأسية إلى O(n) مسألة فرعية متمايزة تُحل مرة واحدة لكل منها." },
      { question: "fib(0) و fib(1) مُعرَّفتان بـ…", options: ["1 و 1", "0 و 1", "0 و 0", "1 و 0"], answer: 1, explanation: "المتتالية 0، 1، 1، 2، 3، 5، … تبدأ بـ fib(0) = 0 و fib(1) = 1." },
    ],
  },
  inputFields: [{ key: "n", label: "n", placeholder: "7", help: "0–14 (kept small — this is exponential! fib(14) already makes ~1600 recursive calls)." }],
  defaultInput: (level) => ({ n: Math.min(14, 4 + level * 2) }),
  parseInput: (fields) => {
    const n = Number((fields.n ?? "").trim());
    if (!Number.isInteger(n) || n < 0 || n > 14) throw new Error("n must be an integer between 0 and 14.");
    return { n };
  },
  serializeInput: (input) => ({ n: String(input.n) }),
  generate,
};

export default mod;
