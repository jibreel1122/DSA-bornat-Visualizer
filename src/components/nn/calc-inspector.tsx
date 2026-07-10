"use client";

import * as React from "react";
import type { ForwardPass, Gradients, Network } from "@/lib/nn/network";
import { ACTIVATIONS } from "@/lib/nn/activations";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";

/**
 * Shows the exact math for a selected neuron: the weighted sum term by term,
 * the activation function, and (after a backward pass) its gradient signal.
 */
export function CalcInspector({
  net,
  pass,
  grads,
  selected,
  onEdited,
}: {
  net: Network;
  pass: ForwardPass | null;
  grads: Gradients | null;
  selected: { layer: number; index: number } | null;
  /** called after a weight/bias is edited in place, so the caller can force a re-render */
  onEdited?: () => void;
}) {
  const { t } = useLocale();
  if (!selected || !pass) {
    return (
      <div className="grid h-full min-h-[160px] place-items-center text-center text-sm text-muted-foreground">
        {t("nn.clickNeuronToInspect")}
      </div>
    );
  }
  const { layer, index } = selected;

  if (layer === 0) {
    return (
      <div className="text-sm">
        <div className="font-medium">{t("nn.inputNeuronLabel", { index: index + 1 })}</div>
        <p className="mt-1 text-muted-foreground">
          {t("nn.valueEquals")} <span className="font-mono text-foreground">{pass.a[0][index].toFixed(4)}</span>. {t("nn.inputNeuronNote")}
        </p>
      </div>
    );
  }

  const ti = layer - 1; // transition index feeding this layer
  const W = net.weights[ti][index];
  const b = net.biases[ti][index];
  const prev = pass.a[layer - 1];
  const z = pass.z[ti][index];
  const a = pass.a[layer][index];
  const actId = net.activations[ti];
  const act = ACTIVATIONS[actId];
  const delta = grads?.delta?.[ti]?.[index];

  return (
    <div className="grid gap-3 text-sm">
      <div className="font-medium">
        {layer === net.layerSizes.length - 1 ? t("nn.layerOutput") : t("nn.layerHidden", { n: layer })}{" "}
        {t("nn.neuronHash", { index: index + 1 })}
        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{act.label}</span>
      </div>

      <div>
        <div className="mb-1 text-xs font-medium text-muted-foreground">
          {t("nn.weightedSumLabel")} <span dir="ltr">z = b + Σ wᵢ·aᵢ</span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table dir="ltr" className="w-full text-[11px]">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-2 py-1 text-left">{t("nn.tableTerm")}</th>
                <th className="px-2 py-1 text-right">{t("nn.tableWeight")}</th>
                <th className="px-2 py-1 text-right">{t("nn.tableInputA")}</th>
                <th className="px-2 py-1 text-right">w·a</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr className="border-t border-border/60">
                <td className="px-2 py-1">{t("nn.tableBias")}</td>
                <td className="px-2 py-1 text-right">
                  <EditableCell
                    value={b}
                    onCommit={(v) => {
                      net.setBias(ti, index, v);
                      onEdited?.();
                    }}
                  />
                </td>
                <td className="px-2 py-1 text-right text-muted-foreground">1</td>
                <td className="px-2 py-1 text-right">{b.toFixed(3)}</td>
              </tr>
              {W.map((w, c) => (
                <tr key={c} className="border-t border-border/60">
                  <td className="px-2 py-1">w{c + 1}·a{c + 1}</td>
                  <td className="px-2 py-1 text-right">
                    <EditableCell
                      value={w}
                      onCommit={(v) => {
                        net.setWeight(ti, index, c, v);
                        onEdited?.();
                      }}
                    />
                  </td>
                  <td className="px-2 py-1 text-right">{prev[c].toFixed(3)}</td>
                  <td className="px-2 py-1 text-right">{(w * prev[c]).toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label={t("nn.zWeightedSum")} value={z.toFixed(4)} />
        <Stat label={`a = ${act.label}(z)`} value={a.toFixed(4)} accent />
        {delta !== undefined && <Stat label="δ = ∂Loss/∂z" value={delta.toFixed(4)} />}
        {delta !== undefined && <Stat label="∂Loss/∂b" value={delta.toFixed(4)} />}
      </div>

      {delta !== undefined && (
        <p className="text-xs text-muted-foreground">
          {t("nn.backpropNote", { delta: delta.toFixed(4) })}
        </p>
      )}
    </div>
  );
}

/**
 * A compact inline-editable number cell for the weighted-sum table. Shows the
 * current value formatted like the rest of the table; on focus it switches to
 * a raw editable number input, and commits (calling `onCommit`) on blur or Enter.
 */
function EditableCell({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const { t } = useLocale();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(String(value));

  React.useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  const commit = () => {
    const v = parseFloat(draft);
    if (Number.isFinite(v)) onCommit(v);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(String(value));
          setEditing(true);
        }}
        className="w-full rounded px-1 text-right font-mono text-[11px] hover:bg-accent"
        title={t("nn.clickToEdit")}
      >
        {value.toFixed(3)}
      </button>
    );
  }

  return (
    <Input
      autoFocus
      type="number"
      step="any"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          setDraft(String(value));
          setEditing(false);
        }
      }}
      className="h-6 w-20 px-1 py-0 text-right font-mono text-[11px]"
    />
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-mono text-sm font-semibold ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
