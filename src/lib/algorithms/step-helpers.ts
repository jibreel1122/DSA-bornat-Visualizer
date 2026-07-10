import type { ArrayFrame, CellState } from "@/lib/engine/types";

/**
 * Shared frame builder for comparison sorts over a single number array.
 * Merges "sorted" markers for a suffix ([sortedFrom, length)) and/or a
 * prefix ([0, sortedTo)) without overwriting explicit per-index states.
 *
 * `note` is always included on the returned frame (even as `undefined`) to
 * match the pre-refactor per-file `frame()` helpers, which unconditionally
 * returned a `note` property. `pointers` and `aux`, by contrast, are only
 * included when actually supplied — the pre-refactor helpers that didn't
 * accept those options never emitted the keys at all, and Vitest's snapshot
 * serializer treats `{ pointers: undefined }` as distinct from an omitted
 * `pointers` key. Getting this wrong breaks byte-identical golden snapshots.
 */
export function arrayFrame(
  values: number[],
  states: Record<number, CellState> = {},
  opts?: {
    sortedFrom?: number;
    sortedTo?: number;
    note?: string;
    pointers?: ArrayFrame["pointers"];
    aux?: ArrayFrame["aux"];
  },
): ArrayFrame {
  const merged: Record<number, CellState> = { ...states };
  if (opts?.sortedFrom !== undefined)
    for (let i = opts.sortedFrom; i < values.length; i++) merged[i] ??= "sorted";
  if (opts?.sortedTo !== undefined)
    for (let i = 0; i < Math.min(opts.sortedTo, values.length); i++) merged[i] ??= "sorted";
  const frame: ArrayFrame = { values: [...values], states: merged, note: opts?.note };
  if (opts?.pointers !== undefined) frame.pointers = opts.pointers;
  if (opts?.aux !== undefined) frame.aux = opts.aux;
  return frame;
}
