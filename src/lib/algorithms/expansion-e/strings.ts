import type { Level, RNG, Step, TableFrame } from "@/lib/engine/types";
import {
  boundedText,
  makeModule,
  step,
  tableFrame,
  textDefault,
} from "./shared";

type TextPatternInput = { text: string; pattern: string };
type TextInput = { text: string };
type StringPairInput = { first: string; second: string };

const textPatternFields = [
  {
    key: "text",
    label: "Text",
    labelAr: "النص",
    placeholder: "abracadabra",
    help: "Text processed as Unicode code points.",
    helpAr: "يُعالج النص كنقاط ترميز يونيكود.",
  },
  {
    key: "pattern",
    label: "Pattern",
    labelAr: "النمط",
    placeholder: "cada",
    help: "Substring to recognize.",
    helpAr: "السلسلة الجزئية المطلوب التعرف عليها.",
    search: true,
  },
];

const textFields = [{
  key: "text",
  label: "Text",
  labelAr: "النص",
  placeholder: "abacaba",
  help: "Enter 1-40 Unicode characters.",
  helpAr: "أدخل من 1 إلى 40 محرف يونيكود.",
}];

const pairFields = [
  {
    key: "first",
    label: "First string",
    labelAr: "السلسلة الأولى",
    placeholder: "xabxac",
  },
  {
    key: "second",
    label: "Second string",
    labelAr: "السلسلة الثانية",
    placeholder: "abcabxabcd",
  },
];

function defaultTextPattern(level: Level, rng: RNG): TextPatternInput {
  const text = textDefault(level, rng, "abcde");
  const chars = [...text];
  const length = Math.max(1, Math.min(4, Math.floor(chars.length / 3)));
  const start = rng.int(0, chars.length - length);
  return { text, pattern: rng.next() < 0.8 ? chars.slice(start, start + length).join("") : "zz" };
}

function parseTextPattern(fields: Record<string, string>): TextPatternInput {
  return {
    text: boundedText(fields.text ?? "", "Text", 40),
    pattern: boundedText(fields.pattern ?? "", "Pattern", 20),
  };
}

function samDefault(level: Level, rng: RNG): TextPatternInput {
  return defaultTextPattern(level, rng);
}

type SamState = {
  len: number;
  link: number;
  next: Record<string, number>;
  firstPos: number;
  clone?: boolean;
};

function transitionLabel(next: Record<string, number>): string {
  return Object.entries(next)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ch, state]) => `${JSON.stringify(ch)}→q${state}`)
    .join(", ") || "∅";
}

function samTable(states: SamState[], active: number | null, processed: string, pattern: string, note: string): TableFrame {
  return tableFrame(
    states.map((_, index) => `q${index}`),
    ["max length", "suffix link", "transitions"],
    states.map((state) => [state.len, state.link < 0 ? "−" : `q${state.link}`, transitionLabel(state.next)]),
    {
      active: active === null ? null : [active, 0],
      aux: [
        { label: "Processed prefix", values: [...processed] },
        { label: "Pattern", values: [...pattern] },
      ],
      note,
    },
  );
}

