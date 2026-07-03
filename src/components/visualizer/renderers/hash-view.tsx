"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { HashFrame } from "@/lib/engine/types";
import { AuxRows, FrameNote, vizFill } from "../viz-utils";

/** Hash table renderer: chained buckets as arrow lists, open addressing as slots. */
export function HashView({ frame }: { frame: HashFrame }) {
  return (
    <div className="relative flex h-full w-full flex-col p-4">
      <FrameNote note={frame.note} />
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
        {frame.chained ? (
          <div className="grid w-full max-w-xl gap-1.5">
            {frame.buckets.map((b) => (
              <div key={b.index} className="flex items-center gap-2">
                <div
                  className="grid size-8 shrink-0 place-items-center rounded-md font-mono text-xs font-semibold transition-colors duration-200"
                  style={{
                    background: !b.state || b.state === "default" ? "var(--muted)" : vizFill(b.state),
                    color: !b.state || b.state === "default" ? "var(--foreground)" : "white",
                  }}
                >
                  {b.index}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <AnimatePresence initial={false}>
                    {b.items.map((item, i) => (
                      <motion.span
                        key={`${item.key}-${i}`}
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        className="flex items-center gap-1"
                      >
                        {i > 0 && <span className="text-muted-foreground">→</span>}
                        <span
                          className="rounded-md px-2 py-1 font-mono text-xs font-medium text-white transition-colors duration-200"
                          style={{ background: vizFill(item.state ?? "active") }}
                        >
                          {item.key}
                        </span>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                  {b.items.length === 0 && (
                    <span className="text-xs italic text-muted-foreground/50">∅</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex max-w-2xl flex-wrap justify-center gap-1.5">
            {frame.buckets.map((b) => {
              const item = b.items[0];
              return (
                <div key={b.index} className="flex flex-col items-center gap-1">
                  <div
                    className="grid size-11 place-items-center rounded-lg font-mono text-xs font-semibold transition-colors duration-200"
                    style={{
                      background: item
                        ? vizFill(item.state ?? "active")
                        : !b.state || b.state === "default"
                          ? "var(--muted)"
                          : vizFill(b.state),
                      color: item || (b.state && b.state !== "default") ? "white" : "var(--muted-foreground)",
                    }}
                  >
                    {item ? item.key : ""}
                  </div>
                  <span className="font-mono text-[9px] text-muted-foreground/70">{b.index}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <AuxRows rows={frame.aux} className="mt-2" />
    </div>
  );
}
