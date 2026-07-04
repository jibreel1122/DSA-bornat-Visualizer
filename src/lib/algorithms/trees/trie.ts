import type { AlgorithmModule, CellState, Step, TreeFrame, TreeNodeF } from "@/lib/engine/types";

interface TNode {
  id: string;
  ch: string;
  children: Map<string, TNode>;
  isEnd: boolean;
}
type Input = { words: string[]; search: string };

function generate(input: Input): Step<TreeFrame>[] {
  let idc = 0;
  const root: TNode = { id: "root", ch: "•", children: new Map(), isEnd: false };
  const steps: Step<TreeFrame>[] = [];
  let nodeCount = 1;

  const toFrame = (states: Record<string, CellState>, description: string, codeLine: number, note: string): void => {
    const nodes: Record<string, TreeNodeF> = {};
    const walk = (n: TNode) => {
      const kids = [...n.children.values()].sort((a, b) => a.ch.localeCompare(b.ch));
      nodes[n.id] = {
        id: n.id,
        value: n.ch,
        children: kids.map((k) => k.id),
        extra: n.isEnd ? "★" : undefined,
        color: n.isEnd ? "black" : undefined,
      };
      kids.forEach(walk);
    };
    walk(root);
    // isEnd nodes shouldn't render as red/black unless also stated; clear color when a state applies
    for (const id of Object.keys(states)) if (nodes[id]) nodes[id].color = undefined;
    steps.push({
      frame: { nodes, rootId: root.id, states: { ...states }, note },
      description,
      codeLine,
      counters: { nodes: nodeCount },
    });
  };

  toFrame({ root: "active" }, `A trie stores strings by shared prefixes. The root (•) holds no character; ★ marks a complete word.`, 0, `empty trie`);

  // --- insert each word ---
  for (const word of input.words) {
    let cur = root;
    toFrame({ [cur.id]: "active" }, `insert("${word}"): start at the root.`, 2, `insert "${word}"`);
    for (const ch of word) {
      if (cur.children.has(ch)) {
        cur = cur.children.get(ch)!;
        toFrame({ [cur.id]: "compare" }, `'${ch}' already exists — follow the existing edge.`, 4, `insert "${word}"`);
      } else {
        const node: TNode = { id: `t${idc++}`, ch, children: new Map(), isEnd: false };
        cur.children.set(ch, node);
        nodeCount++;
        cur = node;
        toFrame({ [cur.id]: "found" }, `'${ch}' is new — create a child node for it.`, 5, `insert "${word}"`);
      }
    }
    cur.isEnd = true;
    toFrame({ [cur.id]: "special" }, `Mark the node for '${word[word.length - 1]}' as end-of-word (★). "${word}" is now stored.`, 6, `insert "${word}"`);
  }

  // --- search ---
  const target = input.search;
  let cur: TNode | null = root;
  let ok = true;
  toFrame({ root: "active" }, `search("${target}"): walk the trie character by character.`, 8, `search "${target}"`);
  for (const ch of target) {
    if (cur && cur.children.has(ch)) {
      cur = cur.children.get(ch)!;
      toFrame({ [cur.id]: "compare" }, `Matched '${ch}' — descend.`, 9, `search "${target}"`);
    } else {
      ok = false;
      const st: Record<string, CellState> = {};
      if (cur) st[cur.id] = "discarded";
      toFrame(st, `No edge for '${ch}': "${target}" is not in the trie.`, 10, `search "${target}"`);
      cur = null;
      break;
    }
  }
  if (ok && cur) {
    if (cur.isEnd) {
      toFrame({ [cur.id]: "found" }, `Reached the end and it is marked ★ — "${target}" is present.`, 11, `search "${target}"`);
    } else {
      toFrame({ [cur.id]: "discarded" }, `Path exists but the final node isn't ★ — "${target}" is only a prefix, not a stored word.`, 11, `search "${target}"`);
    }
  }
  return steps;
}