function suffixAutomatonSteps(input: TextPatternInput): Step<TableFrame>[] {
  const text = [...input.text];
  const pattern = [...input.pattern];
  const states: SamState[] = [{ len: 0, link: -1, next: {}, firstPos: -1 }];
  const steps: Step<TableFrame>[] = [];
  const counters = { states: 1, transitions: 0, clones: 0, comparisons: 0 };
  let last = 0;
  steps.push(step(
    samTable(states, 0, "", input.pattern, "Initial state recognizes the empty string."),
    "Create initial state q0 for the empty prefix.",
    "أنشئ الحالة الابتدائية q0 للبادئة الفارغة.",
    0,
    counters,
    "initialize",
  ));
  for (let index = 0; index < text.length; index++) {
    const ch = text[index];
    const current = states.length;
    states.push({ len: states[last].len + 1, link: 0, next: {}, firstPos: index });
    counters.states++;
    let p = last;
    while (p >= 0 && states[p].next[ch] === undefined) {
      states[p].next[ch] = current;
      counters.transitions++;
      steps.push(step(
        samTable(states, current, text.slice(0, index + 1).join(""), input.pattern, `Add ${JSON.stringify(ch)} transition q${p}→q${current}.`),
        `Add transition q${p} --${JSON.stringify(ch)}--> q${current}.`,
        `أضف الانتقال q${p} --${JSON.stringify(ch)}--> q${current}.`,
        2,
        counters,
        "add-transition",
      ));
      p = states[p].link;
    }
    if (p < 0) {
      states[current].link = 0;
    } else {
      const q = states[p].next[ch];
      counters.comparisons++;
      if (states[p].len + 1 === states[q].len) {
        states[current].link = q;
      } else {
        const clone = states.length;
        states.push({
          len: states[p].len + 1,
          link: states[q].link,
          next: { ...states[q].next },
          firstPos: states[q].firstPos,
          clone: true,
        });
        counters.states++;
        counters.clones++;
        steps.push(step(
          samTable(states, clone, text.slice(0, index + 1).join(""), input.pattern, `Clone q${q} as q${clone}.`),
          `Clone q${q} into q${clone} with shorter maximum length ${states[clone].len}.`,
          `استنسخ q${q} إلى q${clone} بطول أقصى أقصر ${states[clone].len}.`,
          5,
          counters,
          "clone-state",
          { transformation: { kind: "rebuild", label: "Split automaton equivalence class" } },
        ));
        while (p >= 0 && states[p].next[ch] === q) {
          states[p].next[ch] = clone;
          steps.push(step(
            samTable(states, p, text.slice(0, index + 1).join(""), input.pattern, `Redirect ${JSON.stringify(ch)} to clone q${clone}.`),
            `Redirect q${p}'s ${JSON.stringify(ch)} transition from q${q} to clone q${clone}.`,
            `أعد توجيه انتقال ${JSON.stringify(ch)} من q${p} من q${q} إلى النسخة q${clone}.`,
            6,
            counters,
            "redirect-transition",
          ));
          p = states[p].link;
        }
        states[q].link = clone;
        states[current].link = clone;
      }
    }
    last = current;
    steps.push(step(
      samTable(states, current, text.slice(0, index + 1).join(""), input.pattern, `suffix link q${current}→q${states[current].link}`),
      `Finish extension ${JSON.stringify(ch)}; q${current}'s suffix link is q${states[current].link}.`,
      `أكمل تمديد ${JSON.stringify(ch)}؛ رابط لاحقة q${current} هو q${states[current].link}.`,
      7,
      counters,
      "finish-extension",
    ));
  }
  let state = 0;
  let matched = true;
  for (let index = 0; index < pattern.length; index++) {
    const next = states[state].next[pattern[index]];
    counters.comparisons++;
    if (next === undefined) {
      matched = false;
      steps.push(step(
        samTable(states, state, input.text, input.pattern, `Missing ${JSON.stringify(pattern[index])} transition.`),
        `Pattern scan stops: q${state} has no ${JSON.stringify(pattern[index])} transition.`,
        `يتوقف فحص النمط: لا تملك q${state} انتقال ${JSON.stringify(pattern[index])}.`,
        9,
        counters,
        "pattern-reject",
      ));
      break;
    }
    state = next;
    steps.push(step(
      samTable(states, state, input.text, input.pattern, `Consume pattern character ${index}.`),
      `Consume ${JSON.stringify(pattern[index])} and enter q${state}.`,
      `استهلك ${JSON.stringify(pattern[index])} وانتقل إلى q${state}.`,
      9,
      counters,
      "pattern-transition",
    ));
  }
  const start = matched ? states[state].firstPos - pattern.length + 1 : -1;
  const resultFrame = samTable(states, matched ? state : null, input.text, input.pattern, matched ? `Match starts at ${start}.` : "Pattern is absent.");
  resultFrame.aux = [
    ...(resultFrame.aux ?? []),
    { label: "Matches", values: [start] },
    { label: "State count", values: [states.length] },
  ];
  steps.push(step(
    resultFrame,
    matched ? `The suffix automaton recognizes the pattern at index ${start}.` : "The suffix automaton rejects the pattern.",
    matched ? `تتعرف آلة اللواحق على النمط عند الموضع ${start}.` : "ترفض آلة اللواحق النمط.",
    10,
    counters,
    matched ? "accepted" : "rejected",
  ));
  return steps;
}

