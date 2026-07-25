import type { AlgorithmModule, CellState, Step, TreeFrame, TreeNodeF } from "@/lib/engine/types";

const T = 2; // minimum degree → up to 2T-1 = 3 keys, 2T = 4 children (a 2-3-4 tree)
const MAX_KEYS = 2 * T - 1;

interface BNode {
  id: string;
  keys: number[];
  children: BNode[];
  leaf: boolean;
}
type Input = { values: number[] };

function generate(input: Input): Step<TreeFrame>[] {
  let idc = 0;
  const mk = (leaf: boolean): BNode => ({ id: `b${idc++}`, keys: [], children: [], leaf });
  let root: BNode = mk(true);
  const steps: Step<TreeFrame>[] = [];
  let splits = 0;
  let inserts = 0;

  const toFrame = (states: Record<string, CellState>, description: string, codeLine: number, note: string, descriptionAr?: string, transformation?: Step<TreeFrame>["transformation"]): void => {
    const nodes: Record<string, TreeNodeF> = {};
    const walk = (n: BNode) => {
      nodes[n.id] = {
        id: n.id,
        value: n.keys.join(" | "),
        children: n.children.map((c) => c.id),
      };
      n.children.forEach(walk);
    };
    walk(root);
    steps.push({
      frame: { nodes, rootId: root.id, states: { ...states }, note },
      description,
      descriptionAr,
      codeLine,
      counters: { inserts, splits },
      transformation,
    });
  };

  toFrame(
    { [root.id]: "active" },
    `A B-tree keeps keys sorted inside nodes that hold up to ${MAX_KEYS} keys (min degree t=${T}). Full children are split before we descend, so the tree grows upward and stays balanced.`,
    0,
    `empty B-tree (t=${T})`,
    `شجرة B تُبقي المفاتيح مرتبة داخل عقد تحمل حتى ${MAX_KEYS} مفتاح (الدرجة الدنيا t=${T}). الأبناء الممتلئون يُقسَّمون قبل أن ننزل إليهم، لذا تنمو الشجرة صعودًا وتبقى متوازنة.`,
  );

  const splitChild = (parent: BNode, i: number) => {
    const child = parent.children[i];
    const z = mk(child.leaf);
    const mid = T - 1;
    const originalKeys = [...child.keys];
    const originalChildren = [...child.children];
    const upKey = originalKeys[mid];
    toFrame(
      { [parent.id]: "special", [child.id]: "swap" },
      `Child [${originalKeys.join(", ")}] is full. Pause before splitting it: median ${upKey} must move to the parent.`,
      6,
      "split: detect full child",
      `العقدة الابنة [${originalKeys.join(", ")}] ممتلئة. توقّف قبل تقسيمها: يجب أن ينتقل الوسيط ${upKey} إلى الأب.`,
      { kind: "rebuild", label: "Detect full B-tree child" },
    );

    // Attach the empty right sibling first so the learner can see where the
    // values and subtrees will travel, rather than jumping directly to a
    // completed split.
    parent.children.splice(i + 1, 0, z);
    toFrame(
      { [parent.id]: "special", [child.id]: "swap", [z.id]: "active" },
      `Create an empty right sibling beside [${originalKeys.join(", ")}]. The median ${upKey} is still waiting to move upward.`,
      6,
      "split: create right sibling",
      `أنشئ شقيقًا أيمن فارغًا بجانب [${originalKeys.join(", ")}]. لا يزال الوسيط ${upKey} بانتظار انتقاله إلى الأعلى.`,
      { kind: "rebuild", label: "Create B-tree split sibling" },
    );

    z.keys = originalKeys.slice(mid + 1);
    child.keys = originalKeys.slice(0, mid);
    toFrame(
      { [child.id]: "swap", [z.id]: "active" },
      `Move keys right of ${upKey} into the new sibling: left [${child.keys.join(", ")}], right [${z.keys.join(", ")}].`,
      6,
      "split: move right keys",
      `انقل المفاتيح الواقعة يمين ${upKey} إلى الشقيق الجديد: اليسار [${child.keys.join(", ")}], واليمين [${z.keys.join(", ")}].`,
      { kind: "rebuild", label: "Move B-tree split keys" },
    );
    if (!child.leaf) {
      z.children = originalChildren.slice(T);
      child.children = originalChildren.slice(0, T);
      toFrame(
        { [child.id]: "swap", [z.id]: "active" },
        `Move the ${z.children.length} right-side subtree link${z.children.length === 1 ? "" : "s"} with the keys they contain.`,
        6,
        "split: move right subtrees",
        `انقل رابط الشجرة الفرعية الأيمن وعدده ${z.children.length} مع المفاتيح التي يحتويها.`,
        { kind: "rebuild", label: "Move B-tree split subtrees" },
      );
    }
    parent.keys.splice(i, 0, upKey);
    splits++;
    toFrame(
      { [parent.id]: "special", [child.id]: "swap", [z.id]: "found" },
      `Promote median ${upKey} to the parent. The split is complete and both children can now be explored independently.`,
      6,
      `split`,
      `قسّم العقدة الممتلئة [${[...child.keys, upKey, ...z.keys].join(", ")}]: ادفع الوسيط ${upKey} صعودًا إلى الأب، واحتفظ بالباقي في عقدتين.`,
      { kind: "rebuild", label: "Split full B-tree node" },
    );
  };

  const insertNonFull = (node: BNode, k: number) => {
    let i = node.keys.length - 1;
    if (node.leaf) {
      while (i >= 0 && k < node.keys[i]) i--;
      node.keys.splice(i + 1, 0, k);
      toFrame({ [node.id]: "found" }, `Insert ${k} into leaf → [${node.keys.join(", ")}].`, 5, `insert ${k}`, `أدرج ${k} في الورقة ← [${node.keys.join(", ")}].`);
    } else {
      while (i >= 0 && k < node.keys[i]) i--;
      i++;
      toFrame(
        { [node.id]: "compare", [node.children[i].id]: "active" },
        `${k}: descend into child ${i + 1} of node [${node.keys.join(", ")}].`,
        6,
        `insert ${k}`,
        `${k}: انزل إلى الابن ${i + 1} من العقدة [${node.keys.join(", ")}].`,
      );
      if (node.children[i].keys.length === MAX_KEYS) {
        splitChild(node, i);
        if (k > node.keys[i]) i++;
      }
      insertNonFull(node.children[i], k);
    }
  };

  const insert = (k: number) => {
    inserts++;
    if (root.keys.length === MAX_KEYS) {
      const s = mk(false);
      s.children = [root];
      root = s;
      toFrame({ [s.id]: "active" }, `Root is full — grow the tree: make a new empty root above the old one, then split.`, 2, `insert ${k}`, `الجذر ممتلئ — نمِّ الشجرة: أنشئ جذرًا فارغًا جديدًا فوق القديم، ثم قسّم.`, { kind: "rebuild", label: "Grow B-tree root" });
      splitChild(s, 0);
      insertNonFull(s, k);
    } else {
      insertNonFull(root, k);
    }
  };

  for (const v of input.values) insert(v);

  const done: Record<string, CellState> = {};
  const markAll = (n: BNode) => {
    done[n.id] = "found";
    n.children.forEach(markAll);
  };
  markAll(root);
  const height = (() => {
    let h = 1;
    let n = root;
    while (!n.leaf) {
      h++;
      n = n.children[0];
    }
    return h;
  })();
  toFrame(
    done,
    `Done. All keys inserted; the B-tree has height ${height} and every leaf is at the same depth — searches are O(log n).`,
    7,
    `final B-tree`,
    `تم. أُدرجت كل المفاتيح؛ ارتفاع شجرة B هو ${height} وكل ورقة في نفس العمق — البحث O(log n).`,
  );
  return steps;
}

