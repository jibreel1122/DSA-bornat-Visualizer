import { ALGORITHMS } from "@/lib/algorithms";
import { CATEGORIES } from "@/lib/categories";
import {
  CategoryShowcase,
  Features,
  FinalCta,
  Hero,
  Stats,
} from "@/components/home/home-sections";

export default function Home() {
  return (
    <>
      <Hero algoCount={ALGORITHMS.length} />
      <Stats algoCount={ALGORITHMS.length} categoryCount={CATEGORIES.length} />
      <Features />
      <CategoryShowcase />
      <FinalCta />
    </>
  );
}
