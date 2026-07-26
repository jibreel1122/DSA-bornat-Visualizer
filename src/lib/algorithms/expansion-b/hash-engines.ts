import type { ArrayFrame, CellState, HashFrame, Step } from "@/lib/engine/types";
import { complexities, makeModule, numberField, parseIntegerList, randomUnique } from "./shared";

type HashInput = { values: number[]; query: number };

function parseHash(fields: Record<string, string>): HashInput {
  const values = parseIntegerList(fields.values ?? "", "key");
  const query = Number(fields.query);
  if (!Number.isSafeInteger(query)) throw new Error("Query must be an integer.");
  return { values, query };
}

const hashFields = [
  numberField("Keys", "المفاتيح"),
  {
    key: "query",
    label: "Query",
    labelAr: "مفتاح البحث",
    placeholder: "12",
    help: "Key to test after insertion.",
    helpAr: "المفتاح المراد اختباره بعد الإدراج.",
    search: true,
  },
];

const mod = (value: number, size: number) => ((value % size) + size) % size;

function generateCuckoo(input: HashInput): Step<HashFrame>[] {
  let size = 5;
  let first: (number | null)[] = Array(size).fill(null);
  let second: (number | null)[] = Array(size).fill(null);
  const inserted: number[] = [];
  const steps: Step<HashFrame>[] = [];
  let evictions = 0;
  let rehashes = 0;
  const h1 = (key: number) => mod(key, size);
  const h2 = (key: number) => mod(Math.imul(key, 3) + 1, size);
  const emit = (
    states: Record<number, CellState>,
    description: string,
    descriptionAr: string,
    phase: string,
    transformation?: Step<HashFrame>["transformation"],
  ) => {
    steps.push({
      frame: {
        buckets: [
          ...first.map((key, index) => ({ index, items: key === null ? [] : [{ key: String(key) }], state: states[index] })),
          ...second.map((key, index) => ({ index: size + index, items: key === null ? [] : [{ key: String(key) }], state: states[size + index] })),
        ],
        chained: false,
        aux: [
          { label: "table", values: [...first.map(() => "T1"), ...second.map(() => "T2")] },
          { label: "slot", values: [...first.map((_, index) => index), ...second.map((_, index) => index)] },
        ],
        note: `h1(k)=k mod ${size}; h2(k)=(3k+1) mod ${size}`,
      },
      description,
      descriptionAr,
      codeLine: phase === "evict" ? 2 : phase === "rehash" ? 4 : 1,
      counters: { evictions, rehashes, capacity: size * 2 },
      phase,
      transformation,
    });
  };

  const place = (key: number, record = true): boolean => {
    if (first[h1(key)] === key || second[h2(key)] === key) return true;
    let current = key;
    let table = 0;
    for (let kick = 0; kick < size * 2; kick++) {
      const index = table === 0 ? h1(current) : h2(current);
      const flat = table === 0 ? index : size + index;
      emit({ [flat]: "compare" }, `Probe T${table + 1}[${index}] for key ${current}.`, `افحص T${table + 1}[${index}] للمفتاح ${current}.`, "probe");
      const target = table === 0 ? first : second;
      if (target[index] === null) {
        target[index] = current;
        emit({ [flat]: "found" }, `Place ${current} in the empty slot.`, `ضع ${current} في الخانة الفارغة.`, "place");
        if (record) inserted.push(key);
        return true;
      }
      const displaced = target[index]!;
      emit({ [flat]: "swap" }, `Slot occupied by ${displaced}; evict it before writing ${current}.`, `الخانة مشغولة بـ${displaced}؛ أخرجه قبل كتابة ${current}.`, "evict");
      target[index] = current;
      current = displaced;
      evictions++;
      emit({ [flat]: "active" }, `${current} is now the displaced key and must move to its alternate table.`, `أصبح ${current} المفتاح المطرود ويجب نقله إلى الجدول البديل.`, "evict");
      table = 1 - table;
    }
    return false;
  };

  emit({}, "Start with two empty cuckoo-hash tables.", "ابدأ بجدولي تجزئة الوقواق فارغين.", "start");
  for (const key of input.values) {
    if (inserted.includes(key)) {
      emit({}, `Skip duplicate key ${key}.`, `تجاهل المفتاح المكرر ${key}.`, "duplicate");
      continue;
    }
    if (place(key)) continue;
    const all = [...inserted, key];
    const oldCapacity = size * 2;
    emit({}, `An eviction cycle was detected at capacity ${oldCapacity}; resize before retrying.`, `اكتُشفت دورة طرد عند السعة ${oldCapacity}؛ وسّع الجدولين قبل إعادة المحاولة.`, "rehash");
    while (true) {
      size = size * 2 + 1;
      first = Array(size).fill(null);
      second = Array(size).fill(null);
      inserted.length = 0;
      rehashes++;
      emit({}, `Allocate two new tables with ${size} slots each.`, `احجز جدولين جديدين في كل منهما ${size} خانة.`, "rehash", { kind: "resize", label: "Cuckoo table resize" });
      if (all.every((item) => place(item))) break;
    }
  }
  const locations = [h1(input.query), size + h2(input.query)];
  emit({ [locations[0]]: "compare" }, `Search checks T1[${locations[0]}].`, `يفحص البحث T1[${locations[0]}].`, "search");
  if (first[locations[0]] === input.query) {
    emit({ [locations[0]]: "found" }, `Found ${input.query} in T1.`, `عُثر على ${input.query} في T1.`, "search");
  } else {
    emit({ [locations[1]]: "compare" }, `Search checks the only alternate slot, T2[${locations[1] - size}].`, `يفحص البحث الخانة البديلة الوحيدة T2[${locations[1] - size}].`, "search");
    emit({ [locations[1]]: second[locations[1] - size] === input.query ? "found" : "discarded" }, second[locations[1] - size] === input.query ? `Found ${input.query} in T2.` : `${input.query} is absent.`, second[locations[1] - size] === input.query ? `عُثر على ${input.query} في T2.` : `${input.query} غير موجود.`, "search");
  }
  return steps;
}