function randomInput(level: number, rng: { shuffle: <T>(a: readonly T[]) => T[] }): Input {
  const n = Math.min(10, 5 + level);
  return { values: rng.shuffle(Array.from({ length: n }, (_, k) => (k + 1) * 5)) };
}

const mod: AlgorithmModule<TreeFrame, Input> = {
  slug: "b-tree",
  title: "B-Tree",
  titleAr: "شجرة B",
  category: "trees",
  difficulty: "Advanced",
  tags: ["tree", "balanced", "multiway", "database index"],
  tagsAr: ["شجرة", "متوازنة", "متعددة الطرق", "فهرس قاعدة بيانات"],
  summary: "A balanced multiway search tree where nodes hold many keys and split when full, keeping all leaves at the same depth.",
  summaryAr: "شجرة بحث متعددة الطرق متوازنة تحمل عقدها مفاتيح كثيرة وتنقسم عند الامتلاء، مبقية كل الأوراق في نفس العمق.",
  renderer: "tree",
  pseudocode: [
    "procedure insert(key)",
    "  if root is full:",
    "    grow a new root and split the old root",
    "  insertNonFull(root, key)",
    "procedure insertNonFull(node, key)",
    "  if node is a leaf: put key in sorted order",
    "  else: find child; if child full: splitChild; descend",
    "  // every leaf remains at the same depth",
  ],
  code: {
    pseudocode: `insert(key):
  if len(root.keys) == 2t-1: newRoot; splitChild(newRoot,0)
  insertNonFull(root, key)
insertNonFull(node, key):
  if leaf: insert key sorted
  else: i = child index; if full: splitChild(node,i); descend`,
    c: `void insertNonFull(Node* x, int k) {
    int i = x->n - 1;
    if (x->leaf) {
        while (i >= 0 && k < x->keys[i]) { x->keys[i+1] = x->keys[i]; i--; }
        x->keys[i+1] = k; x->n++;
    } else {
        while (i >= 0 && k < x->keys[i]) i--;
        i++;
        if (x->child[i]->n == 2*T-1) { splitChild(x, i); if (k > x->keys[i]) i++; }
        insertNonFull(x->child[i], k);
    }
}`,
    cpp: `void insertNonFull(Node* x, int k) {
    int i = x->keys.size() - 1;
    if (x->leaf) {
        x->keys.push_back(0);
        while (i >= 0 && k < x->keys[i]) { x->keys[i+1] = x->keys[i]; i--; }
        x->keys[i+1] = k;
    } else {
        while (i >= 0 && k < x->keys[i]) i--;
        i++;
        if (x->child[i]->keys.size() == 2*T-1) { splitChild(x, i); if (k > x->keys[i]) i++; }
        insertNonFull(x->child[i], k);
    }
}`,
    java: `void insertNonFull(Node x, int k) {
    int i = x.n - 1;
    if (x.leaf) {
        while (i >= 0 && k < x.keys[i]) { x.keys[i+1] = x.keys[i]; i--; }
        x.keys[i+1] = k; x.n++;
    } else {
        while (i >= 0 && k < x.keys[i]) i--;
        i++;
        if (x.child[i].n == 2*T-1) { splitChild(x, i); if (k > x.keys[i]) i++; }
        insertNonFull(x.child[i], k);
    }
}`,
    python: `def insert_non_full(x, k):
    i = len(x.keys) - 1
    if x.leaf:
        x.keys.append(0)
        while i >= 0 and k < x.keys[i]:
            x.keys[i+1] = x.keys[i]; i -= 1
        x.keys[i+1] = k
    else:
        while i >= 0 and k < x.keys[i]: i -= 1
        i += 1
        if len(x.child[i].keys) == 2*T - 1:
            split_child(x, i)
            if k > x.keys[i]: i += 1
        insert_non_full(x.child[i], k)`,
    javascript: `function insertNonFull(x, k) {
  let i = x.keys.length - 1;
  if (x.leaf) {
    while (i >= 0 && k < x.keys[i]) i--;
    x.keys.splice(i + 1, 0, k);
  } else {
    while (i >= 0 && k < x.keys[i]) i--;
    i++;
    if (x.child[i].keys.length === 2 * T - 1) { splitChild(x, i); if (k > x.keys[i]) i++; }
    insertNonFull(x.child[i], k);
  }
}`,
    typescript: `function insertNonFull(x: Node, k: number): void {
  let i = x.keys.length - 1;
  if (x.leaf) {
    while (i >= 0 && k < x.keys[i]) i--;
    x.keys.splice(i + 1, 0, k);
  } else {
    while (i >= 0 && k < x.keys[i]) i--;
    i++;
    if (x.child[i].keys.length === 2 * T - 1) { splitChild(x, i); if (k > x.keys[i]) i++; }
    insertNonFull(x.child[i], k);
  }
}`,
    csharp: `void InsertNonFull(Node x, int k) {
    int i = x.N - 1;
    if (x.Leaf) {
        while (i >= 0 && k < x.Keys[i]) { x.Keys[i+1] = x.Keys[i]; i--; }
        x.Keys[i+1] = k; x.N++;
    } else {
        while (i >= 0 && k < x.Keys[i]) i--;
        i++;
        if (x.Child[i].N == 2*T-1) { SplitChild(x, i); if (k > x.Keys[i]) i++; }
        InsertNonFull(x.Child[i], k);
    }
}`,
    go: `func insertNonFull(x *Node, k int) {
	i := len(x.keys) - 1
	if x.leaf {
		x.keys = append(x.keys, 0)
		for i >= 0 && k < x.keys[i] { x.keys[i+1] = x.keys[i]; i-- }
		x.keys[i+1] = k
	} else {
		for i >= 0 && k < x.keys[i] { i-- }
		i++
		if len(x.child[i].keys) == 2*T-1 { splitChild(x, i); if k > x.keys[i] { i++ } }
		insertNonFull(x.child[i], k)
	}
}`,
    rust: `fn insert_non_full(x: &mut Node, k: i32) {
    let mut i = x.keys.len() as i32 - 1;
    if x.leaf {
        while i >= 0 && k < x.keys[i as usize] { i -= 1; }
        x.keys.insert((i + 1) as usize, k);
    } else {
        while i >= 0 && k < x.keys[i as usize] { i -= 1; }
        let mut ci = (i + 1) as usize;
        if x.child[ci].keys.len() == 2 * T - 1 {
            split_child(x, ci);
            if k > x.keys[ci] { ci += 1; }
        }
        insert_non_full(&mut x.child[ci], k);
    }
}`,
    kotlin: `fun insertNonFull(x: Node, k: Int) {
    var i = x.keys.size - 1
    if (x.leaf) {
        while (i >= 0 && k < x.keys[i]) i--
        x.keys.add(i + 1, k)
    } else {
        while (i >= 0 && k < x.keys[i]) i--
        i++
        if (x.child[i].keys.size == 2 * T - 1) { splitChild(x, i); if (k > x.keys[i]) i++ }
        insertNonFull(x.child[i], k)
    }
}`,
    swift: `func insertNonFull(_ x: Node, _ k: Int) {
    var i = x.keys.count - 1
    if x.leaf {
        while i >= 0 && k < x.keys[i] { i -= 1 }
        x.keys.insert(k, at: i + 1)
    } else {
        while i >= 0 && k < x.keys[i] { i -= 1 }
        i += 1
        if x.child[i].keys.count == 2 * T - 1 { splitChild(x, i); if k > x.keys[i] { i += 1 } }
        insertNonFull(x.child[i], k)
    }
}`,
  },
  content: {
    overview: `A B-tree is a balanced search tree generalized so that each node can hold many keys and have many children, rather than just one key and two children. It is the workhorse of databases and file systems: because a single node can be sized to match a disk block or memory page, a B-tree of height 3–4 can index millions of records with only a handful of disk reads. Every leaf sits at exactly the same depth, so performance is uniform.

A B-tree of minimum degree t requires each non-root node to hold between t−1 and 2t−1 keys (this visualization uses t=2, a "2-3-4 tree" with 1–3 keys per node). Keys within a node stay sorted, and a node with k keys has k+1 children whose key ranges interleave with the keys. Insertion uses a clever proactive strategy: while descending toward the correct leaf, any full child (2t−1 keys) encountered is split first — its median key moves up into the parent and the node divides into two. This keeps every node on the path non-full, so a single downward pass suffices and the tree grows in height only by splitting the root. All operations are O(log n) with a very small base.`,
    howItWorks: [
      "Each node holds up to 2t−1 sorted keys and up to 2t children; all leaves are at the same depth.",
      "To insert, if the root is full, create a new root and split the old one — this is the only way height increases.",
      "Descend toward the target leaf; before entering a full child, split it, pushing its median key up.",
      "Because splits happen on the way down, the leaf you reach is guaranteed non-full.",
      "Insert the key into that leaf in sorted position.",
    ],
    complexity: {
      time: { best: "O(log n)", average: "O(log n)", worst: "O(log n)" },
      space: "O(n)",
      notes: "Height is O(log_t n), so search/insert/delete are O(t·log_t n) comparisons — very shallow for large t. B-trees minimize disk/page accesses, which is why databases and filesystems use them (and the B+ tree variant).",
    },
    applications: [
      "database indexes (B-tree and B+ tree)",
      "filesystem metadata (NTFS, HFS+, ext4, Btrfs)",
      "key-value stores and on-disk ordered maps",
      "any large ordered index kept on block storage",
    ],
    advantages: [
      "Very shallow height → few disk/page accesses",
      "Node size tunable to the storage block size",
      "All leaves at equal depth → uniform performance",
      "Efficient range scans and ordered iteration",
    ],
    disadvantages: [
      "More complex than a binary BST to implement",
      "Nodes may be partially full, wasting some space",
      "In-memory it can be slower than a binary balanced tree",
      "Deletion with rebalancing (merge/borrow) is intricate",
    ],
    commonMistakes: [
      "Splitting reactively after overflow instead of proactively on the way down.",
      "Forgetting that only a root split increases the tree's height.",
      "Miscomputing the median index when splitting (t−1).",
      "Allowing a node to exceed 2t−1 keys before splitting.",
    ],
    interviewQuestions: [
      "Why are B-trees preferred over binary search trees for on-disk indexes?",
      "What is the minimum degree t and how does it bound keys per node?",
      "Why split full nodes proactively during a top-down insert?",
      "How does a B+ tree differ from a B-tree?",
      "How does node size relate to the disk block size?",
    ],
    summary:
      "A B-tree is a balanced multiway search tree whose nodes hold up to 2t−1 sorted keys and split when full, keeping all leaves at equal depth and the height O(log_t n). By matching node size to a disk block, B-trees (and B+ trees) minimize I/O and underpin databases and filesystems.",
    quiz: [
      { question: "A B-tree node can hold…", options: ["Exactly one key", "Up to 2t−1 sorted keys", "Only two keys", "Unlimited keys"], answer: 1, explanation: "Minimum degree t allows between t−1 and 2t−1 keys per node." },
      { question: "In a B-tree, all leaves are…", options: ["At random depths", "At the same depth", "Always empty", "Colored"], answer: 1, explanation: "Balanced growth keeps every leaf at equal depth." },
      { question: "During top-down insertion, a full child is…", options: ["Left alone", "Split before descending into it", "Deleted", "Merged"], answer: 1, explanation: "Proactive splitting keeps the path non-full for a single pass." },
      { question: "A B-tree's height increases only when…", options: ["Any node splits", "The root splits", "A leaf fills", "A key is deleted"], answer: 1, explanation: "Splitting the root adds a level; other splits don't." },
      { question: "B-trees are favored for disk storage because…", options: ["They are binary", "Their shallow height minimizes block/disk accesses", "They need no balancing", "They store no keys"], answer: 1, explanation: "High fan-out means very few I/O operations per lookup." },
    ],
  },
  contentAr: {
    overview: `شجرة B هي شجرة بحث متوازنة معمَّمة بحيث تستطيع كل عقدة أن تحمل مفاتيح كثيرة وأن يكون لها أبناء كثيرون، بدلًا من مفتاح واحد وابنين فقط. إنها العمود الفقري لقواعد البيانات وأنظمة الملفات: ولأن العقدة الواحدة يمكن أن تُحجَّم لتطابق كتلة قرص أو صفحة ذاكرة، فإن شجرة B بارتفاع 3–4 يمكنها فهرسة ملايين السجلات بقراءات قرص قليلة جدًا. كل ورقة تقع في نفس العمق بالضبط، لذا الأداء موحد.

شجرة B ذات الدرجة الدنيا t تتطلب أن تحمل كل عقدة غير جذرية بين t−1 و2t−1 مفتاحًا (يستخدم هذا التصور t=2، وهي "شجرة 2-3-4" بـ1–3 مفاتيح لكل عقدة). المفاتيح داخل العقدة تبقى مرتبة، والعقدة ذات k مفتاح لها k+1 ابن تتشابك مجالات مفاتيحهم مع المفاتيح. الإدراج يستخدم استراتيجية استباقية ذكية: أثناء النزول نحو الورقة الصحيحة، أي ابن ممتلئ (2t−1 مفتاح) يُصادَف يُقسَّم أولًا — مفتاحه الوسيط ينتقل صعودًا إلى الأب وتنقسم العقدة إلى اثنتين. هذا يبقي كل عقدة على المسار غير ممتلئة، لذا يكفي مرور واحد نازل وتنمو الشجرة ارتفاعًا فقط بتقسيم الجذر. كل العمليات O(log n) بأساس صغير جدًا.`,
    howItWorks: [
      "كل عقدة تحمل حتى 2t−1 مفتاحًا مرتبًا وحتى 2t ابن؛ كل الأوراق في نفس العمق.",
      "للإدراج، إذا كان الجذر ممتلئًا، أنشئ جذرًا جديدًا وقسّم القديم — هذه هي الطريقة الوحيدة لزيادة الارتفاع.",
      "انزل نحو الورقة الهدف؛ قبل الدخول إلى ابن ممتلئ، قسّمه، دافعًا مفتاحه الوسيط صعودًا.",
      "لأن الانقسامات تحدث أثناء النزول، فإن الورقة التي تصلها مضمونة غير ممتلئة.",
      "أدرج المفتاح في تلك الورقة في موضعه المرتب.",
    ],
    complexity: {
      time: { best: "O(log n)", average: "O(log n)", worst: "O(log n)" },
      space: "O(n)",
      notes: "الارتفاع O(log_t n)، لذا البحث/الإدراج/الحذف يحتاج O(t·log_t n) مقارنة — ضحل جدًا لـt كبيرة. أشجار B تقلل عمليات الوصول للقرص/الصفحة، وهذا سبب استخدام قواعد البيانات وأنظمة الملفات لها (ومتغير شجرة +B).",
    },
    applications: [
      "فهارس قواعد البيانات (شجرة B وشجرة +B)",
      "بيانات نظام الملفات الوصفية (NTFS، HFS+، ext4، Btrfs)",
      "مخازن المفتاح-القيمة والخرائط المرتبة على القرص",
      "أي فهرس مرتب كبير محفوظ على تخزين بالكتل",
    ],
    advantages: [
      "ارتفاع ضحل جدًا ← وصول قليل للقرص/الصفحة",
      "حجم العقدة قابل للضبط وفق حجم كتلة التخزين",
      "كل الأوراق في نفس العمق ← أداء موحد",
      "مسح مجالات فعال واجتياز مرتب",
    ],
    disadvantages: [
      "أعقد من شجرة بحث ثنائية في التطبيق",
      "قد تكون العقد ممتلئة جزئيًا، مهدرة بعض المساحة",
      "في الذاكرة قد تكون أبطأ من شجرة ثنائية متوازنة",
      "الحذف مع إعادة التوازن (الدمج/الاستعارة) معقد",
    ],
    commonMistakes: [
      "التقسيم بردة فعل بعد الفيضان بدلًا من الاستباق أثناء النزول.",
      "نسيان أن تقسيم الجذر فقط هو ما يزيد ارتفاع الشجرة.",
      "خطأ في حساب فهرس الوسيط عند التقسيم (t−1).",
      "السماح لعقدة بتجاوز 2t−1 مفتاحًا قبل التقسيم.",
    ],
    interviewQuestions: [
      "لماذا تُفضَّل أشجار B على أشجار البحث الثنائية للفهارس على القرص؟",
      "ما الدرجة الدنيا t وكيف تحد عدد المفاتيح لكل عقدة؟",
      "لماذا تُقسَّم العقد الممتلئة استباقيًا أثناء الإدراج من الأعلى إلى الأسفل؟",
      "كيف تختلف شجرة +B عن شجرة B؟",
      "كيف يرتبط حجم العقدة بحجم كتلة القرص؟",
    ],
    summary:
      "شجرة B هي شجرة بحث متعددة الطرق متوازنة تحمل عقدها حتى 2t−1 مفتاحًا مرتبًا وتنقسم عند الامتلاء، مبقية كل الأوراق في نفس العمق والارتفاع O(log_t n). بمطابقة حجم العقدة مع كتلة القرص، تقلل أشجار B (وأشجار +B) الإدخال/الإخراج وتدعم قواعد البيانات وأنظمة الملفات.",
    quiz: [
      { question: "عقدة شجرة B يمكن أن تحمل…", options: ["مفتاحًا واحدًا بالضبط", "حتى 2t−1 مفتاحًا مرتبًا", "مفتاحين فقط", "مفاتيح غير محدودة"], answer: 1, explanation: "الدرجة الدنيا t تسمح بين t−1 و2t−1 مفتاحًا لكل عقدة." },
      { question: "في شجرة B، كل الأوراق…", options: ["في أعماق عشوائية", "في نفس العمق", "فارغة دائمًا", "ملونة"], answer: 1, explanation: "النمو المتوازن يبقي كل ورقة في نفس العمق." },
      { question: "أثناء الإدراج من الأعلى إلى الأسفل، الابن الممتلئ…", options: ["يُترك كما هو", "يُقسَّم قبل النزول إليه", "يُحذف", "يُدمج"], answer: 1, explanation: "التقسيم الاستباقي يبقي المسار غير ممتلئ لمرور واحد." },
      { question: "ارتفاع شجرة B يزداد فقط عندما…", options: ["أي عقدة تنقسم", "الجذر ينقسم", "ورقة تمتلئ", "مفتاح يُحذف"], answer: 1, explanation: "تقسيم الجذر يضيف مستوى؛ الانقسامات الأخرى لا تفعل." },
      { question: "تُفضَّل أشجار B للتخزين على القرص لأن…", options: ["إنها ثنائية", "ارتفاعها الضحل يقلل الوصول للكتل/القرص", "لا تحتاج توازنًا", "لا تخزّن مفاتيح"], answer: 1, explanation: "التفرع العالي يعني عمليات إدخال/إخراج قليلة جدًا لكل بحث." },
    ],
  },
  inputFields: [
    { key: "values", label: "Keys to insert", placeholder: "10, 20, 5, 6, 12, 30, 7, 17", help: "3–30 distinct numbers, inserted in order (watch nodes split)." },
  ],
  defaultInput: (level, rng) => randomInput(level, rng),
  parseInput: (fields) => {
    const values = (fields.values ?? "")
      .split(/[,\s]+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const v = Number(p);
        if (!Number.isInteger(v)) throw new Error(`"${p}" is not a whole number.`);
        return v;
      });
    if (values.length < 3) throw new Error("Enter at least 3 keys.");
    if (values.length > 30) throw new Error("Maximum 30 keys.");
    if (new Set(values).size !== values.length) throw new Error("Keys must be distinct.");
    return { values };
  },
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate,
};

export default mod;