type EertreeNode = {
  len: number;
  link: number;
  next: Record<string, number>;
  firstEnd: number;
};

function eertreeTable(nodes: EertreeNode[], active: number | null, processed: string, distinct: string[], note: string): TableFrame {
  return tableFrame(
    nodes.map((_, index) => index === 0 ? "root −1" : index === 1 ? "root 0" : `p${index}`),
    ["length", "suffix link", "next"],
    nodes.map((node) => [node.len, node.link, transitionLabel(node.next)]),
    {
      active: active === null ? null : [active, 0],
      aux: [
        { label: "Processed prefix", values: [...processed] },
        { label: "Distinct palindromes", values: distinct },
      ],
      note,
    },
  );
}

function eertreeSteps(input: TextInput): Step<TableFrame>[] {
  const chars = [...input.text];
  const nodes: EertreeNode[] = [
    { len: -1, link: 0, next: {}, firstEnd: -1 },
    { len: 0, link: 0, next: {}, firstEnd: -1 },
  ];
  const distinct: string[] = [];
  const steps: Step<TableFrame>[] = [];
  const counters = { nodes: 2, suffixWalks: 0, transitions: 0 };
  let suffix = 1;
  steps.push(step(eertreeTable(nodes, 1, "", distinct, "Two roots represent odd and even palindrome bases."), "Create roots of length −1 and 0.", "أنشئ جذري الطولين −1 و0.", 0, counters, "initialize"));
  for (let index = 0; index < chars.length; index++) {
    const ch = chars[index];
    let current = suffix;
    while (
      index - 1 - nodes[current].len < 0
      || chars[index - 1 - nodes[current].len] !== ch
    ) {
      current = nodes[current].link;
      counters.suffixWalks++;
      steps.push(step(
        eertreeTable(nodes, current, chars.slice(0, index + 1).join(""), distinct, `Follow suffix link while seeking matching ${JSON.stringify(ch)} boundary.`),
        `Follow a suffix link because ${JSON.stringify(ch)} cannot extend the current palindrome.`,
        `اتبع رابط اللاحقة لأن ${JSON.stringify(ch)} لا يمدد المتناظر الحالي.`,
        2,
        counters,
        "suffix-walk",
      ));
    }
    const existing = nodes[current].next[ch];
    if (existing !== undefined) {
      suffix = existing;
      steps.push(step(
        eertreeTable(nodes, suffix, chars.slice(0, index + 1).join(""), distinct, "Palindrome node already exists."),
        `Reuse palindrome node p${suffix} for the suffix ending at ${index}.`,
        `أعد استخدام عقدة المتناظر p${suffix} للاحقة المنتهية عند ${index}.`,
        3,
        counters,
        "reuse-node",
      ));
      continue;
    }
    const created = nodes.length;
    const length = nodes[current].len + 2;
    nodes.push({ len: length, link: 1, next: {}, firstEnd: index });
    nodes[current].next[ch] = created;
    counters.nodes++;
    counters.transitions++;
    const palindrome = chars.slice(index - length + 1, index + 1).join("");
    distinct.push(palindrome);
    steps.push(step(
      eertreeTable(nodes, created, chars.slice(0, index + 1).join(""), distinct, `Create palindrome ${JSON.stringify(palindrome)}.`),
      `Create p${created} for new palindrome ${JSON.stringify(palindrome)}.`,
      `أنشئ p${created} للمتناظر الجديد ${JSON.stringify(palindrome)}.`,
      4,
      counters,
      "create-node",
    ));
    if (length === 1) {
      nodes[created].link = 1;
    } else {
      let candidate = nodes[current].link;
      while (
        index - 1 - nodes[candidate].len < 0
        || chars[index - 1 - nodes[candidate].len] !== ch
      ) {
        candidate = nodes[candidate].link;
        counters.suffixWalks++;
      }
      nodes[created].link = nodes[candidate].next[ch] ?? 1;
    }
    suffix = created;
    steps.push(step(
      eertreeTable(nodes, created, chars.slice(0, index + 1).join(""), distinct, `suffix link p${created}→p${nodes[created].link}`),
      `Set p${created}'s longest proper palindromic suffix link to ${nodes[created].link}.`,
      `اضبط رابط أطول لاحقة متناظرة صحيحة للعقدة p${created} إلى ${nodes[created].link}.`,
      7,
      counters,
      "set-suffix-link",
    ));
  }
  const finalFrame = eertreeTable(nodes, suffix, input.text, distinct, `${distinct.length} distinct palindromes.`);
  finalFrame.aux = [
    ...(finalFrame.aux ?? []),
    { label: "Distinct palindromes", values: distinct },
  ];
  steps.push(step(finalFrame, `Eertree contains ${distinct.length} distinct palindromes.`, `تحتوي شجرة المتناظرات على ${distinct.length} متناظرات مختلفة.`, 8, counters, "result"));
  return steps;
}

