"use client";

import * as React from "react";
import type { Network, Sample } from "@/lib/nn/network";

/**
 * Heatmap of the network's output across the 2-D input plane, with the
 * dataset points overlaid. Recomputes whenever `version` changes.
 */
export function DecisionBoundary({
  net,
  samples,
  version,
}: {
  net: Network;
  samples: Sample[];
  version: number;
}) {
  const GRID = 24;
  const size = 220;
  const cell = size / GRID;

  const cells = React.useMemo(() => {
    const out: { x: number; y: number; v: number }[] = [];
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        const x = (i + 0.5) / GRID;
        const y = (j + 0.5) / GRID;
        const v = net.forward([x, y]).output[0];
        out.push({ x: i, y: j, v });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [net, version]);

  const color = (v: number) => {
    const t = Math.max(0, Math.min(1, v));
    // rose (0) → muted (0.5) → teal (1)
    return `color-mix(in oklch, oklch(0.7 0.15 175) ${Math.round(t * 100)}%, oklch(0.65 0.2 15))`;
  };

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full rounded-lg" style={{ maxWidth: 260 }}>
      {cells.map((c, k) => (
        <rect key={k} x={c.x * cell} y={size - (c.y + 1) * cell} width={cell + 0.5} height={cell + 0.5} fill={color(c.v)} opacity={0.85} />
      ))}
      {samples.map((s, k) => (
        <circle
          key={`p-${k}`}
          cx={s.input[0] * size}
          cy={size - s.input[1] * size}
          r={5}
          fill={s.target[0] >= 0.5 ? "oklch(0.75 0.15 175)" : "oklch(0.68 0.2 15)"}
          stroke="white"
          strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}
