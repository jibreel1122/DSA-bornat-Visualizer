import type { AlgorithmModule, ArrayFrame, Level, RNG, Step } from "@/lib/engine/types";
import {
  arrayFrame,
  defaultNumbers,
  makeModule,
  numberFields,
  parseNumberInput,
  serializeNumberInput,
  step,
  type NumberInput,
} from "./shared";

type SortGenerator = (input: NumberInput) => Step<ArrayFrame>[];

type SortDefinition = {
  slug: string;
  title: string;
  titleAr: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  summary: string;
  summaryAr: string;
  pseudocode: string[];
  complexity: {
    time: { best: string; average: string; worst: string };
    space: string;
    notes?: string;
  };
  invariant: string;
  invariantAr: string;
  how: string[];
  howAr: string[];
  generate: SortGenerator;
  min?: number;
  max?: number;
  maxCount?: number;
  defaultInput?: (level: Level, rng: RNG) => NumberInput;
};

function sortingModule(definition: SortDefinition): AlgorithmModule<ArrayFrame, NumberInput> {
  return makeModule({
    ...definition,
    category: "sorting",
    tags: ["sorting", "step-by-step", definition.slug],
    tagsAr: ["ترتيب", "خطوة بخطوة", definition.titleAr],
    renderer: "array",
    inputFields: numberFields,
    defaultInput: definition.defaultInput
      ?? ((level, rng) => defaultNumbers(level, rng, {
        min: definition.min,
        max: definition.max,
        maxCount: definition.maxCount ?? 18,
      })),
    parseInput: (fields) => parseNumberInput(fields, {
      maxCount: definition.maxCount ?? 18,
      min: definition.min,
      max: definition.max,
    }),
    serializeInput: serializeNumberInput,
  });
}

function binaryInsertionSteps(input: NumberInput): Step<ArrayFrame>[] {
  const values = [...input.values];
  const steps: Step<ArrayFrame>[] = [];
  const counters = { comparisons: 0, writes: 0, insertions: 0 };
  steps.push(step(arrayFrame(values), "Start with the first one-element sorted prefix.", "ابدأ بأول بادئة مرتبة مكوّنة من عنصر واحد.", 0, counters, "initialize"));
  for (let i = 1; i < values.length; i++) {
    const key = values[i];
    let low = 0;
    let high = i;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      counters.comparisons++;
      steps.push(step(
        arrayFrame(values, { [i]: "active", [mid]: "compare" }, {
          range: { from: low, to: high - 1 },
          pointers: [{ index: mid, label: "mid" }, { index: i, label: "key" }],
        }),
        `Compare key ${key} with ${values[mid]} to locate its insertion boundary.`,
        `قارن المفتاح ${key} مع ${values[mid]} لتحديد موضع إدخاله.`,
        2,
        counters,
        "binary-search",
      ));
      if (values[mid] <= key) low = mid + 1;
      else high = mid;
    }
    for (let j = i; j > low; j--) {
      values[j] = values[j - 1];
      counters.writes++;
      steps.push(step(
        arrayFrame(values, { [j - 1]: "active", [j]: "swap" }),
        `Shift ${values[j]} one position right to open index ${low}.`,
        `حرّك ${values[j]} موضعاً واحداً إلى اليمين لفتح الموضع ${low}.`,
        4,
        counters,
        "shift",
      ));
    }
    values[low] = key;
    counters.writes++;
    counters.insertions++;
    steps.push(step(
      arrayFrame(values, { [low]: "found" }, { range: { from: 0, to: i } }),
      `Insert ${key} at index ${low}; indices 0..${i} are now sorted.`,
      `أدخل ${key} في الموضع ${low}؛ أصبحت الفهارس من 0 إلى ${i} مرتبة.`,
      5,
      counters,
      "insert",
    ));
  }
  steps.push(step(arrayFrame(values, Object.fromEntries(values.map((_, i) => [i, "sorted"]))), "Binary insertion sort is complete.", "اكتمل ترتيب الإدراج الثنائي.", 6, counters, "result"));
  return steps;
}

function stoogeSteps(input: NumberInput): Step<ArrayFrame>[] {
  const values = [...input.values];
  const steps: Step<ArrayFrame>[] = [];
  const counters = { comparisons: 0, swaps: 0, calls: 0 };
  const visit = (left: number, right: number, depth: number) => {
    counters.calls++;
    counters.comparisons++;
    steps.push(step(
      arrayFrame(values, { [left]: "compare", [right]: "compare" }, {
        range: { from: left, to: right },
        aux: [{ label: "Recursion", values: [left, right, depth] }],
      }),
      `Stooge-sort range [${left}, ${right}] and compare its endpoints.`,
      `رتّب مجال ستوج [${left}، ${right}] وقارن طرفيه.`,
      1,
      counters,
      "compare-endpoints",
    ));
    if (values[left] > values[right]) {
      [values[left], values[right]] = [values[right], values[left]];
      counters.swaps++;
      steps.push(step(
        arrayFrame(values, { [left]: "swap", [right]: "swap" }, { range: { from: left, to: right } }),
        `Swap endpoints so ${values[left]} precedes ${values[right]}.`,
        `بدّل الطرفين كي تسبق ${values[left]} القيمة ${values[right]}.`,
        2,
        counters,
        "swap",
      ));
    }
    const length = right - left + 1;
    if (length > 2) {
      const third = Math.floor(length / 3);
      visit(left, right - third, depth + 1);
      visit(left + third, right, depth + 1);
      visit(left, right - third, depth + 1);
    }
  };
  visit(0, values.length - 1, 0);
  steps.push(step(arrayFrame(values, Object.fromEntries(values.map((_, i) => [i, "sorted"]))), "All three recursive passes are complete.", "اكتملت التمريرات العودية الثلاث.", 6, counters, "result"));
  return steps;
}

function mergeSorted(left: number[], right: number[], counters: { comparisons: number; writes: number }): number[] {
  const merged: number[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    counters.comparisons++;
    merged.push(left[i] <= right[j] ? left[i++] : right[j++]);
    counters.writes++;
  }
  while (i < left.length) {
    merged.push(left[i++]);
    counters.writes++;
  }
  while (j < right.length) {
    merged.push(right[j++]);
    counters.writes++;
  }
  return merged;
}

