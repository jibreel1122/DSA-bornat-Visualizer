import type { CellState, ListFrame, Step } from "@/lib/engine/types";
import { complexities, makeModule } from "./shared";

type ListOp =
  | { kind: "push-front" | "push-back"; value: number }
  | { kind: "delete" | "search"; value: number };
type ListInput = { ops: ListOp[] };

function parseOps(raw: string): ListOp[] {
  const tokens = raw.split(",").map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 24) throw new Error("Enter 1 to 24 operations.");
  return tokens.map((token) => {
    const match = /^(\^|\+|-|\?)(-?\d+)$/.exec(token.replace(/\s+/g, ""));
    if (!match) throw new Error(`Invalid operation "${token}". Use ^x, +x, -x, or ?x.`);
    const value = Number(match[2]);
    const kind = match[1] === "^" ? "push-front" : match[1] === "+" ? "push-back" : match[1] === "-" ? "delete" : "search";
    return { kind, value };
  });
}

function serializeOps(input: ListInput): Record<string, string> {
  const symbols: Record<ListOp["kind"], string> = {
    "push-front": "^",
    "push-back": "+",
    delete: "-",
    search: "?",
  };
  return { ops: input.ops.map((op) => `${symbols[op.kind]}${op.value}`).join(", ") };
}

function listGenerate(input: ListInput, circular: boolean): Step<ListFrame>[] {
  const values: { id: string; value: number }[] = [];
  const steps: Step<ListFrame>[] = [];
  let nextId = 0;
  const frame = (
    states: Record<string, CellState>,
    description: string,
    descriptionAr: string,
    pointers: ListFrame["pointers"] = [],
    phase = "inspect",
  ) => {
    const links: ListFrame["links"] = values.slice(0, -1).map((node, index) => ({ from: node.id, to: values[index + 1].id, kind: "next" }));
    if (circular && values.length > 0) links.push({ from: values.at(-1)!.id, to: values[0].id, kind: "loop" });
    steps.push({
      frame: {
        nodes: values.map((node) => ({ ...node })),
        links,
        pointers,
        states: { ...states },
        circular,
        note: circular ? "tail.next = head" : "tail.next = null",
      },
      description,
      descriptionAr,
      codeLine: phase === "insert" ? 1 : phase === "delete" ? 3 : 2,
      phase,
      why: "The visible links must match the pointer state before the next mutation.",
      whyAr: "يجب أن تطابق الروابط الظاهرة حالة المؤشرات قبل التغيير التالي.",
    });
  };

  frame({}, `Start with an empty ${circular ? "circular " : ""}singly linked list.`, `ابدأ بقائمة مترابطة أحادية ${circular ? "دائرية " : ""}فارغة.`);
  for (const op of input.ops) {
    if (op.kind === "push-front" || op.kind === "push-back") {
      const node = { id: `n${nextId++}`, value: op.value };
      const target = op.kind === "push-front" ? values[0] : values.at(-1);
      frame(
        target ? { [target.id]: "active" } : {},
        `Allocate ${op.value}; inspect the ${op.kind === "push-front" ? "head" : "tail"} link before insertion.`,
        `احجز عقدة للقيمة ${op.value} وافحص رابط ${op.kind === "push-front" ? "الرأس" : "الذيل"} قبل الإدراج.`,
        [{ nodeId: target?.id ?? null, label: op.kind === "push-front" ? "head" : "tail" }],
        "insert",
      );
      if (op.kind === "push-front") values.unshift(node);
      else values.push(node);
      frame(
        { [node.id]: "found" },
        `Link ${op.value} at the ${op.kind === "push-front" ? "front" : "back"}.`,
        `اربط ${op.value} في ${op.kind === "push-front" ? "البداية" : "النهاية"}.`,
        [
          { nodeId: values[0]?.id ?? null, label: "head" },
          { nodeId: values.at(-1)?.id ?? null, label: "tail" },
        ],
        "insert",
      );
    } else {
      let found = -1;
      for (let index = 0; index < values.length; index++) {
        frame(
          { [values[index].id]: "compare" },
          `Compare ${op.value} with node ${values[index].value}.`,
          `قارن ${op.value} مع العقدة ${values[index].value}.`,
          [{ nodeId: values[index].id, label: "current" }],
          op.kind,
        );
        if (values[index].value === op.value) {
          found = index;
          break;
        }
      }
      if (found < 0) {
        frame({}, `${op.value} is not present; no link changes.`, `القيمة ${op.value} غير موجودة؛ لا تتغير الروابط.`, [], op.kind);
      } else if (op.kind === "search") {
        frame({ [values[found].id]: "found" }, `Found ${op.value}.`, `عُثر على ${op.value}.`, [{ nodeId: values[found].id, label: "found" }], "search");
      } else {
        const removed = values[found];
        frame(
          { [removed.id]: "swap" },
          `Unlink ${removed.value}; its predecessor now bypasses it.`,
          `افصل ${removed.value}؛ سيتجاوزه رابط العقدة السابقة.`,
          [{ nodeId: removed.id, label: "delete" }],
          "delete",
        );
        values.splice(found, 1);
        frame(
          {},
          `Deletion complete; ${circular && values.length ? "the tail again points to the head" : "all remaining links are valid"}.`,
          `اكتمل الحذف؛ ${circular && values.length ? "عاد الذيل ليشير إلى الرأس" : "كل الروابط المتبقية صحيحة"}.`,
          [
            { nodeId: values[0]?.id ?? null, label: "head" },
            { nodeId: values.at(-1)?.id ?? null, label: "tail" },
          ],
          "delete",
        );
      }
    }
  }
  frame(Object.fromEntries(values.map((node) => [node.id, "sorted" as const])), "All requested list operations are complete.", "اكتملت كل عمليات القائمة.");
  return steps;
}

