import type { CellState, Level, RNG, Step, TreeFrame, TreeNodeF } from "@/lib/engine/types";
import { cloneFrame, makeTreeModule, parseWords, step } from "./shared";

interface RadixNode {
  id: string;
  edge: string;
  terminal: boolean;
  children: RadixNode[];
}

type WordsInput = { words: string[]; query: string };

function parseWordsInput(fields: Record<string, string>): WordsInput {
  const words = parseWords(fields.words ?? "", 14);
  const query = (fields.query ?? "").trim();
  if (!query) throw new Error("Enter a non-empty query.");
  return { words: [...new Set(words)], query };
}

function wordDefaults(level: Level, rng: RNG): WordsInput {
  const banks = [
    ["car", "card", "care", "cat"],
    ["bear", "bell", "bid", "bull", "buy"],
    ["romane", "romanus", "romulus", "rubens", "ruber", "rubicon"],
    ["team", "tear", "technical", "technique", "temple", "temporary", "ten"],
    ["algorithm", "algebra", "align", "allocation", "allow", "alloy", "almanac", "alpha"],
  ];
  const words = banks[level - 1];
  return { words, query: rng.pick(words) };
}

function commonPrefix(left: string, right: string): number {
  const a = [...left];
  const b = [...right];
  let index = 0;
  while (index < a.length && index < b.length && a[index] === b[index]) index++;
  return index;
}

function radixFrame(root: RadixNode, states: Record<string, CellState>, note: string): TreeFrame {
  const nodes: Record<string, TreeNodeF> = {};
  const visit = (node: RadixNode) => {
    nodes[node.id] = {
      id: node.id,
      value: node.edge || "∅",
      children: node.children.map((child) => child.id),
      extra: node.terminal ? "word ✓" : undefined,
    };
    node.children.forEach(visit);
  };
  visit(root);
  return cloneFrame(nodes, root.id, states, [], note);
}

function generateRadix(input: WordsInput): Step<TreeFrame>[] {
  const root: RadixNode = { id: "rx0", edge: "", terminal: false, children: [] };
  let nextId = 1;
  let comparisons = 0;
  const steps: Step<TreeFrame>[] = [];
  const emit = (states: Record<string, CellState>, description: string, descriptionAr: string, line: number, phase: string, transformation?: Step<TreeFrame>["transformation"]) =>
    steps.push(step(radixFrame(root, states, "Edges store maximal shared substrings."), description, descriptionAr, line, phase, { comparisons }, transformation));
  emit({}, "Start with an empty radix-tree root.", "ابدأ بجذر شجرة Radix فارغ.", 0, "start");
  for (const word of input.words) {
    let node = root;
    let remainder = word;
    while (remainder.length > 0) {
      let child = node.children.find((candidate) => [...candidate.edge][0] === [...remainder][0]);
      if (!child) {
        child = { id: `rx${nextId++}`, edge: remainder, terminal: true, children: [] };
        node.children.push(child);
        emit({ [node.id]: "active", [child.id]: "found" }, `Attach the unmatched suffix "${remainder}" as one compressed edge.`, `اربط اللاحقة غير المطابقة "${remainder}" كحافة مضغوطة واحدة.`, 1, "insert");
        remainder = "";
        break;
      }
      comparisons++;
      const length = commonPrefix(child.edge, remainder);
      emit({ [child.id]: "compare" }, `The common prefix of "${child.edge}" and "${remainder}" has length ${length}.`, `طول البادئة المشتركة بين "${child.edge}" و"${remainder}" هو ${length}.`, 1, "compare");
      if (length === [...child.edge].length) {
        remainder = [...remainder].slice(length).join("");
        node = child;
        if (remainder.length === 0) {
          node.terminal = true;
          emit({ [node.id]: "found" }, `Mark the existing path as word "${word}".`, `علّم المسار الموجود ككلمة "${word}".`, 2, "terminal");
        }
        continue;
      }
      const edgeChars = [...child.edge];
      const remainderChars = [...remainder];
      const prefix = edgeChars.slice(0, length).join("");
      const oldSuffix = edgeChars.slice(length).join("");
      const newSuffix = remainderChars.slice(length).join("");
      emit({ [child.id]: "swap" }, `Split edge "${child.edge}" at shared prefix "${prefix}".`, `اقسم الحافة "${child.edge}" عند البادئة المشتركة "${prefix}".`, 2, "split");
      const oldChild: RadixNode = {
        id: `rx${nextId++}`,
        edge: oldSuffix,
        terminal: child.terminal,
        children: child.children,
      };
      child.edge = prefix;
      child.terminal = newSuffix.length === 0;
      child.children = [oldChild];
      if (newSuffix.length > 0) {
        child.children.push({ id: `rx${nextId++}`, edge: newSuffix, terminal: true, children: [] });
      }
      emit({ [child.id]: "found", ...Object.fromEntries(child.children.map((item) => [item.id, "active" as CellState])) }, `The split creates one branching node and preserves both suffixes.`, "أنشأ التقسيم عقدة تفرع وحافظ على اللاحقتين.", 2, "split", { kind: "rebuild", label: "Radix edge split" });
      remainder = "";
    }
  }
  let node = root;
  let remainder = input.query;
  let found = true;
  while (remainder.length > 0) {
    const child = node.children.find((candidate) => [...candidate.edge][0] === [...remainder][0]);
    if (!child) {
      found = false;
      break;
    }
    comparisons++;
    const matches = remainder.startsWith(child.edge);
    emit({ [child.id]: matches ? "active" : "discarded" }, `Compare query remainder "${remainder}" with edge "${child.edge}".`, `قارن بقية الاستعلام "${remainder}" مع الحافة "${child.edge}".`, 3, "search");
    if (!matches) {
      found = false;
      break;
    }
    remainder = [...remainder].slice([...child.edge].length).join("");
    node = child;
  }
  found = found && remainder.length === 0 && node.terminal;
  emit({ [node.id]: found ? "found" : "discarded" }, found ? `"${input.query}" is stored in the radix tree.` : `"${input.query}" is not a complete stored word.`, found ? `"${input.query}" مخزنة في شجرة Radix.` : `"${input.query}" ليست كلمة مخزنة كاملة.`, 3, "done");
  return steps;
}

