import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ALGORITHMS, getMeta } from "@/lib/algorithms";
import { AlgorithmPage } from "@/components/visualizer/algorithm-page";

export function generateStaticParams() {
  return ALGORITHMS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = getMeta(slug);
  if (!meta) return {};
  return { title: meta.title, description: meta.summary };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = getMeta(slug);
  if (!meta) notFound();
  return <AlgorithmPage meta={meta} />;
}
