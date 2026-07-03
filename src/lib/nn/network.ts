/**
 * A small but fully correct multilayer perceptron: exact forward propagation,
 * backpropagation, and gradient descent. Every value the visualizer displays
 * comes straight from these computations — nothing is faked.
 */
import { createRNG } from "@/lib/engine/random";
import { ACTIVATIONS, type ActivationId } from "./activations";

export interface Sample {
  input: number[];
  target: number[];
}

export interface ForwardPass {
  /** activations per layer, a[0] = input … a[L-1] = output */
  a: number[][];
  /** pre-activations (weighted sums) per transition, z[0..M-1] */
  z: number[][];
  output: number[];
}

export interface Gradients {
  /** dL/dW per transition, same shape as weights */
  dW: number[][][];
  /** dL/db per transition */
  db: number[][];
  /** delta (dL/dz) per transition — the backprop signal */
  delta: number[][];
}

export class Network {
  /** e.g. [2, 4, 1] — input size, hidden sizes, output size */
  layerSizes: number[];
  /** weights[i] connects layer i → i+1, shape [size(i+1)][size(i)] */
  weights: number[][][];
  /** biases[i] for layer i+1 */
  biases: number[][];
  /** activation applied at layer i+1 (one per transition) */
  activations: ActivationId[];
  private seed: number;

  constructor(layerSizes: number[], activations: ActivationId[], seed = 42) {
    this.layerSizes = [...layerSizes];
    this.activations = [...activations];
    this.seed = seed;
    this.weights = [];
    this.biases = [];
    this.initWeights();
  }

  get transitions() {
    return this.layerSizes.length - 1;
  }

  /** Deterministic small-random initialization (Xavier-style scale). */
  initWeights(seed = this.seed) {
    const rng = createRNG(seed);
    this.weights = [];
    this.biases = [];
    for (let i = 0; i < this.transitions; i++) {
      const fanIn = this.layerSizes[i];
      const fanOut = this.layerSizes[i + 1];
      const scale = Math.sqrt(2 / (fanIn + fanOut));
      const W: number[][] = [];
      for (let r = 0; r < fanOut; r++) {
        const row: number[] = [];
        for (let c = 0; c < fanIn; c++) row.push((rng.next() * 2 - 1) * scale * 2.5);
        W.push(row);
      }
      this.weights.push(W);
      this.biases.push(new Array(fanOut).fill(0));
    }
  }

  /** Forward propagation, recording every intermediate value. */
  forward(input: number[]): ForwardPass {
    const a: number[][] = [input.slice()];
    const z: number[][] = [];
    for (let i = 0; i < this.transitions; i++) {
      const W = this.weights[i];
      const b = this.biases[i];
      const prev = a[i];
      const zi: number[] = [];
      for (let r = 0; r < W.length; r++) {
        let sum = b[r];
        for (let c = 0; c < prev.length; c++) sum += W[r][c] * prev[c];
        zi.push(sum);
      }
      z.push(zi);
      a.push(ACTIVATIONS[this.activations[i]].fn(zi));
    }
    return { a, z, output: a[a.length - 1] };
  }

  /** Loss for one sample (MSE, or cross-entropy when the output is softmax). */
  loss(output: number[], target: number[]): number {
    const outAct = ACTIVATIONS[this.activations[this.transitions - 1]];
    if (outAct.crossEntropy) {
      let s = 0;
      for (let k = 0; k < output.length; k++) s += -target[k] * Math.log(Math.max(output[k], 1e-12));
      return s;
    }
    let s = 0;
    for (let k = 0; k < output.length; k++) s += 0.5 * (output[k] - target[k]) ** 2;
    return s;
  }

  /** Backpropagation for one sample; returns gradients and deltas. */
  backward(fp: ForwardPass, target: number[]): Gradients {
    const M = this.transitions;
    const delta: number[][] = new Array(M);
    const outAct = ACTIVATIONS[this.activations[M - 1]];

    // output-layer delta
    const out = fp.a[M];
    if (outAct.crossEntropy) {
      // softmax + cross-entropy: dL/dz = a - y
      delta[M - 1] = out.map((ai, k) => ai - target[k]);
    } else {
      const dact = outAct.dfn(fp.z[M - 1], out);
      delta[M - 1] = out.map((ai, k) => (ai - target[k]) * dact[k]);
    }

    // hidden-layer deltas, back to front
    for (let i = M - 2; i >= 0; i--) {
      const Wnext = this.weights[i + 1]; // shape [size(i+2)][size(i+1)]
      const dNext = delta[i + 1];
      const size = this.layerSizes[i + 1];
      const propagated = new Array(size).fill(0);
      for (let j = 0; j < size; j++) {
        let s = 0;
        for (let r = 0; r < Wnext.length; r++) s += Wnext[r][j] * dNext[r];
        propagated[j] = s;
      }
      const dact = ACTIVATIONS[this.activations[i]].dfn(fp.z[i], fp.a[i + 1]);
      delta[i] = propagated.map((p, j) => p * dact[j]);
    }

    // gradients: dW[i] = delta[i] ⊗ a[i];  db[i] = delta[i]
    const dW: number[][][] = [];
    const db: number[][] = [];
    for (let i = 0; i < M; i++) {
      const prev = fp.a[i];
      const gW: number[][] = delta[i].map((d) => prev.map((ap) => d * ap));
      dW.push(gW);
      db.push(delta[i].slice());
    }
    return { dW, db, delta };
  }

  /** One full-batch gradient-descent epoch; returns the average loss before the update. */
  trainEpoch(data: Sample[], lr: number): number {
    const M = this.transitions;
    const accW: number[][][] = this.weights.map((W) => W.map((row) => row.map(() => 0)));
    const accB: number[][] = this.biases.map((b) => b.map(() => 0));
    let totalLoss = 0;

    for (const s of data) {
      const fp = this.forward(s.input);
      totalLoss += this.loss(fp.output, s.target);
      const g = this.backward(fp, s.target);
      for (let i = 0; i < M; i++) {
        for (let r = 0; r < accW[i].length; r++) {
          for (let c = 0; c < accW[i][r].length; c++) accW[i][r][c] += g.dW[i][r][c];
          accB[i][r] += g.db[i][r];
        }
      }
    }

    const n = data.length;
    for (let i = 0; i < M; i++) {
      for (let r = 0; r < this.weights[i].length; r++) {
        for (let c = 0; c < this.weights[i][r].length; c++) {
          this.weights[i][r][c] -= (lr * accW[i][r][c]) / n;
        }
        this.biases[i][r] -= (lr * accB[i][r]) / n;
      }
    }
    return totalLoss / n;
  }

  /** Average loss over a dataset without training. */
  datasetLoss(data: Sample[]): number {
    let s = 0;
    for (const d of data) s += this.loss(this.forward(d.input).output, d.target);
    return s / data.length;
  }

  clone(): Network {
    const net = new Network(this.layerSizes, this.activations, this.seed);
    net.weights = this.weights.map((W) => W.map((r) => r.slice()));
    net.biases = this.biases.map((b) => b.slice());
    return net;
  }
}
