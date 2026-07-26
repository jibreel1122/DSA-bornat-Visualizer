import type { CellState, Level, RNG, Step, TreeFrame, TreeNodeF } from "@/lib/engine/types";
import { cloneFrame, makeTreeModule, step } from "./shared";

type Point = number[];
type Box = { low: number[]; high: number[] };
interface SpatialCell {
  id: string;
  bounds: Box;
  depth: number;
  points: Point[];
  children: SpatialCell[];
}
interface SpatialInput {
  points: Point[];
  range: Box;
}

function parseTuples(raw: string, dimensions: number, maximum = 16): Point[] {
  const tokens = raw.split(",").map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0) throw new Error("Enter at least one point.");
  if (tokens.length > maximum) throw new Error(`Use at most ${maximum} points.`);
  const points = tokens.map((token) => {
    const values = token.split(":").map(Number);
    if (values.length !== dimensions || values.some((value) => !Number.isInteger(value) || value < 0 || value > 99)) {
      throw new Error(`"${token}" must contain ${dimensions} integers from 0 to 99 separated by colons.`);
    }
    return values;
  });
  if (new Set(points.map((point) => point.join(":"))).size !== points.length) throw new Error("Points must be unique.");
  return points;
}

function parseRange(raw: string, dimensions: number): Box {
  const values = raw.split(":").map(Number);
  if (values.length !== dimensions * 2 || values.some((value) => !Number.isInteger(value) || value < 0 || value > 100)) {
    throw new Error(`Range must contain ${dimensions * 2} integers from 0 to 100.`);
  }
  const low = values.slice(0, dimensions);
  const high = values.slice(dimensions);
  if (low.some((value, index) => value > high[index])) throw new Error("Every lower range coordinate must be at most its upper coordinate.");
  return { low, high };
}

function spatialParser(dimensions: number) {
  return (fields: Record<string, string>): SpatialInput => ({
    points: parseTuples(fields.points ?? "", dimensions),
    range: parseRange(fields.range ?? "", dimensions),
  });
}

function spatialDefaults(dimensions: number, level: Level, rng: RNG): SpatialInput {
  const size = 3 + level;
  const points: Point[] = [];
  const seen = new Set<string>();
  while (points.length < size) {
    const point = Array.from({ length: dimensions }, () => rng.int(2, 97));
    const key = point.join(":");
    if (!seen.has(key)) {
      seen.add(key);
      points.push(point);
    }
  }
  return { points, range: { low: Array(dimensions).fill(20), high: Array(dimensions).fill(70) } };
}

function boundsLabel(bounds: Box): string {
  return bounds.low.map((value, index) => `${value}..${bounds.high[index]}`).join(" × ");
}

function spatialFrame(root: SpatialCell, states: Record<string, CellState>, results: Point[], name: string): TreeFrame {
  const nodes: Record<string, TreeNodeF> = {};
  const visit = (cell: SpatialCell) => {
    nodes[cell.id] = {
      id: cell.id,
      value: boundsLabel(cell.bounds),
      children: cell.children.map((child) => child.id),
      extra: cell.points.length ? cell.points.map((point) => `(${point.join(",")})`).join(" ") : `depth ${cell.depth}`,
    };
    cell.children.forEach(visit);
  };
  visit(root);
  return cloneFrame(nodes, root.id, states, [{ label: "range results", values: results.map((point) => `(${point.join(",")})`) }], `${name} leaves hold points; internal nodes partition space.`);
}

function pointChildIndex(cell: SpatialCell, point: Point): number {
  let index = 0;
  point.forEach((coordinate, dimension) => {
    const middle = (cell.bounds.low[dimension] + cell.bounds.high[dimension]) / 2;
    if (coordinate >= middle) index |= 1 << dimension;
  });
  return index;
}

function splitCell(cell: SpatialCell, dimensions: number, nextId: () => string) {
  const count = 1 << dimensions;
  cell.children = Array.from({ length: count }, (_, index) => {
    const low: number[] = [];
    const high: number[] = [];
    for (let dimension = 0; dimension < dimensions; dimension++) {
      const middle = (cell.bounds.low[dimension] + cell.bounds.high[dimension]) / 2;
      const upper = (index & (1 << dimension)) !== 0;
      low.push(upper ? middle : cell.bounds.low[dimension]);
      high.push(upper ? cell.bounds.high[dimension] : middle);
    }
    return { id: nextId(), bounds: { low, high }, depth: cell.depth + 1, points: [], children: [] };
  });
}