function strandSteps(input: NumberInput): Step<ArrayFrame>[] {
  const remaining = [...input.values];
  let output: number[] = [];
  const steps: Step<ArrayFrame>[] = [];
  const counters = { comparisons: 0, extracted: 0, writes: 0 };
  while (remaining.length > 0) {
    const strand = [remaining.shift()!];
    counters.extracted++;
    for (let i = 0; i < remaining.length;) {
      counters.comparisons++;
      steps.push(step(
        arrayFrame([...output, ...strand, ...remaining], { [output.length + strand.length + i]: "compare" }, {
          aux: [{ label: "Output", values: output }, { label: "Current strand", values: strand }],
        }),
        `Compare ${remaining[i]} with strand tail ${strand.at(-1)}.`,
        `قارن ${remaining[i]} مع ذيل السلسلة ${strand.at(-1)}.`,
        2,
        counters,
        "scan",
      ));
      if (remaining[i] >= strand.at(-1)!) {
        strand.push(remaining.splice(i, 1)[0]);
        counters.extracted++;
        steps.push(step(
          arrayFrame([...output, ...strand, ...remaining], { [output.length + strand.length - 1]: "active" }, {
            aux: [{ label: "Output", values: output }, { label: "Current strand", values: strand }],
          }),
          `Extract ${strand.at(-1)} into the increasing strand.`,
          `استخرج ${strand.at(-1)} إلى السلسلة المتزايدة.`,
          3,
          counters,
          "extract",
        ));
      } else i++;
    }
    output = mergeSorted(output, strand, counters);
    steps.push(step(
      arrayFrame([...output, ...remaining], Object.fromEntries(output.map((_, i) => [i, "sorted"])), {
        aux: [{ label: "Merged output", values: output }, { label: "Remaining", values: remaining }],
      }),
      `Merge strand [${strand.join(", ")}] into the sorted output.`,
      `ادمج السلسلة [${strand.join("، ")}] في الناتج المرتب.`,
      5,
      counters,
      "merge",
      { transformation: { kind: "reorder", label: "Merge extracted strand" } },
    ));
  }
  steps.push(step(arrayFrame(output, Object.fromEntries(output.map((_, i) => [i, "sorted"]))), "No input remains; strand sort is complete.", "لم يتبقَّ أي عنصر؛ اكتمل ترتيب السلاسل.", 6, counters, "result"));
  return steps;
}

function patienceSteps(input: NumberInput): Step<ArrayFrame>[] {
  const piles: number[][] = [];
  const steps: Step<ArrayFrame>[] = [];
  const counters = { comparisons: 0, pushes: 0, pops: 0 };
  for (const value of input.values) {
    let left = 0;
    let right = piles.length;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      counters.comparisons++;
      if (piles[mid].at(-1)! >= value) right = mid;
      else left = mid + 1;
    }
    if (left === piles.length) piles.push([]);
    piles[left].push(value);
    counters.pushes++;
    steps.push(step(
      arrayFrame(piles.flat(), {}, {
        aux: piles.map((pile, index) => ({ label: `Pile ${index + 1}`, values: pile })),
      }),
      `Place ${value} on the leftmost pile whose top is at least ${value}.`,
      `ضع ${value} فوق أول كومة لا يقل أعلاها عن ${value}.`,
      2,
      counters,
      "place",
    ));
  }
  const output: number[] = [];
  while (output.length < input.values.length) {
    let bestPile = -1;
    for (let i = 0; i < piles.length; i++) {
      if (piles[i].length === 0) continue;
      if (bestPile < 0) bestPile = i;
      else {
        counters.comparisons++;
        if (piles[i].at(-1)! < piles[bestPile].at(-1)!) bestPile = i;
      }
    }
    output.push(piles[bestPile].pop()!);
    counters.pops++;
    steps.push(step(
      arrayFrame([...output, ...piles.flat()], Object.fromEntries(output.map((_, i) => [i, "sorted"])), {
        aux: [
          { label: "Output", values: output },
          ...piles.map((pile, index) => ({ label: `Pile ${index + 1}`, values: pile })),
        ],
      }),
      `Remove the smallest pile top, ${output.at(-1)}, into the output.`,
      `انقل أصغر قمة كومة، وهي ${output.at(-1)}، إلى الناتج.`,
      5,
      counters,
      "extract-min",
    ));
  }
  steps.push(step(arrayFrame(output, Object.fromEntries(output.map((_, i) => [i, "sorted"]))), "The pile merge produced sorted order.", "أنتج دمج الأكوام ترتيباً صحيحاً.", 6, counters, "result"));
  return steps;
}

function tournamentSteps(input: NumberInput): Step<ArrayFrame>[] {
  const alive = input.values.map((value, index) => ({ value, index, alive: true }));
  const output: number[] = [];
  const steps: Step<ArrayFrame>[] = [];
  const counters = { comparisons: 0, tournaments: 0, extracted: 0 };
  while (output.length < input.values.length) {
    let round = alive.filter((entry) => entry.alive).map((entry) => entry.index);
    const levels: string[] = [];
    while (round.length > 1) {
      const next: number[] = [];
      for (let i = 0; i < round.length; i += 2) {
        if (i + 1 === round.length) {
          next.push(round[i]);
          levels.push(`${alive[round[i]].value} advances`);
        } else {
          const first = round[i];
          const second = round[i + 1];
          counters.comparisons++;
          const winner = alive[first].value <= alive[second].value ? first : second;
          next.push(winner);
          levels.push(`${alive[first].value} vs ${alive[second].value} → ${alive[winner].value}`);
          steps.push(step(
            arrayFrame(input.values, { [first]: "compare", [second]: "compare", [winner]: "found" }, {
              aux: [{ label: "Output", values: output }, { label: "Matches", values: levels.slice(-6) }],
            }),
            `Tournament match: ${alive[first].value} versus ${alive[second].value}; ${alive[winner].value} advances.`,
            `مباراة البطولة: ${alive[first].value} مقابل ${alive[second].value}؛ تتأهل ${alive[winner].value}.`,
            2,
            counters,
            "match",
          ));
        }
      }
      round = next;
    }
    const winner = round[0];
    output.push(alive[winner].value);
    alive[winner].alive = false;
    counters.tournaments++;
    counters.extracted++;
    const remaining = alive.filter((entry) => entry.alive).map((entry) => entry.value);
    steps.push(step(
      arrayFrame([...output, ...remaining], Object.fromEntries(output.map((_, i) => [i, "sorted"])), {
        aux: [{ label: "Output", values: output }, { label: "Removed leaf", values: [winner] }],
      }),
      `Extract tournament winner ${alive[winner].value} and remove its leaf.`,
      `استخرج فائز البطولة ${alive[winner].value} واحذف ورقته.`,
      4,
      counters,
      "extract-winner",
    ));
  }
  steps.push(step(arrayFrame(output, Object.fromEntries(output.map((_, i) => [i, "sorted"]))), "Repeated tournaments produced sorted order.", "أنتج تكرار البطولات ترتيباً صحيحاً.", 6, counters, "result"));
  return steps;
}

