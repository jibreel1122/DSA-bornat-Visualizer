"use client";

import { FlaskConical } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/catalog/page-header";
import { useLocale } from "@/lib/i18n";
import { GraphBuilder } from "./graph-builder";
import { ArrayLab } from "./array-lab";

export function PlaygroundClient() {
  const { t } = useLocale();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        icon={FlaskConical}
        title={t("playground.title")}
        description={t("playground.description")}
      />

      <Tabs defaultValue="graph">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="graph">{t("playground.graphBuilder")}</TabsTrigger>
          <TabsTrigger value="array">{t("playground.arrayLab")}</TabsTrigger>
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