function generateRobinHood(input: HashInput): Step<HashFrame>[] {
  const size = Math.max(7, input.values.length * 2 + 1);
  const table: ({ key: number; distance: number } | null)[] = Array(size).fill(null);
  const steps: Step<HashFrame>[] = [];
  let swaps = 0;
  const emit = (states: Record<number, CellState>, description: string, descriptionAr: string, phase: string) => {
    steps.push({
      frame: {
        buckets: table.map((entry, index) => ({ index, items: entry ? [{ key: String(entry.key) }] : [], state: states[index] })),
        chained: false,
        aux: [{ label: "probe distance", values: table.map((entry) => entry?.distance ?? "-") }],
        note: `home(k)=k mod ${size}`,
      },
      description,
      descriptionAr,
      codeLine: phase === "swap" ? 3 : phase === "search" ? 5 : 1,
      counters: { swaps, capacity: size },
      phase,
    });
  };
  emit({}, "Start with an empty Robin Hood hash table.", "ابدأ بجدول تجزئة روبن هود فارغ.", "start");
  for (const original of input.values) {
    let candidate = { key: original, distance: 0 };
    let index = mod(original, size);
    let inserted = false;
    for (let probes = 0; probes < size; probes++) {
      emit({ [index]: "compare" }, `Probe slot ${index} for ${candidate.key} at distance ${candidate.distance}.`, `افحص الخانة ${index} للمفتاح ${candidate.key} بمسافة ${candidate.distance}.`, "probe");
      if (table[index] === null) {
        table[index] = candidate;
        emit({ [index]: "found" }, `Place ${candidate.key}; its stored distance is ${candidate.distance}.`, `ضع ${candidate.key}؛ مسافة الفحص المخزنة ${candidate.distance}.`, "place");
        inserted = true;
        break;
      }
      if (table[index]!.key === candidate.key) {
        emit({ [index]: "discarded" }, `Duplicate ${candidate.key} changes nothing.`, `المفتاح المكرر ${candidate.key} لا يغيّر شيئاً.`, "duplicate");
        inserted = true;
        break;
      }
      if (table[index]!.distance < candidate.distance) {
        const resident = table[index]!;
        emit({ [index]: "swap" }, `${candidate.key} has probed farther than ${resident.key}; Robin Hood swaps them.`, `قطع ${candidate.key} مسافة أكبر من ${resident.key}؛ تبدلهما روبن هود.`, "swap");
        table[index] = candidate;
        candidate = { key: resident.key, distance: resident.distance };
        swaps++;
        emit({ [index]: "active" }, `${resident.key} becomes the displaced candidate.`, `أصبح ${resident.key} المرشح المطرود.`, "swap");
      }
      candidate = { ...candidate, distance: candidate.distance + 1 };
      index = (index + 1) % size;
    }
    if (!inserted) emit({}, `Table is full; ${original} cannot be inserted.`, `الجدول ممتلئ؛ لا يمكن إدراج ${original}.`, "overflow");
  }
  let index = mod(input.query, size);
  let distance = 0;
  for (let probes = 0; probes < size; probes++) {
    emit({ [index]: "compare" }, `Search ${input.query} at slot ${index}, distance ${distance}.`, `ابحث عن ${input.query} في الخانة ${index}، المسافة ${distance}.`, "search");
    const entry = table[index];
    if (entry === null || entry.distance < distance) {
      emit({ [index]: "discarded" }, `${input.query} is absent; Robin Hood's distance rule proves early termination.`, `${input.query} غير موجود؛ تثبت قاعدة المسافة إمكان التوقف المبكر.`, "search");
      break;
    }
    if (entry.key === input.query) {
      emit({ [index]: "found" }, `Found ${input.query}.`, `عُثر على ${input.query}.`, "search");
      break;
    }
    distance++;
    index = (index + 1) % size;
  }
  return steps;
}

