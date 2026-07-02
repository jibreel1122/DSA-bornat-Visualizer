"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { CallStackFrame } from "@/lib/engine/types";
import { AuxRows, FrameNote, vizFill } from "../viz-utils";

/** Call-stack / stack-structure renderer: frames grow upward, output below. */
export function CallStackView({ frame }: { frame: CallStackFrame }) {
  return (
    <div className="relative flex h-full w-full flex-col p-4">
      <FrameNote note={frame.note} />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-end gap-1.5 overflow-y-auto py-2">
        <AnimatePresence initial={false}>
          {[...frame.stack].reverse().map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="flex w-full max-w-md items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-white shadow-sm"
              style={{ background: vizFill(item.state) }}
            >
              <span className="font-mono text-sm font-semibold">{item.label}</span>
              {item.detail && <span className="text-xs opacity-85">{item.detail}</span>}
            </motion.div>
          ))}
        </AnimatePresence>
        {frame.stack.length === 0 && (
          <span className="pb-6 text-sm text-muted-foreground">call stack empty</span>
        )}
        <div className="mt-1 h-1 w-full max-w-md rounded bg-border" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">stack base</span>
      </div>
      {frame.output && frame.output.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="min-w-16 text-xs font-medium text-muted-foreground">Output</span>
          {frame.output.map((v, i) => (
            <span key={i} className="rounded-md bg-secondary px-2 py-1 font-mono text-xs">
              {v}
            </span>
          ))}
        </div>
      )}
      <AuxRows rows={frame.aux} className="mt-2" />
    </div>
  );
}
