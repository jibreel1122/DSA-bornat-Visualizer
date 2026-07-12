import type { AlgorithmModule, CellState, Step, TreeFrame, TreeNodeF } from "@/lib/engine/types";

type Color = "red" | "black";
interface Node {
  id: string;
  value: number;
  color: Color;
  left: Node | null;
  right: Node | null;
  parent: Node | null;
}
type Input = { values: number[] };

function generate(input: Input): Step<TreeFrame>[] {
  let idc = 0;
  let root: Node | null = null;
  const steps: Step<TreeFrame>[] = [];
  let comparisons = 0;
  let rotations = 0;
  let recolors = 0;

  const isRed = (n: Node | null) => n?.color === "red";

  const toFrame = (states: Record<string, CellState>, description: string, codeLine: number, note: string, descriptionAr?: string): void => {
    const nodes: Record<string, TreeNodeF> = {};
    const walk = (n: Node | null) => {
      if (!n) return;
      nodes[n.id] = { id: n.id, value: n.value, left: n.left?.id ?? null, right: n.right?.id ?? null, color: n.color };
      walk(n.left);
      walk(n.right);
    };
    walk(root);
    // clear color when a highlight state applies so the state color shows
    for (const id of Object.keys(states)) if (nodes[id]) nodes[id].color = undefined;
    steps.push({
      frame: { nodes, rootId: root?.id ?? null, states: { ...states }, note },
      description,
      descriptionAr,
      codeLine,
      counters: { comparisons, rotations, recolors },
    });
  };

  const rotateLeft = (x: Node) => {
    const y = x.right!;
    x.right = y.left;
    if (y.left) y.left.parent = x;
    y.parent = x.parent;
    if (!x.parent) root = y;
    else if (x === x.parent.left) x.parent.left = y;
    else x.parent.right = y;
    y.left = x;
    x.parent = y;
    rotations++;
  };
  const rotateRight = (x: Node) => {
    const y = x.left!;
    x.left = y.right;
    if (y.right) y.right.parent = x;
    y.parent = x.parent;
    if (!x.parent) root = y;
    else if (x === x.parent.right) x.parent.right = y;
    else x.parent.left = y;
    y.right = x;
    x.parent = y;
    rotations++;
  };

  toFrame(
    {},
    `A red-black tree is a BST with colored nodes and 5 rules that keep it balanced: root is black, red nodes have black children, and every root-to-leaf path has the same number of black nodes.`,
    0,
    `empty red-black tree`,
    `الشجرة الحمراء-السوداء هي شجرة بحث ثنائية بعقد ملونة و5 قواعد تحافظ على توازنها: الجذر أسود، أبناء العقد الحمراء سوداء، ولكل مسار من الجذر إلى ورقة نفس عدد العقد السوداء.`,
  );

  const insert = (value: number) => {
    let z: Node = { id: `n${idc++}`, value, color: "red", left: null, right: null, parent: null };
    // BST insert
    let y: Node | null = null;
    let x: Node | null = root;
    while (x) {
      comparisons++;
      y = x;
      toFrame(
        { [x.id]: "compare" },
        `insert(${value}): ${value} ${value < x.value ? "<" : ">"} ${x.value}, go ${value < x.value ? "left" : "right"}.`,
        2,
        `insert ${value}`,
        `insert(${value}): ${value} ${value < x.value ? "<" : ">"} ${x.value}، اتجه ${value < x.value ? "يسارًا" : "يمينًا"}.`,
      );
      x = value < x.value ? x.left : x.right;
    }
    z.parent = y;
    if (!y) root = z;
    else if (value < y.value) y.left = z;
    else y.right = z;
    toFrame({ [z.id]: "active" }, `Insert ${value} as a RED leaf. Now fix any red-black violations.`, 3, `insert ${value}`, `أدرج ${value} كورقة حمراء. الآن أصلح أي مخالفات حمراء-سوداء.`);

    // Fixup
    while (isRed(z.parent)) {
      const parent = z.parent!;
      const grand = parent.parent!;
      if (parent === grand.left) {
        const uncle = grand.right;
        if (isRed(uncle)) {
          // Case 1: uncle red → recolor
          parent.color = "black";
          uncle!.color = "black";
          grand.color = "red";
          recolors++;
          toFrame(
            { [parent.id]: "special", [grand.id]: "special", [uncle!.id]: "special" },
            `Uncle is red → recolor parent & uncle black, grandparent red. Move up to grandparent.`,
            5,
            `recolor`,
            `العم أحمر ← أعِد تلوين الأب والعم أسودين، والجد أحمر. انتقل صعودًا إلى الجد.`,
          );
          z = grand;
        } else {
          if (z === parent.right) {
            // Case 2: triangle → rotate parent
            toFrame(
              { [parent.id]: "active" },
              `Uncle black, ${value} is an inner (LR) child → left-rotate the parent first.`,
              7,
              `rotate`,
              `العم أسود، ${value} ابن داخلي (LR) ← أجرِ دورانًا يساريًا للأب أولًا.`,
            );
            rotateLeft(parent);
            z = parent;
          }
          // Case 3: line → recolor + rotate grandparent
          z.parent!.color = "black";
          grand.color = "red";
          recolors++;
          toFrame(
            { [z.parent!.id]: "special", [grand.id]: "swap" },
            `Recolor parent black, grandparent red, then right-rotate the grandparent.`,
            8,
            `rotate`,
            `أعِد تلوين الأب أسود، والجد أحمر، ثم أجرِ دورانًا يمينيًا للجد.`,
          );
          rotateRight(grand);
        }
      } else {
        const uncle = grand.left;
        if (isRed(uncle)) {
          parent.color = "black";
          uncle!.color = "black";
          grand.color = "red";
          recolors++;
          toFrame(
            { [parent.id]: "special", [grand.id]: "special", [uncle!.id]: "special" },
            `Uncle is red → recolor parent & uncle black, grandparent red. Move up to grandparent.`,
            5,
            `recolor`,
            `العم أحمر ← أعِد تلوين الأب والعم أسودين، والجد أحمر. انتقل صعودًا إلى الجد.`,
          );
          z = grand;
        } else {
          if (z === parent.left) {
            toFrame(
              { [parent.id]: "active" },
              `Uncle black, ${value} is an inner (RL) child → right-rotate the parent first.`,
              7,
              `rotate`,
              `العم أسود، ${value} ابن داخلي (RL) ← أجرِ دورانًا يمينيًا للأب أولًا.`,
            );
            rotateRight(parent);
            z = parent;
          }
          z.parent!.color = "black";
          grand.color = "red";
          recolors++;
          toFrame(
            { [z.parent!.id]: "special", [grand.id]: "swap" },
            `Recolor parent black, grandparent red, then left-rotate the grandparent.`,
            8,
            `rotate`,
            `أعِد تلوين الأب أسود، والجد أحمر، ثم أجرِ دورانًا يساريًا للجد.`,
          );
          rotateLeft(grand);
        }
      }
    }
    if (root!.color !== "black") {
      root!.color = "black";
      recolors++;
    }
    toFrame({}, `Root is forced black. Red-black properties restored after inserting ${value}.`, 7, `balanced`, `يُجبَر الجذر على أن يكون أسود. استُعيدت خصائص الشجرة الحمراء-السوداء بعد إدراج ${value}.`);
  };

  for (const v of input.values) insert(v);

  const done: Record<string, CellState> = {};
  const markAll = (n: Node | null) => {
    if (!n) return;
    // keep colors visible in final frame (don't override) — use empty states
    markAll(n.left);
    markAll(n.right);
  };
  markAll(root);
  toFrame(
    done,
    `Done. The red-black tree stays balanced with height ≤ 2·log₂(n+1); all operations are O(log n).`,
    8,
    `final red-black tree`,
    `تم. تبقى الشجرة الحمراء-السوداء متوازنة بارتفاع ≤ 2·log₂(n+1)؛ كل العمليات O(log n).`,
  );
  return steps;
}

