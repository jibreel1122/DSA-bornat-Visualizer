import type { AlgorithmModule, AuxRow, CellState, Step, TreeFrame, TreeNodeF } from "@/lib/engine/types";

type Input = { text: string };

interface HNode {
  id: string;
  freq: number;
  ch?: string;
  left?: string;
  right?: string;
  order: number; // stable tie-breaker
}

function generate(input: Input): Step<TreeFrame>[] {
  const text = input.text;
  const freqMap = new Map<string, number>();
  for (const c of text) freqMap.set(c, (freqMap.get(c) ?? 0) + 1);

  const nodes = new Map<string, HNode>();
  let idc = 0;
  let order = 0;
  const steps: Step<TreeFrame>[] = [];
  let merges = 0;

  // leaves
  let forest: string[] = [];
  for (const [ch, freq] of [...freqMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const id = `n${idc++}`;
    nodes.set(id, { id, freq, ch, order: order++ });
    forest.push(id);
  }

  const codesOf = (root: string): Map<string, string> => {
    const codes = new Map<string, string>();
    const walk = (id: string, code: string) => {
      const n = nodes.get(id)!;
      if (n.ch !== undefined) {
        codes.set(n.ch, code || "0");
        return;
      }
      if (n.left) walk(n.left, code + "0");
      if (n.right) walk(n.right, code + "1");
    };
    walk(root, "");
    return codes;
  };

  const buildTreeNodes = (rootId: string, includeVirtual: boolean): Record<string, TreeNodeF> => {
    const out: Record<string, TreeNodeF> = {};
    const add = (id: string) => {
      const n = nodes.get(id)!;
      out[id] = {
        id,
        value: n.ch !== undefined ? n.ch : n.freq,
        left: n.left ?? null,
        right: n.right ?? null,
        extra: n.ch !== undefined ? String(n.freq) : undefined,
      };
      if (n.left) add(n.left);
      if (n.right) add(n.right);
    };
    if (includeVirtual) {
      const sorted = [...forest].sort((a, b) => nodes.get(a)!.freq - nodes.get(b)!.freq || nodes.get(a)!.order - nodes.get(b)!.order);
      out["PQ"] = { id: "PQ", value: "PQ", children: sorted };
      sorted.forEach(add);
    } else {
      add(rootId);
    }
    return out;
  };

  const frame = (states: Record<string, CellState>, description: string, codeLine: number, aux?: AuxRow[], finalRoot?: string): void => {
    const virtual = finalRoot === undefined;
    const treeNodes = buildTreeNodes(finalRoot ?? "", virtual);
    steps.push({
      frame: {
        nodes: treeNodes,
        rootId: virtual ? "PQ" : finalRoot!,
        states: { ...states },
        aux,
        note: virtual ? `PQ = current forest of trees (children of the "PQ" node), sorted by frequency` : `final Huffman tree — left edge = 0, right edge = 1`,
      },
      description,
      codeLine,
      counters: { merges },
    });
  };

  frame(
    Object.fromEntries(forest.map((id) => [id, "active" as CellState])),
    `Huffman coding of "${text}". Start with one leaf per character, holding its frequency, in a priority queue.`,
    1,
  );

  while (forest.length > 1) {
    forest.sort((a, b) => nodes.get(a)!.freq - nodes.get(b)!.freq || nodes.get(a)!.order - nodes.get(b)!.order);
    const aId = forest[0];
    const bId = forest[1];
    const a = nodes.get(aId)!;
    const b = nodes.get(bId)!;
    frame({ [aId]: "swap", [bId]: "swap" }, `Take the two smallest frequencies: ${label(a)}=${a.freq} and ${label(b)}=${b.freq}.`, 3);

    const id = `n${idc++}`;
    nodes.set(id, { id, freq: a.freq + b.freq, left: aId, right: bId, order: order++ });
    forest = forest.slice(2);
    forest.push(id);
    merges++;
    frame({ [id]: "found", [aId]: "visited", [bId]: "visited" }, `Merge them into a new node with frequency ${a.freq + b.freq}. Push it back into the queue.`, 4);
  }

  const rootId = forest[0];
  const codes = codesOf(rootId);
  const codeAux: AuxRow[] = [
    { label: "character", values: [...codes.keys()].map((c) => (c === " " ? "␣" : c)) },
    { label: "Huffman code", values: [...codes.values()] },
  ];
  const leafStates: Record<string, CellState> = {};
  for (const [id, n] of nodes) if (n.ch !== undefined) leafStates[id] = "found";
  frame(leafStates, `Done. Read left=0 / right=1 from the root to each leaf for its prefix-free code.`, 6, codeAux, rootId);
  return steps;
}

function label(n: HNode): string {
  return n.ch !== undefined ? `'${n.ch === " " ? "␣" : n.ch}'` : `(${n.freq})`;
}

const SAMPLES = ["abracadabra", "mississippi", "beekeeper", "tennessee", "abbcccdddd"];

function sampleInput(level: number): Input {
  return { text: SAMPLES[Math.min(level - 1, SAMPLES.length - 1)] };
}

const mod: AlgorithmModule<TreeFrame, Input> = {
  slug: "huffman-coding",
  title: "Huffman Coding",
  category: "greedy",
  difficulty: "Advanced",
  tags: ["greedy", "compression", "prefix code", "binary tree"],
  summary: "Builds an optimal prefix-free binary code by repeatedly merging the two lowest-frequency nodes into a tree.",
  renderer: "tree",
  pseudocode: [
    "procedure huffman(freqs)",
    "  pq = min-heap of leaf nodes by frequency",
    "  while pq has > 1 node:",
    "    a = pq.extractMin(); b = pq.extractMin()",
    "    merge = node(freq = a.freq + b.freq, left = a, right = b)",
    "    pq.insert(merge)",
    "  // codes: left edge = 0, right edge = 1",
    "  return pq.extractMin()  // root",
  ],
  code: {
    pseudocode: `pq = min-heap of leaves by frequency
while size(pq) > 1:
  a = extractMin(); b = extractMin()
  pq.insert(node(a.freq+b.freq, a, b))
root = extractMin()
# assign codes: left=0, right=1`,
    c: `Node* huffman(char* chars, int* freq, int n) {
    MinHeap* pq = buildHeap(chars, freq, n);
    while (pq->size > 1) {
        Node* a = extractMin(pq);
        Node* b = extractMin(pq);
        Node* m = newNode('$', a->freq + b->freq);
        m->left = a; m->right = b;
        insert(pq, m);
    }
    return extractMin(pq);
}`,
    cpp: `struct Node { int freq; char ch; Node *l=0, *r=0; };
Node* huffman(vector<pair<char,int>>& f) {
    auto cmp = [](Node* a, Node* b){ return a->freq > b->freq; };
    priority_queue<Node*, vector<Node*>, decltype(cmp)> pq(cmp);
    for (auto& [c, fr] : f) pq.push(new Node{fr, c});
    while (pq.size() > 1) {
        Node* a = pq.top(); pq.pop();
        Node* b = pq.top(); pq.pop();
        Node* m = new Node{a->freq + b->freq, '$', a, b};
        pq.push(m);
    }
    return pq.top();
}`,
    java: `Node huffman(char[] chars, int[] freq) {
    PriorityQueue<Node> pq = new PriorityQueue<>((a, b) -> a.freq - b.freq);
    for (int i = 0; i < chars.length; i++) pq.add(new Node(chars[i], freq[i]));
    while (pq.size() > 1) {
        Node a = pq.poll(), b = pq.poll();
        Node m = new Node('$', a.freq + b.freq);
        m.left = a; m.right = b;
        pq.add(m);
    }
    return pq.poll();
}`,
    python: `import heapq
def huffman(freq):
    pq = [[f, i, ch, None, None] for i, (ch, f) in enumerate(freq.items())]
    heapq.heapify(pq)
    k = len(pq)
    while len(pq) > 1:
        a = heapq.heappop(pq)
        b = heapq.heappop(pq)
        heapq.heappush(pq, [a[0] + b[0], k, None, a, b]); k += 1
    return pq[0]`,
    javascript: `function huffman(freq) {
  // freq: Map<char, number>; use a min-heap (array + sort here for brevity)
  let pq = [...freq].map(([ch, f]) => ({ freq: f, ch, left: null, right: null }));
  while (pq.length > 1) {
    pq.sort((a, b) => a.freq - b.freq);
    const a = pq.shift(), b = pq.shift();
    pq.push({ freq: a.freq + b.freq, ch: null, left: a, right: b });
  }
  return pq[0];
}`,
    typescript: `interface Node { freq: number; ch: string | null; left: Node | null; right: Node | null; }
function huffman(freq: Map<string, number>): Node {
  let pq: Node[] = [...freq].map(([ch, f]) => ({ freq: f, ch, left: null, right: null }));
  while (pq.length > 1) {
    pq.sort((a, b) => a.freq - b.freq);
    const a = pq.shift()!, b = pq.shift()!;
    pq.push({ freq: a.freq + b.freq, ch: null, left: a, right: b });
  }
  return pq[0];
}`,
    csharp: `Node Huffman(Dictionary<char,int> freq) {
    var pq = new SortedSet<Node>(Comparer<Node>.Create((a,b) =>
        a.Freq != b.Freq ? a.Freq - b.Freq : a.Id - b.Id));
    foreach (var kv in freq) pq.Add(new Node(kv.Key, kv.Value));
    while (pq.Count > 1) {
        var a = pq.Min; pq.Remove(a);
        var b = pq.Min; pq.Remove(b);
        pq.Add(new Node('$', a.Freq + b.Freq) { Left = a, Right = b });
    }
    return pq.Min;
}`,
    go: `func huffman(freq map[rune]int) *Node {
	pq := &NodeHeap{}
	for ch, f := range freq { heap.Push(pq, &Node{Freq: f, Ch: ch}) }
	for pq.Len() > 1 {
		a := heap.Pop(pq).(*Node)
		b := heap.Pop(pq).(*Node)
		heap.Push(pq, &Node{Freq: a.Freq + b.Freq, Left: a, Right: b})
	}
	return heap.Pop(pq).(*Node)
}`,
    rust: `use std::collections::BinaryHeap;
use std::cmp::Reverse;
fn huffman(freq: Vec<(char, i32)>) -> Box<Node> {
    let mut pq: BinaryHeap<Reverse<Box<Node>>> =
        freq.into_iter().map(|(c, f)| Reverse(Box::new(Node::leaf(c, f)))).collect();
    while pq.len() > 1 {
        let Reverse(a) = pq.pop().unwrap();
        let Reverse(b) = pq.pop().unwrap();
        pq.push(Reverse(Box::new(Node::merge(a, b))));
    }
    let Reverse(root) = pq.pop().unwrap();
    root
}`,
    kotlin: `fun huffman(freq: Map<Char, Int>): Node {
    val pq = PriorityQueue<Node>(compareBy { it.freq })
    freq.forEach { (c, f) -> pq.add(Node(f, c)) }
    while (pq.size > 1) {
        val a = pq.poll(); val b = pq.poll()
        pq.add(Node(a.freq + b.freq, null, a, b))
    }
    return pq.poll()
}`,
    swift: `func huffman(_ freq: [(Character, Int)]) -> Node {
    var pq = Heap<Node>(freq.map { Node(freq: $0.1, ch: $0.0) })  // min-heap by freq
    while pq.count > 1 {
        let a = pq.removeMin(), b = pq.removeMin()
        pq.insert(Node(freq: a.freq + b.freq, left: a, right: b))
    }
    return pq.removeMin()
}`,
  },
  content: {
    overview: `Huffman coding is a greedy algorithm that produces an optimal prefix-free binary code for compressing data. Instead of giving every character a fixed number of bits (as ASCII does), it assigns short codes to frequent characters and longer codes to rare ones, minimizing the total number of bits. "Prefix-free" means no code is a prefix of another, so the compressed stream decodes unambiguously without separators.

The algorithm builds a binary tree from the bottom up. Each character starts as a leaf weighted by its frequency, and all leaves go into a min-priority-queue. Repeatedly, the two lowest-frequency nodes are removed and merged under a new parent whose frequency is their sum; the parent goes back into the queue. After n−1 merges, one tree remains. Reading the path from the root to each leaf — left = 0, right = 1 — yields that character's code. The greedy "merge the two rarest" rule provably minimizes the expected code length, which is what makes Huffman codes optimal among prefix codes.`,
    howItWorks: [
      "Count the frequency of each symbol and make a leaf node for each.",
      "Insert all leaves into a min-heap keyed by frequency.",
      "Remove the two lowest-frequency nodes and merge them under a new internal node (freq = sum).",
      "Insert the merged node back into the heap; repeat until one node (the root) remains.",
      "Assign codes by walking the tree: append 0 going left, 1 going right, down to each leaf.",
    ],
    complexity: {
      time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)" },
      space: "O(n)",
      notes: "With a binary heap, each of the n−1 merges does O(log n) heap work → O(n log n). If frequencies are pre-sorted, two queues give O(n). Space is O(n) for the tree and heap.",
    },
    applications: [
      "file compression (DEFLATE/ZIP, gzip, PNG use Huffman)",
      "JPEG and MP3 entropy-coding stages",
      "fax and modem data encoding",
      "any variable-length prefix-code scheme",
    ],
    advantages: [
      "Produces provably optimal prefix codes for known frequencies",
      "Prefix-free codes decode unambiguously and instantly",
      "Simple, fast O(n log n) greedy construction",
      "Foundational to many real compression formats",
    ],
    disadvantages: [
      "Needs the frequency table (two passes or transmit the tree)",
      "Optimal only per-symbol; arithmetic coding can beat it",
      "Poor for tiny alphabets or near-uniform distributions",
      "Static Huffman doesn't adapt to changing data (adaptive variants exist)",
    ],
    commonMistakes: [
      "Producing codes that are not prefix-free (a decoding disaster).",
      "Breaking ties inconsistently, yielding a different (but still valid) tree.",
      "Forgetting to transmit or reconstruct the code table for decoding.",
      "Assigning shorter codes to rarer symbols by mistake.",
    ],
    interviewQuestions: [
      "Why does merging the two lowest-frequency nodes give an optimal code?",
      "What does 'prefix-free' mean and why is it essential for decoding?",
      "How can Huffman construction run in O(n) with sorted frequencies?",
      "How does arithmetic coding improve on Huffman?",
      "How would you build an adaptive Huffman code that updates as data streams?",
    ],
    summary:
      "Huffman coding greedily merges the two lowest-frequency nodes into a binary tree, yielding an optimal prefix-free code that gives frequent symbols shorter bit-strings. It runs in O(n log n) with a heap and underpins ZIP, JPEG, and MP3 compression.",
    quiz: [
      { question: "Huffman coding assigns shorter codes to…", options: ["Rare symbols", "Frequent symbols", "All symbols equally", "The first symbol"], answer: 1, explanation: "Frequent symbols get shorter codes to minimize total bits." },
      { question: "'Prefix-free' means…", options: ["Codes have no prefixes", "No code is a prefix of another", "All codes start with 0", "Codes are sorted"], answer: 1, explanation: "That property makes the encoded stream uniquely decodable." },
      { question: "Each step merges…", options: ["The two highest-frequency nodes", "The two lowest-frequency nodes", "Random nodes", "All nodes at once"], answer: 1, explanation: "The two rarest are combined under a new parent." },
      { question: "With a binary heap, construction takes…", options: ["O(n)", "O(n log n)", "O(n²)", "O(2^n)"], answer: 1, explanation: "n−1 merges each cost O(log n) heap operations." },
      { question: "Huffman codes are read from the tree by…", options: ["Level order", "Left=0, right=1 from root to leaf", "Random assignment", "Alphabetical order"], answer: 1, explanation: "The root-to-leaf path bits form each symbol's code." },
    ],
  },
  inputFields: [
    { key: "text", label: "Text to encode", placeholder: "abracadabra", help: "2–16 characters; frequencies are counted automatically." },
  ],
  defaultInput: (level) => sampleInput(level),
  parseInput: (fields) => {
    const text = (fields.text ?? "").trim();
    if (text.length < 2) throw new Error("Enter at least 2 characters.");
    if (text.length > 16) throw new Error("Keep the text to 16 characters or fewer.");
    if (new Set(text).size < 2) throw new Error("Use at least 2 distinct characters.");
    return { text };
  },
  serializeInput: (input) => ({ text: input.text }),
  generate,
};

export default mod;
