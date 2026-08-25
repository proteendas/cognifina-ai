"use client";

import { useState } from "react";
import { Lightbulb, Loader2 } from "lucide-react";
import { AdminPageHeader, EmptyBlock, ErrorBlock, LoadingBlock, RangePicker, useAdminData } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { RecommendationRow } from "@/lib/admin/dto";
import { cn, formatDate } from "@/lib/utils";

const STATUS_OPTIONS = ["new", "reviewed", "in_progress", "completed", "dismissed"];

const PRIORITY_STYLE: Record<string, string> = {
  high: "bg-danger-soft text-danger",
  medium: "bg-warning-soft text-warning",
  low: "bg-info-soft text-info",
};

export default function AdminRecommendationsPage() {
  return (
    <div className="space-y-0">
      <RecommendationsInner />
    </div>
  );
}

function RecommendationsInner() {
  const { data, error, loading, reload } = useAdminData<{ rows: RecommendationRow[] }>("/api/admin/recommendations?days=30");
  const [busyId, setBusyId] = useState<string | null>(null);

  const setStatus = async (id: string, status: string) => {
    setBusyId(id);
    try {
      await fetch("/api/admin/recommendations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      });
      reload();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <AdminPageHeader
        eyebrow="Super Admin"
        title="Recommendations & insights"
        sub="Rules run over live aggregates; every insight cites the metric that produced it and keeps a review lifecycle."
        actions={<RangePicker />}
      />

      {loading ? (
        <LoadingBlock label="Running insight rules…" />
      ) : error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyBlock message="No insights triggered — the rules only fire when the data crosses their thresholds." />
      ) : (
        <div className="mt-6 space-y-4">
          {data.rows.map((r) => (
            <article key={r.id} className="rounded-xl border border-line bg-surface p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Lightbulb size={16} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold leading-snug tracking-tight text-ink">{r.title}</h2>
                    <p className="mt-1 font-secondary text-[13px] leading-relaxed text-ink-2">{r.description}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider", PRIORITY_STYLE[r.priority])}>
                    {r.priority} priority
                  </span>
                  <span className="rounded-md border border-line bg-paper-2 px-2 py-0.5 text-[11px] font-medium text-ink-3">confidence {r.confidence}</span>
                  <span className="rounded-md border border-line bg-paper-2 px-2 py-0.5 text-[11px] font-medium capitalize text-ink-3">{r.status.replace("_", " ")}</span>
                </div>
              </div>

              <dl className="mt-4 grid gap-x-8 gap-y-3 rounded-lg border border-line bg-paper-2 p-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4">Evidence (source of truth)</dt>
                  <dd className="tnum mt-1 font-mono text-[11.5px] leading-relaxed text-ink-2">{JSON.stringify(r.evidence)}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4">Affected</dt>
                  <dd className="mt-1 font-secondary text-[12.5px] text-ink-2">
                    {r.affectedSegment || "—"} · {r.affectedArea || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4">Generated</dt>
                  <dd className="tnum mt-1 font-secondary text-[12.5px] text-ink-2">{formatDate(r.generatedAt)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4">Recommended action</dt>
                  <dd className="mt-1 font-secondary text-[12.5px] leading-relaxed text-ink-2">{r.recommendation}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4">Expected outcome</dt>
                  <dd className="mt-1 font-secondary text-[12.5px] leading-relaxed text-ink-2">{r.expectedOutcome}</dd>
                </div>
              </dl>

              <div className="mt-4 flex items-center gap-3">
                <Select
                  options={STATUS_OPTIONS}
                  value={r.status}
                  onChange={(s) => void setStatus(r.id, s)}
                  className="w-44"
                />
                {busyId === r.id && <Loader2 size={14} className="animate-spin text-ink-4" />}
                <span className="font-secondary text-[11.5px] text-ink-4">Status changes are audited with your identity.</span>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="mt-6 flex justify-end">
        <Button variant="ghost" size="sm" onClick={reload}>
          Re-run rules
        </Button>
      </div>
    </div>
  );
}
