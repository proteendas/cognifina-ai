"use client";

import { Activity, CheckCircle2, Database, ServerCog, XCircle } from "lucide-react";
import { AdminPageHeader, ErrorBlock, LoadingBlock, StatCard, useAdminData } from "@/components/admin/kit";
import type { SystemHealthDto } from "@/lib/admin/dto";
import { cn } from "@/lib/utils";

export default function AdminSystemPage() {
  const { data, error, loading, reload } = useAdminData<SystemHealthDto>("/api/admin/system");

  return (
    <div>
      <AdminPageHeader
        eyebrow="Super Admin"
        title="System health"
        sub="Live probes and platform counters. Latency figures are measured on request — no stored telemetry exists yet."
      />

      {loading ? (
        <LoadingBlock label="Probing database…" />
      ) : error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : !data ? null : (
        <div className="mt-7 space-y-6">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Database" value={data.dbOk ? "Operational" : "Down"} formula="8× select-1 probes, just executed" />
            <StatCard label="DB latency p50" value={`${data.dbLatencyMsP50} ms`} formula="median of 8 sequential probes" />
            <StatCard label="DB latency p95" value={`${data.dbLatencyMsP95} ms`} formula="95th percentile of 8 probes (small sample)" />
            <StatCard label="Server uptime" value={`${data.uptimeHours} h`} formula="process.uptime() of the serving instance" />
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Runs (24h)" value={data.runs24h} formula="runs created in trailing 24h" />
            <StatCard label="Failed runs (24h)" value={data.failedRuns24h} formula="status='failed' in trailing 24h" />
            <StatCard label="Total accounts" value={data.totalUsers} formula="count(*) on users" />
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <Panel
              icon={<Database size={16} className="text-accent" />}
              title="Database"
              status={data.dbOk ? "connected" : "unreachable"}
              ok={data.dbOk}
            >
              <p className="font-secondary text-[13px] leading-relaxed text-ink-3">
                Latency is measured with 8 sequential <code className="tnum rounded bg-paper-2 px-1.5 py-0.5 text-[11.5px]">select 1</code> probes per
                page load. p95 on 8 samples is indicative, not statistical — treat sustained movement, not single reads, as signal.
              </p>
            </Panel>
            <Panel icon={<ServerCog size={16} className="text-accent" />} title="Runtime" status={`node ${data.nodeVersion}`} ok>
              <p className="font-secondary text-[13px] leading-relaxed text-ink-3">{data.activeSessionsNote}</p>
            </Panel>
          </div>

          <section className="rounded-xl border border-dashed border-line-strong bg-paper-2 p-5">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-ink-3">
              <Activity size={14} className="text-warning" /> Not instrumented yet
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 font-secondary text-[13px] leading-relaxed text-ink-3">
              <li>HTTP request latency percentiles &amp; uptime history — needs a request-timing log (middleware writing to a metrics table or APM integration).</li>
              <li>Queue/worker status — the pipeline is serverless stage-per-request; there are no background queues to report.</li>
              <li>External service &amp; webhook failures — provider call outcomes are not persisted per request.</li>
            </ul>
          </section>

          <div className="flex justify-end">
            <button onClick={reload} className="pressable rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink-2 hover:bg-surface-2">
              Re-run probes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Panel({
  icon,
  title,
  status,
  ok,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  status: string;
  ok?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-soft">
      <div className="flex items-center gap-2.5">
        {icon}
        <h2 className="title-sm text-ink">{title}</h2>
        <span className={cn("ml-auto flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider", ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
          {ok ? <CheckCircle2 size={11} /> : <XCircle size={11} />} {status}
        </span>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
