import type { Metadata } from "next";
import { PlaygroundClient } from "@/components/playground/playground-client";

export const metadata: Metadata = {
  title: "Playground",
  description: "Build custom graphs and arrays, then run any compatible algorithm on your own structures.",
};

export default function PlaygroundPage() {
  return <PlaygroundClient />;
}