function smoothsortSteps(input: NumberInput): Step<ArrayFrame>[] {
  const values = [...input.values];
  const leonardo = [1, 1];
  while (leonardo.at(-1)! < values.length) {
    leonardo.push(leonardo.at(-1)! + leonardo.at(-2)! + 1);
  }
  const orders: number[] = [];
  const steps: Step<ArrayFrame>[] = [];
  const counters = { comparisons: 0, swaps: 0, heaps: 0, extractions: 0 };

  const roots = (): number[] => {
    let offset = 0;
    return orders.map((order) => {
      offset += leonardo[order];
      return offset - 1;
    });
  };

  const sift = (root: number, order: number) => {
    let currentRoot = root;
    let currentOrder = order;
    while (currentOrder >= 2) {
      const right = currentRoot - 1;
      const left = right - leonardo[currentOrder - 2];
      counters.comparisons++;
      const child = values[left] >= values[right] ? left : right;
      const childOrder = child === left ? currentOrder - 1 : currentOrder - 2;
      counters.comparisons++;
      steps.push(step(
        arrayFrame(values, { [currentRoot]: "active", [left]: "compare", [right]: "compare" }, {
          aux: [{ label: "Leonardo orders", values: orders }],
        }),
        `Sift Leonardo heap L${currentOrder}: compare root ${values[currentRoot]} with child roots ${values[left]} and ${values[right]}.`,
        `أنزل في كومة ليوناردو L${currentOrder}: قارن الجذر ${values[currentRoot]} بجذري الطفلين ${values[left]} و${values[right]}.`,
        3,
        counters,
        "sift-compare",
      ));
      if (values[currentRoot] >= values[child]) break;
      [values[currentRoot], values[child]] = [values[child], values[currentRoot]];
      counters.swaps++;
      steps.push(step(
        arrayFrame(values, { [currentRoot]: "swap", [child]: "swap" }, {
          aux: [{ label: "Leonardo orders", values: orders }],
        }),
        `Swap with the larger child to restore the Leonardo max-heap.`,
        "بدّل مع الطفل الأكبر لاستعادة خاصية كومة ليوناردو العظمى.",
        4,
        counters,
        "sift-swap",
      ));
      currentRoot = child;
      currentOrder = childOrder;
    }
  };

  for (let end = 0; end < values.length; end++) {
    if (
      orders.length >= 2
      && orders[orders.length - 2] === orders.at(-1)! + 1
    ) {
      const rightOrder = orders.pop()!;
      const leftOrder = orders.pop()!;
      const mergedOrder = leftOrder + 1;
      orders.push(mergedOrder);
      counters.heaps = orders.length;
      steps.push(step(
        arrayFrame(values, { [end]: "active" }, {
          range: { from: end - leonardo[mergedOrder] + 1, to: end },
          aux: [{ label: "Leonardo orders", values: orders }],
        }),
        `Merge adjacent L${leftOrder} and L${rightOrder} heaps with ${values[end]} as an L${mergedOrder} root.`,
        `ادمج الكومتين المتجاورتين L${leftOrder} وL${rightOrder} مع ${values[end]} جذراً للكومة L${mergedOrder}.`,
        1,
        counters,
        "leonardo-merge",
        { transformation: { kind: "rebuild", label: "Merge Leonardo heaps" } },
      ));
      sift(end, mergedOrder);
    } else {
      const order = orders.at(-1) === 1 ? 0 : 1;
      orders.push(order);
      counters.heaps = orders.length;
      steps.push(step(
        arrayFrame(values, { [end]: "active" }, {
          aux: [{ label: "Leonardo orders", values: orders }],
        }),
        `Add ${values[end]} as singleton Leonardo heap L${order}.`,
        `أضف ${values[end]} ككومة ليوناردو مفردة L${order}.`,
        2,
        counters,
        "add-heap",
      ));
    }
  }

  for (let sortedFrom = values.length - 1; sortedFrom >= 0; sortedFrom--) {
    const currentRoots = roots();
    let maxHeap = 0;
    for (let i = 1; i < currentRoots.length; i++) {
      counters.comparisons++;
      if (values[currentRoots[i]] > values[currentRoots[maxHeap]]) maxHeap = i;
    }
    const finalHeap = orders.length - 1;
    const maxRoot = currentRoots[maxHeap];
    const finalRoot = currentRoots[finalHeap];
    steps.push(step(
      arrayFrame(values, Object.fromEntries(currentRoots.map((root) => [root, root === maxRoot ? "found" : "compare"])), {
        aux: [{ label: "Leonardo orders", values: orders }],
      }),
      `Select maximum forest root ${values[maxRoot]}.`,
      `اختر أكبر جذر في الغابة وهو ${values[maxRoot]}.`,
      5,
      counters,
      "select-root",
    ));
    if (maxHeap !== finalHeap) {
      [values[maxRoot], values[finalRoot]] = [values[finalRoot], values[maxRoot]];
      counters.swaps++;
      steps.push(step(
        arrayFrame(values, { [maxRoot]: "swap", [finalRoot]: "swap" }),
        `Move the maximum root to final index ${finalRoot}.`,
        `انقل الجذر الأكبر إلى الموضع النهائي ${finalRoot}.`,
        6,
        counters,
        "root-swap",
      ));
      sift(maxRoot, orders[maxHeap]);
    }
    const removedOrder = orders.pop()!;
    if (removedOrder >= 2) {
      orders.push(removedOrder - 1, removedOrder - 2);
      counters.heaps = orders.length;
      steps.push(step(
        arrayFrame(values, { [finalRoot]: "sorted" }, {
          aux: [{ label: "Leonardo orders", values: orders }],
        }),
        `Remove the L${removedOrder} root and expose child heaps L${removedOrder - 1} and L${removedOrder - 2}.`,
        `احذف جذر L${removedOrder} وأظهر كومتَي الطفلين L${removedOrder - 1} وL${removedOrder - 2}.`,
        7,
        counters,
        "split-heap",
        { transformation: { kind: "rebuild", label: "Split Leonardo heap" } },
      ));
    }
    counters.extractions++;
    counters.heaps = orders.length;
    steps.push(step(
      arrayFrame(values, Object.fromEntries(Array.from({ length: values.length - sortedFrom }, (_, i) => [sortedFrom + i, "sorted"]))),
      `Fix ${values[sortedFrom]} at sorted index ${sortedFrom}.`,
      `ثبّت ${values[sortedFrom]} في الموضع المرتب ${sortedFrom}.`,
      8,
      counters,
      "extract-max",
    ));
  }
  return steps;
}