function pairDefault(level: Level, rng: RNG): StringPairInput {
  const first = textDefault(level, rng, "abcd").slice(0, 5 + level * 2);
  const shared = [...first].slice(1, Math.min(4, [...first].length)).join("");
  const second = rng.next() < 0.8
    ? `${textDefault(level, rng, "xyz").slice(0, 2)}${shared}${textDefault(level, rng, "pq").slice(0, 2)}`
    : textDefault(level, rng, "wxyz").slice(0, 5 + level * 2);
  return { first, second };
}

function pairParse(fields: Record<string, string>): StringPairInput {
  return {
    first: boundedText(fields.first ?? "", "First string", 24),
    second: boundedText(fields.second ?? "", "Second string", 24),
  };
}

function longestCommonSubstringSteps(input: StringPairInput): Step<TableFrame>[] {
  const first = [...input.first];
  const second = [...input.second];
  const rows = Array.from({ length: first.length + 1 }, () => Array<number>(second.length + 1).fill(0));
  const rowLabels = ["∅", ...first];
  const colLabels = ["∅", ...second];
  const steps: Step<TableFrame>[] = [];
  const counters = { comparisons: 0, writes: 0, bestUpdates: 0 };
  let bestLength = 0;
  let bestEnd = 0;
  for (let i = 1; i <= first.length; i++) {
    for (let j = 1; j <= second.length; j++) {
      counters.comparisons++;
      if (first[i - 1] === second[j - 1]) {
        rows[i][j] = rows[i - 1][j - 1] + 1;
        if (rows[i][j] > bestLength) {
          bestLength = rows[i][j];
          bestEnd = i;
          counters.bestUpdates++;
        }
      } else rows[i][j] = 0;
      counters.writes++;
      steps.push(step(
        tableFrame(rowLabels, colLabels, rows, {
          active: [i, j],
          compared: [[i - 1, j - 1]],
          aux: [{ label: "Best length", values: [bestLength] }],
        }),
        first[i - 1] === second[j - 1]
          ? `Characters match; write diagonal + 1 = ${rows[i][j]}.`
          : "Characters differ; contiguous suffix length resets to 0.",
        first[i - 1] === second[j - 1]
          ? `المحرفان متساويان؛ اكتب القطر + 1 = ${rows[i][j]}.`
          : "المحرفان مختلفان؛ أعد طول اللاحقة المتصلة إلى 0.",
        first[i - 1] === second[j - 1] ? 3 : 4,
        counters,
        "dp-write",
      ));
    }
  }
  const result = first.slice(bestEnd - bestLength, bestEnd).join("");
  const finalFrame = tableFrame(rowLabels, colLabels, rows, {
    active: bestLength > 0 ? [bestEnd, second.length] : null,
    aux: [{ label: "Longest common substring", values: [result, bestLength] }],
  });
  steps.push(step(finalFrame, `Longest common substring is ${JSON.stringify(result)} with length ${bestLength}.`, `أطول سلسلة جزئية مشتركة هي ${JSON.stringify(result)} وطولها ${bestLength}.`, 6, counters, "result"));
  return steps;
}

type WildcardInput = { text: string; pattern: string };

function wildcardDefault(level: Level, rng: RNG): WildcardInput {
  const text = textDefault(level, rng, "abcd").slice(0, 5 + level * 2);
  const chars = [...text];
  const pattern = level % 2 === 0
    ? `${chars[0]}*${chars.at(-1)}`
    : `?${chars.slice(1, Math.min(chars.length, 3)).join("")}*`;
  return { text, pattern };
}

