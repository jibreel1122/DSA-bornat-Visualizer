import type { AlgorithmModule, Step, StringFrame } from "@/lib/engine/types";
import { codeBundle, stringFrame, standardLearning } from "./shared";

type Input = { text: string; patterns: string[] };
type Node = { next: Map<string, number>; fail: number; output: number[] };
const pseudocode = [
  "procedure ahoCorasick(text, patterns)",
  "  insert patterns into a trie",
  "  BFS trie to build failure links",
  "    inherit output from the failure state",
  "  state = root",
  "  for each text character:",
  "    follow failure links until a transition exists",
  "    take transition and report every output pattern",
];
function generate(input: Input): Step<StringFrame>[] {
  const text = [...input.text];
  const patterns = input.patterns.map((pattern) => [...pattern]);
  const nodes: Node[] = [{ next: new Map(), fail: 0, output: [] }];
  const steps: Step<StringFrame>[] = [];
  const matches: { pattern: string; start: number }[] = [];
  let transitions = 0, failureJumps = 0;
  const snap = (description: string, ar: string, line: number, index?: number, state: "active" | "compare" | "found" = "active", queue: number[] = []) => {
    const states: Record<number, "active" | "compare" | "found"> = {};
    if (index !== undefined) states[index] = state;
    steps.push({ frame: stringFrame(text, states, undefined, {}, 0, [
      { label: "Failure links", values: nodes.map((node, i) => `${i}→${node.fail}`) },
      { label: "Queue", values: queue },
      { label: "Matches", values: matches.length ? matches.map((match) => `${match.pattern}@${match.start}`) : ["—"] },
    ]), description, descriptionAr: ar, codeLine: line, counters: { transitions, failureJumps, matches: matches.length } });
  };
  snap("Build the multi-pattern trie.", "ابن قاموس الأنماط المتعددة.", 1);
  patterns.forEach((pattern, patternIndex) => {
    let state = 0;
    for (const ch of pattern) {
      let next = nodes[state].next.get(ch);
      if (next === undefined) {
        next = nodes.length;
        nodes[state].next.set(ch, next);
        nodes.push({ next: new Map(), fail: 0, output: [] });
        snap(`Create trie edge '${ch}' from state ${state} to ${next}.`, `أنشئ حافة القاموس '${ch}' من الحالة ${state} إلى ${next}.`, 1);
      }
      state = next;
    }
    nodes[state].output.push(patternIndex);
  });
  const queue: number[] = [];
  for (const child of nodes[0].next.values()) queue.push(child);
  snap("Breadth-first construction of failure links begins.", "يبدأ بناء روابط الفشل بالاتساع.", 2, undefined, "active", queue);
  while (queue.length) {
    const current = queue.shift()!;
    for (const [ch, next] of nodes[current].next) {
      queue.push(next);
      let fallback = nodes[current].fail;
      while (fallback !== 0 && !nodes[fallback].next.has(ch)) fallback = nodes[fallback].fail;
      const candidate = nodes[fallback].next.get(ch);
      nodes[next].fail = candidate !== undefined && candidate !== next ? candidate : 0;
      nodes[next].output.push(...nodes[nodes[next].fail].output);
      snap(`Failure(${next}) = ${nodes[next].fail} on '${ch}'; inherit suffix outputs.`, `رابط فشل(${next}) = ${nodes[next].fail} عند '${ch}'؛ ورّث مخرجات اللواحق.`, 3, undefined, "active", queue);
    }
  }
  let state = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    while (state !== 0 && !nodes[state].next.has(ch)) {
      const previous = state;
      state = nodes[state].fail;
      failureJumps++;
      snap(`No '${ch}' edge from ${previous}; follow failure link to ${state}.`, `لا توجد حافة '${ch}' من ${previous}؛ اتبع رابط الفشل إلى ${state}.`, 5, i, "compare");
    }
    state = nodes[state].next.get(ch) ?? 0;
    transitions++;
    snap(`Read '${ch}' and enter automaton state ${state}.`, `اقرأ '${ch}' وانتقل إلى حالة الآلة ${state}.`, 6, i);
    for (const patternIndex of nodes[state].output) {
      const pattern = input.patterns[patternIndex];
      const start = i - [...pattern].length + 1;
      matches.push({ pattern, start });
      snap(`Report pattern "${pattern}" at index ${start}.`, `أبلغ عن النمط "${pattern}" عند الفهرس ${start}.`, 7, i, "found");
    }
  }
  snap(matches.length ? `Done: ${matches.length} match(es).` : "Done: no pattern matched.", matches.length ? `انتهى: ${matches.length} تطابق.` : "انتهى: لا يوجد تطابق.", 7);
  return steps;
}
const learning = standardLearning({
  overview: "Aho–Corasick combines all patterns in one trie and adds failure links, producing a finite automaton that scans the text once.",
  overviewAr: "تجمع أهو-كوراسيك كل الأنماط في قاموس واحد وتضيف روابط فشل لتنتج آلة منتهية تمسح النص مرة واحدة.",
  how: ["Build a trie of all patterns.", "Build failure links by BFS.", "Scan text, falling back without rewinding and reporting inherited outputs."],
  howAr: ["ابن قاموسًا لكل الأنماط.", "ابن روابط الفشل بالبحث بالاتساع.", "امسح النص مع الرجوع دون إعادة القراءة وأبلغ عن المخرجات الموروثة."],
  complexity: { time: { best: "O(total patterns + text)", average: "O(total patterns + text + matches)", worst: "O(total patterns + text + matches)" }, space: "O(total pattern characters)" },
  invariant: "The current state represents the longest pattern prefix that is also a suffix of scanned text.",
  invariantAr: "تمثل الحالة الحالية أطول بادئة لنمط تكون أيضًا لاحقة للنص الممسوح.",
  summary: "Aho–Corasick performs simultaneous multi-pattern matching in one text pass.",
  summaryAr: "تنفذ أهو-كوراسيك مطابقة أنماط متعددة في مرور واحد على النص.",
});
const mod: AlgorithmModule<StringFrame, Input> = {
  slug: "aho-corasick", title: "Aho–Corasick", titleAr: "أهو-كوراسيك", category: "strings", difficulty: "Advanced",
  tags: ["multi-pattern", "trie", "failure links", "automaton"], tagsAr: ["أنماط متعددة", "قاموس", "روابط فشل", "آلة"],
  summary: "Builds a trie automaton with failure links to find many patterns in one scan.",
  summaryAr: "يبني آلة قاموس بروابط فشل لإيجاد أنماط كثيرة في مسح واحد.",
  renderer: "string", pseudocode, code: codeBundle("Aho–Corasick", pseudocode), ...learning,
  inputFields: [{ key: "text", label: "Text", labelAr: "النص", placeholder: "ushers" }, { key: "patterns", label: "Patterns", labelAr: "الأنماط", placeholder: "he, she, his, hers", help: "Comma-separated nonempty patterns.", helpAr: "أنماط غير فارغة مفصولة بفواصل." }],
  defaultInput: () => ({ text: "ushers", patterns: ["he", "she", "his", "hers"] }),
  parseInput: (fields) => {
    const text = fields.text ?? "";
    const patterns = (fields.patterns ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    if ([...text].length < 1 || [...text].length > 100) throw new Error("Text must contain 1 to 100 characters.");
    if (patterns.length < 1 || patterns.length > 12 || patterns.some((pattern) => [...pattern].length > 24)) throw new Error("Enter 1 to 12 patterns, each at most 24 characters.");
    return { text, patterns };
  },
  serializeInput: (input) => ({ text: input.text, patterns: input.patterns.join(", ") }), generate,
};
export default mod;
