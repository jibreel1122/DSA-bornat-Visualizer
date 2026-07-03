"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Brain, Minus, Pause, Play, Plus, RotateCcw, Shuffle, StepForward } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/catalog/page-header";
import { Network, type ForwardPass, type Gradients } from "@/lib/nn/network";
import { DATASETS, DATASET_IDS } from "@/lib/nn/datasets";
import { ACTIVATIONS, HIDDEN_ACTIVATIONS, OUTPUT_ACTIVATIONS, type ActivationId } from "@/lib/nn/activations";
import { useSettings } from "@/components/providers/settings-provider";
import { NetworkDiagram } from "./network-diagram";
import { LossChart } from "./loss-chart";
import { DecisionBoundary } from "./decision-boundary";
import { CalcInspector } from "./calc-inspector";

const EPOCHS_PER_TICK = 6;

function buildNetwork(
  inputs: number,
  outputs: number,
  hidden: number[],
  hiddenAct: ActivationId,
  outputAct: ActivationId,
  seed: number,
): Network {
  const layerSizes = [inputs, ...hidden, outputs];
  const acts: ActivationId[] = [...hidden.map(() => hiddenAct), outputAct];
  return new Network(layerSizes, acts, seed);
}

export function NNVisualizer() {
  const { settings } = useSettings();
  const [datasetId, setDatasetId] = React.useState("xor");
  const [hidden, setHidden] = React.useState<number[]>([4]);
  const [hiddenAct, setHiddenAct] = React.useState<ActivationId>("tanh");
  const [outputAct, setOutputAct] = React.useState<ActivationId>("sigmoid");
  const [lr, setLr] = React.useState(1.2);
  const [seed, setSeed] = React.useState(42);

  const dataset = DATASETS[datasetId];
  // Build the network synchronously so the diagram is populated on first paint
  // (robust to Fast Refresh / remounts that reset post-mount effects).
  const netRef = React.useRef<Network | null>(null);
  if (netRef.current === null) {
    netRef.current = buildNetwork(dataset.inputs, dataset.outputs, hidden, hiddenAct, outputAct, seed);
  }
  const [, bump] = React.useReducer((x: number) => x + 1, 0);
  const [version, setVersion] = React.useState(0);
  const [epoch, setEpoch] = React.useState(0);
  const [loss, setLoss] = React.useState(() => netRef.current!.datasetLoss(dataset.samples));
  const [history, setHistory] = React.useState<number[]>([]);
  const [playing, setPlaying] = React.useState(false);
  const [sampleIdx, setSampleIdx] = React.useState(0);
  const [selectedNeuron, setSelectedNeuron] = React.useState<{ layer: number; index: number } | null>(null);

  // (re)build network when structure/dataset changes
  const rebuild = React.useCallback(() => {
    netRef.current = buildNetwork(dataset.inputs, dataset.outputs, hidden, hiddenAct, outputAct, seed);
    setEpoch(0);
    setHistory([]);
    setLoss(netRef.current.datasetLoss(dataset.samples));
    setVersion((v) => v + 1);
    bump();
  }, [dataset, hidden, hiddenAct, outputAct, seed]);

  // Rebuild on config change (skip the very first mount — already built synchronously).
  const firstRun = React.useRef(true);
  React.useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    rebuild();
    setPlaying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetId, hidden, hiddenAct, outputAct, seed]);

  const runEpochs = React.useCallback(
    (count: number) => {
      const net = netRef.current;
      if (!net) return;
      let last = loss;
      const newHist: number[] = [];
      for (let e = 0; e < count; e++) {
        last = net.trainEpoch(dataset.samples, lr);
        newHist.push(last);
      }
      setEpoch((p) => p + count);
      setLoss(net.datasetLoss(dataset.samples));
      setHistory((h) => [...h, ...newHist].slice(-400));
      setVersion((v) => v + 1);
      bump();
    },
    [dataset.samples, lr, loss],
  );

  // training loop
  React.useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => runEpochs(EPOCHS_PER_TICK), settings.reducedMotion ? 120 : 40);
    return () => clearInterval(id);
  }, [playing, runEpochs, settings.reducedMotion]);

  // stop when converged
  React.useEffect(() => {
    if (playing && loss < 1e-4) setPlaying(false);
  }, [playing, loss]);

  const net = netRef.current;
  const sample = dataset.samples[Math.min(sampleIdx, dataset.samples.length - 1)];
  const pass: ForwardPass | null = net ? net.forward(sample.input) : null;
  const grads: Gradients | null = net && pass ? net.backward(pass, sample.target) : null;

  const addNeuron = (li: number) =>
    setHidden((h) => h.map((s, i) => (i === li ? Math.min(8, s + 1) : s)));
  const removeNeuron = (li: number) =>
    setHidden((h) => h.map((s, i) => (i === li ? Math.max(1, s - 1) : s)));
  const addLayer = () => setHidden((h) => (h.length < 3 ? [...h, 3] : h));
  const removeLayer = () => setHidden((h) => (h.length > 0 ? h.slice(0, -1) : h));

  const predicted = pass ? pass.output.map((v) => v.toFixed(3)).join(", ") : "—";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        icon={Brain}
        title="Neural Network Visualizer"
        description="Build a multilayer perceptron and watch it learn — with real forward propagation, backpropagation, and gradient descent. Every number shown is exactly what the network computes."
        accent="from-violet-500 to-fuchsia-500"
      />

      {/* control bar */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <Field label="Dataset">
            <Select value={datasetId} onValueChange={setDatasetId}>
              <SelectTrigger className="h-9 w-36 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATASET_IDS.map((id) => (
                  <SelectItem key={id} value={id}>{DATASETS[id].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Hidden activation">
            <Select value={hiddenAct} onValueChange={(v) => setHiddenAct(v as ActivationId)}>
              <SelectTrigger className="h-9 w-36 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HIDDEN_ACTIVATIONS.map((id) => (
                  <SelectItem key={id} value={id}>{ACTIVATIONS[id].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Output activation">
            <Select value={outputAct} onValueChange={(v) => setOutputAct(v as ActivationId)}>
              <SelectTrigger className="h-9 w-36 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OUTPUT_ACTIVATIONS.map((id) => (
                  <SelectItem key={id} value={id}>{ACTIVATIONS[id].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={`Learning rate: ${lr.toFixed(2)}`}>
            <Slider value={[lr]} min={0.05} max={3} step={0.05} onValueChange={([v]) => setLr(v)} className="w-40" />
          </Field>

          <div className="ml-auto flex items-end gap-1.5">
            <Button onClick={() => setPlaying((p) => !p)} className="rounded-full shadow-lg shadow-primary/30">
              {playing ? <><Pause /> Pause</> : <><Play /> Train</>}
            </Button>
            <Button variant="secondary" size="icon" onClick={() => runEpochs(1)} aria-label="One epoch">
              <StepForward />
            </Button>
            <Button variant="ghost" size="icon" onClick={rebuild} aria-label="Reset weights">
              <RotateCcw />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSeed((s) => (s * 7 + 13) % 100000)} aria-label="New random init">
              <Shuffle />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* hidden-layer editor */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <span className="text-sm font-medium">Architecture</span>
          <span className="rounded-lg bg-muted px-2 py-1 font-mono text-xs">
            {[dataset.inputs, ...hidden, dataset.outputs].join(" → ")}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {hidden.map((size, li) => (
              <div key={li} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1">
                <span className="text-xs text-muted-foreground">H{li + 1}</span>
                <Button variant="ghost" size="icon-sm" onClick={() => removeNeuron(li)} aria-label="Remove neuron"><Minus /></Button>
                <span className="w-4 text-center font-mono text-sm">{size}</span>
                <Button variant="ghost" size="icon-sm" onClick={() => addNeuron(li)} aria-label="Add neuron"><Plus /></Button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={addLayer} disabled={hidden.length >= 3}>
              <Plus /> Layer
            </Button>
            <Button variant="ghost" size="sm" onClick={removeLayer} disabled={hidden.length <= 0}>
              <Minus /> Layer
            </Button>
          </div>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <Stat label="Epoch" value={String(epoch)} />
            <Stat label="Loss" value={loss.toFixed(4)} accent />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* network diagram */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Network — sample [{sample.input.join(", ")}] → target [{sample.target.join(", ")}], predicted [{predicted}]</CardTitle>
          </CardHeader>
          <CardContent>
            {net && <NetworkDiagram net={net} pass={pass} selectedNeuron={selectedNeuron} onSelectNeuron={setSelectedNeuron} />}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Show sample:</span>
              {dataset.samples.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSampleIdx(i)}
                  className={`rounded-md border px-2 py-1 font-mono text-[11px] transition-colors ${
                    i === sampleIdx ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  [{s.input.join(",")}]→{s.target.join(",")}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="inline-block h-1 w-5 rounded" style={{ background: "oklch(0.7 0.15 175)" }} /> positive weight</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-1 w-5 rounded" style={{ background: "oklch(0.65 0.2 15)" }} /> negative weight</span>
              <span>edge thickness ∝ |weight|</span>
            </div>
          </CardContent>
        </Card>

        {/* right column */}
        <div className="grid gap-4">
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-base">Decision boundary</CardTitle></CardHeader>
            <CardContent className="grid place-items-center">
              {net && <DecisionBoundary net={net} samples={dataset.samples} version={version} />}
              <p className="mt-2 text-center text-xs text-muted-foreground">{dataset.description}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-base">Loss over epochs</CardTitle></CardHeader>
            <CardContent><LossChart history={history} /></CardContent>
          </Card>
        </div>
      </div>

      {/* calculation inspector */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="mt-4">
          <CardHeader className="pb-1"><CardTitle className="text-base">Calculation inspector</CardTitle></CardHeader>
          <CardContent>
            {net && <CalcInspector net={net} pass={pass} grads={grads} selected={selectedNeuron} />}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-mono text-lg font-bold tabular-nums ${accent ? "gradient-text" : ""}`}>{value}</div>
    </div>
  );
}