function wildcardParse(fields: Record<string, string>): WildcardInput {
  const text = boundedText(fields.text ?? "", "Text", 24, true);
  const pattern = boundedText(fields.pattern ?? "", "Pattern", 24, true);
  return { text, pattern };
}

function wildcardSteps(input: WildcardInput): Step<TableFrame>[] {
  const text = [...input.text];
  const pattern = [...input.pattern];
  const dp = Array.from({ length: pattern.length + 1 }, () => Array<boolean>(text.length + 1).fill(false));
  dp[0][0] = true;
  const rowLabels = ["∅", ...pattern];
  const colLabels = ["∅", ...text];
  const display = () => dp.map((row) => row.map((value) => value ? "✓" : "·"));
  const steps: Step<TableFrame>[] = [];
  const counters = { writes: 1, branches: 0, stars: 0 };
  steps.push(step(tableFrame(rowLabels, colLabels, display(), { active: [0, 0] }), "The empty pattern matches the empty text.", "يطابق النمط الفارغ النص الفارغ.", 0, counters, "base"));
  for (let i = 1; i <= pattern.length; i++) {
    if (pattern[i - 1] === "*") {
      dp[i][0] = dp[i - 1][0];
      counters.writes++;
      counters.stars++;
      steps.push(step(
        tableFrame(rowLabels, colLabels, display(), { active: [i, 0], compared: [[i - 1, 0]] }),
        `Leading * at pattern index ${i - 1} can match an empty suffix.`,
        `يمكن للنجمة البادئة عند موضع النمط ${i - 1} أن تطابق لاحقة فارغة.`,
        2,
        counters,
        "star-empty",
      ));
    }
  }
  for (let i = 1; i <= pattern.length; i++) {
    for (let j = 1; j <= text.length; j++) {
      counters.branches++;
      if (pattern[i - 1] === "*") {
        dp[i][j] = dp[i - 1][j] || dp[i][j - 1];
        counters.stars++;
      } else {
        dp[i][j] = (pattern[i - 1] === "?" || pattern[i - 1] === text[j - 1]) && dp[i - 1][j - 1];
      }
      counters.writes++;
      steps.push(step(
        tableFrame(rowLabels, colLabels, display(), {
          active: [i, j],
          compared: pattern[i - 1] === "*" ? [[i - 1, j], [i, j - 1]] : [[i - 1, j - 1]],
        }),
        pattern[i - 1] === "*"
          ? `* matches empty (up) or consumes ${JSON.stringify(text[j - 1])} (left): ${dp[i][j]}.`
          : `Match ${JSON.stringify(pattern[i - 1])} with ${JSON.stringify(text[j - 1])}: ${dp[i][j]}.`,
        pattern[i - 1] === "*"
          ? `تطابق * الفراغ (أعلى) أو تستهلك ${JSON.stringify(text[j - 1])} (يسار): ${dp[i][j]}.`
          : `طابق ${JSON.stringify(pattern[i - 1])} مع ${JSON.stringify(text[j - 1])}: ${dp[i][j]}.`,
        pattern[i - 1] === "*" ? 4 : 5,
        counters,
        "dp-write",
      ));
    }
  }
  const matches = dp[pattern.length][text.length];
  const finalFrame = tableFrame(rowLabels, colLabels, display(), {
    active: [pattern.length, text.length],
    aux: [{ label: "Matches", values: [String(matches)] }],
  });
  steps.push(step(finalFrame, `Wildcard match result: ${matches}.`, `نتيجة مطابقة أحرف البدل: ${matches}.`, 6, counters, "result"));
  return steps;
}