export const radixTree = makeTreeModule<WordsInput>({
  slug: "radix-tree",
  title: "Radix Tree",
  titleAr: "شجرة Radix المضغوطة",
  difficulty: "Advanced",
  tags: ["compressed trie", "prefix", "edge split"],
  tagsAr: ["Trie مضغوطة", "بادئة", "تقسيم حافة"],
  summary: "Compress unary trie paths into substring-labelled edges.",
  summaryAr: "اضغط مسارات Trie الأحادية في حواف تحمل سلاسل نصية.",
  overview: "A radix tree stores maximal common substrings on edges and splits an edge exactly where a new word diverges.",
  overviewAr: "تخزن شجرة Radix أطول المقاطع المشتركة على الحواف وتقسم الحافة بدقة عند اختلاف كلمة جديدة.",
  pseudocode: ["start at the root", "match the longest child-edge prefix", "split a partially matching edge", "follow exact edges to search"],
  complexity: { time: { best: "O(k)", average: "O(k)", worst: "O(k)" }, space: "O(total characters)" },
  applications: ["Routing tables", "Autocomplete", "Dictionary indexes"],
  applicationsAr: ["جداول التوجيه", "الإكمال التلقائي", "فهارس القواميس"],
  inputFields: [
    { key: "words", label: "Words", labelAr: "الكلمات", placeholder: "car, card, care, cat", help: "Comma-separated words.", helpAr: "كلمات مفصولة بفواصل.", list: true },
    { key: "query", label: "Query", labelAr: "الاستعلام", placeholder: "care", help: "Exact word to search.", helpAr: "كلمة كاملة للبحث.", search: true },
  ],
  defaultInput: wordDefaults,
  parseInput: parseWordsInput,
  serializeInput: (input) => ({ words: input.words.join(", "), query: input.query }),
  generate: generateRadix,
});

interface TrieNode {
  id: string;
  ch: string;
  terminal: boolean;
  children: Map<string, TrieNode>;
}

type SuffixInput = { text: string; pattern: string };