function generateBloom(input: HashInput): Step<ArrayFrame>[] {
  const size = 23;
  const bits = Array(size).fill(0) as number[];
  const steps: Step<ArrayFrame>[] = [];
  const hashes = (key: number) => [
    mod(key, size),
    mod(Math.imul(key, 7) + 3, size),
    mod(Math.imul(key, 13) + 5, size),
  ];
  const emit = (states: Record<number, CellState>, description: string, descriptionAr: string, phase: string) => {
    steps.push({
      frame: {
        values: [...bits],
        states,
        aux: [{ label: "bit index", values: bits.map((_, index) => index) }],
        note: "A Bloom filter may return false positives, but never false negatives for inserted keys.",
      },
      description,
      descriptionAr,
      codeLine: phase === "insert" ? 2 : 4,
      counters: { setBits: bits.filter(Boolean).length, size },
      phase,
    });
  };
  emit({}, "Start with every Bloom-filter bit cleared.", "ابدأ بكل بتات مرشح بلوم مساوية للصفر.", "start");
  for (const key of input.values) {
    for (const index of hashes(key)) {
      emit({ [index]: "compare" }, `Hash ${key} to bit ${index}.`, `جزّئ ${key} إلى البت ${index}.`, "insert");
      bits[index] = 1;
      emit({ [index]: "found" }, `Set bit ${index}; existing set bits remain set.`, `اضبط البت ${index}؛ تبقى البتات المضبوطة كما هي.`, "insert");
    }
  }
  const queryHashes = hashes(input.query);
  let possible = true;
  for (const index of queryHashes) {
    emit({ [index]: "compare" }, `Check query bit ${index}.`, `افحص بت البحث ${index}.`, "search");
    if (bits[index] === 0) {
      possible = false;
      emit({ [index]: "discarded" }, `Bit ${index} is zero, so ${input.query} is definitely absent.`, `البت ${index} يساوي صفراً، لذلك ${input.query} غير موجود بالتأكيد.`, "search");
      break;
    }
  }
  if (possible) {
    emit(Object.fromEntries(queryHashes.map((index) => [index, "found" as const])), `All three bits are set: ${input.query} may be present (not a proof).`, `البتات الثلاثة مضبوطة: قد تكون ${input.query} موجودة، وهذا ليس إثباتاً.`, "search");
  }
  return steps;
}

const hashingBase = {
  category: "hashing" as const,
  inputFields: hashFields,
  defaultInput: (level: Parameters<typeof randomUnique>[0], rng: Parameters<typeof randomUnique>[1]) => {
    const values = randomUnique(level, rng, 8);
    return { values, query: values[Math.floor(values.length / 2)] };
  },
  parseInput: parseHash,
  serializeInput: (input: HashInput) => ({ values: input.values.join(", "), query: String(input.query) }),
};

export const cuckooHashing = makeModule<HashFrame, HashInput>({
  ...hashingBase,
  slug: "cuckoo-hashing",
  title: "Cuckoo Hashing",
  titleAr: "تجزئة الوقواق",
  difficulty: "Advanced",
  tags: ["hashing", "two tables", "eviction", "rehash"],
  tagsAr: ["تجزئة", "جدولان", "طرد", "إعادة تجزئة"],
  summary: "Stores every key in one of two hash locations, evicting occupants and resizing on a cycle.",
  summaryAr: "يخزن كل مفتاح في أحد موضعين، ويطرد الشاغلين ويوسع الجدول عند حدوث دورة.",
  renderer: "hash",
  pseudocode: ["insert key in h1(key)", "  if occupied, evict resident", "  move resident to its alternate table", "  repeat until empty slot", "  if cycle detected, resize and rehash all keys", "search checks h1 and h2 only"],
  pseudocodeAr: ["أدرج المفتاح في h1", "  إن كانت مشغولة فاطرد المقيم", "  انقل المقيم إلى جدوله البديل", "  كرر حتى خانة فارغة", "  عند الدورة وسّع وأعد تجزئة المفاتيح", "يفحص البحث h1 وh2 فقط"],
  overview: "Cuckoo hashing gives two possible homes to each key. Insertions may evict keys along a chain; a cycle requires a larger table and a full rehash.",
  overviewAr: "تمنح تجزئة الوقواق كل مفتاح موضعين محتملين، وقد يطرد الإدراج سلسلة من المفاتيح، وتتطلب الدورة توسيعاً وإعادة تجزئة.",
  complexity: complexities.hashExpected,
  applications: ["Fast lookup tables", "Networking", "Caches"],
  applicationsAr: ["جداول بحث سريعة", "الشبكات", "الذاكرة المخبأة"],
  generate: generateCuckoo,
});

