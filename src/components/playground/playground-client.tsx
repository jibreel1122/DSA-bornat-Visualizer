"use client";

import { FlaskConical } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/catalog/page-header";
import { GraphBuilder } from "./graph-builder";
import { ArrayLab } from "./array-lab";

export function PlaygroundClient() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        icon={FlaskConical}
        title="Playground"
        description="Design your own structures and run algorithms on them. Build a graph node by node, or craft a custom array — then launch it straight into the visualizer."
      />

      <Tabs defaultValue="graph">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="graph">Graph Builder</TabsTrigger>
          <TabsTrigger value="array">Array Lab</TabsTrigger>
        </TabsList>
        <TabsContent value="graph" className="mt-6">
          <GraphBuilder />
        </TabsContent>
        <TabsContent value="array" className="mt-6">
          <ArrayLab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
