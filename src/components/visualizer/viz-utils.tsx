import type { AuxRow, CellState } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

/** Fill color for a cell/node state — resolved from CSS design tokens. */
export function vizFill(state?: CellState): string {
  return `var(--viz-${state ?? "default"})`;
}

/** Whether text on top of this state color should be white. */
export function isDarkFill(state?: CellState): boolean {
  return state !== "discarded";
}

export const STATE_LEGEND: { state: CellState; label: string }[] = [
  { state: "active", label: "Active" },
  { state: "compare", label: "Comparing" },
  { state: "swap", label: "Swapping" },
  { state: "sorted", label: "Sorted / Done" },
  { state: "pivot", label: "Pivot" },
  { state: "found", label: "Found" },
  { state: "visited", label: "Visited" },
  { state: "discarded", label: "Discarded" },
  { state: "special", label: "Special" },
];

/** Auxiliary data rows (queues, buffers, count arrays, failure functions…). */
export function AuxRows({ rows, className }: { rows?: AuxRow[]; className?: string }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {rows.map((row, i) => (
        <div key={`${row.label}-${i}`} className="flex flex-wrap items-center gap-1.5">
          <span className="min-w-16 text-xs font-medium text-muted-foreground">{row.label}</span>
          {row.values.length === 0 ? (
            <span className="text-xs italic text-muted-foreground/60">empty</span>
          ) : (
            row.values.map((v, j) => (
              <span
                key={j}
                className="grid min-w-7 place-items-center rounded-md px-1.5 py-1 font-mono text-xs text-white transition-colors duration-300"
                style={{ background: vizFill(row.states?.[j]) }}
              >
                {v}
              </span>
            ))
          )}
        </div>
      ))}
    </div>
  );
}

export function FrameNote({ note }: { note?: string }) {
  if (!note) return null;
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[70%] rounded-lg bg-popover/80 px-2.5 py-1.5 text-xs text-muted-foreground backdrop-blur">
      {note}
    </div>
  );
}
