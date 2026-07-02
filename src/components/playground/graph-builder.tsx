"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Dices, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALGORITHMS } from "@/lib/algorithms";
import { createRNG, randomGraph, randomSeed } from "@/lib/engine/random";

/** Known graph algorithms and how to feed them. Filtered to whatever is registered. */
const GRAPH_ALGOS: Record<string, { needsStart: boolean; weighted: boolean; directed: boolean }> = {
  bfs: { needsStart: true, weighted: false, directed: false },
  dfs: { needsStart: true, weighted: false, directed: false },
  dijkstra: { needsStart: true, weighted: true, directed: false },
  "bellman-ford": { needsStart: true, weighted: true, directed: true },
  prim: { needsStart: false, weighted: true, directed: false },
  kruskal: { needsStart: false, weighted: true, directed: false },
  "topological-sort": { needsStart: false, weighted: false, directed: true },
};

function CircleNode({ data }: NodeProps) {
  return (
    <div className="relative grid size-11 place-items-center rounded-full text-sm font-bold text-white shadow-md" style={{ background: "var(--viz-default)" }}>
      <Handle type="target" position={Position.Left} className="!size-2 !border-none !bg-primary" />
      {(data as { label: string }).label}
      <Handle type="source" position={Position.Right} className="!size-2 !border-none !bg-primary" />
    </div>
  );
}

const nodeTypes = { circle: CircleNode };

let idCounter = 0;
const nextLetter = (existing: Node[]): string => {
  const used = new Set(existing.map((n) => (n.data as { label: string }).label));
  for (let i = 0; i < 26; i++) {
    const l = String.fromCharCode(65 + i);
    if (!used.has(l)) return l;
  }
  return `N${existing.length}`;
};

