"use client";

import type { ArrayFrame } from "@/lib/engine/types";
import { AuxRows, FrameNote, vizFill } from "../viz-utils";
import { cn } from "@/lib/utils";

/**
 * Bar-chart renderer for array algorithms (sorting, searching).
 * Heights are proportional to values; colors follow the shared state palette.
 */
export function ArrayView({ frame }: { frame: ArrayFrame }) {
  const n = frame.values.length;
  const max = Math.max(1, ...frame.values.map((v) => Math.abs(v)));
  const wide = n > 18;

  const pointerByIndex = new Map<number, string[]>();
  for (const p of frame.pointers ?? []) {
    if (!pointerByIndex.has(p.index)) pointerByIndex.set(p.index, []);
    pointerByIndex.get(p.index)!.push(p.label);
  }

  return (
    <div className="relative flex h-full w-full flex-col justify-end gap-3 p-4">
      <FrameNote note={frame.note} />
      <div className="flex min-h-0 flex-1 items-end justify-center gap-[3px]">
        {frame.values.map((v, i) => {
          const inRange =
            !frame.range || (i >= frame.range.from && i <= frame.range.to);
          const state = frame.states?.[i] ?? (inRange ? "default" : "discarded");
          const labels = pointerByIndex.get(i);
          return (
            <div
              key={i}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              style={{ maxWidth: 56 }}
            >
              {!wide && (
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                  {v}
                </span>
              )}
              <div
                className="w-full rounded-t-md transition-all duration-300 ease-out"
                style={{
                  height: `${8 + (Math.abs(v) / max) * 78}%`,
                  background: vizFill(state),
                  opacity: inRange ? 1 : 0.45,
                }}
                title={`a[${i}] = ${v}`}
              />
              <span
                className={cn(
                  "font-mono text-[10px] tabular-nums",
                  labels ? "font-bold text-primary" : "text-muted-foreground/60",
                )}
              >
                {wide && !labels ? (i % 2 === 0 ? i : " ") : i}
              </span>
              <span className="h-4 text-center text-[10px] font-semibold leading-none text-primary">
                {labels ? labels.join(",") : " "}
              </span>
            </div>
          );
        })}
      </div>
      <AuxRows rows={frame.aux} />
    </div>
  );
}
