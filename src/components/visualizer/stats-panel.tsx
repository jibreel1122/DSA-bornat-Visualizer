"use client";

import type { Step } from "@/lib/engine/types";
import { formatBytes, roughSizeOf } from "@/lib/utils";
import { STATE_LEGEND, vizFill } from "./viz-utils";

/** Operation counters, step indicator, memory estimate, and color legend. */
export function StatsPanel({
  step,
  cursor,
  total,
}: {
  step: Step | undefined;
  cursor: number;
  total: number;
}) {
  const counters = Object.entries(step?.counters ?? {});
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Step" value={total === 0 ? "—" : `${cursor + 1} / ${total}`} />
        <Stat label="Memory (frame)" value={step ? formatBytes(roughSizeOf(step.frame)) : "—"} />
        {counters.map(([k, v]) => (
          <Stat key={k} label={prettify(k)} value={String(v)} />
        ))}
      </div>
      <div>
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">Legend</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {STATE_LEGEND.map((l) => (
            <span key={l.state} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2.5 rounded-full" style={{ background: vizFill(l.state) }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function prettify(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}