function intersects(left: Box, right: Box): boolean {
  return left.low.every((value, index) => value <= right.high[index] && right.low[index] <= left.high[index]);
}

function contains(box: Box, point: Point): boolean {
  return point.every((value, index) => box.low[index] <= value && value <= box.high[index]);
}

function generateSpatial(input: SpatialInput, dimensions: number, name: string): Step<TreeFrame>[] {
  let next = 1;
  const nextId = () => `sp${next++}`;
  const root: SpatialCell = {
    id: "sp0",
    bounds: { low: Array(dimensions).fill(0), high: Array(dimensions).fill(100) },
    depth: 0,
    points: [],
    children: [],
  };
  const results: Point[] = [];
  let splits = 0;
  let visits = 0;
  const steps: Step<TreeFrame>[] = [];
  const emit = (states: Record<string, CellState>, description: string, descriptionAr: string, line: number, phase: string, transformation?: Step<TreeFrame>["transformation"]) =>
    steps.push(step(spatialFrame(root, states, results, name), description, descriptionAr, line, phase, { splits, visits }, transformation));
  emit({}, `Start with one empty ${name} root region.`, `ابدأ بمنطقة جذر فارغة واحدة في ${name}.`, 0, "start");

  const place = (cell: SpatialCell, point: Point, narrate: boolean): void => {
    visits++;
    if (narrate) emit({ [cell.id]: "compare" }, `Visit region ${boundsLabel(cell.bounds)} for point (${point.join(",")}).`, `زر المنطقة ${boundsLabel(cell.bounds)} للنقطة (${point.join(",")}).`, 0, "descend");
    if (cell.children.length > 0) {
      place(cell.children[pointChildIndex(cell, point)], point, narrate);
      return;
    }
    if (cell.points.length === 0 || cell.depth >= 7) {
      cell.points.push(point);
      if (narrate) emit({ [cell.id]: "found" }, `Store point (${point.join(",")}) in this leaf.`, `خزّن النقطة (${point.join(",")}) في هذه الورقة.`, 1, "insert");
      return;
    }
    const previous = [...cell.points];
    emit({ [cell.id]: "swap" }, `Leaf ${cell.id} is occupied; prepare to split it into ${1 << dimensions} children.`, `الورقة ${cell.id} مشغولة؛ استعد لتقسيمها إلى ${1 << dimensions} أبناء.`, 2, "split");
    cell.points = [];
    splitCell(cell, dimensions, nextId);
    splits++;
    emit({ [cell.id]: "active", ...Object.fromEntries(cell.children.map((child) => [child.id, "found" as CellState])) }, `Complete the ${dimensions === 2 ? "quadrant" : "octant"} subdivision.`, `أكمل تقسيم ${dimensions === 2 ? "الأرباع" : "الأثمان"}.`, 2, "split", { kind: "rebuild", label: `${name} subdivision` });
    for (const oldPoint of previous) place(cell.children[pointChildIndex(cell, oldPoint)], oldPoint, false);
    place(cell.children[pointChildIndex(cell, point)], point, narrate);
  };

  input.points.forEach((point) => place(root, point, true));
  const query = (cell: SpatialCell): void => {
    visits++;
    const overlap = intersects(cell.bounds, input.range);
    emit({ [cell.id]: overlap ? "compare" : "discarded" }, overlap ? `Region ${boundsLabel(cell.bounds)} overlaps the query.` : `Prune disjoint region ${boundsLabel(cell.bounds)}.`, overlap ? `المنطقة ${boundsLabel(cell.bounds)} تتقاطع مع الاستعلام.` : `استبعد المنطقة المنفصلة ${boundsLabel(cell.bounds)}.`, 3, "range-query");
    if (!overlap) return;
    for (const point of cell.points) {
      if (contains(input.range, point)) results.push(point);
    }
    cell.children.forEach(query);
  };
  query(root);
  emit({}, `Range search found ${results.length} point(s).`, `وجد بحث النطاق ${results.length} نقطة.`, 3, "done");
  return steps;
}

