import type { AlgorithmModule, CellState, ListFrame, Step } from "@/lib/engine/types";

type Node = { id: string; value: number };
type Input = { values: number[]; insertHead: number; deleteValue: number };

function generate(input: Input): Step<ListFrame>[] {
  const steps: Step<ListFrame>[] = [];
  let idCounter = 0;
  const order: Node[] = [];
  let linkOps = 0;

  const links = () => {
    const out: { from: string; to: string; kind: "next" | "prev" }[] = [];
    for (let i = 0; i < order.length - 1; i++) {
      out.push({ from: order[i].id, to: order[i + 1].id, kind: "next" });
      out.push({ from: order[i + 1].id, to: order[i].id, kind: "prev" });
    }
    return out;
  };

  const frame = (states: Record<string, CellState>, description: string, codeLine: number, descriptionAr: string): void => {
    const head = order[0]?.id ?? null;
    const tail = order[order.length - 1]?.id ?? null;
    const pointers = [
      { nodeId: head, label: "head" },
      { nodeId: tail, label: "tail" },
    ];
    steps.push({
      frame: {
        nodes: order.map((n) => ({ ...n })),
        links: links(),
        pointers,
        states: { ...states },
        doubly: true,
        note: `doubly linked list — each node stores prev and next`,
      },
      description,
      descriptionAr,
      codeLine,
      counters: { nodes: order.length, linkOps },
    });
  };

  frame(
    {},
    `A doubly linked list starts empty. Every node keeps a prev and a next pointer.`,
    0,
    `تبدأ القائمة المترابطة المزدوجة فارغة. كل عقدة تحتفظ بمؤشرَي prev وnext.`,
  );

  // 1. Build by inserting at the tail.
  for (const v of input.values) {
    const node: Node = { id: `n${idCounter++}`, value: v };
    const prevTail = order[order.length - 1];
    order.push(node);
    linkOps += prevTail ? 2 : 0;
    frame(
      { [node.id]: "active", ...(prevTail ? { [prevTail.id]: "compare" } : {}) },
      prevTail
        ? `insertTail(${v}): link new node's prev → ${prevTail.value} and ${prevTail.value}.next → ${v}.`
        : `insertTail(${v}): list was empty, so ${v} becomes both head and tail.`,
      2,
      prevTail
        ? `insertTail(${v}): اربط prev للعقدة الجديدة → ${prevTail.value} و${prevTail.value}.next → ${v}.`
        : `insertTail(${v}): كانت القائمة فارغة، لذا تصبح ${v} الرأس والذيل معًا.`,
    );
  }

  // 2. Insert at the head.
  {
    const node: Node = { id: `n${idCounter++}`, value: input.insertHead };
    const oldHead = order[0];
    order.unshift(node);
    linkOps += oldHead ? 2 : 0;
    frame(
      { [node.id]: "active", ...(oldHead ? { [oldHead.id]: "compare" } : {}) },
      `insertHead(${input.insertHead}): new node's next → ${oldHead?.value}, ${oldHead?.value}.prev → ${input.insertHead}. It becomes the new head.`,
      4,
      `insertHead(${input.insertHead}): اجعل next للعقدة الجديدة → ${oldHead?.value}، و${oldHead?.value}.prev → ${input.insertHead}. تصبح هي الرأس الجديد.`,
    );
  }

  // 3. Delete a node by value (if present).
  {
    const idx = order.findIndex((n) => n.value === input.deleteValue);
    if (idx !== -1) {
      const target = order[idx];
      const before = order[idx - 1];
      const after = order[idx + 1];
      frame(
        { [target.id]: "swap", ...(before ? { [before.id]: "compare" } : {}), ...(after ? { [after.id]: "compare" } : {}) },
        `delete(${input.deleteValue}): found the node. Re-link ${before ? before.value : "null"} ↔ ${after ? after.value : "null"} to bypass it.`,
        6,
        `delete(${input.deleteValue}): تم العثور على العقدة. أعد ربط ${before ? before.value : "null"} ↔ ${after ? after.value : "null"} لتجاوزها.`,
      );
      order.splice(idx, 1);
      linkOps += (before ? 1 : 0) + (after ? 1 : 0);
      frame(
        { ...(before ? { [before.id]: "sorted" } : {}), ...(after ? { [after.id]: "sorted" } : {}) },
        `Node ${input.deleteValue} removed. Its neighbors now point directly to each other.`,
        7,
        `تمت إزالة العقدة ${input.deleteValue}. أصبح جاراها يشيران إلى بعضهما مباشرة.`,
      );
    }
  }

  // 4. Forward traversal highlight.
  for (let i = 0; i < order.length; i++) {
    const st: Record<string, CellState> = {};
    for (let k = 0; k <= i; k++) st[order[k].id] = "visited";
    st[order[i].id] = "active";
    frame(st, `Traverse forward via next pointers: visit ${order[i].value}.`, 7, `اجتياز أمامي عبر مؤشرات next: زيارة ${order[i].value}.`);
  }

  const done: Record<string, CellState> = {};
  order.forEach((n) => (done[n.id] = "found"));
  frame(
    done,
    `Final list: [${order.map((n) => n.value).join(" ⇄ ")}]. It can be walked forward or backward.`,
    8,
    `القائمة النهائية: [${order.map((n) => n.value).join(" ⇄ ")}]. يمكن اجتيازها للأمام أو للخلف.`,
  );
  return steps;
}

