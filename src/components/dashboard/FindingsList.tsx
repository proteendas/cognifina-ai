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
      <div className="rounded-xl border border-line bg-surface px-6 py-10 text-center font-secondary text-sm text-ink-4 shadow-soft">
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
              "overflow-hidden rounded-xl border bg-surface shadow-soft transition-shadow",
              f.severity === "critical" && "border-danger/30",
              f.severity === "high" && "border-[#ce6a23]/30",
              f.severity !== "critical" && f.severity !== "high" && "border-line"
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
              <span className="min-w-0 flex-1">
                <span className="tnum block text-[11px] font-medium uppercase tracking-wider text-ink-4">
                  {f.ref} · {f.category}
                </span>
                <span className="mt-1 block text-[15px] font-semibold leading-snug tracking-tight text-ink">{f.title}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 pt-0.5 text-[12px] text-ink-4">
                {cites.length > 0 && (
                  <span className="tnum flex items-center gap-1">
                    <Quote size={12} /> {cites.length}
                  </span>
                )}
                <ChevronDown size={16} className={cn("transition-transform duration-200", open && "rotate-180")} />
              </span>
            </button>
            {open && (
              <div className="space-y-4 border-t border-line px-5 pb-5 pt-4">
                <p className="font-secondary text-[13.5px] leading-relaxed text-ink-2">{f.description}</p>
                {f.recommendation && (
                  <div className="rounded-lg border border-accent/20 bg-accent-soft px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">Recommended action</p>
                    <p className="mt-1 font-secondary text-[13px] leading-relaxed text-ink-2">{f.recommendation}</p>
                  </div>
                )}
                {cites.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-4">Source citations</p>
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
                        className="pressable block w-full rounded-lg border border-line bg-paper-2 p-3.5 text-left transition-colors hover:border-accent/40 hover:bg-accent-soft/50"
                      >
                        <p className="line-clamp-2 font-secondary text-[13px] leading-relaxed text-ink-2">“{c.rawExcerpt}”</p>
                        <p className="tnum mt-1.5 font-secondary text-[11px] text-ink-4">
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
