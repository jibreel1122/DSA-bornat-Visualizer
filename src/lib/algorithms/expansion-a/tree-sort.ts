import type { AlgorithmModule, ArrayFrame, Step } from "@/lib/engine/types";
import { codeBundle, defaultValues, listFields, parseValues, pushArrayStep, serializeValues, standardLearning, type NumberListInput } from "./shared";

type Node = { value: number; count: number; left: Node | null; right: Node | null };
const pseudocode = [
  "procedure treeSort(a)",
  "  root = empty BST",
  "  for value in a: insert value into root",
  "    increment count when value equals a node",
  "  output = inorder(root)",
  "  copy output back to a",
  "  return a",
];

function generate(input: NumberListInput): Step<ArrayFrame>[] {
  const original = [...input.values];
  const a = [...original];
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;
  let writes = 0;
  let root: Node | null = null;
  const inorder = (node: Node | null, out: number[] = []): number[] => {
    if (!node) return out;
    inorder(node.left, out);
    for (let i = 0; i < node.count; i++) out.push(node.value);
    inorder(node.right, out);
    return out;
  };
  const snap = (text: string, ar: string, line: number, index?: number) =>
    pushArrayStep(steps, a, text, ar, line, { comparisons, writes }, index === undefined ? {} : { [index]: "active" }, {
      aux: [{ label: "BST inorder", values: inorder(root) }, { label: "Input order", values: original }],
    });
  snap("Insert every value into a binary search tree.", "أدخل كل قيمة في شجرة بحث ثنائية.", 0);
  for (let source = 0; source < original.length; source++) {
    const value = original[source];
    if (!root) {
      root = { value, count: 1, left: null, right: null };
      snap(`Create root ${value}.`, `أنشئ الجذر ${value}.`, 2, source);
      continue;
    }
    let node = root;
    while (true) {
      comparisons++;
      snap(`Compare inserted value ${value} with BST node ${node.value}.`, `قارن القيمة المدخلة ${value} مع عقدة الشجرة ${node.value}.`, 2, source);
      if (value === node.value) {
        node.count++;
        snap(`Duplicate ${value}: increment its node count.`, `القيمة ${value} مكررة: زد عداد عقدتها.`, 3, source);
        break;
      }
      const side = value < node.value ? "left" : "right";
      const next = node[side];
      if (!next) {
        node[side] = { value, count: 1, left: null, right: null };
        snap(`Attach ${value} as the ${side} child of ${node.value}.`, `اربط ${value} بوصفها الابن ${side === "left" ? "الأيسر" : "الأيمن"} للعقدة ${node.value}.`, 2, source);
        break;
      }
      node = next;
    }
  }
  const output = inorder(root);
  for (let i = 0; i < output.length; i++) {
    a[i] = output[i];
    writes++;
    snap(`In-order visit writes ${output[i]} to output index ${i}.`, `تكتب الزيارة بالترتيب القيمة ${output[i]} في فهرس الخرج ${i}.`, 4, i);
  }
  pushArrayStep(steps, a, "In-order traversal has produced sorted order.", "أنتج الاجتياز بالترتيب ترتيبًا تصاعديًا.", 6, { comparisons, writes }, Object.fromEntries(a.map((_, i) => [i, "sorted"])), { aux: [{ label: "BST inorder", values: output }] });
  return steps;
}

const learning = standardLearning({
  overview: "Tree sort inserts values into a binary search tree and emits them by in-order traversal. Duplicate counts preserve repeated values.",
  overviewAr: "يدخل ترتيب الشجرة القيم في شجرة بحث ثنائية ثم يخرجها باجتياز بالترتيب، وتحفظ العدادات القيم المكررة.",
  how: ["Insert each key by BST comparisons.", "Count duplicate keys at their node.", "Traverse left, node, right to emit sorted values."],
  howAr: ["أدخل كل مفتاح بمقارنات شجرة البحث.", "احسب المفاتيح المكررة في عقدتها.", "اجتز يسارًا ثم العقدة ثم يمينًا لإخراج القيم المرتبة."],
  complexity: { time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n²)" }, space: "O(n)" },
  invariant: "Every node's left subtree is smaller and its right subtree is larger.",
  invariantAr: "كل قيم الفرع الأيسر أصغر من العقدة وكل قيم الفرع الأيمن أكبر.",
  summary: "Tree sort converts BST ordering into a sorted array through in-order traversal.",
  summaryAr: "يحوّل ترتيب شجرة البحث إلى مصفوفة مرتبة باجتياز بالترتيب.",
});
const mod: AlgorithmModule<ArrayFrame, NumberListInput> = {
  slug: "tree-sort", title: "Tree Sort", titleAr: "ترتيب الشجرة", category: "sorting", difficulty: "Intermediate",
  tags: ["binary search tree", "in-order", "not in-place", "adaptive"], tagsAr: ["شجرة بحث ثنائية", "اجتياز بالترتيب", "ليس في المكان", "متكيف"],
  summary: "Builds a BST and emits its keys in order, including duplicate counts.",
  summaryAr: "يبني شجرة بحث ثنائية ويخرج مفاتيحها بالترتيب مع التكرارات.",
  renderer: "array", pseudocode, code: codeBundle("Tree Sort", pseudocode), ...learning,
  inputFields: listFields, defaultInput: defaultValues, parseInput: (fields) => parseValues(fields), serializeInput: serializeValues, generate,
};
export default mod;