function insertionRange(
  values: number[],
  start: number,
  end: number,
  steps: Step<ArrayFrame>[],
  counters: { comparisons: number; writes: number; merges: number },
) {
  for (let i = start + 1; i < end; i++) {
    const key = values[i];
    let j = i - 1;
    while (j >= start) {
      counters.comparisons++;
      if (values[j] <= key) break;
      values[j + 1] = values[j];
      counters.writes++;
      j--;
    }
    values[j + 1] = key;
    counters.writes++;
    steps.push(step(
      arrayFrame(values, { [j + 1]: "active" }, { range: { from: start, to: end - 1 } }),
      `Insertion-sort block [${start}, ${end - 1}] through index ${i}.`,
      `رتّب كتلة الإدراج [${start}، ${end - 1}] حتى الموضع ${i}.`,
      2,
      counters,
      "block-insertion",
    ));
  }
}

function blockSteps(input: NumberInput): Step<ArrayFrame>[] {
  const values = [...input.values];
  const steps: Step<ArrayFrame>[] = [];
  const counters = { comparisons: 0, writes: 0, merges: 0 };
  const blockSize = Math.max(2, Math.floor(Math.sqrt(values.length)));
  for (let start = 0; start < values.length; start += blockSize) {
    insertionRange(values, start, Math.min(values.length, start + blockSize), steps, counters);
  }
  for (let width = blockSize; width < values.length; width *= 2) {
    for (let start = 0; start < values.length; start += width * 2) {
      const mid = Math.min(start + width, values.length);
      const end = Math.min(start + width * 2, values.length);
      if (mid >= end) continue;
      const merged: number[] = [];
      let i = start;
      let j = mid;
      while (i < mid && j < end) {
        counters.comparisons++;
        merged.push(values[i] <= values[j] ? values[i++] : values[j++]);
      }
      while (i < mid) merged.push(values[i++]);
      while (j < end) merged.push(values[j++]);
      for (let k = 0; k < merged.length; k++) {
        values[start + k] = merged[k];
        counters.writes++;
      }
      counters.merges++;
      steps.push(step(
        arrayFrame(values, Object.fromEntries(merged.map((_, k) => [start + k, "active"])), {
          range: { from: start, to: end - 1 },
          aux: [{ label: "Merged block", values: merged }],
        }),
        `Merge adjacent sorted blocks [${start}, ${mid - 1}] and [${mid}, ${end - 1}].`,
        `ادمج الكتلتين المرتبتين المتجاورتين [${start}، ${mid - 1}] و[${mid}، ${end - 1}].`,
        5,
        counters,
        "block-merge",
        { transformation: { kind: "reorder", label: "Merge sorted blocks" } },
      ));
    }
  }
  steps.push(step(arrayFrame(values, Object.fromEntries(values.map((_, i) => [i, "sorted"]))), `All block widths have been merged.`, "اكتمل دمج جميع أحجام الكتل.", 6, counters, "result"));
  return steps;
}

function pigeonholeSteps(input: NumberInput): Step<ArrayFrame>[] {
  const values = [...input.values];
  const steps: Step<ArrayFrame>[] = [];
  const counters = { reads: 0, writes: 0, holes: 0 };
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const holes = Array<number>(maximum - minimum + 1).fill(0);
  counters.holes = holes.length;
  for (let i = 0; i < values.length; i++) {
    holes[values[i] - minimum]++;
    counters.reads++;
    steps.push(step(
      arrayFrame(values, { [i]: "active" }, { aux: [{ label: `Holes (offset ${minimum})`, values: holes }] }),
      `Place ${values[i]} in pigeonhole ${values[i] - minimum}.`,
      `ضع ${values[i]} في الخانة ${values[i] - minimum}.`,
      2,
      counters,
      "count",
    ));
  }
  let out = 0;
  for (let hole = 0; hole < holes.length; hole++) {
    while (holes[hole] > 0) {
      values[out] = hole + minimum;
      holes[hole]--;
      counters.writes++;
      steps.push(step(
        arrayFrame(values, { [out]: "sorted" }, { aux: [{ label: `Holes (offset ${minimum})`, values: holes }] }),
        `Write ${values[out]} from its pigeonhole to output index ${out}.`,
        `اكتب ${values[out]} من خانته في موضع الناتج ${out}.`,
        4,
        counters,
        "collect",
      ));
      out++;
    }
  }
  steps.push(step(arrayFrame(values, Object.fromEntries(values.map((_, i) => [i, "sorted"]))), "Every pigeonhole is empty.", "أصبحت كل الخانات فارغة.", 5, counters, "result"));
  return steps;
}

function americanFlagSteps(input: NumberInput): Step<ArrayFrame>[] {
  const values = [...input.values];
  const steps: Step<ArrayFrame>[] = [];
  const counters = { digitReads: 0, swaps: 0, partitions: 0 };
  const offset = Math.min(0, ...values);
  const key = (value: number) => value - offset;
  const maxKey = Math.max(...values.map(key));
  let divisor = 1;
  while (Math.floor(maxKey / divisor) >= 10) divisor *= 10;

  const distribute = (start: number, end: number, div: number) => {
    if (end - start <= 1 || div === 0) return;
    const count = Array<number>(10).fill(0);
    for (let i = start; i < end; i++) {
      count[Math.floor(key(values[i]) / div) % 10]++;
      counters.digitReads++;
    }
    const begin = Array<number>(10).fill(start);
    for (let bucket = 1; bucket < 10; bucket++) begin[bucket] = begin[bucket - 1] + count[bucket - 1];
    const next = [...begin];
    for (let bucket = 0; bucket < 10; bucket++) {
      const limit = begin[bucket] + count[bucket];
      while (next[bucket] < limit) {
        const index = next[bucket];
        const actual = Math.floor(key(values[index]) / div) % 10;
        if (actual === bucket) {
          next[bucket]++;
        } else {
          const destination = next[actual]++;
          [values[index], values[destination]] = [values[destination], values[index]];
          counters.swaps++;
          steps.push(step(
            arrayFrame(values, { [index]: "swap", [destination]: "swap" }, {
              range: { from: start, to: end - 1 },
              aux: [{ label: `Digit divisor ${div}`, values: count }],
            }),
            `Cycle ${values[destination]} into decimal bucket ${actual}.`,
            `انقل ${values[destination]} بالدورة إلى دلو الرقم العشري ${actual}.`,
            4,
            counters,
            "cycle-leader",
          ));
        }
      }
    }
    counters.partitions++;
    steps.push(step(
      arrayFrame(values, Object.fromEntries(
        begin
          .filter((index) => index >= start && index < end)
          .map((index) => [index, "active"]),
      ), {
        range: { from: start, to: end - 1 },
        aux: [{ label: `Bucket counts at divisor ${div}`, values: count }],
      }),
      `Partition [${start}, ${end - 1}] by digit divisor ${div}.`,
      `قسّم المجال [${start}، ${end - 1}] حسب خانة القاسم ${div}.`,
      5,
      counters,
      "digit-partition",
      { transformation: { kind: "reorder", label: "American-flag bucket partition" } },
    ));
    if (div >= 10) {
      for (let bucket = 0; bucket < 10; bucket++) {
        distribute(begin[bucket], begin[bucket] + count[bucket], Math.floor(div / 10));
      }
    }
  };
  distribute(0, values.length, divisor);
  steps.push(step(arrayFrame(values, Object.fromEntries(values.map((_, i) => [i, "sorted"]))), "All most-significant-digit partitions are complete.", "اكتملت جميع تقسيمات الخانات من الأكثر أهمية.", 6, counters, "result"));
  return steps;
}

