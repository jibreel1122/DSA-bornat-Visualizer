import type { AlgorithmModule, CallStackFrame, CallStackItem, Step } from "@/lib/engine/types";

type Input = { disks: number };

function generate(input: Input): Step<CallStackFrame>[] {
  const n = Math.max(1, Math.min(10, input.disks));
  const steps: Step<CallStackFrame>[] = [];
  const pegs: Record<"A" | "B" | "C", number[]> = {
    A: Array.from({ length: n }, (_, i) => n - i), // largest at bottom
    B: [],
    C: [],
  };
  const stack: CallStackItem[] = [];
  let moves = 0;
  let calls = 0;
  let uid = 0;

  const pegRows = () => [
    { label: "Peg A", values: [...pegs.A] },
    { label: "Peg B", values: [...pegs.B] },
    { label: "Peg C", values: [...pegs.C] },
  ];

  const snap = (description: string, codeLine: number, topState?: CallStackItem["state"], descriptionAr?: string) => {
    const shown = stack.map((s, i) => ({ ...s, state: i === stack.length - 1 ? topState ?? s.state : s.state }));
    steps.push({
      frame: { stack: shown, aux: pegRows(), note: `${moves} move${moves === 1 ? "" : "s"} of ${2 ** n - 1}` },
      description,
      descriptionAr,
      codeLine,
      counters: { moves, calls },
    });
  };

  snap(
    `Solve Tower of Hanoi for ${n} disks: move the whole stack from A to C.`,
    0,
    undefined,
    `حلّ لغز أبراج هانوي بعدد ${n} أقراص: انقل الكومة بأكملها من A إلى C.`,
  );

  const hanoi = (k: number, from: "A" | "B" | "C", to: "A" | "B" | "C", via: "A" | "B" | "C") => {
    calls++;
    const id = `h${uid++}`;
    stack.push({ id, label: `hanoi(${k}, ${from}→${to})`, detail: `via ${via}`, state: "active" });
    snap(
      `Call hanoi(${k}, ${from}→${to}) using ${via} as spare.`,
      1,
      undefined,
      `استدعِ hanoi(${k}, ${from}→${to}) باستخدام ${via} كقطب احتياطي.`,
    );
    if (k === 1) {
      const disk = pegs[from].pop()!;
      pegs[to].push(disk);
      moves++;
      snap(
        `Base case: move disk ${disk} from ${from} to ${to}.`,
        2,
        "found",
        `الحالة الأساسية: انقل القرص ${disk} من ${from} إلى ${to}.`,
      );
      stack.pop();
      return;
    }
    hanoi(k - 1, from, via, to);
    const disk = pegs[from].pop()!;
    pegs[to].push(disk);
    moves++;
    snap(`Move disk ${disk} from ${from} to ${to}.`, 4, "found", `انقل القرص ${disk} من ${from} إلى ${to}.`);
    hanoi(k - 1, via, to, from);
    stack.pop();
    snap(`hanoi(${k}, ${from}→${to}) done.`, 5, "sorted", `اكتمل hanoi(${k}, ${from}→${to}).`);
  };

  hanoi(n, "A", "C", "B");
  snap(
    `Solved in ${moves} moves — exactly 2^${n} − 1.`,
    6,
    undefined,
    `حُلّ اللغز في ${moves} حركة — أي بالضبط 2^${n} − 1.`,
  );
  return steps;
}