export const robinHoodHashing = makeModule<HashFrame, HashInput>({
  ...hashingBase,
  slug: "robin-hood-hashing",
  title: "Robin Hood Hashing",
  titleAr: "تجزئة روبن هود",
  difficulty: "Advanced",
  tags: ["hashing", "open addressing", "probe distance"],
  tagsAr: ["تجزئة", "عنونة مفتوحة", "مسافة الفحص"],
  summary: "Equalizes probe lengths by letting farther-travelled keys displace richer residents.",
  summaryAr: "توازن أطوال الفحص بالسماح للمفتاح الذي قطع مسافة أكبر بطرد المقيم الأقرب.",
  renderer: "hash",
  pseudocode: ["probe from home slot", "  if empty, store key and distance", "  if candidate distance > resident distance", "    swap candidate and resident", "  continue probing", "search stops when resident distance < current distance"],
  pseudocodeAr: ["افحص من الخانة الأصلية", "  إن كانت فارغة فخزن المفتاح والمسافة", "  إن تجاوزت مسافة المرشح مسافة المقيم", "    بدّل المرشح والمقيم", "  تابع الفحص", "يتوقف البحث عندما تقل مسافة المقيم"],
  overview: "Robin Hood hashing reduces probe-length variance by moving long-travelled keys ahead of keys closer to home.",
  overviewAr: "تقلل تجزئة روبن هود تفاوت مسافات الفحص بتقديم المفاتيح الأبعد عن موضعها الأصلي.",
  complexity: complexities.hashExpected,
  applications: ["High-performance maps", "Compiler tables", "In-memory indexes"],
  applicationsAr: ["خرائط عالية الأداء", "جداول المترجمات", "فهارس الذاكرة"],
  generate: generateRobinHood,
});

export const bloomFilter = makeModule<ArrayFrame, HashInput>({
  ...hashingBase,
  slug: "bloom-filter",
  title: "Bloom Filter",
  titleAr: "مرشح بلوم",
  difficulty: "Intermediate",
  tags: ["probabilistic", "bitset", "multiple hashes"],
  tagsAr: ["احتمالي", "مصفوفة بتات", "دوال تجزئة متعددة"],
  summary: "Uses several hash-derived bits for space-efficient membership checks with possible false positives.",
  summaryAr: "يستخدم عدة بتات مشتقة من التجزئة لفحص العضوية بكفاءة مكانية مع احتمال إيجابيات كاذبة.",
  renderer: "array",
  pseudocode: ["insert(key)", "  for each hash function set bit[h(key)]", "contains(key)", "  for each hash function check bit[h(key)]", "  any zero => definitely absent", "  all one => possibly present"],
  pseudocodeAr: ["أدرج المفتاح", "  لكل دالة تجزئة اضبط البت المقابل", "افحص المفتاح", "  لكل دالة افحص البت المقابل", "  أي صفر يعني غير موجود بالتأكيد", "  كلها واحد يعني موجود ربما"],
  overview: "A Bloom filter is a compact probabilistic set: it never misses an inserted key but can report that an absent key may be present.",
  overviewAr: "مرشح بلوم مجموعة احتمالية مدمجة؛ لا ينفي مفتاحاً أُدرج، لكنه قد يعطي إيجابية كاذبة لمفتاح غائب.",
  complexity: { time: { best: "O(k)", average: "O(k)", worst: "O(k)" }, space: "O(m)" },
  applications: ["Cache filtering", "Database membership prechecks", "Web crawlers"],
  applicationsAr: ["ترشيح الذاكرة المخبأة", "فحص أولي لعضوية قواعد البيانات", "زواحف الويب"],
  generate: generateBloom,
});