function parseSuffix(fields: Record<string, string>): SuffixInput {
  const text = fields.text ?? "";
  const pattern = fields.pattern ?? "";
  if (!text || !pattern) throw new Error("Text and pattern must be non-empty.");
  if ([...text].length > 12) throw new Error("Use at most 12 text characters.");
  return { text, pattern };
}

function trieFrame(root: TrieNode, states: Record<string, CellState>, suffixes: string[]): TreeFrame {
  const nodes: Record<string, TreeNodeF> = {};
  const visit = (node: TrieNode) => {
    nodes[node.id] = {
      id: node.id,
      value: node.ch || "root",
      children: [...node.children.values()].map((child) => child.id),
      extra: node.terminal ? "suffix ✓" : undefined,
    };
    node.children.forEach(visit);
  };
  visit(root);
  return cloneFrame(nodes, root.id, states, [{ label: "inserted suffixes", values: suffixes }], "Every suffix is represented by one root-to-terminal path.");
}

function generateSuffixTrie(input: SuffixInput): Step<TreeFrame>[] {
  const root: TrieNode = { id: "st0", ch: "", terminal: false, children: new Map() };
  let nextId = 1;
  let created = 0;
  const inserted: string[] = [];
  const steps: Step<TreeFrame>[] = [];
  const emit = (states: Record<string, CellState>, description: string, descriptionAr: string, line: number, phase: string) =>
    steps.push(step(trieFrame(root, states, inserted), description, descriptionAr, line, phase, { created }));
  emit({}, "Start with an empty suffix trie.", "ابدأ بشجرة لواحق فارغة.", 0, "start");
  const chars = [...input.text];
  for (let start = 0; start < chars.length; start++) {
    let node = root;
    const suffix = chars.slice(start).join("");
    emit({ [root.id]: "active" }, `Insert suffix "${suffix}".`, `أدرج اللاحقة "${suffix}".`, 0, "suffix");
    for (const ch of chars.slice(start)) {
      let child = node.children.get(ch);
      if (!child) {
        child = { id: `st${nextId++}`, ch, terminal: false, children: new Map() };
        node.children.set(ch, child);
        created++;
        emit({ [node.id]: "active", [child.id]: "found" }, `Create character edge "${ch}".`, `أنشئ حافة الحرف "${ch}".`, 1, "insert");
      } else {
        emit({ [child.id]: "visited" }, `Reuse existing character edge "${ch}".`, `أعد استخدام حافة الحرف "${ch}".`, 1, "reuse");
      }
      node = child;
    }
    node.terminal = true;
    inserted.push(suffix);
    emit({ [node.id]: "special" }, `Mark the end of suffix "${suffix}".`, `علّم نهاية اللاحقة "${suffix}".`, 2, "terminal");
  }
  let node: TrieNode | undefined = root;
  for (const ch of [...input.pattern]) {
    const child: TrieNode | undefined = node?.children.get(ch);
    emit(child ? { [child.id]: "compare" } : { [node!.id]: "discarded" }, child ? `Follow "${ch}" while searching for "${input.pattern}".` : `No "${ch}" edge exists; the pattern is absent.`, child ? `اتبع "${ch}" أثناء البحث عن "${input.pattern}".` : `لا توجد حافة "${ch}"؛ النمط غير موجود.`, 3, "search");
    node = child;
    if (!node) break;
  }
  emit(node ? { [node.id]: "found" } : {}, node ? `"${input.pattern}" occurs in the text.` : `"${input.pattern}" does not occur in the text.`, node ? `"${input.pattern}" موجود في النص.` : `"${input.pattern}" غير موجود في النص.`, 3, "done");
  return steps;
}

