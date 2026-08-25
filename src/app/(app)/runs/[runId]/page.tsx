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
      <div className="flex h-56 items-center justify-center gap-2 text-[13.5px] text-ink-4">
        <Loader2 className="animate-spin" size={16} /> Loading run…
      </div>
    );
  }
  if (error && !data) return <ErrorState message={error} onAdvance={() => void advance()} />;
  if (!data) return null;

  const { run } = data;

  if (run.status === "failed") {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 shadow-soft">
        <div className="flex items-center gap-2 text-danger">
          <AlertTriangle size={18} />
          <h2 className="text-[15px] font-semibold">Run failed</h2>
        </div>
        <p className="tnum mt-3 rounded-lg bg-danger-soft p-4 font-secondary text-[13px] leading-relaxed text-danger">{run.error}</p>
        <p className="mt-3 font-secondary text-[12.5px] leading-relaxed text-ink-4">
          Fix the reported issue (often a malformed document) and start a new run. Completed stages up to the failure are preserved.
        </p>
      </div>
    );
  }

  if (run.status !== "completed") {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-line bg-surface p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-ink">Pipeline execution</h2>
            <span className="tnum text-[13px] font-semibold text-accent">{run.progress}%</span>
          </div>
          <StageProgress currentStage={run.currentStage} status={run.status} />
          <p className="mt-4 text-center font-secondary text-[12px] text-ink-4">
            Stages advance automatically — each agent runs to completion before the next starts.
          </p>
        </div>
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger-soft/60 p-4 font-secondary text-[13px] text-danger">
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
        <div className="flex items-center justify-center rounded-xl border border-line bg-surface py-7 shadow-soft">
          <RiskGauge score={data.run.riskScore} band={data.run.riskBand} size={200} />
        </div>
        <div className="grid grid-cols-2 content-start gap-3 rounded-xl border border-line bg-surface p-5 shadow-soft sm:grid-cols-3">
          {(["critical", "high", "medium", "low", "info"] as Severity[]).map((s) => (
            <div key={s} className="rounded-lg border border-line bg-paper-2 px-4 py-3">
              <Badge severity={s}>{s}</Badge>
              <p className="tnum mt-2 text-2xl font-bold leading-none tracking-tight text-ink">{counts[s] ?? 0}</p>
            </div>
          ))}
          <div className="rounded-lg border border-line bg-paper-2 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-ink-4">Evidence</p>
            <p className="tnum mt-1.5 flex items-center gap-1.5 font-secondary text-[12px] font-medium text-ink-2">
              <FileText size={12} className="shrink-0" /> {data.documents.length} docs
            </p>
            <p className="tnum mt-1 flex items-center gap-1.5 font-secondary text-[12px] font-medium text-ink-2">
              <Table2 size={12} className="shrink-0" /> {data.tables.length} tables
              <Layers size={12} className="ml-1.5 shrink-0" /> {data.run.summary?.blocksExtracted ?? 0} blocks
            </p>
          </div>
        </div>
      </div>

      {/* report */}
      {data.run.reportMd && (
        <details className="group overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
          <summary className="pressable cursor-pointer list-none px-5 py-4 text-[13.5px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
            Forensic report (markdown)
            <span className="ml-2 text-[11px] font-normal uppercase tracking-wider text-accent opacity-0 transition-opacity group-open:opacity-100">
              open
            </span>
          </summary>
          <div className="report-md max-h-[480px] overflow-y-auto border-t border-line px-5 py-4 text-[13.5px]" dangerouslySetInnerHTML={{ __html: renderMarkdownLite(data.run.reportMd) }} />
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
    <div className="rounded-xl border border-line bg-surface p-6 text-center shadow-soft">
      <AlertTriangle className="mx-auto mb-3 text-danger" size={20} />
      <p className="text-[14px] font-medium text-ink">{message}</p>
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
