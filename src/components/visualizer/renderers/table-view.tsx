"use client";

import type { TableFrame } from "@/lib/engine/types";
import { AuxRows, FrameNote, vizFill } from "../viz-utils";

/** DP-table renderer with row/column labels and per-cell states. */
export function TableView({ frame }: { frame: TableFrame }) {
  const compact = frame.colLabels.length > 12;
  const cellCls = compact ? "min-w-8 px-1.5 py-1 text-[10px]" : "min-w-10 px-2 py-1.5 text-xs";
  return (
    <div className="relative flex h-full w-full flex-col p-4">
      <FrameNote note={frame.note} />
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
        <table dir="ltr" className="border-separate border-spacing-[3px]">
          <thead>
            <tr>
              <th />
              {frame.colLabels.map((c, i) => (
                <th key={i} className="px-1 pb-1 font-mono text-[10px] font-medium text-muted-foreground">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {frame.cells.map((row, r) => (
              <tr key={r}>
                <td className="pr-2 text-right font-mono text-[10px] font-medium text-muted-foreground">
                  {frame.rowLabels[r]}
                </td>
                {row.map((c, i) => {
                  const isDefault = !c.state || c.state === "default";
                  return (
                    <td
                      key={i}
                      className={`rounded-md text-center font-mono transition-colors duration-200 ${cellCls}`}
                      style={{
                        background: isDefault ? "var(--muted)" : vizFill(c.state),
                        color: isDefault
                          ? c.value === null
                            ? "var(--muted-foreground)"
                            : "var(--foreground)"
                          : "white",
                      }}
                    >
                      {c.value === null ? "·" : c.value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AuxRows rows={frame.aux} className="mt-2" />
    </div>
  );
}
