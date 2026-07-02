"use client";

import type {
  ArrayFrame,
  CallStackFrame,
  GraphFrame,
  GridFrame,
  HashFrame,
  ListFrame,
  RendererKind,
  StringFrame,
  TableFrame,
  TreeFrame,
} from "@/lib/engine/types";
import { ArrayView } from "./array-view";
import { ListView } from "./list-view";
import { TreeView } from "./tree-view";
import { GraphView } from "./graph-view";
import { GridView } from "./grid-view";
import { TableView } from "./table-view";
import { CallStackView } from "./callstack-view";
import { StringView } from "./string-view";
import { HashView } from "./hash-view";

export function RendererSwitch({ kind, frame }: { kind: RendererKind; frame: unknown }) {
  switch (kind) {
    case "array":
      return <ArrayView frame={frame as ArrayFrame} />;
    case "list":
      return <ListView frame={frame as ListFrame} />;
    case "tree":
      return <TreeView frame={frame as TreeFrame} />;
    case "graph":
      return <GraphView frame={frame as GraphFrame} />;
    case "grid":
      return <GridView frame={frame as GridFrame} />;
    case "table":
      return <TableView frame={frame as TableFrame} />;
    case "callstack":
      return <CallStackView frame={frame as CallStackFrame} />;
    case "string":
      return <StringView frame={frame as StringFrame} />;
    case "hash":
      return <HashView frame={frame as HashFrame} />;
    default:
      return null;
  }
}
