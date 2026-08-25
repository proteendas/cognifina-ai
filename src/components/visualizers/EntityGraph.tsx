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
  company: { color: "#6366f1", icon: <Building2 size={15} />, label: "Company" },
  subsidiary: { color: "#8b5cf6", icon: <GitBranch size={15} />, label: "Subsidiary" },
  ubo: { color: "#f59e0b", icon: <Crown size={15} />, label: "UBO" },
  director: { color: "#22d3ee", icon: <User size={15} />, label: "Director" },
  person: { color: "#38bdf8", icon: <User size={15} />, label: "Person" },
  related_party: { color: "#f43f5e", icon: <ShieldAlert size={15} />, label: "Related Party" },
  registry: { color: "#94a3b8", icon: <Landmark size={15} />, label: "Registry" },
};

function nodeStyle(type: string) {
  const s = TYPE_STYLE[type] ?? TYPE_STYLE.company;
  return {
    background: "rgba(12,14,26,0.92)",
    border: `1.5px solid ${s.color}`,
    borderRadius: 14,
    padding: "10px 14px",
    boxShadow: `0 4px 24px -6px ${s.color}55`,
    width: 200,
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
        <span className="truncate text-[13px] font-semibold text-slate-100">{name}</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500">
        <span>{s.label}</span>
        {metaLine && <span className="tnum truncate pl-2 normal-case text-slate-500">{metaLine}</span>}
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
    for (const n of nodes) {
      const d = depth.get(n.key) ?? 99;
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
      labelStyle: { fill: "#8394b8", fontSize: 10 },
      labelBgStyle: { fill: "rgba(7,8,15,0.85)" },
      labelBgPadding: [5, 3] as [number, number],
      labelBgBorderRadius: 6,
      style: { stroke: "rgba(148,163,184,0.45)", strokeWidth: 1.5 },
    }));

    return { flowNodes, flowEdges };
  }, [nodes, edges]);

  if (nodes.length === 0) {
    return (
      <div className="material flex h-[420px] items-center justify-center rounded-2xl text-sm text-slate-400">
        No entities were resolved from this document set.
      </div>
    );
  }

  return (
    <div className="material h-[520px] overflow-hidden rounded-2xl">
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
        <Background color="#1e2438" gap={22} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(7,8,15,0.75)"
          style={{ background: "#0c0e1a", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10 }}
          nodeColor={(n) => TYPE_STYLE[String((n.data as Record<string, unknown>).type)]?.color ?? "#6366f1"}
        />
      </ReactFlow>
    </div>
  );
}