function beadSteps(input: NumberInput): Step<ArrayFrame>[] {
  const original = [...input.values];
  const maximum = Math.max(...original);
  const grid = original.map((value) => Array.from({ length: maximum }, (_, column) => column < value));
  const steps: Step<ArrayFrame>[] = [];
  const counters = { beads: original.reduce((sum, value) => sum + value, 0), columns: 0, moves: 0 };
  const rowCounts = () => grid.map((row) => row.filter(Boolean).length);
  steps.push(step(
    arrayFrame(rowCounts(), {}, { aux: grid.map((row, i) => ({ label: `Row ${i}`, values: row.map((bead) => bead ? "●" : "·") })) }),
    "Place each value as that many beads on a horizontal row.",
    "مثّل كل قيمة بعدد مماثل من الخرز في صف أفقي.",
    1,
    counters,
    "place-beads",
  ));
  for (let column = 0; column < maximum; column++) {
    const count = grid.reduce((sum, row) => sum + (row[column] ? 1 : 0), 0);
    for (let row = 0; row < grid.length; row++) {
      const dropped = row >= grid.length - count;
      if (grid[row][column] !== dropped) counters.moves++;
      grid[row][column] = dropped;
    }
    counters.columns++;
    steps.push(step(
      arrayFrame(rowCounts(), {}, {
        aux: grid.map((row, i) => ({ label: `Row ${i}`, values: row.map((bead) => bead ? "●" : "·") })),
      }),
      `Let the ${count} beads in column ${column} fall to its bottom cells.`,
      `دع الخرزات ${count} في العمود ${column} تسقط إلى خلاياه السفلية.`,
      3,
      counters,
      "gravity",
      { transformation: { kind: "reorder", label: "Drop one bead column" } },
    ));
  }
  const result = rowCounts();
  steps.push(step(arrayFrame(result, Object.fromEntries(result.map((_, i) => [i, "sorted"]))), "Reading row lengths after gravity gives sorted order.", "تعطي أطوال الصفوف بعد الجاذبية الترتيب الصحيح.", 5, counters, "result"));
  return steps;
}

function librarySteps(input: NumberInput): Step<ArrayFrame>[] {
  const shelf: (number | null)[] = Array(input.values.length * 2 + 1).fill(null);
  const remaining = [...input.values];
  const steps: Step<ArrayFrame>[] = [];
  const counters = { comparisons: 0, insertions: 0, rebalances: 0 };
  const entries = () => shelf
    .map((value, index) => ({ value, index }))
    .filter((entry): entry is { value: number; index: number } => entry.value !== null);
  const view = () => [...entries().map((entry) => entry.value), ...remaining];
  const rebalance = (sorted: number[]) => {
    shelf.fill(null);
    for (let i = 0; i < sorted.length; i++) {
      const position = Math.floor(((i + 1) * shelf.length) / (sorted.length + 1));
      shelf[position] = sorted[i];
    }
    counters.rebalances++;
  };

  while (remaining.length > 0) {
    const value = remaining.shift()!;
    const current = entries();
    let low = 0;
    let high = current.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      counters.comparisons++;
      steps.push(step(
        arrayFrame(view(), { [mid]: "compare" }, {
          aux: [{ label: "Gapped shelf", values: shelf.map((item) => item ?? "·") }],
        }),
        `Binary-search the library shelf for ${value}; compare with ${current[mid].value}.`,
        `ابحث ثنائياً في رف المكتبة عن ${value}؛ قارنه مع ${current[mid].value}.`,
        2,
        counters,
        "shelf-search",
      ));
      if (current[mid].value <= value) low = mid + 1;
      else high = mid;
    }
    const lower = low === 0 ? 0 : current[low - 1].index + 1;
    const upper = low === current.length ? shelf.length - 1 : current[low].index - 1;
    if (lower <= upper) {
      shelf[Math.floor((lower + upper) / 2)] = value;
    } else {
      const sorted = [...current.map((entry) => entry.value), value].sort((a, b) => a - b);
      rebalance(sorted);
      steps.push(step(
        arrayFrame([...sorted, ...remaining], {}, {
          aux: [{ label: "Rebalanced shelf", values: shelf.map((item) => item ?? "·") }],
        }),
        `No gap remains at rank ${low}; rebalance ${sorted.length} library entries.`,
        `لا توجد فجوة عند الرتبة ${low}؛ أعد توزيع ${sorted.length} عنصراً في المكتبة.`,
        4,
        counters,
        "rebalance",
        { transformation: { kind: "rebuild", label: "Rebalance gapped shelf" } },
      ));
    }
    counters.insertions++;
    steps.push(step(
      arrayFrame(view(), { [low]: "active" }, {
        aux: [{ label: "Gapped shelf", values: shelf.map((item) => item ?? "·") }],
      }),
      `Insert ${value} into a shelf gap while preserving shelf order.`,
      `أدخل ${value} في فجوة بالرف مع الحفاظ على ترتيبه.`,
      3,
      counters,
      "gapped-insert",
    ));
    if ((counters.insertions & (counters.insertions - 1)) === 0 && remaining.length > 0) {
      rebalance(entries().map((entry) => entry.value));
      steps.push(step(
        arrayFrame(view(), {}, { aux: [{ label: "Rebalanced shelf", values: shelf.map((item) => item ?? "·") }] }),
        `Periodic library rebalance restores evenly spaced gaps.`,
        "تعيد موازنة المكتبة الدورية توزيع الفجوات بالتساوي.",
        4,
        counters,
        "periodic-rebalance",
        { transformation: { kind: "rebuild", label: "Redistribute shelf gaps" } },
      ));
    }
  }
  const result = entries().map((entry) => entry.value);
  steps.push(step(arrayFrame(result, Object.fromEntries(result.map((_, i) => [i, "sorted"]))), "Compact the ordered shelf into the final array.", "اضغط الرف المرتب في المصفوفة النهائية.", 6, counters, "result"));
  return steps;
}

