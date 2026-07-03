"use client";

import type { GridFrame } from "@/lib/engine/types";
import { AuxRows, FrameNote, isEmphasized, vizFill } from "../viz-utils";

/** Matrix renderer for mazes, boards (N-Queens, Sudoku), and sieves. */
export function GridView({ frame }: { frame: GridFrame }) {
  const cell = frame.cols > 12 ? 30 : frame.cols > 9 ? 38 : 46;
  return (
    <div className="relative flex h-full w-full flex-col p-4">
      <FrameNote note={frame.note} />
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
        <div
          className="grid gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${frame.cols}, ${cell}px)` }}
        >
          {frame.cells.flatMap((row, r) =>
            row.map((c, col) => {
              const isDefault = !c.state || c.state === "default";
              return (
                <div
                  key={`${r}-${col}`}
                  className="grid origin-center place-items-center rounded-md font-mono text-xs font-semibold transition-all duration-200"
                  style={{
                    width: cell,
                    height: cell,
                    background: isDefault ? "var(--muted)" : vizFill(c.state),
                    color: isDefault ? "var(--foreground)" : "white",
                    transform: isEmphasized(c.state) ? "scale(1.1)" : "scale(1)",
                    boxShadow: isEmphasized(c.state)
                      ? `0 0 0 2px color-mix(in oklch, ${vizFill(c.state)} 60%, transparent)`
                      : "none",
                  }}
                >
                  {c.value ?? ""}
                </div>
              );
            }),
          )}
        </div>
      </div>
      <AuxRows rows={frame.aux} className="mt-2" />
    </div>
  );
}
