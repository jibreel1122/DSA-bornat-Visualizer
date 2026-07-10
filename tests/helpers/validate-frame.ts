import type {
  ArrayFrame,
  CallStackFrame,
  CellState,
  GraphFrame,
  GridFrame,
  HashFrame,
  ListFrame,
  RendererKind,
  StringFrame,
  TableFrame,
  TreeFrame,
} from "@/lib/engine/types";

const CELL_STATES = new Set<string>([
  "default", "active", "compare", "swap", "sorted",
  "pivot", "found", "discarded", "visited", "special",
]);

const isFinite_ = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);

function checkStates(
  states: Record<string | number, CellState> | undefined,
  isValidKey: (k: string) => boolean,
  out: string[],
  label: string,
) {
  for (const [k, v] of Object.entries(states ?? {})) {
    if (!isValidKey(k)) out.push(`${label} key "${k}" does not reference an existing element`);
    if (!CELL_STATES.has(v)) out.push(`${label}["${k}"] has invalid state "${v}"`);
  }
}

function validateArray(f: ArrayFrame, out: string[]) {
  if (!Array.isArray(f.values)) return void out.push("values is not an array");
  f.values.forEach((v, i) => { if (!isFinite_(v)) out.push(`values[${i}] is not a finite number`); });
  const inRange = (k: string) => {
    const i = Number(k);
    return Number.isInteger(i) && i >= 0 && i < f.values.length;
  };
  checkStates(f.states, inRange, out, "states");
  for (const p of f.pointers ?? []) {
    // -1 (before start) and length (past end) are allowed as sentinel positions
    if (!Number.isInteger(p.index) || p.index < -1 || p.index > f.values.length)
      out.push(`pointer "${p.label}" index ${p.index} out of range`);
  }
  if (f.range && f.range.from > f.range.to)
    out.push(`range.from (${f.range.from}) > range.to (${f.range.to})`);
}

function validateList(f: ListFrame, out: string[]) {
  const ids = new Set(f.nodes.map((n) => n.id));
  if (ids.size !== f.nodes.length) out.push("duplicate node ids");
  for (const l of f.links) {
    if (!ids.has(l.from)) out.push(`link.from "${l.from}" missing`);
    if (!ids.has(l.to)) out.push(`link.to "${l.to}" missing`);
  }
  for (const p of f.pointers ?? [])
    if (p.nodeId !== null && !ids.has(p.nodeId))
      out.push(`pointer "${p.label}" references missing node "${p.nodeId}"`);
  checkStates(f.states, (k) => ids.has(k), out, "states");
}

function validateTree(f: TreeFrame, out: string[]) {
  const ids = new Set(Object.keys(f.nodes));
  if (f.rootId !== null && !ids.has(f.rootId))
    out.push(`rootId "${f.rootId}" missing from nodes`);
  for (const [id, n] of Object.entries(f.nodes)) {
    for (const child of [n.left, n.right, ...(n.children ?? [])]) {
      if (child != null && !ids.has(child))
        out.push(`node "${id}" references missing child "${child}"`);
      if (child === id) out.push(`node "${id}" is its own child`);
    }
  }
  checkStates(f.states, (k) => ids.has(k), out, "states");
}

function validateGraph(f: GraphFrame, out: string[]) {
  const ids = new Set(f.nodes.map((n) => n.id));
  if (ids.size !== f.nodes.length) out.push("duplicate node ids");
  for (const e of f.edges) {
    if (!ids.has(e.from)) out.push(`edge.from "${e.from}" missing`);
    if (!ids.has(e.to)) out.push(`edge.to "${e.to}" missing`);
    if (e.weight !== undefined && !isFinite_(e.weight))
      out.push(`edge ${e.from}->${e.to} has non-finite weight`);
  }
  checkStates(f.nodeStates, (k) => ids.has(k), out, "nodeStates");
  for (const [k, v] of Object.entries(f.edgeStates ?? {})) {
    if (!k.includes("->")) out.push(`edgeStates key "${k}" is not "from->to"`);
    else {
      const [from, to] = k.split("->");
      if (!ids.has(from) || !ids.has(to))
        out.push(`edgeStates key "${k}" references missing node`);
    }
    if (!CELL_STATES.has(v)) out.push(`edgeStates["${k}"] invalid state "${v}"`);
  }
  for (const k of Object.keys(f.nodeAnnotations ?? {}))
    if (!ids.has(k)) out.push(`nodeAnnotations key "${k}" references missing node`);
}

function validateGrid(f: GridFrame, out: string[]) {
  if (f.cells.length !== f.rows)
    out.push(`cells has ${f.cells.length} rows, expected ${f.rows}`);
  f.cells.forEach((row, r) => {
    if (row.length !== f.cols)
      out.push(`row ${r} has ${row.length} cols, expected ${f.cols}`);
    row.forEach((c, cIdx) => {
      if (c.state !== undefined && !CELL_STATES.has(c.state))
        out.push(`cell [${r}][${cIdx}] invalid state "${c.state}"`);
    });
  });
}

function validateTable(f: TableFrame, out: string[]) {
  if (f.cells.length !== f.rowLabels.length)
    out.push(`cells has ${f.cells.length} rows, expected ${f.rowLabels.length}`);
  f.cells.forEach((row, r) => {
    if (row.length !== f.colLabels.length)
      out.push(`row ${r} has ${row.length} cols, expected ${f.colLabels.length}`);
  });
}

function validateCallstack(f: CallStackFrame, out: string[]) {
  const ids = new Set(f.stack.map((s) => s.id));
  if (ids.size !== f.stack.length) out.push("duplicate call-stack item ids");
  for (const s of f.stack)
    if (s.state !== undefined && !CELL_STATES.has(s.state))
      out.push(`stack item "${s.id}" invalid state "${s.state}"`);
}

function validateString(f: StringFrame, out: string[]) {
  for (const t of f.text)
    if (t.state !== undefined && !CELL_STATES.has(t.state))
      out.push(`text char invalid state "${t.state}"`);
  if (f.shift !== undefined && !Number.isInteger(f.shift))
    out.push(`shift ${f.shift} is not an integer`);
}

function validateHash(f: HashFrame, out: string[]) {
  if (typeof f.chained !== "boolean") out.push("chained flag missing");
  for (const b of f.buckets) {
    if (!Number.isInteger(b.index) || b.index < 0)
      out.push(`bucket index ${b.index} invalid`);
    for (const item of b.items)
      if (item.state !== undefined && !CELL_STATES.has(item.state))
        out.push(`bucket ${b.index} item "${item.key}" invalid state`);
  }
}

export function validateFrame(kind: RendererKind, frame: unknown): string[] {
  const out: string[] = [];
  if (frame === null || typeof frame !== "object") return [`frame is not an object`];
  switch (kind) {
    case "array": validateArray(frame as ArrayFrame, out); break;
    case "list": validateList(frame as ListFrame, out); break;
    case "tree": validateTree(frame as TreeFrame, out); break;
    case "graph": validateGraph(frame as GraphFrame, out); break;
    case "grid": validateGrid(frame as GridFrame, out); break;
    case "table": validateTable(frame as TableFrame, out); break;
    case "callstack": validateCallstack(frame as CallStackFrame, out); break;
    case "string": validateString(frame as StringFrame, out); break;
    case "hash": validateHash(frame as HashFrame, out); break;
  }
  return out;
}
