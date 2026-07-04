"use client";

/**
 * Simple SVG line chart of loss over epochs. `markers` are epoch indices
 * where the network architecture changed mid-run (rebuild while keeping
 * history) — drawn as a dashed vertical line so you can see the before/after
 * effect of an architecture edit on the same curve.
 */
export function LossChart({ history, markers = [] }: { history: number[]; markers?: number[] }) {
  const W = 300;
  const H = 140;
  const pad = 24;
  if (history.length < 2) {
    return (
      <div className="grid h-[140px] place-items-center text-xs text-muted-foreground">
        Train to see the loss curve
      </div>
    );
  }
  const max = Math.max(...history);
  const min = Math.min(...history);
  const range = max - min || 1;
  const x = (i: number) => pad + (i / (history.length - 1)) * (W - 2 * pad);
  const y = (v: number) => H - pad - ((v - min) / range) * (H - 2 * pad);
  const path = history.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--border)" strokeWidth={1} />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="var(--border)" strokeWidth={1} />
      {markers
        .filter((m) => m > 0 && m < history.length)
        .map((m, k) => (
          <line
            key={`marker-${k}`}
            x1={x(m)}
            y1={pad}
            x2={x(m)}
            y2={H - pad}
            stroke="var(--muted-foreground)"
            strokeWidth={1}
            strokeDasharray="3,3"
            opacity={0.6}
          />
        ))}
      <path d={path} fill="none" stroke="var(--primary)" strokeWidth={2} />
      <text x={pad} y={pad - 6} className="fill-[var(--muted-foreground)] text-[9px]">
        {max.toFixed(3)}
      </text>
      <text x={pad} y={H - pad + 14} className="fill-[var(--muted-foreground)] text-[9px]">
        {min.toFixed(3)}
      </text>
      <text x={W - pad} y={H - pad + 14} textAnchor="end" className="fill-[var(--muted-foreground)] text-[9px]">
        epoch {history.length}
      </text>
    </svg>
  );
}
