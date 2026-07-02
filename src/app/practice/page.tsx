import type { Metadata } from "next";
import { PracticeClient } from "@/components/practice/practice-client";

export const metadata: Metadata = {
  title: "Practice",
  description: "Test your knowledge with quiz sprints and step-prediction challenges. Track mastery per category.",
};

export default function PracticePage() {
  return <PracticeClient />;
}
