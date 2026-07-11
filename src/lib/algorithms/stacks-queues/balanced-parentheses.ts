import type { AlgorithmModule, CallStackFrame, CallStackItem, Step } from "@/lib/engine/types";

type Input = { expr: string };

const PAIRS: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
const OPEN = new Set(["(", "[", "{"]);

function generate(input: Input): Step<CallStackFrame>[] {
  const s = input.expr.replace(/\s+/g, "");
  const steps: Step<CallStackFrame>[] = [];
  let pushes = 0;
  let pops = 0;

  const stack: { id: string; ch: string; pos: number }[] = [];
  let idc = 0;

  const frame = (
    highlightTop: "active" | "swap" | "found" | undefined,
    pos: number,
    description: string,
    codeLine: number,
    failed = false,
    descriptionAr?: string,
  ): void => {
    const items: CallStackItem[] = stack.map((e, i) => ({
      id: e.id,
      label: e.ch,
      detail: `from index ${e.pos}`,
      state: failed ? "discarded" : i === stack.length - 1 ? highlightTop : undefined,
    }));
    const marker = s
      .split("")
      .map((c, i) => (i === pos ? `[${c}]` : c))
      .join("");
    steps.push({
      frame: {
        stack: items,
        aux: [{ label: "expression", values: marker.split("") }],
        note: `scanning "${s}"  ·  cursor at index ${pos < 0 ? "—" : pos}`,
      },
      description,
      descriptionAr,
      codeLine,
      counters: { pushes, pops },
    });
  };

  frame(
    undefined,
    -1,
    `Check if brackets are balanced. Push every opening bracket; match each closing bracket with the stack top.`,
    0,
    false,
    `تحقّق مما إذا كانت الأقواس متوازنة. ادفع كل قوس فتح؛ وطابِق كل قوس إغلاق مع قمة المكدس.`,
  );

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (OPEN.has(ch)) {
      stack.push({ id: `b${idc++}`, ch, pos: i });
      pushes++;
      frame("active", i, `'${ch}' is an opening bracket → push it onto the stack.`, 2, false, `'${ch}' قوس فتح ← ادفعه إلى المكدس.`);
    } else if (ch in PAIRS) {
      if (stack.length === 0) {
        frame(
          undefined,
          i,
          `'${ch}' has no matching opener — the stack is empty. ✗ Not balanced.`,
          5,
          true,
          `'${ch}' ليس له قوس فتح مطابق — المكدس فارغ. ✗ غير متوازنة.`,
        );
        return steps;
      }
      const top = stack[stack.length - 1];
      if (top.ch === PAIRS[ch]) {
        frame("found", i, `'${ch}' matches the top '${top.ch}' → pop it. Good.`, 4, false, `'${ch}' يطابق القمة '${top.ch}' ← أخرِجها. جيد.`);
        stack.pop();
        pops++;
        frame(undefined, i, `Popped '${top.ch}'. Continue scanning.`, 4, false, `أُخرِج '${top.ch}'. تابِع المسح.`);
      } else {
        frame(
          "swap",
          i,
          `'${ch}' expects '${PAIRS[ch]}' but the top is '${top.ch}' — mismatch. ✗ Not balanced.`,
          6,
          true,
          `'${ch}' يتوقّع '${PAIRS[ch]}' لكن القمة هي '${top.ch}' — عدم تطابق. ✗ غير متوازنة.`,
        );
        return steps;
      }
    } else {
      frame(undefined, i, `'${ch}' is not a bracket — ignore it.`, 1, false, `'${ch}' ليس قوسًا — تجاهله.`);
    }
  }

  if (stack.length === 0) {
    frame(
      undefined,
      s.length - 1,
      `End of string and the stack is empty → every bracket matched. ✓ Balanced!`,
      7,
      false,
      `نهاية السلسلة والمكدس فارغ ← كل قوس تطابق. ✓ متوازنة!`,
    );
  } else {
    frame(
      "swap",
      s.length - 1,
      `End of string but ${stack.length} opening bracket(s) remain unmatched. ✗ Not balanced.`,
      7,
      true,
      `نهاية السلسلة لكن يتبقى ${stack.length} قوس فتح دون مطابقة. ✗ غير متوازنة.`,
    );
  }
  return steps;
}