function spreadSteps(input: NumberInput): Step<ArrayFrame>[] {
  const values = [...input.values];
  const steps: Step<ArrayFrame>[] = [];
  const counters = { distributions: 0, comparisons: 0, writes: 0 };

  const insertion = (start: number, end: number) => {
    for (let i = start + 1; i < end; i++) {
      const key = values[i];
      let j = i - 1;
      while (j >= start) {
        counters.comparisons++;
        if (values[j] <= key) break;
        values[j + 1] = values[j];
        counters.writes++;
        j--;
      }
      values[j + 1] = key;
      counters.writes++;
    }
    steps.push(step(
      arrayFrame(values, {}, { range: { from: start, to: end - 1 } }),
      `Use insertion sort for small spread bucket [${start}, ${end - 1}].`,
      `استخدم ترتيب الإدراج لدلو الانتشار الصغير [${start}، ${end - 1}].`,
      6,
      counters,
      "small-bucket",
    ));
  };

  const distribute = (start: number, end: number, depth: number) => {
    const length = end - start;
    if (length <= 1) return;
    if (length <= 4) {
      insertion(start, end);
      return;
    }
    let minimum = values[start];
    let maximum = values[start];
    for (let i = start + 1; i < end; i++) {
      counters.comparisons += 2;
      minimum = Math.min(minimum, values[i]);
      maximum = Math.max(maximum, values[i]);
    }
    if (minimum === maximum) return;
    const binCount = Math.min(length, Math.max(2, Math.ceil(Math.sqrt(length))));
    const bins = Array.from({ length: binCount }, () => [] as number[]);
    for (let i = start; i < end; i++) {
      const bucket = Math.min(binCount - 1, Math.floor(((values[i] - minimum) * binCount) / (maximum - minimum + 1)));
      bins[bucket].push(values[i]);
    }
    if (bins.some((bin) => bin.length === length)) {
      insertion(start, end);
      return;
    }
    let cursor = start;
    const boundaries = [start];
    for (const bin of bins) {
      for (const value of bin) {
        values[cursor++] = value;
        counters.writes++;
      }
      boundaries.push(cursor);
    }
    counters.distributions++;
    steps.push(step(
      arrayFrame(values, Object.fromEntries(boundaries.slice(0, -1).map((index) => [index, "active"])), {
        range: { from: start, to: end - 1 },
        aux: bins.map((bin, index) => ({ label: `Spread bin ${index}`, values: bin })),
      }),
      `Distribute depth ${depth} range by its numeric spread [${minimum}, ${maximum}].`,
      `وزّع مجال العمق ${depth} حسب انتشاره العددي [${minimum}، ${maximum}].`,
      4,
      counters,
      "spread-distribute",
      { transformation: { kind: "reorder", label: "Distribute by numeric spread" } },
    ));
    for (let bin = 0; bin < binCount; bin++) distribute(boundaries[bin], boundaries[bin + 1], depth + 1);
  };
  distribute(0, values.length, 0);
  steps.push(step(arrayFrame(values, Object.fromEntries(values.map((_, i) => [i, "sorted"]))), "Every spread bucket is ordered.", "أصبح كل دلو انتشار مرتباً.", 6, counters, "result"));
  return steps;
}

export const binaryInsertionSort = sortingModule({
  slug: "binary-insertion-sort",
  title: "Binary Insertion Sort",
  titleAr: "ترتيب الإدراج الثنائي",
  difficulty: "Intermediate",
  summary: "Uses binary search to locate each insertion point, then shifts the sorted prefix.",
  summaryAr: "يستخدم البحث الثنائي لتحديد موضع كل إدراج ثم يزيح البادئة المرتبة.",
  pseudocode: [
    "Treat index 0 as a sorted prefix",
    "For each key at index i",
    "Binary-search the first prefix value greater than key",
    "Shift the suffix of the prefix one position right",
    "Write key at the insertion boundary",
    "Grow the sorted prefix",
    "Return the array",
  ],
  complexity: { time: { best: "O(n log n)", average: "O(n²)", worst: "O(n²)" }, space: "O(1)" },
  invariant: "Before iteration i, indices below i are sorted.",
  invariantAr: "قبل الدورة i تكون الفهارس الأصغر من i مرتبة.",
  how: ["Binary-search the sorted prefix.", "Shift values to create a gap.", "Insert the key in that gap."],
  howAr: ["ابحث ثنائياً في البادئة المرتبة.", "أزح القيم لفتح فجوة.", "أدخل المفتاح في الفجوة."],
  generate: binaryInsertionSteps,
});

export const stoogeSort = sortingModule({
  slug: "stooge-sort",
  title: "Stooge Sort",
  titleAr: "ترتيب ستوج",
  difficulty: "Advanced",
  summary: "Recursively sorts the first two-thirds, last two-thirds, then first two-thirds again.",
  summaryAr: "يرتب عودياً الثلثين الأولين ثم الأخيرين ثم الأولين مرة أخرى.",
  pseudocode: [
    "Compare the two endpoints",
    "Swap endpoints if they are reversed",
    "If the range has more than two elements",
    "Sort its first two-thirds",
    "Sort its last two-thirds",
    "Sort its first two-thirds again",
    "Return",
  ],
  complexity: { time: { best: "O(n^2.71)", average: "O(n^2.71)", worst: "O(n^2.71)" }, space: "O(log n)" },
  invariant: "After the three recursive calls, every endpoint and overlapping two-third range is ordered.",
  invariantAr: "بعد النداءات الثلاثة تكون الأطراف ومجالات الثلثين المتداخلة مرتبة.",
  how: ["Order the endpoints.", "Recursively process overlapping two-third ranges in the required order."],
  howAr: ["رتب الطرفين.", "عالج عودياً مجالات الثلثين المتداخلة بالترتيب المحدد."],
  generate: stoogeSteps,
  maxCount: 9,
  defaultInput: (level, rng) => defaultNumbers(level, rng, { min: -20, max: 40, maxCount: 4 + level }),
});