export function GraphBuilder() {
  const router = useRouter();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [directed, setDirected] = React.useState(false);
  const [weighted, setWeighted] = React.useState(false);
  const [slug, setSlug] = React.useState("");
  const [startNode, setStartNode] = React.useState("");

  const available = React.useMemo(
    () => ALGORITHMS.filter((m) => m.category === "graphs" && GRAPH_ALGOS[m.slug]),
    [],
  );

  React.useEffect(() => {
    if (!slug && available.length) setSlug(available[0].slug);
  }, [available, slug]);

  // seed a starter graph on first mount
  React.useEffect(() => {
    seedRandom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seedRandom = () => {
    const g = randomGraph(2, createRNG(randomSeed()), { weighted: true });
    const n = g.nodes.length;
    const newNodes: Node[] = g.nodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      return {
        id: `n${idCounter++}`,
        type: "circle",
        position: { x: 300 + 200 * Math.cos(angle), y: 210 + 160 * Math.sin(angle) },
        data: { label: node.id },
      };
    });
    const labelToId = new Map(newNodes.map((nd) => [(nd.data as { label: string }).label, nd.id]));
    const newEdges: Edge[] = g.edges.map((e, i) => ({
      id: `e${i}`,
      source: labelToId.get(e.from)!,
      target: labelToId.get(e.to)!,
      label: String(e.weight ?? 1),
      data: { weight: e.weight ?? 1 },
      animated: false,
    }));
    setNodes(newNodes);
    setEdges(newEdges);
    setStartNode(newNodes[0]?.id ?? "");
  };

  const onConnect = React.useCallback(
    (c: Connection) => {
      const weight = weighted ? 1 : undefined;
      setEdges((eds) =>
        addEdge(
          { ...c, label: weighted ? "1" : undefined, data: { weight: weight ?? 1 } },
          eds,
        ),
      );
    },
    [weighted, setEdges],
  );

  const addNode = () => {
    setNodes((nds) => [
      ...nds,
      {
        id: `n${idCounter++}`,
        type: "circle",
        position: { x: 120 + Math.random() * 360, y: 100 + Math.random() * 240 },
        data: { label: nextLetter(nds) },
      },
    ]);
  };

  const deleteSelected = () => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected && !nodesSelectedIds.has(e.source) && !nodesSelectedIds.has(e.target)));
  };
  const nodesSelectedIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));

  const clearAll = () => {
    setNodes([]);
    setEdges([]);
    setStartNode("");
  };

  const setEdgeWeight = (edgeId: string, w: number) => {
    setEdges((eds) =>
      eds.map((e) => (e.id === edgeId ? { ...e, label: String(w), data: { ...e.data, weight: w } } : e)),
    );
  };

  const algoConfig = slug ? GRAPH_ALGOS[slug] : undefined;

  const run = () => {
    if (!slug || !algoConfig) {
      toast.error("Pick an algorithm.");
      return;
    }
    if (nodes.length < 2 || edges.length < 1) {
      toast.error("Draw at least two nodes and one edge.");
      return;
    }
    const idToLabel = new Map(nodes.map((n) => [n.id, (n.data as { label: string }).label]));
    const sep = algoConfig.directed ? ">" : "-";
    const edgeStrs = edges.map((e) => {
      const a = idToLabel.get(e.source);
      const b = idToLabel.get(e.target);
      const w = (e.data as { weight?: number })?.weight ?? 1;
      return algoConfig.weighted ? `${a}${sep}${b}:${w}` : `${a}${sep}${b}`;
    });
    const fields: Record<string, string> = { edges: edgeStrs.join(", ") };
    if (algoConfig.needsStart) {
      const startLabel = idToLabel.get(startNode) ?? idToLabel.get(nodes[0].id)!;
      fields.start = startLabel;
    }
    router.push(`/visualizer/${slug}?input=${encodeURIComponent(JSON.stringify(fields))}`);
  };

  const selectedEdge = edges.find((e) => e.selected);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border p-2">
          <Button size="sm" variant="secondary" onClick={addNode}>
            <Plus /> Node
          </Button>
          <Button size="sm" variant="ghost" onClick={deleteSelected}>
            <Trash2 /> Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={seedRandom}>
            <Dices /> Random
          </Button>
          <Button size="sm" variant="ghost" onClick={clearAll}>
            Clear
          </Button>
          <div className="ml-auto flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs">
              <Switch checked={directed} onCheckedChange={setDirected} /> Directed
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <Switch checked={weighted} onCheckedChange={setWeighted} /> Weighted
            </label>
          </div>
        </div>
        <div className="h-[480px] bg-background/40">
          <ReactFlow
            nodes={nodes}
            edges={edges.map((e) => ({
              ...e,
              label: weighted ? e.label : undefined,
              markerEnd: directed ? { type: "arrowclosed" as never } : undefined,
            }))}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background color="var(--border)" gap={20} />
            <Controls className="!border-border !bg-card" />
            <MiniMap className="!bg-card" nodeColor="var(--viz-default)" maskColor="oklch(0 0 0 / 0.4)" />
          </ReactFlow>
        </div>
      </Card>

      <Card>
        <CardContent className="grid gap-4 p-4">
          <div>
            <Label>Algorithm</Label>
            {available.length === 0 ? (
              <p className="mt-1.5 text-xs text-muted-foreground">No graph algorithms registered yet.</p>
            ) : (
              <Select value={slug} onValueChange={setSlug}>
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue placeholder="Choose an algorithm" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((m) => (
                    <SelectItem key={m.slug} value={m.slug}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {algoConfig && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Runs as {algoConfig.directed ? "directed" : "undirected"}
                {algoConfig.weighted ? ", weighted" : ", unweighted"}.
              </p>
            )}
          </div>

          {algoConfig?.needsStart && (
            <div>
              <Label>Start node</Label>
              <Select value={startNode} onValueChange={setStartNode}>
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue placeholder="Start" />
                </SelectTrigger>
                <SelectContent>
                  {nodes.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {(n.data as { label: string }).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedEdge && (
            <div>
              <Label>Selected edge weight</Label>
              <Input
                type="number"
                className="mt-1.5"
                value={(selectedEdge.data as { weight?: number })?.weight ?? 1}
                onChange={(e) => setEdgeWeight(selectedEdge.id, Number(e.target.value) || 1)}
              />
            </div>
          )}

          <Button onClick={run} disabled={!slug}>
            <Play /> Run in Visualizer
          </Button>

          <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Tips</p>
            <ul className="mt-1 grid gap-1">
              <li>Drag from a node&apos;s right dot to another to connect.</li>
              <li>Click an edge to edit its weight.</li>
              <li>Select a node/edge and press Delete.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