function randomInput(level: number, rng: { int: (a: number, b: number) => number }): Input {
  const n = Math.min(6, 3 + level);
  const values = Array.from({ length: n }, () => rng.int(10, 99));
  return { values, insertHead: rng.int(10, 99), deleteValue: values[Math.floor(n / 2)] };
}

const mod: AlgorithmModule<ListFrame, Input> = {
  slug: "doubly-linked-list",
  title: "Doubly Linked List",
  titleAr: "القائمة المترابطة المزدوجة",
  category: "linked-lists",
  difficulty: "Beginner",
  tags: ["linked list", "doubly linked", "pointers", "data structure"],
  tagsAr: ["قائمة مترابطة", "مزدوجة الارتباط", "مؤشرات", "هيكل بيانات"],
  summary: "Demonstrates a doubly linked list's core operations: insert at head/tail and delete, with two-way prev/next pointers.",
  summaryAr: "توضّح العمليات الأساسية للقائمة المترابطة المزدوجة: الإدراج عند الرأس/الذيل والحذف، باستخدام مؤشرَي prev وnext ثنائيَي الاتجاه.",
  renderer: "list",
  pseudocode: [
    "structure DoublyLinkedList",
    "  Node { value, prev, next }",
    "  insertTail(v): wire prev→oldTail, oldTail.next→new",
    "  insertHead(v): wire next→oldHead, oldHead.prev→new",
    "  delete(node):",
    "    node.prev.next = node.next",
    "    node.next.prev = node.prev",
    "  traverseForward(): follow next until null",
    "  traverseBackward(): follow prev until null",
  ],
  code: {
    pseudocode: `Node { value, prev, next }
insertTail(v): n.prev = tail; tail.next = n; tail = n
insertHead(v): n.next = head; head.prev = n; head = n
delete(n): n.prev.next = n.next; n.next.prev = n.prev`,
    c: `typedef struct Node { int val; struct Node *prev, *next; } Node;

void insertTail(Node** head, Node** tail, int v) {
    Node* n = malloc(sizeof(Node));
    n->val = v; n->next = NULL; n->prev = *tail;
    if (*tail) (*tail)->next = n; else *head = n;
    *tail = n;
}
void deleteNode(Node** head, Node** tail, Node* n) {
    if (n->prev) n->prev->next = n->next; else *head = n->next;
    if (n->next) n->next->prev = n->prev; else *tail = n->prev;
    free(n);
}`,
    cpp: `struct Node { int val; Node *prev = nullptr, *next = nullptr; };

void insertTail(Node*& head, Node*& tail, int v) {
    Node* n = new Node{v};
    n->prev = tail;
    if (tail) tail->next = n; else head = n;
    tail = n;
}
void erase(Node*& head, Node*& tail, Node* n) {
    if (n->prev) n->prev->next = n->next; else head = n->next;
    if (n->next) n->next->prev = n->prev; else tail = n->prev;
    delete n;
}`,
    java: `class Node { int val; Node prev, next; Node(int v){val=v;} }
class DLL {
    Node head, tail;
    void insertTail(int v) {
        Node n = new Node(v);
        n.prev = tail;
        if (tail != null) tail.next = n; else head = n;
        tail = n;
    }
    void delete(Node n) {
        if (n.prev != null) n.prev.next = n.next; else head = n.next;
        if (n.next != null) n.next.prev = n.prev; else tail = n.prev;
    }
}`,
    python: `class Node:
    def __init__(self, val):
        self.val, self.prev, self.next = val, None, None

class DLL:
    def __init__(self):
        self.head = self.tail = None
    def insert_tail(self, v):
        n = Node(v); n.prev = self.tail
        if self.tail: self.tail.next = n
        else: self.head = n
        self.tail = n
    def delete(self, n):
        if n.prev: n.prev.next = n.next
        else: self.head = n.next
        if n.next: n.next.prev = n.prev
        else: self.tail = n.prev`,
    javascript: `class Node { constructor(val){ this.val = val; this.prev = null; this.next = null; } }
class DLL {
  constructor(){ this.head = this.tail = null; }
  insertTail(v){
    const n = new Node(v); n.prev = this.tail;
    if (this.tail) this.tail.next = n; else this.head = n;
    this.tail = n;
  }
  delete(n){
    if (n.prev) n.prev.next = n.next; else this.head = n.next;
    if (n.next) n.next.prev = n.prev; else this.tail = n.prev;
  }
}`,
    typescript: `class Node { val: number; prev: Node | null = null; next: Node | null = null;
  constructor(v: number){ this.val = v; } }
class DLL {
  head: Node | null = null; tail: Node | null = null;
  insertTail(v: number){
    const n = new Node(v); n.prev = this.tail;
    if (this.tail) this.tail.next = n; else this.head = n;
    this.tail = n;
  }
  delete(n: Node){
    if (n.prev) n.prev.next = n.next; else this.head = n.next;
    if (n.next) n.next.prev = n.prev; else this.tail = n.prev;
  }
}`,
    csharp: `class Node { public int Val; public Node Prev, Next; public Node(int v){ Val = v; } }
class DLL {
    Node head, tail;
    public void InsertTail(int v) {
        var n = new Node(v){ Prev = tail };
        if (tail != null) tail.Next = n; else head = n;
        tail = n;
    }
    public void Delete(Node n) {
        if (n.Prev != null) n.Prev.Next = n.Next; else head = n.Next;
        if (n.Next != null) n.Next.Prev = n.Prev; else tail = n.Prev;
    }
}`,
    go: `type Node struct { Val int; Prev, Next *Node }
type DLL struct { Head, Tail *Node }

func (l *DLL) InsertTail(v int) {
	n := &Node{Val: v, Prev: l.Tail}
	if l.Tail != nil { l.Tail.Next = n } else { l.Head = n }
	l.Tail = n
}
func (l *DLL) Delete(n *Node) {
	if n.Prev != nil { n.Prev.Next = n.Next } else { l.Head = n.Next }
	if n.Next != nil { n.Next.Prev = n.Prev } else { l.Tail = n.Prev }
}`,
    rust: `use std::{rc::Rc, cell::RefCell};
type Link = Option<Rc<RefCell<Node>>>;
struct Node { val: i32, prev: Link, next: Link }
// insertTail: new.prev = tail; tail.next = new; tail = new
// delete(n): n.prev.next = n.next; n.next.prev = n.prev
// (Rc<RefCell<..>> models the shared, mutable two-way links.)`,
    kotlin: `class Node(val value: Int) { var prev: Node? = null; var next: Node? = null }
class DLL {
    var head: Node? = null; var tail: Node? = null
    fun insertTail(v: Int) {
        val n = Node(v); n.prev = tail
        if (tail != null) tail!!.next = n else head = n
        tail = n
    }
    fun delete(n: Node) {
        if (n.prev != null) n.prev!!.next = n.next else head = n.next
        if (n.next != null) n.next!!.prev = n.prev else tail = n.prev
    }
}`,
    swift: `final class Node { let value: Int; var prev: Node?; var next: Node?
    init(_ v: Int){ value = v } }
final class DLL {
    var head: Node?; var tail: Node?
    func insertTail(_ v: Int) {
        let n = Node(v); n.prev = tail
        if let t = tail { t.next = n } else { head = n }
        tail = n
    }
    func delete(_ n: Node) {
        if let p = n.prev { p.next = n.next } else { head = n.next }
        if let nx = n.next { nx.prev = n.prev } else { tail = n.prev }
    }
}`,
  },
  content: {
    overview: `A doubly linked list (DLL) is a linear structure in which every node holds a value plus two pointers: next (to its successor) and prev (to its predecessor). Because each node knows both neighbors, the list can be traversed in either direction, and a node can be removed in O(1) time once you have a reference to it — no need to walk from the head to find the previous node as in a singly linked list.

The trade-off is one extra pointer per node (more memory) and more links to maintain on every insertion and deletion. Head and tail references let you push and pop at both ends in constant time, which is why doubly linked lists back deques, LRU caches, and many editor/undo structures. The visualization builds a list by tail insertion, adds a node at the head, deletes a node by relinking its two neighbors, and then walks the list to show two-way traversal.`,
    howItWorks: [
      "Each node stores value, a prev pointer, and a next pointer; the list tracks head and tail.",
      "insertTail: point the new node's prev at the old tail, the old tail's next at the new node, then move tail.",
      "insertHead: point the new node's next at the old head, the old head's prev at the new node, then move head.",
      "delete(node): set node.prev.next = node.next and node.next.prev = node.prev (handling null ends).",
      "Traverse forward by following next until null, or backward by following prev until null.",
    ],
    complexity: {
      time: { best: "O(1) insert/delete at a known node", average: "O(n) search", worst: "O(n) search" },
      space: "O(n)",
      notes: "Insertion/deletion at the head, tail, or a known node is O(1). Finding an arbitrary node by value is still O(n). Each node carries one extra pointer versus a singly linked list.",
    },
    applications: [
      "deques (double-ended queues) with O(1) push/pop at both ends",
      "LRU cache eviction lists (move-to-front / remove in O(1))",
      "browser history and undo/redo stacks",
      "the internal structure of many language standard-library lists",
    ],
    advantages: [
      "Bidirectional traversal (forward and backward)",
      "O(1) deletion of a known node without a preceding-node search",
      "O(1) insert/remove at both ends with head and tail pointers",
      "Simplifies algorithms that must step backward",
    ],
    disadvantages: [
      "Extra memory for the second pointer per node",
      "More pointer updates per operation (easier to get wrong)",
      "Still O(n) to locate a node by value",
      "Poor cache locality compared to arrays",
    ],
    commonMistakes: [
      "Updating only next (or only prev) and leaving the reverse link stale.",
      "Forgetting to update head/tail when deleting the first/last node.",
      "Dereferencing prev or next of a boundary node without a null check.",
      "Losing the rest of the list by rewiring pointers in the wrong order.",
    ],
    interviewQuestions: [
      "How does deleting a known node differ between singly and doubly linked lists?",
      "How would you implement an LRU cache with a doubly linked list and a hash map?",
      "What are the edge cases when deleting the head or tail node?",
      "How does a DLL support an O(1) deque?",
      "What extra cost does the second pointer impose, and when is it worth it?",
    ],
    summary:
      "A doubly linked list gives every node prev and next pointers, enabling bidirectional traversal and O(1) deletion of a known node. It costs one extra pointer per node and more careful relinking, and it underlies deques, LRU caches, and undo histories.",
    quiz: [
      { question: "Each node in a doubly linked list stores…", options: ["Only a next pointer", "Value plus prev and next pointers", "Value plus an index", "Two values"], answer: 1, explanation: "Both a predecessor and successor pointer are kept." },
      { question: "Deleting a known node in a DLL is…", options: ["O(n)", "O(log n)", "O(1)", "O(n²)"], answer: 2, explanation: "With prev available, you relink neighbors directly in constant time." },
      { question: "The main cost over a singly linked list is…", options: ["Slower traversal", "An extra pointer (memory) per node", "It cannot be searched", "No tail access"], answer: 1, explanation: "Each node needs a second pointer, adding memory and update work." },
      { question: "When deleting the tail node you must also…", options: ["Reverse the list", "Update the tail reference to prev", "Rebuild all links", "Nothing"], answer: 1, explanation: "The tail pointer must move back to the previous node." },
      { question: "A doubly linked list is a natural fit for…", options: ["Binary search", "An LRU cache with O(1) removals", "Hashing", "Heap sort"], answer: 1, explanation: "O(1) node removal and reinsertion make LRU eviction efficient." },
    ],
  },
  contentAr: {
    overview: `القائمة المترابطة المزدوجة (DLL) هي هيكل خطي تحمل فيه كل عقدة قيمة بالإضافة إلى مؤشرين: next (إلى تاليها) وprev (إلى سابقتها). ولأن كل عقدة تعرف كلا جارَيها، يمكن اجتياز القائمة في أي من الاتجاهين، ويمكن حذف عقدة في زمن O(1) بمجرد الحصول على مرجع لها — دون الحاجة إلى السير من الرأس لإيجاد العقدة السابقة كما في القائمة المترابطة الأحادية.

المقابل هو مؤشر إضافي واحد لكل عقدة (ذاكرة أكبر) ومزيد من الروابط التي يجب صيانتها في كل إدراج وحذف. تتيح مراجع الرأس والذيل الدفع والسحب من كلا الطرفين في زمن ثابت، ولهذا تقوم القوائم المترابطة المزدوجة بدعم الطوابير ثنائية الاتجاه (deques) وذاكرات LRU المؤقتة والعديد من هياكل التحرير والتراجع. يبني هذا التصور القائمة عبر الإدراج عند الذيل، ثم يضيف عقدة عند الرأس، ثم يحذف عقدة بإعادة ربط جارَيها، ثم يجتاز القائمة لإظهار الاجتياز ثنائي الاتجاه.`,
    howItWorks: [
      "تخزّن كل عقدة القيمة ومؤشر prev ومؤشر next؛ وتتتبّع القائمة الرأس (head) والذيل (tail).",
      "insertTail: اجعل prev للعقدة الجديدة يشير إلى الذيل القديم، وnext للذيل القديم يشير إلى العقدة الجديدة، ثم حرّك tail.",
      "insertHead: اجعل next للعقدة الجديدة يشير إلى الرأس القديم، وprev للرأس القديم يشير إلى العقدة الجديدة، ثم حرّك head.",
      "delete(node): اضبط node.prev.next = node.next وnode.next.prev = node.prev (مع معالجة الأطراف الفارغة).",
      "اجتز للأمام باتباع next حتى null، أو للخلف باتباع prev حتى null.",
    ],
    complexity: {
      time: { best: "O(1) insert/delete at a known node", average: "O(n) search", worst: "O(n) search" },
      space: "O(n)",
      notes: "الإدراج والحذف عند الرأس أو الذيل أو عقدة معروفة يتم في زمن O(1). أما إيجاد عقدة عشوائية بالقيمة فيبقى O(n). تحمل كل عقدة مؤشرًا إضافيًا واحدًا مقارنة بالقائمة المترابطة الأحادية.",
    },
    applications: [
      "الطوابير ثنائية الاتجاه (deques) بدفع وسحب O(1) من كلا الطرفين",
      "قوائم إخلاء ذاكرة LRU المؤقتة (النقل إلى المقدمة / الإزالة في O(1))",
      "سجل تصفح المتصفح وأكوام التراجع/الإعادة",
      "البنية الداخلية للعديد من قوائم مكتبات اللغات القياسية",
    ],
    advantages: [
      "اجتياز ثنائي الاتجاه (للأمام وللخلف)",
      "حذف عقدة معروفة في O(1) دون البحث عن العقدة السابقة",
      "إدراج/إزالة O(1) عند كلا الطرفين بفضل مؤشرَي الرأس والذيل",
      "يبسّط الخوارزميات التي يجب أن تتحرك للخلف",
    ],
    disadvantages: [
      "ذاكرة إضافية للمؤشر الثاني في كل عقدة",
      "تحديثات مؤشرات أكثر في كل عملية (أسهل للخطأ)",
      "ما زال إيجاد عقدة بالقيمة يستغرق O(n)",
      "محلية ذاكرة تخزين مؤقت (cache) أضعف مقارنة بالمصفوفات",
    ],
    commonMistakes: [
      "تحديث next فقط (أو prev فقط) وترك الرابط المعاكس قديمًا.",
      "نسيان تحديث head/tail عند حذف العقدة الأولى/الأخيرة.",
      "الوصول إلى prev أو next لعقدة طرفية دون التحقق من القيمة الفارغة.",
      "فقدان بقية القائمة بإعادة توصيل المؤشرات بترتيب خاطئ.",
    ],
    interviewQuestions: [
      "كيف يختلف حذف عقدة معروفة بين القائمة المترابطة الأحادية والمزدوجة؟",
      "كيف تنفّذ ذاكرة LRU المؤقتة باستخدام قائمة مترابطة مزدوجة وجدول تجزئة؟",
      "ما هي الحالات الحدّية عند حذف عقدة الرأس أو الذيل؟",
      "كيف تدعم القائمة المترابطة المزدوجة طابورًا ثنائي الاتجاه بزمن O(1)؟",
      "ما التكلفة الإضافية التي يفرضها المؤشر الثاني، ومتى تستحق العناء؟",
    ],
    summary:
      "تمنح القائمة المترابطة المزدوجة كل عقدة مؤشرَي prev وnext، مما يتيح الاجتياز ثنائي الاتجاه وحذف عقدة معروفة في O(1). وهي تكلّف مؤشرًا إضافيًا لكل عقدة وإعادة ربط أكثر عناية، وتقوم عليها الطوابير ثنائية الاتجاه وذاكرات LRU وسجلات التراجع.",
    quiz: [
      { question: "ماذا تخزّن كل عقدة في القائمة المترابطة المزدوجة؟", options: ["مؤشر next فقط", "القيمة بالإضافة إلى مؤشرَي prev وnext", "القيمة بالإضافة إلى فهرس", "قيمتان"], answer: 1, explanation: "يُحتفظ بمؤشر للسابق وآخر للتالي معًا." },
      { question: "حذف عقدة معروفة في القائمة المترابطة المزدوجة يكون…", options: ["O(n)", "O(log n)", "O(1)", "O(n²)"], answer: 2, explanation: "بوجود prev، يمكن إعادة ربط الجارَين مباشرة في زمن ثابت." },
      { question: "التكلفة الأساسية مقارنة بالقائمة المترابطة الأحادية هي…", options: ["اجتياز أبطأ", "مؤشر إضافي (ذاكرة) لكل عقدة", "لا يمكن البحث فيها", "لا وصول إلى الذيل"], answer: 1, explanation: "تحتاج كل عقدة مؤشرًا ثانيًا، مما يضيف ذاكرة وعمل تحديث." },
      { question: "عند حذف عقدة الذيل يجب أيضًا…", options: ["عكس القائمة", "تحديث مؤشر الذيل ليشير إلى prev", "إعادة بناء كل الروابط", "لا شيء"], answer: 1, explanation: "يجب أن يتراجع مؤشر الذيل إلى العقدة السابقة." },
      { question: "القائمة المترابطة المزدوجة مناسبة بشكل طبيعي لـ…", options: ["البحث الثنائي", "ذاكرة LRU المؤقتة بإزالات O(1)", "التجزئة", "الترتيب الكومي"], answer: 1, explanation: "إزالة العقدة وإعادة إدراجها في O(1) تجعل إخلاء LRU فعّالًا." },
    ],
  },
  inputFields: [
    { key: "values", label: "Initial values (inserted at tail)", placeholder: "10, 20, 30, 40", help: "2–15 numbers." },
    { key: "insertHead", label: "Insert at head", placeholder: "5", help: "One value to prepend." },
    { key: "deleteValue", label: "Delete value", placeholder: "20", help: "A value to remove (if present)." },
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
    if (values.length < 2) throw new Error("Enter at least 2 initial values.");
    if (values.length > 15) throw new Error("Maximum 15 initial values.");
    const insertHead = Number((fields.insertHead ?? "").trim());
    if (!Number.isInteger(insertHead)) throw new Error("Insert-at-head must be a whole number.");
    const deleteValue = Number((fields.deleteValue ?? "").trim());
    if (!Number.isInteger(deleteValue)) throw new Error("Delete value must be a whole number.");
    return { values, insertHead, deleteValue };
  },
  serializeInput: (input) => ({
    values: input.values.join(", "),
    insertHead: String(input.insertHead),
    deleteValue: String(input.deleteValue),
  }),
  generate,
};

export default mod;