export const strandSort = sortingModule({
  slug: "strand-sort",
  title: "Strand Sort",
  titleAr: "ترتيب السلاسل",
  difficulty: "Intermediate",
  summary: "Extracts increasing strands from the input and merges them into a sorted output.",
  summaryAr: "يستخرج سلاسل متزايدة من المدخل ويدمجها في ناتج مرتب.",
  pseudocode: [
    "Initialize empty output",
    "Start a strand with the first remaining item",
    "Scan remaining items",
    "Extract every item not smaller than the strand tail",
    "Merge the strand into output",
    "Repeat until no input remains",
    "Return output",
  ],
  complexity: { time: { best: "O(n)", average: "O(n²)", worst: "O(n²)" }, space: "O(n)" },
  invariant: "Every extracted strand and the accumulated output are independently sorted.",
  invariantAr: "كل سلسلة مستخرجة والناتج المتراكم مرتبان بصورة مستقلة.",
  how: ["Extract one increasing subsequence.", "Merge it with the sorted output.", "Repeat."],
  howAr: ["استخرج متتالية متزايدة.", "ادمجها مع الناتج المرتب.", "كرر العملية."],
  generate: strandSteps,
});

export const patienceSort = sortingModule({
  slug: "patience-sort",
  title: "Patience Sort",
  titleAr: "ترتيب الصبر",
  difficulty: "Advanced",
  summary: "Builds patience piles and repeatedly extracts the minimum visible pile top.",
  summaryAr: "يبني أكوام الصبر ثم يستخرج أصغر قمة ظاهرة بصورة متكررة.",
  pseudocode: [
    "Start with no piles",
    "For each value, binary-search pile tops",
    "Push it on the leftmost top not smaller than it",
    "Repeat until every value is placed",
    "Select the smallest pile top",
    "Pop it into output and repeat",
    "Return output",
  ],
  complexity: { time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)" }, space: "O(n)" },
  invariant: "Pile tops are ordered and each pile is decreasing from bottom to top.",
  invariantAr: "قمم الأكوام مرتبة وكل كومة تتناقص من الأسفل إلى الأعلى.",
  how: ["Place values on ordered pile tops.", "Merge the piles by repeatedly removing the minimum top."],
  howAr: ["ضع القيم فوق قمم أكوام مرتبة.", "ادمج الأكوام بإزالة أصغر قمة تكرارياً."],
  generate: patienceSteps,
});

export const tournamentSort = sortingModule({
  slug: "tournament-sort",
  title: "Tournament Sort",
  titleAr: "ترتيب البطولة",
  difficulty: "Intermediate",
  summary: "Runs a comparison tournament to select each successive minimum.",
  summaryAr: "يجري بطولة مقارنات لاختيار كل قيمة صغرى تالية.",
  pseudocode: [
    "Mark every input leaf active",
    "Compare leaves pairwise",
    "Advance the smaller winner",
    "Repeat matches until one winner remains",
    "Output and deactivate the winner leaf",
    "Re-run the affected tournament",
    "Return output",
  ],
  complexity: { time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)" }, space: "O(n)" },
  invariant: "Every internal match winner is the minimum of the leaves under that match.",
  invariantAr: "فائز كل مباراة داخلية هو أصغر الأوراق التابعة لها.",
  how: ["Compare active leaves in knockout rounds.", "Extract the champion.", "Repeat without the champion."],
  howAr: ["قارن الأوراق النشطة في جولات إقصائية.", "استخرج البطل.", "كرر دونه."],
  generate: tournamentSteps,
});

export const smoothsort = sortingModule({
  slug: "smoothsort",
  title: "Smoothsort",
  titleAr: "الترتيب السلس",
  difficulty: "Advanced",
  summary: "Builds a forest of Leonardo max-heaps and dismantles it from the maximum end.",
  summaryAr: "يبني غابة من أكوام ليوناردو العظمى ثم يفككها من النهاية الكبرى.",
  pseudocode: [
    "Represent the prefix as Leonardo heaps",
    "Merge consecutive heaps when they form the next Leonardo size",
    "Sift each new heap root",
    "Compare a root with its two Leonardo child roots",
    "Select the greatest root in the forest",
    "Move it to the final heap root",
    "Split a removed nontrivial Leonardo heap",
    "Fix the maximum at the end",
    "Repeat until the forest is empty",
  ],
  complexity: { time: { best: "O(n)", average: "O(n log n)", worst: "O(n log n)" }, space: "O(log n)", notes: "Leonardo-heap forest representation." },
  invariant: "Each forest component is a valid Leonardo max-heap.",
  invariantAr: "كل مكوّن في الغابة كومة ليوناردو عظمى صحيحة.",
  how: ["Build Leonardo heaps over the prefix.", "Sift roots.", "Extract forest maxima while splitting heaps."],
  howAr: ["ابنِ أكوام ليوناردو فوق البادئة.", "أنزل الجذور.", "استخرج أعظم قيم الغابة مع تقسيم الأكوام."],
  generate: smoothsortSteps,
});

export const blockSort = sortingModule({
  slug: "block-sort",
  title: "Block Sort",
  titleAr: "ترتيب الكتل",
  difficulty: "Intermediate",
  summary: "Sorts small blocks, then merges adjacent sorted blocks at doubling widths.",
  summaryAr: "يرتب كتلاً صغيرة ثم يدمج الكتل المرتبة المتجاورة بأحجام متضاعفة.",
  pseudocode: [
    "Choose a block size near sqrt(n)",
    "Insertion-sort each block",
    "Set merge width to one block",
    "Merge every adjacent pair of runs",
    "Double the run width",
    "Repeat until one run remains",
    "Return the array",
  ],
  complexity: { time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)" }, space: "O(n)" },
  invariant: "At each merge width, every completed block of that width is sorted.",
  invariantAr: "عند كل عرض دمج تكون كل كتلة مكتملة بذلك العرض مرتبة.",
  how: ["Sort local blocks.", "Merge neighboring blocks.", "Double the merged width."],
  howAr: ["رتب الكتل المحلية.", "ادمج الكتل المتجاورة.", "ضاعف عرض الدمج."],
  generate: blockSteps,
});