function randomInput(level: number, rng: { pick: <T>(a: readonly T[]) => T; int: (a: number, b: number) => number }): Input {
  const banks = [
    ["cat", "car", "card", "cave"],
    ["dog", "do", "dot", "dove"],
    ["ten", "tea", "ted", "ton"],
    ["ant", "and", "ape", "art"],
    ["bat", "bad", "ban", "bar"],
  ];
  const words = banks[Math.min(level - 1, banks.length - 1)];
  const searchInBank = rng.int(0, 1) === 0;
  const search = searchInBank ? rng.pick(words) : words[0].slice(0, 2) + "z";
  return { words: [...words], search };
}

const mod: AlgorithmModule<TreeFrame, Input> = {
  slug: "trie",
  title: "Trie (Prefix Tree)",
  category: "trees",
  difficulty: "Intermediate",
  tags: ["trie", "prefix tree", "strings", "dictionary"],
  summary: "Stores a set of strings in a prefix tree, sharing common prefixes; supports fast insert and lookup by walking edges.",
  renderer: "tree",
  pseudocode: [
    "structure Trie",
    "  root = node with empty children map",
    "  insert(word):",
    "    cur = root",
    "    for ch in word:",
    "      cur = cur.children[ch] (create if absent)",
    "    cur.isEnd = true",
    "  search(word): walk edges; true if path exists and isEnd",
    "  startsWith(prefix): true if the path exists",
  ],
  code: {
    pseudocode: `insert(word):
  cur = root
  for ch in word: cur = cur.child[ch] or new node
  cur.isEnd = true
search(word):
  walk edges; return path exists and cur.isEnd`,
    c: `#define A 26
typedef struct Trie { struct Trie* next[A]; int end; } Trie;

void insert(Trie* root, const char* w) {
    Trie* cur = root;
    for (; *w; w++) {
        int i = *w - 'a';
        if (!cur->next[i]) cur->next[i] = calloc(1, sizeof(Trie));
        cur = cur->next[i];
    }
    cur->end = 1;
}
int search(Trie* root, const char* w) {
    Trie* cur = root;
    for (; *w; w++) {
        int i = *w - 'a';
        if (!cur->next[i]) return 0;
        cur = cur->next[i];
    }
    return cur->end;
}`,
    cpp: `struct Trie {
    Trie* next[26] = {};
    bool end = false;
    void insert(const string& w) {
        Trie* cur = this;
        for (char c : w) {
            int i = c - 'a';
            if (!cur->next[i]) cur->next[i] = new Trie();
            cur = cur->next[i];
        }
        cur->end = true;
    }
    bool search(const string& w) {
        Trie* cur = this;
        for (char c : w) {
            int i = c - 'a';
            if (!cur->next[i]) return false;
            cur = cur->next[i];
        }
        return cur->end;
    }
};`,
    java: `class Trie {
    Trie[] next = new Trie[26];
    boolean end = false;
    void insert(String w) {
        Trie cur = this;
        for (char c : w.toCharArray()) {
            int i = c - 'a';
            if (cur.next[i] == null) cur.next[i] = new Trie();
            cur = cur.next[i];
        }
        cur.end = true;
    }
    boolean search(String w) {
        Trie cur = this;
        for (char c : w.toCharArray()) {
            int i = c - 'a';
            if (cur.next[i] == null) return false;
            cur = cur.next[i];
        }
        return cur.end;
    }
}`,
    python: `class Trie:
    def __init__(self):
        self.children = {}
        self.end = False
    def insert(self, word):
        cur = self
        for ch in word:
            cur = cur.children.setdefault(ch, Trie())
        cur.end = True
    def search(self, word):
        cur = self
        for ch in word:
            if ch not in cur.children: return False
            cur = cur.children[ch]
        return cur.end`,
    javascript: `class Trie {
  constructor() { this.children = {}; this.end = false; }
  insert(word) {
    let cur = this;
    for (const ch of word) {
      if (!cur.children[ch]) cur.children[ch] = new Trie();
      cur = cur.children[ch];
    }
    cur.end = true;
  }
  search(word) {
    let cur = this;
    for (const ch of word) {
      if (!cur.children[ch]) return false;
      cur = cur.children[ch];
    }
    return cur.end;
  }
}`,
    typescript: `class Trie {
  children: Record<string, Trie> = {};
  end = false;
  insert(word: string): void {
    let cur: Trie = this;
    for (const ch of word) {
      if (!cur.children[ch]) cur.children[ch] = new Trie();
      cur = cur.children[ch];
    }
    cur.end = true;
  }
  search(word: string): boolean {
    let cur: Trie = this;
    for (const ch of word) {
      if (!cur.children[ch]) return false;
      cur = cur.children[ch];
    }
    return cur.end;
  }
}`,
    csharp: `class Trie {
    Dictionary<char, Trie> children = new();
    bool end = false;
    public void Insert(string w) {
        var cur = this;
        foreach (char c in w) {
            if (!cur.children.ContainsKey(c)) cur.children[c] = new Trie();
            cur = cur.children[c];
        }
        cur.end = true;
    }
    public bool Search(string w) {
        var cur = this;
        foreach (char c in w) {
            if (!cur.children.TryGetValue(c, out var nx)) return false;
            cur = nx;
        }
        return cur.end;
    }
}`,
    go: `type Trie struct {
	children map[rune]*Trie
	end      bool
}
func NewTrie() *Trie { return &Trie{children: map[rune]*Trie{}} }
func (t *Trie) Insert(w string) {
	cur := t
	for _, ch := range w {
		if cur.children[ch] == nil { cur.children[ch] = NewTrie() }
		cur = cur.children[ch]
	}
	cur.end = true
}
func (t *Trie) Search(w string) bool {
	cur := t
	for _, ch := range w {
		if cur.children[ch] == nil { return false }
		cur = cur.children[ch]
	}
	return cur.end
}`,
    rust: `use std::collections::HashMap;
#[derive(Default)]
struct Trie { children: HashMap<char, Trie>, end: bool }
impl Trie {
    fn insert(&mut self, w: &str) {
        let mut cur = self;
        for ch in w.chars() {
            cur = cur.children.entry(ch).or_default();
        }
        cur.end = true;
    }
    fn search(&self, w: &str) -> bool {
        let mut cur = self;
        for ch in w.chars() {
            match cur.children.get(&ch) {
                Some(n) => cur = n,
                None => return false,
            }
        }
        cur.end
    }
}`,
    kotlin: `class Trie {
    val children = HashMap<Char, Trie>()
    var end = false
    fun insert(w: String) {
        var cur = this
        for (ch in w) cur = cur.children.getOrPut(ch) { Trie() }
        cur.end = true
    }
    fun search(w: String): Boolean {
        var cur = this
        for (ch in w) cur = cur.children[ch] ?: return false
        return cur.end
    }
}`,
    swift: `final class Trie {
    var children: [Character: Trie] = [:]
    var end = false
    func insert(_ w: String) {
        var cur = self
        for ch in w {
            if cur.children[ch] == nil { cur.children[ch] = Trie() }
            cur = cur.children[ch]!
        }
        cur.end = true
    }
    func search(_ w: String) -> Bool {
        var cur = self
        for ch in w {
            guard let nx = cur.children[ch] else { return false }
            cur = nx
        }
        return cur.end
    }
}`,
  },
  content: {
    overview: `A trie (pronounced "try", from re-trie-val), or prefix tree, is a tree that stores a set of strings by their characters. Each edge is labeled with one character, and a path from the root spells out a prefix; nodes flagged as "end of word" mark where a complete stored string finishes. Strings that share a prefix share the same initial path, so "car", "card", and "cave" branch apart only where they start to differ.

The power of a trie is that insertion and lookup cost O(L), where L is the length of the word — completely independent of how many words are stored. That beats a hash set's need to hash the whole key and, unlike hashing, a trie also answers prefix queries ("does any word start with 'ca'?") directly, which is why tries drive autocomplete, spell-checkers, and IP routing tables. The cost is memory: each node may fan out to many children, so a trie can use more space than a compact hash set.`,
    howItWorks: [
      "Start with a root node that holds no character and an empty set of children.",
      "To insert a word, walk from the root following an edge per character, creating child nodes for characters that don't yet exist.",
      "Mark the final node as end-of-word so prefixes aren't mistaken for complete words.",
      "To search, follow the edges character by character; if any edge is missing the word is absent.",
      "A word is present only if the full path exists AND its last node is flagged end-of-word.",
    ],
    complexity: {
      time: { best: "O(L)", average: "O(L)", worst: "O(L)" },
      space: "O(total characters · alphabet)",
      notes: "Insert, search, and prefix queries are O(L) in the word length, independent of the number of stored words. Space can be large: up to O(N·L·Σ) in the naive array-per-node layout, reduced by hash-map children or compression (radix/Patricia tries).",
    },
    applications: [
      "autocomplete and type-ahead suggestions",
      "spell-checkers and dictionary lookups",
      "IP routing (longest-prefix match) and phone directories",
      "prefix-based search and word games (Boggle, Scrabble solvers)",
    ],
    advantages: [
      "O(L) insert/search independent of the number of keys",
      "Direct prefix queries and ordered iteration",
      "Common prefixes are stored once, sharing structure",
      "No hash collisions to resolve",
    ],
    disadvantages: [
      "High memory use, especially with array-per-node children",
      "Poor cache locality due to pointer chasing",
      "Overkill for small key sets versus a hash set",
      "Implementation is more involved than a hash table",
    ],
    commonMistakes: [
      "Forgetting the end-of-word flag, so prefixes falsely count as words.",
      "Confusing search (exact word) with startsWith (prefix only).",
      "Not handling the empty string or shared-prefix cases.",
      "Allocating a full alphabet array per node and wasting memory.",
    ],
    interviewQuestions: [
      "How does a trie differ from a hash set for word lookup, and when is each better?",
      "How do you implement autocomplete (all words with a given prefix) on a trie?",
      "How would you delete a word from a trie and prune empty nodes?",
      "What is a compressed/radix trie and why does it save space?",
      "How does longest-prefix matching in IP routing use a trie?",
    ],
    summary:
      "A trie stores strings character-by-character along tree edges, sharing common prefixes and flagging end-of-word nodes. Insert, search, and prefix queries all run in O(L) regardless of the number of keys, making tries ideal for autocomplete and dictionaries at the cost of extra memory.",
    quiz: [
      { question: "In a trie, each edge represents…", options: ["A whole word", "A single character", "A hash value", "A subtree"], answer: 1, explanation: "Paths of single-character edges spell out prefixes." },
      { question: "Searching for a word of length L takes…", options: ["O(1)", "O(L)", "O(N)", "O(N·L)"], answer: 1, explanation: "You follow one edge per character, independent of the number of words." },
      { question: "The end-of-word flag is needed to…", options: ["Save memory", "Distinguish stored words from mere prefixes", "Speed up hashing", "Balance the tree"], answer: 1, explanation: "Without it, a prefix like 'car' of 'card' could be mistaken for a stored word." },
      { question: "A key advantage of tries over hash sets is…", options: ["Less memory", "Efficient prefix / startsWith queries", "No traversal needed", "Guaranteed O(1) lookup"], answer: 1, explanation: "Tries answer prefix queries directly, which hashing cannot." },
      { question: "A common downside of tries is…", options: ["Slow lookups", "High memory consumption", "Hash collisions", "Inability to store strings"], answer: 1, explanation: "Many child pointers per node can consume significant memory." },
    ],
  },
  inputFields: [
    { key: "words", label: "Words to insert", placeholder: "cat, car, card, cave", help: "2–12 lowercase words (letters only, up to 12 letters each)." },
    { key: "search", label: "Word to search", placeholder: "card", help: "One lowercase word to look up (up to 12 letters)." },
  ],
  defaultInput: (level, rng) => randomInput(level, rng),
  parseInput: (fields) => {
    const words = (fields.words ?? "")
      .split(/[,\s]+/)
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);
    if (words.length < 2) throw new Error("Enter at least 2 words.");
    if (words.length > 12) throw new Error("Maximum 12 words.");
    for (const w of words) {
      if (!/^[a-z]+$/.test(w)) throw new Error(`"${w}" must contain only letters a–z.`);
      if (w.length > 12) throw new Error(`"${w}" is too long (max 12 letters).`);
    }
    const search = (fields.search ?? "").trim().toLowerCase();
    if (!/^[a-z]+$/.test(search)) throw new Error("Search word must contain only letters a–z.");
    if (search.length > 12) throw new Error("Search word is too long (max 12 letters).");
    return { words, search };
  },
  serializeInput: (input) => ({ words: input.words.join(", "), search: input.search }),
  generate,
};

export default mod;