function boothSteps(input: TextInput): Step<TableFrame>[] {
  const chars = [...input.text];
  const doubled = [...chars, ...chars];
  const rows: (string | number | null)[][] = [
    doubled.map((ch) => ch),
    doubled.map((_, index) => index),
  ];
  const labels = doubled.map((_, index) => String(index));
  const steps: Step<TableFrame>[] = [];
  const counters = { comparisons: 0, candidatesDiscarded: 0, matchedPrefix: 0 };
  let first = 0;
  let second = 1;
  let offset = 0;
  while (first < chars.length && second < chars.length && offset < chars.length) {
    counters.comparisons++;
    steps.push(step(
      tableFrame(["doubled text", "index"], labels, rows, {
        active: [0, first + offset],
        compared: [[0, second + offset]],
        aux: [
          { label: "Candidates", values: [first, second] },
          { label: "Matched prefix", values: [offset] },
        ],
      }),
      `Compare rotation candidates ${first} and ${second} at offset ${offset}: ${JSON.stringify(doubled[first + offset])} vs ${JSON.stringify(doubled[second + offset])}.`,
      `قارن مرشحي الدوران ${first} و${second} عند الإزاحة ${offset}: ${JSON.stringify(doubled[first + offset])} مقابل ${JSON.stringify(doubled[second + offset])}.`,
      2,
      counters,
      "compare",
    ));
    if (doubled[first + offset] === doubled[second + offset]) {
      offset++;
      counters.matchedPrefix = offset;
      continue;
    }
    if (doubled[first + offset] > doubled[second + offset]) {
      const old = first;
      first = first + offset + 1;
      if (first <= second) first = second + 1;
      counters.candidatesDiscarded += first - old;
      steps.push(step(
        tableFrame(["doubled text", "index"], labels, rows, {
          active: first < chars.length ? [0, first] : null,
          aux: [{ label: "Remaining candidates", values: [first, second] }],
        }),
        `Candidate ${old} is lexicographically larger; skip through index ${first - 1}.`,
        `المرشح ${old} أكبر معجمياً؛ تجاوز حتى الموضع ${first - 1}.`,
        4,
        counters,
        "discard-first",
      ));
    } else {
      const old = second;
      second = second + offset + 1;
      if (second <= first) second = first + 1;
      counters.candidatesDiscarded += second - old;
      steps.push(step(
        tableFrame(["doubled text", "index"], labels, rows, {
          active: second < chars.length ? [0, second] : null,
          aux: [{ label: "Remaining candidates", values: [first, second] }],
        }),
        `Candidate ${old} is lexicographically larger; skip through index ${second - 1}.`,
        `المرشح ${old} أكبر معجمياً؛ تجاوز حتى الموضع ${second - 1}.`,
        5,
        counters,
        "discard-second",
      ));
    }
    offset = 0;
    counters.matchedPrefix = 0;
  }
  const index = Math.min(first, second);
  const rotation = chars.slice(index).concat(chars.slice(0, index)).join("");
  const finalFrame = tableFrame(["doubled text", "index"], labels, rows, {
    active: [0, index],
    aux: [{ label: "Minimum rotation", values: [rotation, index] }],
  });
  steps.push(step(finalFrame, `Minimum lexicographic rotation is ${JSON.stringify(rotation)} at index ${index}.`, `أصغر دوران معجمي هو ${JSON.stringify(rotation)} عند الموضع ${index}.`, 7, counters, "result"));
  return steps;
}

export const suffixAutomaton = makeModule({
  slug: "suffix-automaton",
  title: "Suffix Automaton",
  titleAr: "آلة اللواحق",
  category: "strings",
  difficulty: "Advanced",
  tags: ["strings", "automaton", "substring"],
  tagsAr: ["سلاسل", "آلة حالات", "سلسلة جزئية"],
  summary: "Builds the minimal suffix automaton online and uses its transitions to recognize a substring.",
  summaryAr: "يبني آلة اللواحق الدنيا تدريجياً ويستخدم انتقالاتها للتعرف على سلسلة جزئية.",
  renderer: "table",
  pseudocode: [
    "Create the initial state",
    "Add a state for the extended longest prefix",
    "Add missing transitions along suffix links",
    "Link directly when lengths are consecutive",
    "Otherwise clone the conflicting state",
    "Redirect transitions to the clone",
    "Set suffix links of original and new states",
    "Advance the last state",
    "Scan the pattern through transitions",
    "Reject on a missing transition",
    "Report an occurrence",
  ],
  complexity: { time: { best: "O(n + m)", average: "O(n + m)", worst: "O(n + m)" }, space: "O(n)" },
  invariant: "Each state represents one end-position equivalence class and suffix links point to the largest proper suffix class.",
  invariantAr: "تمثل كل حالة فئة تكافؤ لمواضع النهاية وتشير روابط اللواحق إلى أكبر فئة لاحقة صحيحة.",
  how: ["Extend one character online.", "Clone a state only when transition lengths conflict.", "Recognize the pattern by following transitions."],
  howAr: ["مدد الآلة بمحرف واحد.", "استنسخ حالة فقط عند تعارض أطوال الانتقال.", "تعرف على النمط باتباع الانتقالات."],
  inputFields: textPatternFields,
  defaultInput: samDefault,
  parseInput: parseTextPattern,
  serializeInput: (input) => ({ text: input.text, pattern: input.pattern }),
  generate: suffixAutomatonSteps,
});

