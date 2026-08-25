"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CitationDto, FindingDto } from "@/lib/types";
import type { CitationTarget } from "@/components/visualizers/CitationDrawer";

export function FindingsList({
  findings,
  citationsByFinding,
  onOpenCitation,
}: {
  findings: FindingDto[];
  citationsByFinding: Map<string, CitationDto[]>;
  onOpenCitation: (c: CitationTarget) => void;
}) {
  const [openRefs, setOpenRefs] = useState<Set<string>>(new Set(findings.slice(0, 1).map((f) => f.ref)));

  const toggle = (ref: string) =>
    setOpenRefs((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });

  if (findings.length === 0) {
    return (
      <div className="material rounded-2xl px-6 py-10 text-center text-sm text-slate-400">
        No findings met reporting thresholds for this run.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {findings.map((f, i) => {
        const open = openRefs.has(f.ref);
        const cites = citationsByFinding.get(f.id) ?? [];
        return (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4, delay: Math.min(i * 0.03, 0.2) }}
            className={cn(
              "material overflow-hidden rounded-2xl transition-colors",
              f.severity === "critical" && "border-rose-500/30",
              f.severity === "high" && "border-orange-400/25"
            )}
          >
            <button
              onClick={() => toggle(f.ref)}
              className="pressable flex w-full items-start gap-3 p-5 text-left"
              aria-expanded={open}
            >
              <Badge severity={f.severity} className="mt-0.5 shrink-0">
                {f.severity}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">
                  {f.ref} · {f.category}
                </p>
                <h3 className="mt-0.5 text-[15px] font-semibold leading-snug tracking-tight text-slate-100">{f.title}</h3>
              </div>
              <span className="flex items-center gap-2 text-[12px] text-slate-500">
                {cites.length > 0 && (
                  <span className="tnum flex items-center gap-1">
                    <Quote size={12} /> {cites.length}
                  </span>
                )}
                <ChevronDown size={16} className={cn("transition-transform duration-200", open && "rotate-180")} />
              </span>
            </button>
            {open && (
              <div className="space-y-4 border-t border-white/6 px-5 pb-5 pt-4">
                <p className="text-[13.5px] leading-relaxed text-slate-300">{f.description}</p>
                {f.recommendation && (
                  <div className="rounded-xl bg-indigo-500/8 px-4 py-3 ring-1 ring-inset ring-indigo-400/20">
                    <p className="text-[12px] font-semibold uppercase tracking-wider text-indigo-300">Recommended action</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-300">{f.recommendation}</p>
                  </div>
                )}
                {cites.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Source citations</p>
                    {cites.map((c) => (
                      <button
                        key={c.id}
                        onClick={() =>
                          onOpenCitation({
                            documentName: c.documentName,
                            documentId: c.documentId,
                            pageNumber: c.pageNumber,
                            rawExcerpt: c.rawExcerpt,
                            bbox: c.bbox,
                            confidence: c.confidence,
                          })
                        }
                        className="pressable block w-full rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-left hover:border-indigo-400/40 hover:bg-indigo-500/6"
                      >
                        <p className="line-clamp-2 text-[13px] leading-relaxed text-slate-300">“{c.rawExcerpt}”</p>
                        <p className="tnum mt-1.5 text-[11px] text-slate-500">
                          {c.documentName} · page {c.pageNumber} · {(c.confidence * 100).toFixed(0)}%
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
