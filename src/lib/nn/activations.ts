/**
 * Activation functions and their derivatives for the neural-network engine.
 * Every function is exact — the visualizer shows real computed numbers.
 */

export type ActivationId = "sigmoid" | "relu" | "leakyRelu" | "tanh" | "linear" | "softmax";

export interface Activation {
  id: ActivationId;
  label: string;
  /** elementwise apply to a pre-activation vector z */
  fn: (z: number[]) => number[];
  /**
   * derivative da/dz given z and the already-computed activation a.
   * For softmax this returns ones (its gradient is folded into the loss).
   */
  dfn: (z: number[], a: number[]) => number[];
  /** true when this activation must be paired with cross-entropy at the output */
  crossEntropy?: boolean;
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export const ACTIVATIONS: Record<ActivationId, Activation> = {
  sigmoid: {
    id: "sigmoid",
    label: "Sigmoid",
    fn: (z) => z.map(sigmoid),
    dfn: (_z, a) => a.map((ai) => ai * (1 - ai)),
  },
  relu: {
    id: "relu",
    label: "ReLU",
    fn: (z) => z.map((x) => Math.max(0, x)),
    dfn: (z) => z.map((x) => (x > 0 ? 1 : 0)),
  },
  leakyRelu: {
    id: "leakyRelu",
    label: "Leaky ReLU",
    fn: (z) => z.map((x) => (x > 0 ? x : 0.01 * x)),
    dfn: (z) => z.map((x) => (x > 0 ? 1 : 0.01)),
  },
  tanh: {
    id: "tanh",
    label: "Tanh",
    fn: (z) => z.map((x) => Math.tanh(x)),
    dfn: (_z, a) => a.map((ai) => 1 - ai * ai),
  },
  linear: {
    id: "linear",
    label: "Linear",
    fn: (z) => [...z],
    dfn: (z) => z.map(() => 1),
  },
  softmax: {
    id: "softmax",
    label: "Softmax",
    fn: (z) => {
      const m = Math.max(...z);
      const exps = z.map((x) => Math.exp(x - m));
      const sum = exps.reduce((s, e) => s + e, 0);
      return exps.map((e) => e / sum);
    },
    // gradient folded into cross-entropy loss (delta = a - y)
    dfn: (z) => z.map(() => 1),
    crossEntropy: true,
  },
};

export const HIDDEN_ACTIVATIONS: ActivationId[] = ["relu", "tanh", "sigmoid", "leakyRelu"];
export const OUTPUT_ACTIVATIONS: ActivationId[] = ["sigmoid", "tanh", "linear", "softmax"];