export const eertree = makeModule({
  slug: "eertree",
  title: "Eertree (Palindromic Tree)",
  titleAr: "شجرة المتناظرات",
  category: "strings",
  difficulty: "Advanced",
  tags: ["strings", "palindrome", "tree"],
  tagsAr: ["سلاسل", "متناظر", "شجرة"],
  summary: "Builds one node per distinct palindrome while following palindromic suffix links.",
  summaryAr: "يبني عقدة لكل متناظر مختلف مع تتبع روابط اللواحق المتناظرة.",
  renderer: "table",
  pseudocode: [
    "Create roots of lengths -1 and 0",
    "For each character, follow suffix links",
    "Find a suffix whose boundaries match the character",
    "Reuse its transition or create a palindrome node",
    "Record the new palindrome length",
    "Find its longest proper palindromic suffix",
    "Set the suffix link",
    "Advance the active suffix node",
    "Return all non-root nodes",
  ],
  complexity: { time: { best: "O(n)", average: "O(n)", worst: "O(n)" }, space: "O(n)" },
  invariant: "Each non-root node uniquely represents one distinct palindrome in the processed prefix.",
  invariantAr: "تمثل كل عقدة غير جذرية متناظراً مختلفاً واحداً في البادئة المعالجة.",
  how: ["Maintain the longest palindromic suffix.", "Follow links until the new character can surround it.", "Create at most one node per character."],
  howAr: ["حافظ على أطول لاحقة متناظرة.", "اتبع الروابط حتى يستطيع المحرف الجديد إحاطتها.", "أنشئ عقدة واحدة على الأكثر لكل محرف."],
  inputFields: textFields,
  defaultInput: (level, rng) => ({ text: textDefault(level, rng, "abac").slice(0, 6 + level * 3) }),
  parseInput: (fields) => ({ text: boundedText(fields.text ?? "", "Text", 40) }),
  serializeInput: (input) => ({ text: input.text }),
  generate: eertreeSteps,
});

export const longestCommonSubstring = makeModule({
  slug: "longest-common-substring",
  title: "Longest Common Substring",
  titleAr: "أطول سلسلة جزئية مشتركة",
  category: "strings",
  difficulty: "Intermediate",
  tags: ["strings", "dynamic programming", "substring"],
  tagsAr: ["سلاسل", "برمجة ديناميكية", "سلسلة جزئية"],
  summary: "Uses diagonal dynamic-programming lengths to find the longest contiguous match.",
  summaryAr: "يستخدم أطوال البرمجة الديناميكية القطرية لإيجاد أطول تطابق متصل.",
  renderer: "table",
  pseudocode: [
    "Initialize a zero table",
    "For each pair of string positions",
    "If characters match, write diagonal + 1",
    "Otherwise write 0",
    "Track the greatest length and end position",
    "Slice the first string at that end",
    "Return the substring",
  ],
  complexity: { time: { best: "O(nm)", average: "O(nm)", worst: "O(nm)" }, space: "O(nm)" },
  invariant: "dp[i][j] is exactly the common-suffix length ending at first[i-1] and second[j-1].",
  invariantAr: "تمثل dp[i][j] بدقة طول اللاحقة المشتركة المنتهية عند المحرفين المحددين.",
  how: ["Fill diagonal extension lengths.", "Reset to zero at mismatches.", "Remember the greatest endpoint."],
  howAr: ["املأ أطوال الامتداد القطري.", "أعد القيمة إلى الصفر عند الاختلاف.", "احفظ أفضل نقطة نهاية."],
  inputFields: pairFields,
  defaultInput: pairDefault,
  parseInput: pairParse,
  serializeInput: (input) => ({ first: input.first, second: input.second }),
  generate: longestCommonSubstringSteps,
});

