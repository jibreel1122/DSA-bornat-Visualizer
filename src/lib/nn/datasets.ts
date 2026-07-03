import type { Sample } from "./network";

export interface NNDataset {
  id: string;
  label: string;
  description: string;
  /** number of input features (always 2 here for 2-D visualization) */
  inputs: number;
  /** number of outputs */
  outputs: number;
  samples: Sample[];
  /** true when outputs are one-hot (softmax/multi-class) */
  multiclass?: boolean;
}

/** Classic logic-gate and shape datasets over the 2-D plane. */
export const DATASETS: Record<string, NNDataset> = {
  xor: {
    id: "xor",
    label: "XOR",
    description: "The exclusive-or problem — not linearly separable, so it needs a hidden layer.",
    inputs: 2,
    outputs: 1,
    samples: [
      { input: [0, 0], target: [0] },
      { input: [0, 1], target: [1] },
      { input: [1, 0], target: [1] },
      { input: [1, 1], target: [0] },
    ],
  },
  and: {
    id: "and",
    label: "AND",
    description: "Logical AND — linearly separable, a single neuron can solve it.",
    inputs: 2,
    outputs: 1,
    samples: [
      { input: [0, 0], target: [0] },
      { input: [0, 1], target: [0] },
      { input: [1, 0], target: [0] },
      { input: [1, 1], target: [1] },
    ],
  },
  or: {
    id: "or",
    label: "OR",
    description: "Logical OR — linearly separable.",
    inputs: 2,
    outputs: 1,
    samples: [
      { input: [0, 0], target: [0] },
      { input: [0, 1], target: [1] },
      { input: [1, 0], target: [1] },
      { input: [1, 1], target: [1] },
    ],
  },
  circle: {
    id: "circle",
    label: "Circle",
    description: "Inside vs. outside a circle — a non-linear boundary needing hidden units.",
    inputs: 2,
    outputs: 1,
    samples: circlePoints(),
  },
};

function circlePoints(): Sample[] {
  // deterministic grid of points; label 1 if inside radius 0.5 of center (0.5, 0.5)
  const pts: Sample[] = [];
  const N = 5;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x = i / (N - 1);
      const y = j / (N - 1);
      const d = Math.hypot(x - 0.5, y - 0.5);
      pts.push({ input: [x, y], target: [d < 0.35 ? 1 : 0] });
    }
  }
  return pts;
}

export const DATASET_IDS = Object.keys(DATASETS);
