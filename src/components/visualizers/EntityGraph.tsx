"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Building2, Crown, GitBranch, Landmark, ShieldAlert, User } from "lucide-react";
import type { EntityEdgeDto, EntityNodeDto } from "@/lib/types";

const TYPE_STYLE: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  company: { color: "#0F3D3E", icon: <Building2 size={15} />, label: "Company" },
  subsidiary: { color: "#3B6EA5", icon: <GitBranch size={15} />, label: "Subsidiary" },
  ubo: { color: "#C98A1E", icon: <Crown size={15} />, label: "UBO" },
  director: { color: "#1E874B", icon: <User size={15} />, label: "Director" },
  person: { color: "#3B6EA5", icon: <User size={15} />, label: "Person" },
  related_party: { color: "#D64545", icon: <ShieldAlert size={15} />, label: "Related Party" },
  registry: { color: "#6F767E", icon: <Landmark size={15} />, label: "Registry" },
};

function nodeStyle(type: string) {
  const s = TYPE_STYLE[type] ?? TYPE_STYLE.company;
  return {
    background: "#ffffff",
    border: `1.5px solid ${s.color}`,
    borderRadius: 12,
    padding: "10px 14px",
    boxShadow: "0 2px 4px -1px rgba(26,29,31,0.05), 0 8px 20px -6px rgba(26,29,31,0.10)",
    width: 200,
    fontSize: 13,
  };
}

function EntityNodeCard({ data }: { data: Record<string, unknown> }) {
  const name = String(data.name ?? "");
  const type = String(data.type ?? "company");
  const s = TYPE_STYLE[type] ?? TYPE_STYLE.company;
  const attrs = (data.attrs ?? {}) as Record<string, string>;
  const metaLine = [attrs.cin && `CIN ${attrs.cin}`, attrs.pan && `PAN ${attrs.pan}`, attrs.gstin && `GSTIN ${attrs.gstin}`]
    .filter(Boolean)
    .join(" · ");
  return (
    <div>
      <div className="flex items-center gap-2">
        <span style={{ color: s.color }}>{s.icon}</span>
        <span className="truncate text-[13px] font-semibold text-[#1a1d1f]">{name}</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-[#8b9096]">
        <span>{s.label}</span>
        {metaLine && <span className="tnum truncate pl-2 normal-case">{metaLine}</span>}
      </div>
    </div>
  );
}

const nodeTypes = { entity: EntityNodeCard };

export function EntityGraph({
  nodes,
  edges,
}: {
  nodes: EntityNodeDto[];
  edges: EntityEdgeDto[];
}) {
  const layout = useMemo(() => {
    // Deterministic layered placement by BFS depth from the subject company.
    if (nodes.length === 0) return { flowNodes: [], flowEdges: [] };
    const adjacency = new Map<string, string[]>();
    for (const e of edges) {
      adjacency.set(e.source, [...(adjacency.get(e.source) ?? []), e.target]);
      adjacency.set(e.target, [...(adjacency.get(e.target) ?? []), e.source]);
    }
    const subject = nodes.find((n) => n.attrs.subject === "true") ?? nodes[0];
    const depth = new Map<string, number>([[subject.key, 0]]);
    const queue = [subject.key];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const nb of adjacency.get(cur) ?? []) {
        if (!depth.has(nb)) {
          depth.set(nb, depth.get(cur)! + 1);
          queue.push(nb);
        }
      }
    }

    const byDepth = new Map<number, EntityNodeDto[]>();
    const maxKnownDepth = Math.max(0, ...[...depth.values()].filter((v) => v < 99));
    for (const n of nodes) {
      // unreachable nodes (no edge to the subject) sit next to the graph,
      // never 99 columns away
      const d = Math.min(depth.get(n.key) ?? 99, maxKnownDepth + 1);
      byDepth.set(d, [...(byDepth.get(d) ?? []), n]);
    }

    const COL_W = 260;
    const ROW_H = 110;
    const flowNodes: Node[] = [];
    for (const [d, list] of [...byDepth.entries()].sort((a, b) => a[0] - b[0])) {
      list.forEach((n, i) => {
        flowNodes.push({
          id: n.key,
          type: "entity",
          position: { x: d * COL_W, y: i * ROW_H - ((list.length - 1) * ROW_H) / 2 },
          data: { name: n.name, type: n.type, attrs: n.attrs },
          style: nodeStyle(n.type),
        });
      });
    }

    const flowEdges: Edge[] = edges.map((e, i) => ({
      id: `e-${i}-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      animated: false,
      label: e.relation,
      labelStyle: { fill: "#6f767e", fontSize: 10 },
      labelBgStyle: { fill: "rgba(255,255,255,0.95)" },
      labelBgPadding: [5, 3] as [number, number],
      labelBgBorderRadius: 6,
      style: { stroke: "rgba(26,29,31,0.28)", strokeWidth: 1.5 },
    }));

    return { flowNodes, flowEdges };
  }, [nodes, edges]);

  if (nodes.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-line bg-surface text-sm text-ink-4 shadow-soft">
        No entities were resolved from this document set.
      </div>
    );
  }

  return (
    <div className="h-[520px] overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
      <ReactFlow
        nodes={layout.flowNodes}
        edges={layout.flowEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.25}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
      >
        <Background color="#DAD7D1" gap={22} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(245,243,238,0.75)"
          style={{ background: "#FBFAF8", border: "1px solid #E8E6E3", borderRadius: 10 }}
          nodeColor={(n) => TYPE_STYLE[String((n.data as Record<string, unknown>).type)]?.color ?? "#0F3D3E"}
        />
      </ReactFlow>
    </div>
  );
}