function randomInput(level: number): Input {
  const balanced = [
    "()",
    "()[]{}",
    "([{}])",
    "{[()]}",
    "(([]){})",
    "[({})]{}",
  ];
  const unbalanced = ["(]", "([)]", "(((", "{[}]", "())", "[(])"];
  const useBalanced = level % 2 === 1;
  const bank = useBalanced ? balanced : unbalanced;
  const idx = Math.min(level - 1, bank.length - 1);
  return { expr: bank[idx] };
}

const mod: AlgorithmModule<CallStackFrame, Input> = {
  slug: "balanced-parentheses",
  title: "Balanced Parentheses",
  titleAr: "الأقواس المتوازنة",
  category: "stacks-queues",
  difficulty: "Beginner",
  tags: ["stack", "matching", "validation", "brackets"],
  tagsAr: ["مكدس", "مطابقة", "تحقّق", "أقواس"],
  summary: "Uses a stack to verify that every opening bracket has a correctly ordered matching closing bracket.",
  summaryAr: "يستخدم مكدسًا للتحقق من أن لكل قوس فتح قوس إغلاق مطابقًا مرتّبًا بشكل صحيح.",
  renderer: "callstack",
  pseudocode: [
    "procedure isBalanced(s)",
    "  stack = empty",
    "  for ch in s:",
    "    if ch is opening: push(ch)",
    "    else if ch is closing:",
    "      if stack empty or top != match(ch): return false",
    "      pop()",
    "  return stack is empty",
  ],
  code: {
    pseudocode: `stack = []
for ch in s:
  if ch in "([{": push(ch)
  elif ch in ")]}":
    if stack empty or top != match(ch): return false
    pop()
return stack.isEmpty()`,
    c: `bool isBalanced(const char* s) {
    char st[1000]; int top = 0;
    for (; *s; s++) {
        if (*s=='('||*s=='['||*s=='{') st[top++] = *s;
        else if (*s==')'||*s==']'||*s=='}') {
            if (top==0) return false;
            char o = st[--top];
            if ((*s==')'&&o!='(')||(*s==']'&&o!='[')||(*s=='}'&&o!='{'))
                return false;
        }
    }
    return top == 0;
}`,
    cpp: `bool isBalanced(const string& s) {
    stack<char> st;
    unordered_map<char,char> m{{')','('},{']','['},{'}','{'}};
    for (char c : s) {
        if (c=='('||c=='['||c=='{') st.push(c);
        else if (m.count(c)) {
            if (st.empty() || st.top()!=m[c]) return false;
            st.pop();
        }
    }
    return st.empty();
}`,
    java: `boolean isBalanced(String s) {
    Deque<Character> st = new ArrayDeque<>();
    Map<Character,Character> m = Map.of(')','(',']','[','}','{');
    for (char c : s.toCharArray()) {
        if (c=='('||c=='['||c=='{') st.push(c);
        else if (m.containsKey(c)) {
            if (st.isEmpty() || st.pop()!=m.get(c)) return false;
        }
    }
    return st.isEmpty();
}`,
    python: `def is_balanced(s):
    stack = []
    match = {')': '(', ']': '[', '}': '{'}
    for ch in s:
        if ch in '([{':
            stack.append(ch)
        elif ch in match:
            if not stack or stack.pop() != match[ch]:
                return False
    return not stack`,
    javascript: `function isBalanced(s) {
  const stack = [];
  const match = { ")": "(", "]": "[", "}": "{" };
  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") stack.push(ch);
    else if (match[ch]) {
      if (stack.pop() !== match[ch]) return false;
    }
  }
  return stack.length === 0;
}`,
    typescript: `function isBalanced(s: string): boolean {
  const stack: string[] = [];
  const match: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") stack.push(ch);
    else if (match[ch]) {
      if (stack.pop() !== match[ch]) return false;
    }
  }
  return stack.length === 0;
}`,
    csharp: `bool IsBalanced(string s) {
    var st = new Stack<char>();
    var m = new Dictionary<char,char>{{')','('},{']','['},{'}','{'}};
    foreach (char c in s) {
        if (c=='('||c=='['||c=='{') st.Push(c);
        else if (m.ContainsKey(c)) {
            if (st.Count==0 || st.Pop()!=m[c]) return false;
        }
    }
    return st.Count == 0;
}`,
    go: `func isBalanced(s string) bool {
	st := []rune{}
	m := map[rune]rune{')':'(', ']':'[', '}':'{'}
	for _, c := range s {
		if c=='('||c=='['||c=='{' {
			st = append(st, c)
		} else if o, ok := m[c]; ok {
			if len(st)==0 || st[len(st)-1]!=o { return false }
			st = st[:len(st)-1]
		}
	}
	return len(st) == 0
}`,
    rust: `fn is_balanced(s: &str) -> bool {
    let mut st = Vec::new();
    for c in s.chars() {
        match c {
            '(' | '[' | '{' => st.push(c),
            ')' => if st.pop() != Some('(') { return false },
            ']' => if st.pop() != Some('[') { return false },
            '}' => if st.pop() != Some('{') { return false },
            _ => {}
        }
    }
    st.is_empty()
}`,
    kotlin: `fun isBalanced(s: String): Boolean {
    val st = ArrayDeque<Char>()
    val m = mapOf(')' to '(', ']' to '[', '}' to '{')
    for (c in s) {
        if (c=='('||c=='['||c=='{') st.addLast(c)
        else if (m.containsKey(c)) {
            if (st.isEmpty() || st.removeLast()!=m[c]) return false
        }
    }
    return st.isEmpty()
}`,
    swift: `func isBalanced(_ s: String) -> Bool {
    var st: [Character] = []
    let m: [Character: Character] = [")": "(", "]": "[", "}": "{"]
    for c in s {
        if c=="(" || c=="[" || c=="{" { st.append(c) }
        else if let o = m[c] {
            if st.popLast() != o { return false }
        }
    }
    return st.isEmpty
}`,
  },
  content: {
    overview: `Checking whether brackets are balanced is the textbook application of a stack. An expression like "{[()]}" is balanced because every opening bracket has a matching closing bracket of the same type, closed in the correct (last-opened-first-closed) order. "([)]" is not balanced — the brackets overlap rather than nest.

A stack captures exactly the "last opened, first closed" discipline (LIFO). Scan the string left to right: push every opening bracket, and when you hit a closing bracket, it must match the most recently pushed opener — the current top of the stack. If it matches, pop; if it doesn't (or the stack is empty), the string is unbalanced. After the scan, the stack must be empty; any leftover openers mean some brackets were never closed.`,
    howItWorks: [
      "Create an empty stack and scan the string one character at a time.",
      "When you see an opening bracket ( [ {, push it onto the stack.",
      "When you see a closing bracket, check the stack: it must be non-empty and its top must be the matching opener.",
      "If the top matches, pop it; otherwise the string is immediately unbalanced.",
      "After scanning, the string is balanced only if the stack is empty.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n)", worst: "O(n)" },
      space: "O(n)",
      notes: "A single scan does O(1) work per character. The stack can grow to O(n) in the worst case (all opening brackets), giving O(n) space.",
    },
    applications: [
      "compiler and interpreter syntax checking",
      "validating expressions, JSON, XML/HTML tags",
      "editor bracket-matching and linting",
      "evaluating and converting arithmetic expressions",
    ],
    advantages: [
      "Simple linear-time, single-pass algorithm",
      "Naturally models nested structure with LIFO",
      "Fails fast on the first mismatch",
      "Extends easily to multiple bracket types",
    ],
    disadvantages: [
      "Needs O(n) auxiliary space for the stack",
      "Only validates structure, not semantic correctness",
      "Requires care to handle non-bracket characters",
    ],
    commonMistakes: [
      "Forgetting to check for an empty stack before popping on a closing bracket.",
      "Not verifying the stack is empty at the end (leftover openers).",
      "Matching only counts of brackets, ignoring type and order (fails on '([)]').",
      "Using a queue instead of a stack, losing the LIFO nesting.",
    ],
    interviewQuestions: [
      "Why does this problem require a stack rather than a counter?",
      "How would you extend it to handle three bracket types simultaneously?",
      "How do you report the position of the first mismatch?",
      "Can you check balance with O(1) space if there is only one bracket type?",
      "How does this relate to evaluating expressions with a stack?",
    ],
    summary:
      "Balanced-parentheses checking pushes opening brackets and matches each closing bracket against the stack top, confirming the stack is empty at the end. It runs in O(n) time and O(n) space and is the canonical demonstration of a stack's LIFO behavior.",
    quiz: [
      { question: "Which data structure validates nested brackets?", options: ["Queue", "Stack", "Heap", "Hash map"], answer: 1, explanation: "A stack's LIFO order matches the last-opened-first-closed rule." },
      { question: "On seeing a closing bracket, you compare it with…", options: ["The bottom of the stack", "The top of the stack", "The next character", "A counter"], answer: 1, explanation: "It must match the most recently pushed opener at the top." },
      { question: "The string '([)]' is…", options: ["Balanced", "Not balanced (brackets overlap)", "Empty", "Undefined"], answer: 1, explanation: "The brackets interleave instead of nesting, so it fails." },
      { question: "After scanning, a balanced string leaves the stack…", options: ["Full", "Empty", "With one element", "Reversed"], answer: 1, explanation: "Every opener must have been matched and popped." },
      { question: "The time complexity is…", options: ["O(1)", "O(n)", "O(n log n)", "O(n²)"], answer: 1, explanation: "Each character is processed once with constant work." },
    ],
  },
  contentAr: {
    overview: `التحقق من توازن الأقواس هو التطبيق الكلاسيكي للمكدس. تعبير مثل "{[()]}" متوازن لأن لكل قوس فتح قوس إغلاق مطابقًا من النوع نفسه، مُغلَقًا بالترتيب الصحيح (آخر ما فُتح هو أول ما يُغلَق). أما "([)]" فليس متوازنًا — إذ تتداخل الأقواس بدلًا من أن تتعشّش.

يجسّد المكدس بالضبط مبدأ "آخر ما فُتح هو أول ما يُغلَق" (LIFO). امسح السلسلة من اليسار إلى اليمين: ادفع كل قوس فتح، وعندما تصادف قوس إغلاق فيجب أن يطابق آخر قوس فتح مدفوع — أي قمة المكدس الحالية. فإن طابق أخرِجه؛ وإن لم يطابق (أو كان المكدس فارغًا) فالسلسلة غير متوازنة. وبعد المسح يجب أن يكون المكدس فارغًا؛ فأي أقواس فتح متبقية تعني أن بعض الأقواس لم يُغلَق أبدًا.`,
    howItWorks: [
      "أنشئ مكدسًا فارغًا وامسح السلسلة محرفًا واحدًا في كل مرة.",
      "عند رؤية قوس فتح ( [ {، ادفعه إلى المكدس.",
      "عند رؤية قوس إغلاق، افحص المكدس: يجب أن يكون غير فارغ وأن تكون قمته قوس الفتح المطابق.",
      "إن طابقت القمة فأخرِجها؛ وإلا فالسلسلة غير متوازنة فورًا.",
      "بعد المسح، تكون السلسلة متوازنة فقط إذا كان المكدس فارغًا.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n)", worst: "O(n)" },
      space: "O(n)",
      notes: "يؤدي مسح واحد عملًا بزمن O(1) لكل محرف. قد ينمو المكدس إلى O(n) في أسوأ حالة (كلها أقواس فتح)، مما يعطي مساحة O(n).",
    },
    applications: [
      "التحقق النحوي في المُصرِّفات والمُفسِّرات",
      "التحقق من التعابير ووسوم JSON و XML/HTML",
      "مطابقة الأقواس والتدقيق في المحررات",
      "تقييم التعابير الحسابية وتحويلها",
    ],
    advantages: [
      "خوارزمية بسيطة بزمن خطي وبمرور واحد",
      "تُنمذِج البنية المتداخلة بطبيعتها عبر LIFO",
      "تفشل سريعًا عند أول عدم تطابق",
      "تمتد بسهولة إلى أنواع أقواس متعددة",
    ],
    disadvantages: [
      "تحتاج مساحة مساعدة بمقدار O(n) للمكدس",
      "تتحقق من البنية فقط، لا من الصحة الدلالية",
      "تتطلب عناية في التعامل مع المحارف غير القوسية",
    ],
    commonMistakes: [
      "نسيان التحقق من أن المكدس غير فارغ قبل الإخراج عند قوس إغلاق.",
      "عدم التأكد من أن المكدس فارغ في النهاية (أقواس فتح متبقية).",
      "مطابقة أعداد الأقواس فقط مع تجاهل النوع والترتيب (يفشل على '([)]').",
      "استخدام طابور بدلًا من مكدس، مما يفقد تعشيش LIFO.",
    ],
    interviewQuestions: [
      "لماذا تتطلب هذه المسألة مكدسًا بدلًا من عدّاد؟",
      "كيف تمدّها لتتعامل مع ثلاثة أنواع من الأقواس في آنٍ واحد؟",
      "كيف تُبلِغ عن موضع أول عدم تطابق؟",
      "هل يمكنك التحقق من التوازن بمساحة O(1) إذا كان هناك نوع واحد من الأقواس فقط؟",
      "كيف يرتبط هذا بتقييم التعابير باستخدام مكدس؟",
    ],
    summary:
      "التحقق من توازن الأقواس يدفع أقواس الفتح ويطابق كل قوس إغلاق مع قمة المكدس، مؤكِّدًا أن المكدس فارغ في النهاية. ويعمل بزمن O(n) ومساحة O(n)، وهو التوضيح الكلاسيكي لسلوك LIFO في المكدس.",
    quiz: [
      { question: "أي هيكل بيانات يتحقق من الأقواس المتداخلة؟", options: ["طابور", "مكدس", "كومة", "جدول تجزئة"], answer: 1, explanation: "ترتيب LIFO في المكدس يطابق قاعدة آخر ما فُتح هو أول ما يُغلَق." },
      { question: "عند رؤية قوس إغلاق، تقارنه بـ…", options: ["قاع المكدس", "قمة المكدس", "المحرف التالي", "عدّاد"], answer: 1, explanation: "يجب أن يطابق آخر قوس فتح مدفوع الموجود في القمة." },
      { question: "السلسلة '([)]' هي…", options: ["متوازنة", "غير متوازنة (الأقواس متشابكة)", "فارغة", "غير معرَّفة"], answer: 1, explanation: "تتشابك الأقواس بدلًا من أن تتعشّش، فتفشل." },
      { question: "بعد المسح، تترك السلسلة المتوازنة المكدس…", options: ["ممتلئًا", "فارغًا", "بعنصر واحد", "معكوسًا"], answer: 1, explanation: "لا بد أن كل قوس فتح قد طُوبِق وأُخرِج." },
      { question: "التعقيد الزمني هو…", options: ["O(1)", "O(n)", "O(n log n)", "O(n²)"], answer: 1, explanation: "يُعالَج كل محرف مرة واحدة بعمل ثابت." },
    ],
  },
  inputFields: [
    { key: "expr", label: "Bracket expression", placeholder: "{[()]}", help: "Use ( ) [ ] { }. Up to 80 characters." },
  ],
  defaultInput: (level) => randomInput(level),
  parseInput: (fields) => {
    const expr = (fields.expr ?? "").replace(/\s+/g, "");
    if (!expr) throw new Error("Enter a bracket expression.");
    if (expr.length > 80) throw new Error("Keep it to 80 characters or fewer.");
    if (!/^[()\[\]{}]+$/.test(expr)) throw new Error("Only the brackets ( ) [ ] { } are allowed.");
    return { expr };
  },
  serializeInput: (input) => ({ expr: input.expr }),
  generate,
};

export default mod;
