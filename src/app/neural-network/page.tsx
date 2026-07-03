import type { Metadata } from "next";
import { NNVisualizer } from "@/components/nn/nn-visualizer";

export const metadata: Metadata = {
  title: "Neural Network Visualizer",
  description:
    "Build a multilayer perceptron and watch it learn with mathematically correct forward propagation, backpropagation, and gradient descent.",
};

export default function NeuralNetworkPage() {
  return <NNVisualizer />;
}
