"use client";

import { useRun } from "@/components/dashboard/RunContext";
import { EntityGraph } from "@/components/visualizers/EntityGraph";

export default function EntityMapPage() {
  const { data } = useRun();
  if (!data) return null;
  const { nodes, edges } = data.entities;

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold tracking-tight text-white">Corporate ownership graph</h2>
        <p className="tnum text-[12px] text-slate-500">
          {nodes.length} entities · {edges.length} relationships
        </p>
      </div>
      <EntityGraph nodes={nodes} edges={edges} />
      <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
        Nodes are extracted from document evidence — company suffixes, director rosters, ownership percentages and
        registry identifiers (CIN / PAN / GSTIN). Drag to arrange; scroll to zoom.
      </p>
    </div>
  );
}