function listModule(circular: boolean) {
  return makeModule<ListFrame, ListInput>({
    slug: circular ? "circular-linked-list" : "singly-linked-list-operations",
    title: circular ? "Circular Linked List" : "Singly Linked List Operations",
    titleAr: circular ? "القائمة المترابطة الدائرية" : "عمليات القائمة المترابطة الأحادية",
    category: "linked-lists",
    difficulty: circular ? "Intermediate" : "Beginner",
    tags: ["linked list", "pointers", circular ? "circular" : "singly linked"],
    tagsAr: ["قائمة مترابطة", "مؤشرات", circular ? "دائرية" : "أحادية"],
    summary: circular
      ? "Maintains a singly linked cycle where the tail always links back to the head."
      : "Performs front/back insertion, search, and deletion with explicit pointer rewiring.",
    summaryAr: circular
      ? "تحافظ على حلقة مترابطة أحادية يشير فيها الذيل دائماً إلى الرأس."
      : "تنفذ الإدراج في البداية والنهاية والبحث والحذف مع إظهار تغيير المؤشرات.",
    renderer: "list",
    pseudocode: [
      "for each operation",
      "  insert: allocate node and change the adjacent next link",
      "  search: follow next links until key or end",
      "  delete: redirect predecessor.next around the target",
      circular ? "  maintain tail.next = head" : "  maintain tail.next = null",
    ],
    pseudocodeAr: [
      "لكل عملية",
      "  الإدراج: احجز عقدة وعدّل رابط next المجاور",
      "  البحث: اتبع روابط next حتى القيمة أو النهاية",
      "  الحذف: اجعل السابق يتجاوز العقدة الهدف",
      circular ? "  حافظ على tail.next = head" : "  حافظ على tail.next = null",
    ],
    overview: circular
      ? "A circular linked list has no null link at its tail: the final node points to the head, enabling cyclic traversal."
      : "A singly linked list stores each value in a node with one next pointer. Operations are correct only when every changed link is rewired in the proper order.",
    overviewAr: circular
      ? "لا تنتهي القائمة الدائرية برابط فارغ؛ فالعقدة الأخيرة تشير إلى الرأس، مما يسمح باجتياز دوري."
      : "تخزن القائمة الأحادية كل قيمة في عقدة لها مؤشر تالٍ واحد، وتصح العمليات فقط عند تعديل الروابط بالترتيب المناسب.",
    complexity: complexities.linear,
    applications: ["Dynamic sequences", "Adjacency lists", circular ? "Round-robin scheduling" : "Free lists"],
    applicationsAr: ["تسلسلات ديناميكية", "قوائم التجاور", circular ? "الجدولة الدورية" : "قوائم الذاكرة الحرة"],
    inputFields: [{
      key: "ops",
      label: "Operations",
      labelAr: "العمليات",
      placeholder: "^4, +7, +9, ?7, -4",
      help: "^x inserts front, +x inserts back, ?x searches, -x deletes.",
      helpAr: "^x إدراج في البداية، +x في النهاية، ?x بحث، -x حذف.",
    }],
    defaultInput: () => ({ ops: parseOps("^4, +7, +9, ?7, -4") }),
    parseInput: (fields) => ({ ops: parseOps(fields.ops ?? "") }),
    serializeInput: serializeOps,
    generate: (input) => listGenerate(input, circular),
  });
}

export const singlyLinkedListOperations = listModule(false);
export const circularLinkedList = listModule(true);
