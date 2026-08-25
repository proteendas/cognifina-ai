"use client";

import { useMemo } from "react";
import { AlertTriangle, FileText, Layers, Loader2, Table2 } from "lucide-react";
import { useRun } from "@/components/dashboard/RunContext";
import { StageProgress } from "@/components/dashboard/StageProgress";
import { FindingsList } from "@/components/dashboard/FindingsList";
import { RiskGauge } from "@/components/visualizers/RiskGauge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CitationDto, Severity } from "@/lib/types";

export default function RunOverviewPage() {
  const { data, error, loading, advance, openCitation } = useRun();

  const citationsByFinding = useMemo(() => {
    const map = new Map<string, CitationDto[]>();
    for (const c of data?.citations ?? []) {
      if (!c.findingId) continue;
      map.set(c.findingId, [...(map.get(c.findingId) ?? []), c]);
    }
    return map;
  }, [data?.citations]);

  if (loading) {
    return (
      <div className="flex h-56 items-center justify-center gap-2 text-slate-400">
        <Loader2 className="animate-spin" size={16} /> Loading run…
      </div>
    );
  }
  if (error && !data) return <ErrorState message={error} onAdvance={() => void advance()} />;
  if (!data) return null;

  const { run } = data;

  if (run.status === "failed") {
    return (
      <div className="material rounded-2xl p-6">
        <div className="flex items-center gap-2 text-rose-300">
          <AlertTriangle size={18} />
          <h2 className="text-[15px] font-semibold">Run failed</h2>
        </div>
        <p className="tnum mt-3 rounded-xl bg-rose-500/8 p-4 text-[13px] leading-relaxed text-rose-200">{run.error}</p>
        <p className="mt-3 text-[12.5px] text-slate-500">
          Fix the reported issue (often a malformed document) and start a new run. Completed stages up to the failure are preserved.
        </p>
      </div>
    );
  }

  if (run.status !== "completed") {
    return (
      <div className="space-y-5">
        <div className="material rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-slate-100">Pipeline execution</h2>
            <span className="tnum text-[13px] text-indigo-300">{run.progress}%</span>
          </div>
          <StageProgress currentStage={run.currentStage} status={run.status} />
          <p className="mt-4 text-center text-[12px] text-slate-500">
            Stages advance automatically — each agent runs to completion before the next starts.
          </p>
        </div>
        {error && (
          <div className="material rounded-2xl border-rose-500/30 p-4 text-[13px] text-rose-300">
            {error}
            <Button variant="secondary" size="sm" className="ml-3" onClick={() => void advance()}>
              Retry stage
            </Button>
          </div>
        )}
      </div>
    );
  }

  // completed
  const counts = data.run.summary?.severityCounts ?? { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const rankedFindings = [...data.findings].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return order[a.severity] - order[b.severity] || a.ref.localeCompare(b.ref);
  });

  return (
    <div className="space-y-5">
      {/* summary strip */}
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="material flex flex-col items-center justify-center rounded-2xl py-7">
          <RiskGauge score={data.run.riskScore} band={data.run.riskBand} size={210} />
        </div>
        <div className="material grid grid-cols-2 content-start gap-3 rounded-2xl p-5 sm:grid-cols-3">
          {(["critical", "high", "medium", "low", "info"] as Severity[]).map((s) => (
            <div key={s} className="rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-inset ring-white/6">
              <Badge severity={s}>{s}</Badge>
              <p className="tnum mt-2 text-2xl font-bold text-white">{counts[s] ?? 0}</p>
            </div>
          ))}
          <div className="rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-inset ring-white/6">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Evidence</p>
            <p className="tnum mt-1 flex items-center gap-1.5 text-[13px] font-medium text-slate-200">
              <FileText size={12} /> {data.documents.length} docs
              <Table2 size={12} className="ml-1.5" /> {data.tables.length} tables
              <Layers size={12} className="ml-1.5" /> {data.run.summary?.blocksExtracted ?? 0} blocks
            </p>
          </div>
        </div>
      </div>

      {/* report */}
      {data.run.reportMd && (
        <details className="material group rounded-2xl">
          <summary className="pressable cursor-pointer list-none px-5 py-4 text-[13.5px] font-semibold text-slate-200 [&::-webkit-details-marker]:hidden">
            Forensic report (markdown)
            <span className="ml-2 text-[11px] font-normal uppercase tracking-wider text-indigo-300 opacity-0 transition-opacity group-open:opacity-100">
              open
            </span>
          </summary>
          <div className="report-md max-h-[480px] overflow-y-auto border-t border-white/6 px-5 py-4 text-[13.5px]" dangerouslySetInnerHTML={{ __html: renderMarkdownLite(data.run.reportMd) }} />
        </details>
      )}

      <FindingsList
        findings={rankedFindings}
        citationsByFinding={citationsByFinding}
        onOpenCitation={openCitation}
      />
    </div>
  );
}

function ErrorState({ message, onAdvance }: { message: string; onAdvance: () => void }) {
  return (
    <div className="material rounded-2xl p-6 text-center">
      <AlertTriangle className="mx-auto mb-3 text-rose-300" size={20} />
      <p className="text-[14px] font-medium text-slate-200">{message}</p>
      <Button variant="secondary" size="sm" className="mt-4" onClick={onAdvance}>
        Retry
      </Button>
    </div>
  );
}

/** Tiny safe renderer for the subset of markdown our compiler emits. */
function renderMarkdownLite(md: string): string {
  const esc = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^\- (.+)$/gm, "<ul><li>$1</li></ul>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .split("\n")
    .map((line) => (/^<(h\d|ul|li)/.test(line.trim()) || line.trim() === "" ? line : `<p>${line}</p>`))
    .join("\n");
}