export const pigeonholeSort = sortingModule({
  slug: "pigeonhole-sort",
  title: "Pigeonhole Sort",
  titleAr: "ترتيب الخانات",
  difficulty: "Beginner",
  summary: "Counts every integer in a direct range-indexed pigeonhole and reads the holes in order.",
  summaryAr: "يعدّ كل عدد صحيح في خانة مفهرسة مباشرة ثم يقرأ الخانات بالترتيب.",
  pseudocode: [
    "Find minimum and maximum",
    "Create one count hole per range value",
    "Increment the value's offset hole",
    "Scan holes from low to high",
    "Write each value by its count",
    "Continue until holes are empty",
  ],
  complexity: { time: { best: "O(n + R)", average: "O(n + R)", worst: "O(n + R)" }, space: "O(R)" },
  invariant: "Hole k equals the number of uncollected occurrences of minimum + k.",
  invariantAr: "الخانة k تساوي عدد مرات القيمة الدنيا + k التي لم تُجمع بعد.",
  how: ["Count range values.", "Write each value according to its count."],
  howAr: ["عدّ قيم المجال.", "اكتب كل قيمة بحسب عددها."],
  generate: pigeonholeSteps,
  min: -60,
  max: 60,
});

export const americanFlagSort = sortingModule({
  slug: "american-flag-sort",
  title: "American Flag Sort",
  titleAr: "ترتيب العلم الأمريكي",
  difficulty: "Advanced",
  summary: "Performs in-place MSD radix distribution with cycle leaders, then recurses into digit buckets.",
  summaryAr: "ينفذ توزيع أساس من الخانة الأكثر أهمية في المكان باستخدام دورات ثم يعالج الدلاء عودياً.",
  pseudocode: [
    "Choose the most significant decimal divisor",
    "Count values in each digit bucket",
    "Compute bucket boundaries",
    "Cycle misplaced values into their buckets",
    "Finish the current digit partition",
    "Recurse into each bucket at the next digit",
    "Return the array",
  ],
  complexity: { time: { best: "O(dn)", average: "O(dn)", worst: "O(dn)" }, space: "O(d + radix)" },
  invariant: "After partitioning a digit, every value lies inside its exact digit bucket.",
  invariantAr: "بعد تقسيم خانة رقمية تقع كل قيمة داخل دلو رقمها الصحيح.",
  how: ["Count MSD digits.", "Cycle values into contiguous digit buckets.", "Recurse on lower digits."],
  howAr: ["عدّ خانات الأرقام العليا.", "انقل القيم دورياً إلى دلاء متجاورة.", "عالج الخانات الأدنى عودياً."],
  generate: americanFlagSteps,
  min: -999,
  max: 999,
});

export const beadSort = sortingModule({
  slug: "bead-sort",
  title: "Bead Sort",
  titleAr: "ترتيب الخرز",
  difficulty: "Intermediate",
  summary: "Represents nonnegative integers as bead rows and applies gravity column by column.",
  summaryAr: "يمثل الأعداد غير السالبة بصفوف خرز ويطبق الجاذبية عموداً بعد عمود.",
  pseudocode: [
    "Create one row per nonnegative value",
    "Place value beads in that row",
    "For each bead column",
    "Count its beads",
    "Move them to the bottom cells",
    "Read each final row's bead count",
  ],
  complexity: { time: { best: "O(nM)", average: "O(nM)", worst: "O(nM)" }, space: "O(nM)" },
  invariant: "Gravity preserves the total bead count in every column.",
  invariantAr: "تحافظ الجاذبية على العدد الكلي للخرز في كل عمود.",
  how: ["Build the bead grid.", "Drop each column.", "Read sorted row lengths."],
  howAr: ["ابنِ شبكة الخرز.", "أسقط كل عمود.", "اقرأ أطوال الصفوف المرتبة."],
  generate: beadSteps,
  min: 0,
  max: 30,
  maxCount: 12,
  defaultInput: (level, rng) => defaultNumbers(level, rng, { min: 0, max: 12, maxCount: 5 + level }),
});

export const librarySort = sortingModule({
  slug: "library-sort",
  title: "Library Sort",
  titleAr: "ترتيب المكتبة",
  difficulty: "Advanced",
  summary: "Maintains sorted items on a gapped shelf and periodically redistributes them to restore insertion space.",
  summaryAr: "يحافظ على عناصر مرتبة في رف ذي فجوات ويعيد توزيعها دورياً لاستعادة مساحة الإدراج.",
  pseudocode: [
    "Create an oversized empty shelf",
    "Binary-search the rank of the next value",
    "Insert into a gap between predecessor and successor",
    "If no local gap exists, rebalance the shelf",
    "Periodically redistribute items evenly",
    "Repeat for every value",
    "Compact occupied shelf cells",
  ],
  complexity: { time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n²)" }, space: "O(n)" },
  invariant: "Occupied shelf cells are always ordered by index, with gaps reserved between them.",
  invariantAr: "خلايا الرف المشغولة مرتبة دائماً حسب الفهرس مع إبقاء فجوات بينها.",
  how: ["Search the current shelf.", "Insert into a nearby order-preserving gap.", "Rebalance when gaps are exhausted."],
  howAr: ["ابحث في الرف الحالي.", "أدخل في فجوة قريبة تحفظ الترتيب.", "أعد التوزيع عند نفاد الفجوات."],
  generate: librarySteps,
});

export const spreadsort = sortingModule({
  slug: "spreadsort",
  title: "Spreadsort",
  titleAr: "ترتيب الانتشار",
  difficulty: "Advanced",
  summary: "Recursively distributes integers by their numeric spread and insertion-sorts small buckets.",
  summaryAr: "يوزع الأعداد عودياً حسب انتشارها العددي ويرتب الدلاء الصغيرة بالإدراج.",
  pseudocode: [
    "Inspect the range minimum and maximum",
    "Choose a bounded number of spread bins",
    "Map values to bins by interpolation",
    "Write bins contiguously",
    "Recurse into nontrivial bins",
    "Insertion-sort small bins",
    "Return the array",
  ],
  complexity: { time: { best: "O(n)", average: "O(n log n)", worst: "O(n²)" }, space: "O(n)" },
  invariant: "After a distribution, every earlier bin contains values no greater than any later bin.",
  invariantAr: "بعد كل توزيع لا يحتوي أي دلو سابق على قيمة أكبر من قيم الدلاء اللاحقة.",
  how: ["Measure numeric spread.", "Distribute by interpolated bins.", "Recursively refine or insertion-sort bins."],
  howAr: ["قس الانتشار العددي.", "وزع إلى دلاء بالاستيفاء.", "دقق الدلاء عودياً أو رتب الصغيرة بالإدراج."],
  generate: spreadSteps,
});

export const sortingModules = [
  binaryInsertionSort,
  stoogeSort,
  strandSort,
  patienceSort,
  tournamentSort,
  smoothsort,
  blockSort,
  pigeonholeSort,
  americanFlagSort,
  beadSort,
  librarySort,
  spreadsort,
] as const;