const mod: AlgorithmModule<CallStackFrame, Input> = {
  slug: "tower-of-hanoi",
  title: "Tower of Hanoi",
  titleAr: "أبراج هانوي",
  category: "recursion",
  difficulty: "Intermediate",
  tags: ["recursion", "divide & conquer", "exponential"],
  tagsAr: ["العودية", "فرّق تسد", "أسي"],
  summary: "Moves a stack of disks between pegs one at a time, never placing a larger disk on a smaller one.",
  summaryAr: "ينقل كومة من الأقراص بين أقطاب، قرصًا واحدًا في كل مرة، دون وضع قرص أكبر فوق قرص أصغر منه.",
  renderer: "callstack",
  pseudocode: [
    "procedure hanoi(n, from, to, via)",
    "  call hanoi(...)",
    "  if n == 1: move disk from → to; return",
    "  hanoi(n-1, from, via, to)",
    "  move disk from → to",
    "  hanoi(n-1, via, to, from)",
    "  return",
  ],
  code: {
    pseudocode: `procedure hanoi(n, from, to, via)
  if n == 1:
    move disk from -> to
    return
  hanoi(n-1, from, via, to)
  move disk from -> to
  hanoi(n-1, via, to, from)`,
    c: `void hanoi(int n, char from, char to, char via) {
    if (n == 1) { printf("%c -> %c\\n", from, to); return; }
    hanoi(n - 1, from, via, to);
    printf("%c -> %c\\n", from, to);
    hanoi(n - 1, via, to, from);
}`,
    cpp: `#include <iostream>
void hanoi(int n, char from, char to, char via) {
    if (n == 1) { std::cout << from << " -> " << to << "\\n"; return; }
    hanoi(n - 1, from, via, to);
    std::cout << from << " -> " << to << "\\n";
    hanoi(n - 1, via, to, from);
}`,
    java: `static void hanoi(int n, char from, char to, char via) {
    if (n == 1) { System.out.println(from + " -> " + to); return; }
    hanoi(n - 1, from, via, to);
    System.out.println(from + " -> " + to);
    hanoi(n - 1, via, to, from);
}`,
    python: `def hanoi(n: int, frm: str, to: str, via: str) -> None:
    if n == 1:
        print(f"{frm} -> {to}")
        return
    hanoi(n - 1, frm, via, to)
    print(f"{frm} -> {to}")
    hanoi(n - 1, via, to, frm)`,
    javascript: `function hanoi(n, from, to, via) {
  if (n === 1) { console.log(\`\${from} -> \${to}\`); return; }
  hanoi(n - 1, from, via, to);
  console.log(\`\${from} -> \${to}\`);
  hanoi(n - 1, via, to, from);
}`,
    typescript: `function hanoi(n: number, from: string, to: string, via: string): void {
  if (n === 1) { console.log(\`\${from} -> \${to}\`); return; }
  hanoi(n - 1, from, via, to);
  console.log(\`\${from} -> \${to}\`);
  hanoi(n - 1, via, to, from);
}`,
    csharp: `static void Hanoi(int n, char from, char to, char via) {
    if (n == 1) { Console.WriteLine($"{from} -> {to}"); return; }
    Hanoi(n - 1, from, via, to);
    Console.WriteLine($"{from} -> {to}");
    Hanoi(n - 1, via, to, from);
}`,
    go: `func hanoi(n int, from, to, via rune) {
	if n == 1 {
		fmt.Printf("%c -> %c\\n", from, to)
		return
	}
	hanoi(n-1, from, via, to)
	fmt.Printf("%c -> %c\\n", from, to)
	hanoi(n-1, via, to, from)
}`,
    rust: `fn hanoi(n: u32, from: char, to: char, via: char) {
    if n == 1 {
        println!("{} -> {}", from, to);
        return;
    }
    hanoi(n - 1, from, via, to);
    println!("{} -> {}", from, to);
    hanoi(n - 1, via, to, from);
}`,
    kotlin: `fun hanoi(n: Int, from: Char, to: Char, via: Char) {
    if (n == 1) { println("$from -> $to"); return }
    hanoi(n - 1, from, via, to)
    println("$from -> $to")
    hanoi(n - 1, via, to, from)
}`,
    swift: `func hanoi(_ n: Int, _ from: String, _ to: String, _ via: String) {
    if n == 1 { print("\\(from) -> \\(to)"); return }
    hanoi(n - 1, from, via, to)
    print("\\(from) -> \\(to)")
    hanoi(n - 1, via, to, from)
}`,
  },
  content: {
    overview: `The Tower of Hanoi is a classic puzzle: move a stack of n disks from a source peg to a destination peg, moving one disk at a time and never placing a larger disk on a smaller one, using a third peg as temporary storage.

Its elegant recursive solution is the reason it appears in every algorithms course. To move n disks from A to C: first move the top n−1 disks out of the way onto B, move the largest disk directly to C, then move the n−1 disks from B onto C. Each subproblem is the same puzzle, one disk smaller — a perfect illustration of recursion and the call stack.`,
    howItWorks: [
      "To move n disks from source to destination using a spare peg:",
      "Recursively move the top n−1 disks from source to the spare peg.",
      "Move the single largest disk directly from source to destination.",
      "Recursively move the n−1 disks from the spare peg onto the destination.",
      "The base case (n = 1) is a single direct move.",
    ],
    complexity: {
      time: { best: "O(2ⁿ)", average: "O(2ⁿ)", worst: "O(2ⁿ)" },
      space: "O(n)",
      notes: "The number of moves is exactly 2ⁿ − 1, which is provably optimal. Recursion depth (call-stack space) is O(n).",
    },
    applications: [
      "Teaching recursion, the call stack, and divide-and-conquer",
      "Benchmarking recursion and stack behavior",
      "Modeling backup rotation schemes ('Tower of Hanoi' backup strategy)",
      "Generating Gray-code sequences (the move pattern maps to Gray codes)",
    ],
    advantages: [
      "Beautifully simple recursive formulation",
      "Provably optimal move count (2ⁿ − 1)",
      "Clear demonstration of subproblem decomposition",
    ],
    disadvantages: [
      "Exponential number of moves — infeasible for large n",
      "Recursion depth grows with n (stack usage)",
      "Not a practical computation, mostly pedagogical",
    ],
    commonMistakes: [
      "Swapping the roles of the destination and spare pegs in the recursive calls.",
      "Placing the direct move before the first recursive call.",
      "Forgetting the base case, causing infinite recursion.",
      "Expecting a polynomial solution — the 2ⁿ − 1 bound is optimal.",
    ],
    interviewQuestions: [
      "Prove that 2ⁿ − 1 moves are necessary and sufficient.",
      "Write an iterative solution and explain the peg-parity trick.",
      "How does the sequence of moves relate to Gray codes?",
      "What is the maximum recursion depth for n disks?",
    ],
    summary:
      "Tower of Hanoi moves n disks between pegs by recursively relocating the top n−1 disks, moving the largest, then moving the rest back — taking exactly 2ⁿ − 1 moves. It's the definitive teaching example of recursion and the call stack.",
    quiz: [
      { question: "The minimum number of moves to solve Tower of Hanoi with n disks is…", options: ["n", "n²", "2ⁿ − 1", "n log n"], answer: 2, explanation: "Each disk count doubles the work plus one move for the largest disk." },
      { question: "In moving n disks from A to C, where do the top n−1 disks go first?", options: ["Directly to C", "To the spare peg B", "They don't move", "Split between B and C"], answer: 1, explanation: "They must be parked on the spare peg so the largest disk can go to C." },
      { question: "The recursion depth for n disks is…", options: ["O(1)", "O(log n)", "O(n)", "O(2ⁿ)"], answer: 2, explanation: "Each level reduces n by one, so the deepest chain of calls is n." },
      { question: "The Tower of Hanoi move sequence corresponds to which encoding?", options: ["Binary counting", "Gray code", "Huffman code", "Run-length encoding"], answer: 1, explanation: "The disk moved at each step follows the reflected binary (Gray) code pattern." },
      { question: "Why is the puzzle impractical for large n?", options: ["It needs O(n²) memory", "The number of moves grows exponentially", "It has no solution", "It requires sorting"], answer: 1, explanation: "2ⁿ − 1 moves becomes astronomically large as n grows." },
    ],
  },
  contentAr: {
    overview: `أبراج هانوي لغز كلاسيكي: انقل كومة من n قرصًا من قطب المصدر إلى قطب الوجهة، قرصًا واحدًا في كل مرة، دون وضع قرص أكبر فوق قرص أصغر منه، باستخدام قطب ثالث كمخزن مؤقت.

حلّه العودي الأنيق هو السبب في ظهوره في كل مقرر خوارزميات. لنقل n قرصًا من A إلى C: انقل أولًا الأقراص العلوية n−1 بعيدًا إلى B، ثم انقل القرص الأكبر مباشرة إلى C، ثم انقل الأقراص n−1 من B إلى C. كل مسألة فرعية هي نفس اللغز بقرص واحد أقل — توضيح مثالي للعودية ومكدس الاستدعاءات.`,
    howItWorks: [
      "لنقل n قرصًا من المصدر إلى الوجهة باستخدام قطب احتياطي:",
      "انقل عوديًا الأقراص العلوية n−1 من المصدر إلى القطب الاحتياطي.",
      "انقل القرص الأكبر الوحيد مباشرة من المصدر إلى الوجهة.",
      "انقل عوديًا الأقراص n−1 من القطب الاحتياطي إلى الوجهة.",
      "الحالة الأساسية (n = 1) هي نقلة مباشرة واحدة.",
    ],
    complexity: {
      time: { best: "O(2ⁿ)", average: "O(2ⁿ)", worst: "O(2ⁿ)" },
      space: "O(n)",
      notes: "عدد الحركات يساوي بالضبط 2ⁿ − 1، وهو مثبَت أنه الأمثل. عمق العودية (مساحة مكدس الاستدعاءات) هو O(n).",
    },
    applications: [
      "تدريس العودية ومكدس الاستدعاءات وأسلوب فرّق تسد",
      "قياس أداء العودية وسلوك المكدس",
      "نمذجة أنظمة تدوير النسخ الاحتياطية (استراتيجية النسخ الاحتياطي 'أبراج هانوي')",
      "توليد متتاليات ترميز غراي (نمط الحركة يقابل رموز غراي)",
    ],
    advantages: [
      "صياغة عودية أنيقة وبسيطة",
      "عدد حركات مثبَت أنه الأمثل (2ⁿ − 1)",
      "توضيح واضح لتفكيك المسألة إلى مسائل فرعية",
    ],
    disadvantages: [
      "عدد الحركات أسي — غير عملي عند n كبيرة",
      "عمق العودية يزداد مع n (استهلاك المكدس)",
      "ليس حسابًا عمليًا، بل هو غالبًا تعليمي",
    ],
    commonMistakes: [
      "تبديل دوري الوجهة والقطب الاحتياطي في الاستدعاءات العودية.",
      "وضع النقلة المباشرة قبل الاستدعاء العودي الأول.",
      "نسيان الحالة الأساسية، مما يسبب عودية لا نهائية.",
      "توقع حل متعدد الحدود — الحد 2ⁿ − 1 هو الأمثل بالفعل.",
    ],
    interviewQuestions: [
      "أثبِت أن 2ⁿ − 1 حركة ضرورية وكافية.",
      "اكتب حلًا تكراريًا واشرح خدعة تماثل الأقطاب (peg-parity).",
      "كيف ترتبط متتالية الحركات برموز غراي؟",
      "ما أقصى عمق للعودية عند n قرصًا؟",
    ],
    summary:
      "أبراج هانوي ينقل n قرصًا بين الأقطاب عبر نقل الأقراص العلوية n−1 عوديًا، ثم نقل الأكبر، ثم إعادة الباقي — بالضبط 2ⁿ − 1 حركة. وهو المثال التعليمي الأمثل للعودية ومكدس الاستدعاءات.",
    quiz: [
      { question: "الحد الأدنى لعدد الحركات لحل أبراج هانوي بعدد n قرصًا هو…", options: ["n", "n²", "2ⁿ − 1", "n log n"], answer: 2, explanation: "كل قرص إضافي يُضاعف العمل زائد حركة واحدة للقرص الأكبر." },
      { question: "عند نقل n قرصًا من A إلى C، إلى أين تذهب الأقراص العلوية n−1 أولًا؟", options: ["مباشرة إلى C", "إلى القطب الاحتياطي B", "لا تتحرك", "تُقسَم بين B و C"], answer: 1, explanation: "يجب ركنها على القطب الاحتياطي حتى يتمكن القرص الأكبر من الذهاب إلى C." },
      { question: "عمق العودية عند n قرصًا هو…", options: ["O(1)", "O(log n)", "O(n)", "O(2ⁿ)"], answer: 2, explanation: "كل مستوى يُنقص n بمقدار واحد، فأطول سلسلة استدعاءات تساوي n." },
      { question: "متتالية حركات أبراج هانوي تقابل أي ترميز؟", options: ["العد الثنائي", "رمز غراي (Gray code)", "ترميز هفمان", "ترميز طول التشغيل"], answer: 1, explanation: "القرص المنقول في كل خطوة يتبع نمط الترميز الثنائي المنعكس (غراي)." },
      { question: "لماذا يكون اللغز غير عملي عند n كبيرة؟", options: ["يحتاج ذاكرة O(n²)", "عدد الحركات ينمو أسيًا", "لا يوجد له حل", "يتطلب ترتيبًا"], answer: 1, explanation: "عدد الحركات 2ⁿ − 1 يصبح كبيرًا فلكيًا مع ازدياد n." },
    ],
  },
  inputFields: [{ key: "disks", label: "Number of disks", placeholder: "3", help: "1–10 disks (moves = 2ⁿ − 1; 10 disks = 1023 moves)." }],
  defaultInput: (level) => ({ disks: Math.min(10, 2 + level) }),
  parseInput: (fields) => {
    const disks = Number((fields.disks ?? "").trim());
    if (!Number.isInteger(disks) || disks < 1 || disks > 10) throw new Error("Enter a whole number of disks from 1 to 10.");
    return { disks };
  },
  serializeInput: (input) => ({ disks: String(input.disks) }),
  generate,
};

export default mod;