export const suffixTrie = makeTreeModule<SuffixInput>({
  slug: "suffix-trie",
  title: "Suffix Trie",
  titleAr: "شجرة اللواحق",
  difficulty: "Advanced",
  tags: ["suffix", "substring", "trie"],
  tagsAr: ["لاحقة", "سلسلة جزئية", "Trie"],
  summary: "Insert every text suffix so substring queries become trie walks.",
  summaryAr: "أدرج كل لواحق النص لتحويل بحث السلاسل الجزئية إلى مسارات في Trie.",
  overview: "A suffix trie stores all suffixes explicitly. Any substring is therefore a prefix of at least one stored suffix.",
  overviewAr: "تخزن شجرة اللواحق جميع اللواحق صراحةً، ولذلك تكون كل سلسلة جزئية بادئةً لإحدى اللواحق المخزنة.",
  pseudocode: ["for each suffix start", "insert every remaining character", "mark the suffix terminal", "walk pattern characters from root"],
  complexity: { time: { best: "O(n²)", average: "O(n²)", worst: "O(n²)" }, space: "O(n²)" },
  applications: ["Substring search", "Text indexing", "Repeated-pattern exploration"],
  applicationsAr: ["بحث السلاسل الجزئية", "فهرسة النصوص", "استكشاف الأنماط المتكررة"],
  inputFields: [
    { key: "text", label: "Text", labelAr: "النص", placeholder: "banana", help: "Text of at most 12 characters.", helpAr: "نص لا يتجاوز 12 حرفاً." },
    { key: "pattern", label: "Pattern", labelAr: "النمط", placeholder: "ana", help: "Substring to search.", helpAr: "سلسلة جزئية للبحث.", search: true },
  ],
  defaultInput: (level) => {
    const texts = ["aba", "banana", "cacao", "mississippi", "abracadabra"];
    const patterns = ["ba", "ana", "cao", "issi", "cad"];
    return { text: texts[level - 1], pattern: patterns[level - 1] };
  },
  parseInput: parseSuffix,
  serializeInput: (input) => ({ text: input.text, pattern: input.pattern }),
  generate: generateSuffixTrie,
});

interface MerkleNode {
  id: string;
  hash: string;
  label: string;
  left: MerkleNode | null;
  right: MerkleNode | null;
}

type MerkleInput = { leaves: string[]; verify: number };

