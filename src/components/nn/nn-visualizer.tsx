"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Brain, ChevronLeft, ChevronRight, Minus, Pause, Play, Plus, RotateCcw, Shuffle, StepForward } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/catalog/page-header";
import { Network, type ForwardPass, type Gradients, type Sample } from "@/lib/nn/network";
import { DATASETS, DATASET_IDS } from "@/lib/nn/datasets";
import { ACTIVATIONS, HIDDEN_ACTIVATIONS, OUTPUT_ACTIVATIONS, type ActivationId } from "@/lib/nn/activations";
import { useSettings } from "@/components/providers/settings-provider";
import { useLocale } from "@/lib/i18n";
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
  const { t } = useLocale();
  const [datasetId, setDatasetId] = React.useState("xor");
  const [hidden, setHidden] = React.useState<number[]>([4]);
  const [hiddenAct, setHiddenAct] = React.useState<ActivationId>("tanh");
  const [outputAct, setOutputAct] = React.useState<ActivationId>("sigmoid");
  const [lr, setLr] = React.useState(1.2);
  const [seed, setSeed] = React.useState(42);

  const dataset = DATASETS[datasetId];
  // Softmax over a single output unit is mathematically degenerate (it always
  // emits exactly 1 regardless of the input), which drives the gradient to a
  // constant non-zero value and makes weights blow up to NaN — so only offer
  // it for genuinely multi-output datasets.
  const availableOutputActivations = React.useMemo(
    () => (dataset.outputs > 1 ? OUTPUT_ACTIVATIONS : OUTPUT_ACTIVATIONS.filter((id) => id !== "softmax")),
    [dataset.outputs],
  );
  // If the dataset changes to single-output while softmax is selected, fall
  // back to sigmoid rather than silently training a degenerate network.
  React.useEffect(() => {
    if (!availableOutputActivations.includes(outputAct)) setOutputAct("sigmoid");
  }, [availableOutputActivations, outputAct]);
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
  /** epoch indices (into `history`) where the architecture/activation changed mid-run, for the loss chart marker */
  const [rebuildMarkers, setRebuildMarkers] = React.useState<number[]>([]);
  const [playing, setPlaying] = React.useState(false);
  const [sampleIdx, setSampleIdx] = React.useState(0);
  const [selectedNeuron, setSelectedNeuron] = React.useState<{ layer: number; index: number } | null>(null);
  const [customMode, setCustomMode] = React.useState(false);
  const [customInputs, setCustomInputs] = React.useState<number[]>(() => dataset.samples[0].input.slice());
  const [customTargets, setCustomTargets] = React.useState<number[]>(() => dataset.samples[0].target.slice());

  // Hard reset: brand-new weights, fresh history. Used for the explicit
  // "Reset weights" button and whenever the dataset changes (loss values
  // from a different dataset aren't comparable, so keeping the curve would
  // be misleading).
  const rebuild = React.useCallback(() => {
    netRef.current = buildNetwork(dataset.inputs, dataset.outputs, hidden, hiddenAct, outputAct, seed);
    setEpoch(0);
    setHistory([]);
    setRebuildMarkers([]);
    setLoss(netRef.current.datasetLoss(dataset.samples));
    setVersion((v) => v + 1);
    bump();
  }, [dataset, hidden, hiddenAct, outputAct, seed]);

  // Soft rebuild: new weights (architecture changed, so old weights don't
  // fit), but the loss history is kept with a marker at the change point —
  // editing the architecture mid-training no longer throws away progress
  // context, you can see the before/after on the same chart.
  const rebuildKeepingHistory = React.useCallback(() => {
    netRef.current = buildNetwork(dataset.inputs, dataset.outputs, hidden, hiddenAct, outputAct, seed);
    setEpoch(0);
    setLoss(netRef.current.datasetLoss(dataset.samples));
    setHistory((h) => {
      if (h.length > 0) setRebuildMarkers((m) => [...m, h.length]);
      return h;
    });
    setVersion((v) => v + 1);
    bump();
  }, [dataset, hidden, hiddenAct, outputAct, seed]);

  // Rebuild on structural/activation change (skip the very first mount — already built synchronously).
  const firstRun = React.useRef(true);
  const prevDatasetId = React.useRef(datasetId);
  React.useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (prevDatasetId.current !== datasetId) {
      prevDatasetId.current = datasetId;
      rebuild();
      // Dataset dimensions may differ — custom values (and selected neuron,
      // whose layer/index may now be out of range) no longer apply.
      setCustomMode(false);
      setSelectedNeuron(null);
    } else {
      rebuildKeepingHistory();
    }
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
      setHistory((h) => {
        const combined = [...h, ...newHist];
        const dropped = Math.max(0, combined.length - 400);
        if (dropped > 0) {
          setRebuildMarkers((m) => m.map((mk) => mk - dropped).filter((mk) => mk > 0));
        }
        return combined.slice(-400);
      });
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
  const pickedSample = dataset.samples[Math.min(sampleIdx, dataset.samples.length - 1)];
  const sample: Sample = customMode ? { input: customInputs, target: customTargets } : pickedSample;
  const pass: ForwardPass | null = net ? net.forward(sample.input) : null;
  const grads: Gradients | null = net && pass ? net.backward(pass, sample.target) : null;

  // Ordered walkthrough sequence: every non-input neuron, layer by layer,
  // left to right — the order a forward pass actually computes them in.
  // `net` is reassigned to a new Network instance (never mutated in place)
  // whenever the architecture changes, so it alone is a sufficient dependency.
  const neuronSequence = React.useMemo(() => {
    if (!net) return [] as { layer: number; index: number }[];
    const seq: { layer: number; index: number }[] = [];
    for (let l = 1; l < net.layerSizes.length; l++) {
      for (let i = 0; i < net.layerSizes[l]; i++) seq.push({ layer: l, index: i });
    }
    return seq;
  }, [net]);

  const stepIndex = selectedNeuron
    ? neuronSequence.findIndex((n) => n.layer === selectedNeuron.layer && n.index === selectedNeuron.index)
    : -1;

  const goToStep = (i: number) => {
    if (neuronSequence.length === 0) return;
    const clamped = Math.max(0, Math.min(neuronSequence.length - 1, i));
    setSelectedNeuron(neuronSequence[clamped]);
  };
  const stepPrev = () => goToStep(stepIndex < 0 ? 0 : stepIndex - 1);
  const stepNext = () => goToStep(stepIndex < 0 ? 0 : stepIndex + 1);

  const enterCustomMode = () => {
    setCustomInputs(pickedSample.input.slice());
    setCustomTargets(pickedSample.target.slice());
    setCustomMode(true);
  };

  const MAX_NEURONS_PER_LAYER = 16;
  const MAX_HIDDEN_LAYERS = 6;
  const addNeuron = (li: number) =>
    setHidden((h) => h.map((s, i) => (i === li ? Math.min(MAX_NEURONS_PER_LAYER, s + 1) : s)));
  const removeNeuron = (li: number) =>
    setHidden((h) => h.map((s, i) => (i === li ? Math.max(1, s - 1) : s)));
  const addLayer = () => setHidden((h) => (h.length < MAX_HIDDEN_LAYERS ? [...h, 3] : h));
  const removeLayer = () => setHidden((h) => (h.length > 0 ? h.slice(0, -1) : h));

  const predicted = pass ? pass.output.map((v) => v.toFixed(3)).join(", ") : "—";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        icon={Brain}
        title={t("nn.title")}
        description={t("nn.description")}
        accent="from-violet-500 to-fuchsia-500"
      />

      {/* control bar */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <Field label={t("nn.dataset")}>
            <Select value={datasetId} onValueChange={setDatasetId}>
              <SelectTrigger className="h-9 w-36 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATASET_IDS.map((id) => (
                  <SelectItem key={id} value={id}>{DATASETS[id].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("nn.hiddenActivation")}>
            <Select value={hiddenAct} onValueChange={(v) => setHiddenAct(v as ActivationId)}>
              <SelectTrigger className="h-9 w-36 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HIDDEN_ACTIVATIONS.map((id) => (
                  <SelectItem key={id} value={id}>{ACTIVATIONS[id].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("nn.outputActivation")}>
            <Select value={outputAct} onValueChange={(v) => setOutputAct(v as ActivationId)}>
              <SelectTrigger className="h-9 w-36 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableOutputActivations.map((id) => (
                  <SelectItem key={id} value={id}>{ACTIVATIONS[id].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("nn.learningRateLabel", { rate: lr.toFixed(2) })}>
            <Slider value={[lr]} min={0.01} max={5} step={0.01} onValueChange={([v]) => setLr(v)} className="w-40" />
          </Field>

          <div className="ml-auto flex items-end gap-1.5">
            <Button onClick={() => setPlaying((p) => !p)} className="rounded-full shadow-lg shadow-primary/30">
              {playing ? <><Pause /> {t("nn.pause")}</> : <><Play /> {t("nn.train")}</>}
            </Button>
            <Button variant="secondary" size="icon" onClick={() => runEpochs(1)} aria-label={t("nn.oneEpoch")}>
              <StepForward />
            </Button>
            <Button variant="ghost" size="icon" onClick={rebuild} aria-label={t("nn.resetWeights")}>
              <RotateCcw />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSeed((s) => (s * 7 + 13) % 100000)} aria-label={t("nn.newRandomInit")}>
              <Shuffle />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* hidden-layer editor */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <span className="text-sm font-medium">{t("nn.architecture")}</span>
          <span dir="ltr" className="rounded-lg bg-muted px-2 py-1 font-mono text-xs">
            {[dataset.inputs, ...hidden, dataset.outputs].join(" → ")}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {hidden.map((size, li) => (
              <div key={li} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1">
                <span className="text-xs text-muted-foreground">H{li + 1}</span>
                <Button variant="ghost" size="icon-sm" onClick={() => removeNeuron(li)} disabled={size <= 1} aria-label={t("nn.removeNeuron")}><Minus /></Button>
                <span className="w-6 text-center font-mono text-sm">{size}</span>
                <Button variant="ghost" size="icon-sm" onClick={() => addNeuron(li)} disabled={size >= MAX_NEURONS_PER_LAYER} aria-label={t("nn.addNeuron")}><Plus /></Button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={addLayer} disabled={hidden.length >= MAX_HIDDEN_LAYERS}>
              <Plus /> {t("nn.layer")}
            </Button>
            <Button variant="ghost" size="sm" onClick={removeLayer} disabled={hidden.length <= 0}>
              <Minus /> {t("nn.layer")}
            </Button>
          </div>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <Stat label={t("nn.epoch")} value={String(epoch)} />
            <Stat label={t("nn.loss")} value={loss.toFixed(4)} accent />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* network diagram */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">
              {t("nn.networkSamplePrefix")}{" "}
              <span dir="ltr" className="font-mono">[{sample.input.join(", ")}]</span>
              {" → "}
              {t("nn.networkTarget")}{" "}
              <span dir="ltr" className="font-mono">[{sample.target.join(", ")}]</span>
              {", "}
              {t("nn.networkPredicted")}{" "}
              <span dir="ltr" className="font-mono">[{predicted}]</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {net && <NetworkDiagram net={net} pass={pass} selectedNeuron={selectedNeuron} onSelectNeuron={setSelectedNeuron} />}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{customMode ? t("nn.customInputLabel") : t("nn.showSampleLabel")}</span>
              {!customMode &&
                dataset.samples.map((s, i) => (
                  <button
                    key={i}
                    dir="ltr"
                    onClick={() => setSampleIdx(i)}
                    className={`rounded-md border px-2 py-1 font-mono text-[11px] transition-colors ${
                      i === sampleIdx ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    [{s.input.join(",")}]→{s.target.join(",")}
                  </button>
                ))}
              {customMode && (
                <>
                  {customInputs.map((v, i) => (
                    <label key={`x${i}`} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <span dir="ltr">x{i + 1}</span>
                      <Input
                        type="number"
                        step="any"
                        value={v}
                        onChange={(e) => {
                          const n = parseFloat(e.target.value);
                          setCustomInputs((arr) => arr.map((old, idx) => (idx === i ? (Number.isFinite(n) ? n : old) : old)));
                        }}
                        className="h-7 w-16 px-1.5 py-0 font-mono text-[11px]"
                      />
                    </label>
                  ))}
                  {customTargets.map((v, i) => (
                    <label key={`t${i}`} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <span dir="ltr">target{customTargets.length > 1 ? i + 1 : ""}</span>
                      <Input
                        type="number"
                        step="any"
                        value={v}
                        onChange={(e) => {
                          const n = parseFloat(e.target.value);
                          setCustomTargets((arr) => arr.map((old, idx) => (idx === i ? (Number.isFinite(n) ? n : old) : old)));
                        }}
                        className="h-7 w-16 px-1.5 py-0 font-mono text-[11px]"
                      />
                    </label>
                  ))}
                </>
              )}
              <Button
                variant={customMode ? "secondary" : "ghost"}
                size="sm"
                className="ml-1"
                onClick={() => (customMode ? setCustomMode(false) : enterCustomMode())}
              >
                {customMode ? t("nn.useSamplePicker") : t("shell.customInput")}
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="inline-block h-1 w-5 rounded" style={{ background: "oklch(0.7 0.15 175)" }} /> {t("nn.positiveWeight")}</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-1 w-5 rounded" style={{ background: "oklch(0.65 0.2 15)" }} /> {t("nn.negativeWeight")}</span>
              <span>{t("nn.edgeThicknessLabel")} <span dir="ltr">∝ |weight|</span></span>
            </div>
          </CardContent>
        </Card>

        {/* right column */}
        <div className="grid gap-4">
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-base">{t("nn.decisionBoundary")}</CardTitle></CardHeader>
            <CardContent className="grid place-items-center">
              {net && <DecisionBoundary net={net} samples={dataset.samples} version={version} />}
              <p className="mt-2 text-center text-xs text-muted-foreground">{dataset.description}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-base">{t("nn.lossOverEpochs")}</CardTitle></CardHeader>
            <CardContent><LossChart history={history} markers={rebuildMarkers} /></CardContent>
          </Card>
        </div>
      </div>

      {/* calculation inspector */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="mt-4">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-1">
            <CardTitle className="text-base">{t("nn.calculationInspector")}</CardTitle>
            {neuronSequence.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="icon-sm" onClick={stepPrev} disabled={stepIndex === 0} aria-label={t("shell.shortcutPrevStep")}>
                  <ChevronLeft />
                </Button>
                <span dir="ltr" className="font-mono text-xs text-muted-foreground">
                  {t("nn.stepOf", { current: stepIndex < 0 ? "–" : stepIndex + 1, total: neuronSequence.length })}
                </span>
                <Button variant="ghost" size="icon-sm" onClick={stepNext} disabled={stepIndex === neuronSequence.length - 1} aria-label={t("shell.shortcutNextStep")}>
                  <ChevronRight />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {net && <CalcInspector net={net} pass={pass} grads={grads} selected={selectedNeuron} onEdited={bump} />}
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