const spatialFields2 = [
  { key: "points", label: "2D points", labelAr: "نقاط ثنائية", placeholder: "10:10, 70:70, 25:80", help: "Comma-separated x:y points in [0,99].", helpAr: "نقاط x:y مفصولة بفواصل ضمن [0,99].", list: true },
  { key: "range", label: "Query rectangle", labelAr: "مستطيل الاستعلام", placeholder: "0:0:50:50", help: "x1:y1:x2:y2.", helpAr: "x1:y1:x2:y2.", search: true },
];

export const quadtree = makeTreeModule<SpatialInput>({
  slug: "quadtree",
  title: "Quadtree",
  titleAr: "شجرة الأرباع",
  difficulty: "Advanced",
  tags: ["spatial index", "2D", "subdivision"],
  tagsAr: ["فهرس مكاني", "ثنائي الأبعاد", "تقسيم"],
  summary: "Recursively divide 2D space into four quadrants and prune range searches.",
  summaryAr: "قسّم الفضاء الثنائي تكرارياً إلى أربعة أرباع واستبعد المناطق غير المتقاطعة.",
  overview: "A point quadtree subdivides an occupied leaf into four equal regions and sends each point to exactly one child.",
  overviewAr: "تقسم شجرة الأرباع النقطية الورقة المشغولة إلى أربع مناطق متساوية وترسل كل نقطة إلى ابن واحد.",
  pseudocode: ["descend to the containing region", "store in an empty leaf", "split an occupied leaf into four", "prune regions outside the query"],
  complexity: { time: { best: "O(log n)", average: "O(log n)", worst: "O(n)" }, space: "O(n)" },
  applications: ["GIS", "Collision detection", "Image partitioning"],
  applicationsAr: ["نظم المعلومات الجغرافية", "كشف التصادم", "تقسيم الصور"],
  inputFields: spatialFields2,
  defaultInput: (level, rng) => spatialDefaults(2, level, rng),
  parseInput: spatialParser(2),
  serializeInput: (input) => ({ points: input.points.map((point) => point.join(":")).join(", "), range: [...input.range.low, ...input.range.high].join(":") }),
  generate: (input) => generateSpatial(input, 2, "quadtree"),
});

const spatialFields3 = [
  { key: "points", label: "3D points", labelAr: "نقاط ثلاثية", placeholder: "10:10:10, 70:70:70, 25:80:40", help: "Comma-separated x:y:z points in [0,99].", helpAr: "نقاط x:y:z مفصولة بفواصل ضمن [0,99].", list: true },
  { key: "range", label: "Query box", labelAr: "صندوق الاستعلام", placeholder: "0:0:0:50:50:50", help: "x1:y1:z1:x2:y2:z2.", helpAr: "x1:y1:z1:x2:y2:z2.", search: true },
];

export const octree = makeTreeModule<SpatialInput>({
  slug: "octree",
  title: "Octree",
  titleAr: "شجرة الأثمان",
  difficulty: "Advanced",
  tags: ["spatial index", "3D", "octants"],
  tagsAr: ["فهرس مكاني", "ثلاثي الأبعاد", "أثمان"],
  summary: "Recursively divide 3D space into eight octants.",
  summaryAr: "قسّم الفضاء الثلاثي تكرارياً إلى ثمانية أثمان.",
  overview: "An octree generalizes quadtree subdivision to three dimensions and prunes whole disjoint volumes.",
  overviewAr: "تعمم شجرة الأثمان تقسيم الأرباع إلى ثلاثة أبعاد وتستبعد أحجاماً منفصلة كاملة.",
  pseudocode: ["descend to the containing octant", "store in an empty leaf", "split an occupied leaf into eight", "prune boxes outside the query"],
  complexity: { time: { best: "O(log n)", average: "O(log n)", worst: "O(n)" }, space: "O(n)" },
  applications: ["3D engines", "Voxel storage", "Ray tracing"],
  applicationsAr: ["محركات ثلاثية الأبعاد", "تخزين فوكسل", "تتبع الأشعة"],
  inputFields: spatialFields3,
  defaultInput: (level, rng) => spatialDefaults(3, level, rng),
  parseInput: spatialParser(3),
  serializeInput: (input) => ({ points: input.points.map((point) => point.join(":")).join(", "), range: [...input.range.low, ...input.range.high].join(":") }),
  generate: (input) => generateSpatial(input, 3, "octree"),
});