export function pedagogicalHash(value: string): string {
  let hash = 0x811c9dc5;
  for (const ch of [...value]) {
    hash ^= ch.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function parseMerkle(fields: Record<string, string>): MerkleInput {
  const leaves = parseWords(fields.leaves ?? "", 16);
  const verify = Number(fields.verify);
  if (!Number.isSafeInteger(verify) || verify < 0 || verify >= leaves.length) throw new Error("Verify index must reference a leaf.");
  return { leaves, verify };
}

function merkleFrame(root: MerkleNode | null, all: MerkleNode[], states: Record<string, CellState>, level: string[]): TreeFrame {
  const nodes: Record<string, TreeNodeF> = {};
  for (const node of all) {
    nodes[node.id] = {
      id: node.id,
      value: node.label,
      left: node.left?.id ?? null,
      right: node.right?.id ?? null,
      extra: node.hash,
    };
  }
  return cloneFrame(nodes, root?.id ?? null, states, [{ label: "current level", values: level }], "The demo uses deterministic FNV-1a digests; production Merkle trees use a cryptographic hash.");
}

function generateMerkle(input: MerkleInput): Step<TreeFrame>[] {
  const all: MerkleNode[] = [];
  let nextId = 0;
  let hashes = 0;
  const steps: Step<TreeFrame>[] = [];
  let level: MerkleNode[] = [];
  let root: MerkleNode | null = null;
  const parentLinks = new Map<string, { parent: MerkleNode; sibling: MerkleNode }>();
  const emit = (states: Record<string, CellState>, description: string, descriptionAr: string, line: number, phase: string) =>
    steps.push(step(merkleFrame(root, all, states, level.map((node) => node.hash)), description, descriptionAr, line, phase, { hashes }));
  for (const value of input.leaves) {
    const node: MerkleNode = { id: `mk${nextId++}`, hash: pedagogicalHash(`leaf:${value}`), label: value, left: null, right: null };
    hashes++;
    all.push(node);
    level.push(node);
    root = node;
    emit({ [node.id]: "found" }, `Hash leaf "${value}" as ${node.hash}.`, `جزّئ الورقة "${value}" إلى ${node.hash}.`, 0, "leaf");
  }
  while (level.length > 1) {
    const next: MerkleNode[] = [];
    for (let index = 0; index < level.length; index += 2) {
      const left = level[index];
      let right = level[index + 1];
      if (!right) {
        right = { id: `mk${nextId++}`, hash: left.hash, label: "duplicate digest", left: null, right: null };
        all.push(right);
        emit({ [left.id]: "compare", [right.id]: "found" }, `Copy unpaired digest ${left.hash} into a distinct duplicate node.`, `انسخ التجزئة غير المزدوجة ${left.hash} إلى عقدة تكرار مستقلة.`, 1, "duplicate");
      } else {
        emit({ [left.id]: "compare", [right.id]: "compare" }, `Concatenate child hashes ${left.hash} and ${right.hash}.`, `ادمج تجزئتي الطفلين ${left.hash} و${right.hash}.`, 1, "combine");
      }
      const parent: MerkleNode = {
        id: `mk${nextId++}`,
        hash: pedagogicalHash(`node:${left.hash}:${right.hash}`),
        label: "hash",
        left,
        right,
      };
      hashes++;
      all.push(parent);
      next.push(parent);
      parentLinks.set(left.id, { parent, sibling: right });
      if (right.label !== "duplicate digest") parentLinks.set(right.id, { parent, sibling: left });
      root = parent;
      emit({ [parent.id]: "found", [left.id]: "active", [right.id]: "active" }, `Create parent digest ${parent.hash}.`, `أنشئ تجزئة الأب ${parent.hash}.`, 2, "parent");
    }
    level = next;
  }
  root = level[0] ?? null;
  const target = all[input.verify];
  const proof: string[] = [];
  let proofNode = target;
  while (proofNode && proofNode !== root) {
    const link = parentLinks.get(proofNode.id);
    if (!link) break;
    proof.push(link.sibling.hash);
    proofNode = link.parent;
  }
  steps.push(step(merkleFrame(root, all, target ? { [target.id]: "found" } : {}, proof), `Leaf ${input.verify} has an authentication path of ${proof.length} sibling hashes to root ${root?.hash}.`, `للورقة ${input.verify} مسار تحقق من ${proof.length} تجزئات شقيقة إلى الجذر ${root?.hash}.`, 3, "done", { hashes }));
  return steps;
}

export const merkleTree = makeTreeModule<MerkleInput>({
  slug: "merkle-tree",
  title: "Merkle Tree",
  titleAr: "شجرة ميركل",
  difficulty: "Advanced",
  tags: ["hash tree", "integrity", "authentication path"],
  tagsAr: ["شجرة تجزئة", "سلامة البيانات", "مسار تحقق"],
  summary: "Hash leaves and pairwise child digests until one authenticated root remains.",
  summaryAr: "جزّئ الأوراق ثم تجزئات الأطفال زوجياً حتى يبقى جذر موثّق واحد.",
  overview: "A Merkle tree commits to an ordered set of leaves. Changing any leaf changes every digest on its path to the root.",
  overviewAr: "تلتزم شجرة ميركل بمجموعة أوراق مرتبة؛ يؤدي تغيير أي ورقة إلى تغيير كل التجزئات على مسارها إلى الجذر.",
  pseudocode: ["hash each tagged leaf", "pair adjacent hashes", "hash tagged child concatenation", "collect sibling hashes for a proof"],
  complexity: { time: { best: "O(n)", average: "O(n)", worst: "O(n)" }, space: "O(n)" },
  applications: ["Blockchains", "Content-addressed storage", "Integrity proofs"],
  applicationsAr: ["سلاسل الكتل", "التخزين المعنون بالمحتوى", "براهين سلامة البيانات"],
  inputFields: [
    { key: "leaves", label: "Leaves", labelAr: "الأوراق", placeholder: "A, B, C, D", help: "Comma-separated leaf payloads.", helpAr: "بيانات أوراق مفصولة بفواصل.", list: true },
    { key: "verify", label: "Verify index", labelAr: "فهرس التحقق", placeholder: "2", help: "Zero-based leaf index.", helpAr: "فهرس الورقة يبدأ من صفر.", search: true },
  ],
  defaultInput: (level) => {
    const leaves = Array.from({ length: Math.min(8, 2 + level) }, (_, index) => `block-${index + 1}`);
    return { leaves, verify: Math.floor(leaves.length / 2) };
  },
  parseInput: parseMerkle,
  serializeInput: (input) => ({ leaves: input.leaves.join(", "), verify: String(input.verify) }),
  generate: generateMerkle,
});
