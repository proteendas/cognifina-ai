"use client";

import { Suspense } from "react";
import { AdminPageHeader, ErrorBlock, LoadingBlock, RangePicker, StatCard, useAdminData } from "@/components/admin/kit";
import { FunnelBars, TrendArea } from "@/components/admin/charts";
import type { AnalyticsDto } from "@/lib/admin/dto";

export default function AdminAnalyticsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <AnalyticsInner />
    </Suspense>
  );
}

function AnalyticsInner() {
  const { data, error, loading, reload } = useAdminData<AnalyticsDto>("/api/admin/analytics?days=30");

  return (
    <div>
      <AdminPageHeader
        eyebrow="Super Admin"
        title="Product analytics"
        sub="How the tool is actually used: acquisition, activation funnel over the real workflow, engagement segments."
        actions={<RangePicker />}
      />

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : !data ? null : (
        <div className="mt-7 space-y-6">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Avg runs / active user" value={data.engagement.avgRunsPerActiveUser?.toFixed(1) ?? "—"} formula="runs in window ÷ distinct running users" />
            <StatCard label="Power users (≥5 runs)" value={data.engagement.powerUsers} formula="distinct users with ≥5 runs in window" />
            <StatCard label="Never ran an analysis" value={data.engagement.neverUsed} formula="accounts with zero runs, all-time" />
            <StatCard label="Inactive 30d (has run)" value={data.engagement.inactive30d} formula="users with ≥1 run all-time but no activity in trailing 30d" />
            <StatCard label="Started, never completed" value={data.engagement.startedNotCompleted} formula="users who started ≥1 run with zero completions" />
            <StatCard label="Re-engaged in window" value={data.engagement.reengaged} formula="users active before the previous window and again within it" />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Panel title="Signups over time">
              <TrendArea data={data.signupsOverTime} dataKey="value" label="Signups" />
            </Panel>
            <Panel title="Active users over time">
              <TrendArea data={data.activeOverTime} dataKey="value" label="Active" color="#1E874B" />
            </Panel>
          </section>

          <Panel title="New vs returning activity per day">
            <TrendArea data={data.newVsReturning} dataKey="New" label="New" color="#0F3D3E" height={180} />
            <TrendArea data={data.newVsReturning} dataKey="Returning" label="Returning" color="#3B6EA5" height={180} />
          </Panel>

          <Panel title="Activation funnel — the real product workflow">
            <FunnelBars stages={data.funnel} />
            <p className="mt-4 font-secondary text-[12px] leading-relaxed text-ink-4">
              Stages: account created → started an analysis → analysis completed → used Evidence Chat → returned on 2+ distinct days.
              Percentages show conversion from the previous stage.
            </p>
          </Panel>

          <section className="grid gap-4 sm:grid-cols-2">
            <Panel title="By role">
              <SegmentList rows={data.segments.byRole} />
            </Panel>
            <Panel title="By account status">
              <SegmentList rows={data.segments.byStatus} />
            </Panel>
          </section>
        </div>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-soft">
      <h2 className="title-sm mb-4 text-ink">{title}</h2>
      {children}
    </section>
  );
}

function SegmentList({ rows }: { rows: { segment: string; users: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.users));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.segment}>
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="font-medium capitalize text-ink">{r.segment}</span>
            <span className="tnum font-semibold text-ink-2">{r.users}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent/70" style={{ width: `${(r.users / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
