"use client";

import { useRun } from "@/components/dashboard/RunContext";
import { EntityGraph } from "@/components/visualizers/EntityGraph";

export default function EntityMapPage() {
  const { data } = useRun();
  if (!data) return null;
  const { nodes, edges } = data.entities;

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="title-sm text-ink">Corporate ownership graph</h2>
        <p className="tnum shrink-0 font-secondary text-[12px] text-ink-4">
          {nodes.length} entities · {edges.length} relationships
        </p>
      </div>
      <EntityGraph nodes={nodes} edges={edges} />
      <p className="mt-3 font-secondary text-[12px] leading-relaxed text-ink-4">
        Nodes are extracted from document evidence — company suffixes, director rosters, ownership percentages and
        registry identifiers (CIN / PAN / GSTIN). Drag to arrange; scroll to zoom.
      </p>
    </div>
  );
}