export const wildcardMatching = makeModule({
  slug: "wildcard-matching",
  title: "Wildcard Matching",
  titleAr: "مطابقة أحرف البدل",
  category: "strings",
  difficulty: "Advanced",
  tags: ["strings", "dynamic programming", "wildcards"],
  tagsAr: ["سلاسل", "برمجة ديناميكية", "أحرف بدل"],
  summary: "Matches the whole text where ? consumes one character and * consumes any sequence.",
  summaryAr: "يطابق النص كاملاً حيث تستهلك ? محرفاً واحداً وتستهلك * أي متتالية.",
  renderer: "table",
  pseudocode: [
    "The empty pattern matches the empty text",
    "Propagate leading stars across the empty-text column",
    "For each pattern and text prefix",
    "For *, combine empty-match and consume-one states",
    "For ? or equal characters, copy the diagonal",
    "Otherwise write false",
    "Return the bottom-right state",
  ],
  complexity: { time: { best: "O(nm)", average: "O(nm)", worst: "O(nm)" }, space: "O(nm)" },
  invariant: "dp[i][j] says exactly whether the first i pattern symbols match the first j text symbols.",
  invariantAr: "تحدد dp[i][j] بدقة هل تطابق أول i رموز من النمط أول j رموز من النص.",
  how: ["Initialize empty prefixes.", "Let * choose empty or consume-one transitions.", "Use diagonal transitions for literals and ?."],
  howAr: ["هيئ البوادئ الفارغة.", "دع * تختار مطابقة الفراغ أو استهلاك محرف.", "استخدم الانتقال القطري للحروف و?."],
  inputFields: textPatternFields,
  defaultInput: wildcardDefault,
  parseInput: wildcardParse,
  serializeInput: (input) => ({ text: input.text, pattern: input.pattern }),
  generate: wildcardSteps,
});

export const boothMinimumRotation = makeModule({
  slug: "booth-minimum-rotation",
  title: "Booth Minimum Rotation",
  titleAr: "أصغر دوران بخوارزمية بوث",
  category: "strings",
  difficulty: "Advanced",
  tags: ["strings", "rotation", "Booth"],
  tagsAr: ["سلاسل", "دوران", "بوث"],
  summary: "Eliminates lexicographically larger rotation starts in linear time over the doubled text.",
  summaryAr: "يستبعد بدايات الدوران الأكبر معجمياً بزمن خطي فوق النص المضاعف.",
  renderer: "table",
  pseudocode: [
    "Double the text",
    "Maintain two candidate starts and an offset",
    "Compare candidate characters at the offset",
    "If the first is larger, skip its proven-larger starts",
    "If the second is larger, skip its proven-larger starts",
    "Reset offset after eliminating a candidate",
    "Return the smaller surviving start",
    "Read n characters from that start",
  ],
  complexity: { time: { best: "O(n)", average: "O(n)", worst: "O(n)" }, space: "O(n)" },
  invariant: "Every skipped start is proven lexicographically larger than a surviving candidate.",
  invariantAr: "كل بداية متجاوزة ثبت أنها أكبر معجمياً من مرشح باقٍ.",
  how: ["Compare two rotations over doubled text.", "Skip an entire dominated candidate range after the first mismatch.", "Read the surviving rotation."],
  howAr: ["قارن دورانين فوق النص المضاعف.", "تجاوز مجال مرشحين مهيمناً عليه بعد أول اختلاف.", "اقرأ الدوران الباقي."],
  inputFields: textFields,
  defaultInput: (level, rng) => ({ text: textDefault(level, rng, "abcd").slice(0, 5 + level * 2) }),
  parseInput: (fields) => ({ text: boundedText(fields.text ?? "", "Text", 40) }),
  serializeInput: (input) => ({ text: input.text }),
  generate: boothSteps,
});

export const stringModules = [
  suffixAutomaton,
  eertree,
  longestCommonSubstring,
  wildcardMatching,
  boothMinimumRotation,
] as const;
