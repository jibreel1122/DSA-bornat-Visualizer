"use client";

import type { StringFrame } from "@/lib/engine/types";
import { AuxRows, FrameNote, vizFill } from "../viz-utils";

const CELL = 34;

/** Pattern-matching renderer: text row, shifted pattern row, aux arrays. */
export function StringView({ frame }: { frame: StringFrame }) {
  const shift = frame.shift ?? 0;
  const cols = Math.max(frame.text.length, shift + (frame.pattern?.length ?? 0));

  const Cell = ({ ch, state, ghost }: { ch: string; state?: StringFrame["text"][0]["state"]; ghost?: boolean }) => {
    const isDefault = !state || state === "default";
    return (
      <div
        className="grid place-items-center rounded-md font-mono text-sm font-semibold transition-colors duration-300"
        style={{
          width: CELL,
          height: CELL,
          background: ghost ? "transparent" : isDefault ? "var(--muted)" : vizFill(state),
          color: ghost ? "transparent" : isDefault ? "var(--foreground)" : "white",
        }}
      >
        {ch}
      </div>
    );
  };

  return (
    <div className="relative flex h-full w-full flex-col p-4">
      <FrameNote note={frame.note} />
      <div className="flex min-h-0 flex-1 flex-col items-start justify-center gap-2 overflow-x-auto px-2">
        <div className="mx-auto flex flex-col gap-1.5">
          {/* indices */}
          <div className="flex gap-[3px]">
            {Array.from({ length: cols }, (_, i) => (
              <div key={i} className="text-center font-mono text-[9px] text-muted-foreground/70" style={{ width: CELL }}>
                {i < frame.text.length ? i : ""}
              </div>
            ))}
          </div>
          {/* text */}
          <div className="flex items-center gap-[3px]">
            {frame.text.map((c, i) => (
              <Cell key={i} ch={c.ch} state={c.state} />
            ))}
            <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">text</span>
          </div>
          {/* pattern (shifted) */}
          {frame.pattern && (
            <div className="flex items-center gap-[3px]">
              {Array.from({ length: shift }, (_, i) => (
                <Cell key={`g${i}`} ch="·" ghost />
              ))}
              {frame.pattern.map((c, i) => (
                <Cell key={i} ch={c.ch} state={c.state} />
              ))}
              <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">pattern</span>
            </div>
          )}
        </div>
        <div className="mx-auto w-full max-w-2xl">
          <AuxRows rows={frame.aux} className="mt-3" />
        </div>
      </div>
    </div>
  );
}