function randomInput(level: number, rng: { int: (a: number, b: number) => number; shuffle: <T>(a: readonly T[]) => T[] }): Input {
  const n = Math.min(7, 4 + level);
  if (level <= 2) return { values: Array.from({ length: n }, (_, k) => (k + 1) * 10) };
  return { values: rng.shuffle(Array.from({ length: n }, (_, k) => (k + 1) * 10)) };
}

const mod: AlgorithmModule<TreeFrame, Input> = {
  slug: "red-black-tree",
  title: "Red-Black Tree",
  titleAr: "الشجرة الحمراء-السوداء",
  category: "trees",
  difficulty: "Advanced",
  tags: ["tree", "self-balancing", "recoloring", "rotations"],
  tagsAr: ["شجرة", "ذاتية التوازن", "إعادة تلوين", "دورانات"],
  summary: "A self-balancing BST that uses node colors and 5 invariants to guarantee O(log n) operations with few rotations.",
  summaryAr: "شجرة بحث ثنائية ذاتية التوازن تستخدم ألوان العقد و5 ثوابت لضمان عمليات O(log n) بدورانات قليلة.",
  renderer: "tree",
  pseudocode: [
    "procedure insert(z)",
    "  BST-insert z as RED",
    "  while z.parent is RED:",
    "    if uncle is RED: recolor parent, uncle, grandparent; z = grandparent",
    "    else:",
    "      if z is an inner child: rotate parent",
    "      recolor parent black, grandparent red; rotate grandparent",
    "  color the root BLACK",
    "  return the balanced tree",
  ],
  code: {
    pseudocode: `insert z as RED; BST-insert
while z.parent is RED:
  uncle = sibling of z.parent
  if uncle RED: recolor(parent,uncle -> black; grandparent -> red); z = grandparent
  else: fix with 1-2 rotations + recolor
root.color = BLACK`,
    c: `void insertFixup(Node** root, Node* z){
    while(z->parent && z->parent->color==RED){
        Node* g=z->parent->parent;
        if(z->parent==g->left){
            Node* u=g->right;
            if(u && u->color==RED){ z->parent->color=BLACK; u->color=BLACK; g->color=RED; z=g; }
            else { if(z==z->parent->right){ z=z->parent; leftRotate(root,z); }
                   z->parent->color=BLACK; g->color=RED; rightRotate(root,g); }
        } else { /* mirror */ }
    }
    (*root)->color=BLACK;
}`,
    cpp: `void insertFixup(Node*& root, Node* z) {
    while (z->parent && z->parent->color == RED) {
        Node* g = z->parent->parent;
        if (z->parent == g->left) {
            Node* u = g->right;
            if (u && u->color == RED) { z->parent->color = BLACK; u->color = BLACK; g->color = RED; z = g; }
            else { if (z == z->parent->right) { z = z->parent; leftRotate(root, z); }
                   z->parent->color = BLACK; g->color = RED; rightRotate(root, g); }
        } else { /* mirror left<->right */ }
    }
    root->color = BLACK;
}`,
    java: `void insertFixup(Node z) {
    while (z.parent != null && z.parent.color == RED) {
        Node g = z.parent.parent;
        if (z.parent == g.left) {
            Node u = g.right;
            if (u != null && u.color == RED) { z.parent.color = BLACK; u.color = BLACK; g.color = RED; z = g; }
            else { if (z == z.parent.right) { z = z.parent; leftRotate(z); }
                   z.parent.color = BLACK; g.color = RED; rightRotate(g); }
        } else { /* mirror */ }
    }
    root.color = BLACK;
}`,
    python: `def insert_fixup(self, z):
    while z.parent and z.parent.color == RED:
        g = z.parent.parent
        if z.parent == g.left:
            u = g.right
            if u and u.color == RED:
                z.parent.color = BLACK; u.color = BLACK; g.color = RED; z = g
            else:
                if z == z.parent.right:
                    z = z.parent; self.left_rotate(z)
                z.parent.color = BLACK; g.color = RED; self.right_rotate(g)
        else:
            ...  # mirror image
    self.root.color = BLACK`,
    javascript: `function insertFixup(z) {
  while (z.parent && z.parent.color === "red") {
    const g = z.parent.parent;
    if (z.parent === g.left) {
      const u = g.right;
      if (u && u.color === "red") { z.parent.color = "black"; u.color = "black"; g.color = "red"; z = g; }
      else { if (z === z.parent.right) { z = z.parent; leftRotate(z); }
             z.parent.color = "black"; g.color = "red"; rightRotate(g); }
    } else { /* mirror */ }
  }
  root.color = "black";
}`,
    typescript: `function insertFixup(z: Node): void {
  while (z.parent && z.parent.color === "red") {
    const g = z.parent.parent!;
    if (z.parent === g.left) {
      const u = g.right;
      if (u && u.color === "red") { z.parent.color = "black"; u.color = "black"; g.color = "red"; z = g; }
      else { if (z === z.parent.right) { z = z.parent; leftRotate(z); }
             z.parent!.color = "black"; g.color = "red"; rightRotate(g); }
    } else { /* mirror */ }
  }
  root.color = "black";
}`,
    csharp: `void InsertFixup(Node z) {
    while (z.Parent != null && z.Parent.Color == RED) {
        Node g = z.Parent.Parent;
        if (z.Parent == g.Left) {
            Node u = g.Right;
            if (u != null && u.Color == RED) { z.Parent.Color = BLACK; u.Color = BLACK; g.Color = RED; z = g; }
            else { if (z == z.Parent.Right) { z = z.Parent; LeftRotate(z); }
                   z.Parent.Color = BLACK; g.Color = RED; RightRotate(g); }
        } else { /* mirror */ }
    }
    root.Color = BLACK;
}`,
    go: `func (t *RBTree) insertFixup(z *Node) {
	for z.parent != nil && z.parent.color == RED {
		g := z.parent.parent
		if z.parent == g.left {
			u := g.right
			if u != nil && u.color == RED {
				z.parent.color = BLACK; u.color = BLACK; g.color = RED; z = g
			} else {
				if z == z.parent.right { z = z.parent; t.leftRotate(z) }
				z.parent.color = BLACK; g.color = RED; t.rightRotate(g)
			}
		} else { /* mirror */ }
	}
	t.root.color = BLACK
}`,
    rust: `fn insert_fixup(&mut self, mut z: Link) {
    while color(parent(z)) == RED {
        let g = grandparent(z);
        if parent(z) == left(g) {
            let u = right(g);
            if color(u) == RED {
                set_color(parent(z), BLACK); set_color(u, BLACK);
                set_color(g, RED); z = g;
            } else {
                if z == right(parent(z)) { z = parent(z); self.left_rotate(z); }
                set_color(parent(z), BLACK); set_color(g, RED);
                self.right_rotate(g);
            }
        } else { /* mirror */ }
    }
    set_color(self.root, BLACK);
}`,
    kotlin: `fun insertFixup(z0: Node) {
    var z = z0
    while (z.parent != null && z.parent!!.color == RED) {
        val g = z.parent!!.parent!!
        if (z.parent == g.left) {
            val u = g.right
            if (u != null && u.color == RED) {
                z.parent!!.color = BLACK; u.color = BLACK; g.color = RED; z = g
            } else {
                if (z == z.parent!!.right) { z = z.parent!!; leftRotate(z) }
                z.parent!!.color = BLACK; g.color = RED; rightRotate(g)
            }
        } else { /* mirror */ }
    }
    root.color = BLACK
}`,
    swift: `func insertFixup(_ z0: Node) {
    var z = z0
    while let p = z.parent, p.color == .red {
        let g = p.parent!
        if p === g.left {
            let u = g.right
            if let u = u, u.color == .red {
                p.color = .black; u.color = .black; g.color = .red; z = g
            } else {
                if z === p.right { z = p; leftRotate(z) }
                z.parent!.color = .black; g.color = .red; rightRotate(g)
            }
        } else { /* mirror */ }
    }
    root.color = .black
}`,
  },
  content: {
    overview: `A red-black tree is a self-balancing binary search tree that tags each node with a color — red or black — and maintains five invariants that together guarantee the tree's height is at most 2·log₂(n+1). Because the balance guarantee is looser than an AVL tree's, red-black trees perform fewer rotations on insertion and deletion, which makes them the preferred choice for update-heavy ordered maps — they back Java's TreeMap, C++'s std::map, and the Linux kernel's scheduler.

The five rules are: (1) every node is red or black; (2) the root is black; (3) all null leaves are black; (4) a red node's children are both black (no two reds in a row); and (5) every path from a node down to its leaves contains the same number of black nodes. New nodes are inserted red, which can only violate rule 4 (a red node with a red parent). A fixup procedure then repairs the tree using two tools: recoloring (when the "uncle" node is red, push the redness up) and rotations (when the uncle is black, rotate and recolor to rebalance). At most two rotations are ever needed per insertion.`,
    howItWorks: [
      "Insert the new key as an ordinary BST leaf and color it red.",
      "If its parent is black, the tree is still valid — done.",
      "If the parent is red and the uncle is red, recolor parent and uncle black and grandparent red, then repeat from the grandparent.",
      "If the parent is red and the uncle is black, rotate (once for a line, twice for a triangle) and recolor to fix the double-red.",
      "Finally, force the root to be black.",
    ],
    complexity: {
      time: { best: "O(log n)", average: "O(log n)", worst: "O(log n)" },
      space: "O(n)",
      notes: "Height is bounded by 2·log₂(n+1), so search/insert/delete are O(log n). Insertion needs at most 2 rotations and O(log n) recolorings; deletion at most 3 rotations. Fewer rotations than AVL, at the cost of slightly taller trees.",
    },
    applications: [
      "ordered maps/sets in standard libraries (std::map, TreeMap)",
      "the Linux kernel's Completely Fair Scheduler and virtual memory areas",
      "associative containers needing balanced updates",
      "any ordered structure with frequent insertions and deletions",
    ],
    advantages: [
      "Guaranteed O(log n) operations with few rotations",
      "Cheaper inserts/deletes than AVL (rotation-light)",
      "Widely used and battle-tested in system libraries",
      "Supports ordered traversal and range queries",
    ],
    disadvantages: [
      "Slightly taller (less balanced) than AVL → marginally slower lookups",
      "Complex insertion and especially deletion fixup logic",
      "Per-node color bit of extra storage",
      "Harder to implement correctly than a plain BST",
    ],
    commonMistakes: [
      "Forgetting to recolor the root black at the end.",
      "Mishandling the triangle (inner-child) case that needs two rotations.",
      "Treating null leaves as red, breaking the black-height rule.",
      "Confusing the left/right mirror cases in the fixup.",
    ],
    interviewQuestions: [
      "State the five red-black invariants and why they bound the height.",
      "When does insertion recolor versus rotate, and how many rotations at most?",
      "Why are red-black trees preferred over AVL for update-heavy workloads?",
      "How does the black-height property guarantee O(log n)?",
      "How do red-black trees relate to 2-3-4 trees?",
    ],
    summary:
      "A red-black tree keeps a BST balanced with node colors and five invariants, bounding height to 2·log₂(n+1). Inserts fix double-red violations by recoloring (red uncle) or rotating (black uncle), using at most two rotations — fewer than AVL, making red-black trees ideal for update-heavy ordered maps.",
    quiz: [
      { question: "A newly inserted red-black node is colored…", options: ["Black", "Red", "Either", "Uncolored"], answer: 1, explanation: "Inserting red can only violate the no-two-reds rule, which is easiest to fix." },
      { question: "Which rule bounds the height logarithmically?", options: ["Root is black", "Equal black-height on every root-to-leaf path", "Nodes are red or black", "Leaves are null"], answer: 1, explanation: "Uniform black-height plus no-two-reds keeps height ≤ 2·log₂(n+1)." },
      { question: "When the parent and uncle are both red, you…", options: ["Rotate twice", "Recolor and move up to the grandparent", "Delete the node", "Do nothing"], answer: 1, explanation: "Recoloring pushes the potential violation upward." },
      { question: "Insertion needs at most how many rotations?", options: ["Zero", "One", "Two", "log n"], answer: 2, explanation: "The triangle case uses two rotations; the line case one." },
      { question: "Compared with AVL trees, red-black trees…", options: ["Are more balanced", "Use fewer rotations on updates", "Have no colors", "Are always faster to search"], answer: 1, explanation: "Looser balance means fewer rotations, favoring frequent updates." },
    ],
  },
  contentAr: {
    overview: `الشجرة الحمراء-السوداء هي شجرة بحث ثنائية ذاتية التوازن تُلصق بكل عقدة لونًا — أحمر أو أسود — وتحافظ على خمسة ثوابت تضمن معًا ألا يتجاوز ارتفاع الشجرة 2·log₂(n+1). ولأن ضمان التوازن أقل صرامة من شجرة AVL، تُجري الأشجار الحمراء-السوداء دورانات أقل عند الإدراج والحذف، مما يجعلها الخيار المفضل للخرائط المرتبة كثيفة التحديث — وهي تشغّل TreeMap في جافا، وstd::map في ++C، وجدولة نواة لينكس.

القواعد الخمس هي: (1) كل عقدة حمراء أو سوداء؛ (2) الجذر أسود؛ (3) كل الأوراق الفارغة سوداء؛ (4) أبناء العقدة الحمراء كلاهما أسود (لا حمراوين متتاليتين)؛ و(5) كل مسار من عقدة إلى أوراقها يحتوي نفس عدد العقد السوداء. تُدرَج العقد الجديدة حمراء، وهذا لا يمكن أن يخالف إلا القاعدة 4 (عقدة حمراء بأب أحمر). ثم يُصلح إجراء إصلاح الشجرة باستخدام أداتين: إعادة التلوين (عندما تكون عقدة "العم" حمراء، ادفع الحُمرة صعودًا) والدورانات (عندما يكون العم أسود، أدر وأعِد التلوين لإعادة التوازن). لا يُحتاج أبدًا إلى أكثر من دورانين لكل إدراج.`,
    howItWorks: [
      "أدرج المفتاح الجديد كورقة عادية في شجرة بحث ثنائية ولوّنه أحمر.",
      "إذا كان أبوه أسود، فالشجرة لا تزال صالحة — انتهى.",
      "إذا كان الأب أحمر والعم أحمر، أعِد تلوين الأب والعم أسودين والجد أحمر، ثم كرر من الجد.",
      "إذا كان الأب أحمر والعم أسود، أدر (مرة واحدة لحالة الخط، مرتين لحالة المثلث) وأعِد التلوين لإصلاح الازدواج الأحمر.",
      "أخيرًا، اجبر الجذر على أن يكون أسود.",
    ],
    complexity: {
      time: { best: "O(log n)", average: "O(log n)", worst: "O(log n)" },
      space: "O(n)",
      notes: "الارتفاع محدود بـ2·log₂(n+1)، لذا البحث/الإدراج/الحذف O(log n). يحتاج الإدراج على الأكثر دورانين وO(log n) من إعادة التلوين؛ ويحتاج الحذف على الأكثر 3 دورانات. دورانات أقل من AVL، مقابل أشجار أطول قليلًا.",
    },
    applications: [
      "الخرائط/المجموعات المرتبة في المكتبات القياسية (std::map، TreeMap)",
      "جدولة CFS العادلة تمامًا ومناطق الذاكرة الافتراضية في نواة لينكس",
      "الحاويات الترابطية التي تحتاج تحديثات متوازنة",
      "أي بنية مرتبة بإدراجات وحذوفات متكررة",
    ],
    advantages: [
      "عمليات مضمونة O(log n) بدورانات قليلة",
      "إدراج/حذف أرخص من AVL (خفيفة الدوران)",
      "مستخدمة على نطاق واسع ومُختبرة في مكتبات النظام",
      "تدعم الاجتياز المرتب واستعلامات المجال",
    ],
    disadvantages: [
      "أطول قليلًا (أقل توازنًا) من AVL ← بحث أبطأ قليلًا",
      "منطق إصلاح الإدراج، وخاصة الحذف، معقد",
      "بت لون إضافي لكل عقدة",
      "أصعب في التطبيق الصحيح من شجرة بحث ثنائية عادية",
    ],
    commonMistakes: [
      "نسيان إعادة تلوين الجذر أسود في النهاية.",
      "سوء معالجة حالة المثلث (الابن الداخلي) التي تحتاج دورانين.",
      "معاملة الأوراق الفارغة كحمراء، مما يكسر قاعدة الارتفاع الأسود.",
      "الخلط بين حالتي المرآة اليسرى/اليمنى في الإصلاح.",
    ],
    interviewQuestions: [
      "اذكر الثوابت الحمراء-السوداء الخمسة ولماذا تحد الارتفاع.",
      "متى يعيد الإدراج التلوين مقابل الدوران، وكم دورانًا على الأكثر؟",
      "لماذا تُفضَّل الأشجار الحمراء-السوداء على AVL لأحمال العمل كثيفة التحديث؟",
      "كيف تضمن خاصية الارتفاع الأسود O(log n)؟",
      "كيف ترتبط الأشجار الحمراء-السوداء بأشجار 2-3-4؟",
    ],
    summary:
      "الشجرة الحمراء-السوداء تحافظ على توازن شجرة بحث ثنائية بألوان العقد وخمسة ثوابت، محددة الارتفاع بـ2·log₂(n+1). الإدراجات تُصلح مخالفات الازدواج الأحمر بإعادة التلوين (عم أحمر) أو الدوران (عم أسود)، مستخدمة دورانين على الأكثر — أقل من AVL، مما يجعل الأشجار الحمراء-السوداء مثالية للخرائط المرتبة كثيفة التحديث.",
    quiz: [
      { question: "العقدة المُدرجة حديثًا في شجرة حمراء-سوداء تُلوَّن…", options: ["أسود", "أحمر", "أي منهما", "بلا لون"], answer: 1, explanation: "الإدراج بالأحمر لا يمكن أن يخالف إلا قاعدة عدم وجود حمراوين متتاليتين، وهي الأسهل إصلاحًا." },
      { question: "أي قاعدة تحد الارتفاع لوغاريتميًا؟", options: ["الجذر أسود", "ارتفاع أسود متساوٍ في كل مسار من الجذر إلى ورقة", "العقد حمراء أو سوداء", "الأوراق فارغة"], answer: 1, explanation: "الارتفاع الأسود الموحد مع عدم وجود حمراوين متتاليتين يبقي الارتفاع ≤ 2·log₂(n+1)." },
      { question: "عندما يكون الأب والعم كلاهما أحمر، فإنك…", options: ["تدور مرتين", "تعيد التلوين وتنتقل صعودًا إلى الجد", "تحذف العقدة", "لا تفعل شيئًا"], answer: 1, explanation: "إعادة التلوين تدفع المخالفة المحتملة صعودًا." },
      { question: "الإدراج يحتاج على الأكثر كم دورانًا؟", options: ["صفر", "واحد", "اثنين", "log n"], answer: 2, explanation: "حالة المثلث تستخدم دورانين؛ وحالة الخط دورانًا واحدًا." },
      { question: "مقارنة بأشجار AVL، الأشجار الحمراء-السوداء…", options: ["أكثر توازنًا", "تستخدم دورانات أقل عند التحديث", "بلا ألوان", "دائمًا أسرع في البحث"], answer: 1, explanation: "التوازن الأقل صرامة يعني دورانات أقل، مما يفضّل التحديثات المتكررة." },
    ],
  },
  inputFields: [
    { key: "values", label: "Values to insert", placeholder: "10, 20, 30, 40, 50", help: "2–20 distinct numbers, inserted in order." },
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
    if (values.length < 2) throw new Error("Enter at least 2 values.");
    if (values.length > 20) throw new Error("Maximum 20 values.");
    if (new Set(values).size !== values.length) throw new Error("Values must be distinct.");
    return { values };
  },
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate,
};

export default mod;
