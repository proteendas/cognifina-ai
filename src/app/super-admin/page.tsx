"use client";

import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminPageHeader, EmptyBlock, ErrorBlock, LoadingBlock, RangePicker, StatCard, useAdminData } from "@/components/admin/kit";
import { DualBar, TrendArea } from "@/components/admin/charts";
import { RISK_REASON_LABELS } from "@/lib/admin/metrics";
import type { OverviewDto } from "@/lib/admin/dto";
import { timeAgo } from "@/lib/utils";

export default function SuperAdminOverview() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <OverviewInner />
    </Suspense>
  );
}

function OverviewInner() {
  const { data, error, loading, reload } = useAdminData<OverviewDto>("/api/admin/overview?days=30");

  return (
    <div>
      <AdminPageHeader
        eyebrow="Super Admin"
        title="Overview"
        sub="Current state of the platform — every figure is computed from live product tables (UTC windows)."
        actions={<RangePicker />}
      />

      {loading ? (
        <LoadingBlock label="Crunching aggregates…" />
      ) : error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : !data ? null : (
        <div className="mt-7 space-y-6">
          {/* stat cards */}
          <section aria-label="Key metrics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={data.totals.users.label} value={data.totals.users.value} formula={data.totals.users.formula} />
            <StatCard label={data.totals.newUsers.label} value={data.totals.newUsers.value} previous={data.totals.newUsers.previous} changePct={data.totals.newUsers.changePct} formula={data.totals.newUsers.formula} />
            <StatCard label={data.totals.dau.label} value={data.totals.dau.value} formula={data.totals.dau.formula} />
            <StatCard label={data.totals.wau.label} value={data.totals.wau.value} formula={data.totals.wau.formula} />
            <StatCard label={data.totals.mau.label} value={data.totals.mau.value} formula={data.totals.mau.formula} />
            <StatCard label={data.totals.runs.label} value={data.totals.runs.value} previous={data.totals.runs.previous} changePct={data.totals.runs.changePct} formula={data.totals.runs.formula} />
            <StatCard label={data.totals.completedRuns.label} value={data.totals.completedRuns.value} previous={data.totals.completedRuns.previous} changePct={data.totals.completedRuns.changePct} formula={data.totals.completedRuns.formula} />
            <StatCard label={data.totals.errorRate.label} value={data.totals.errorRate.value} previous={data.totals.errorRate.previous} changePct={data.totals.errorRate.changePct} formula={data.totals.errorRate.formula} />
            <StatCard label={data.totals.avgRiskScore.label} value={data.totals.avgRiskScore.value} previous={data.totals.avgRiskScore.previous} changePct={data.totals.avgRiskScore.changePct} formula={data.totals.avgRiskScore.formula} />
            <StatCard label={data.totals.documents.label} value={data.totals.documents.value} previous={data.totals.documents.previous} changePct={data.totals.documents.changePct} formula={data.totals.documents.formula} />
            <StatCard label={data.totals.findings.label} value={data.totals.findings.value} formula={data.totals.findings.formula} />
            <StatCard label={data.totals.workspacesNew.label} value={data.totals.workspacesNew.value} previous={data.totals.workspacesNew.previous} changePct={data.totals.workspacesNew.changePct} formula={data.totals.workspacesNew.formula} />
          </section>

          {/* trends */}
          <section className="grid gap-4 lg:grid-cols-2">
            <Panel title="User growth — signups per day">
              <TrendArea data={data.trends.signups} dataKey="value" label="Signups" />
            </Panel>
            <Panel title="Active users per day">
              <TrendArea data={data.trends.active} dataKey="value" label="Active users" color="#1E874B" />
            </Panel>
            <Panel title="Runs vs failures per day" className="lg:col-span-2">
              <DualBar data={data.trends.runs} aKey="current" bKey="previous" aLabel="Runs started" bLabel="Failures" />
            </Panel>
          </section>

          {/* top workflows + attention */}
          <section className="grid gap-4 lg:grid-cols-2">
            <Panel title="Most-used workflows (window)">
              {data.topWorkflows.length === 0 ? (
                <EmptyBlock message="No runs in this window yet." />
              ) : (
                <ul>
                  {data.topWorkflows.map((w) => (
                    <li key={w.workflowId} className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-[13.5px] last:border-0">
                      <Link href="/super-admin/features" className="truncate font-medium text-ink hover:text-accent">
                        {w.name}
                      </Link>
                      <span className="tnum shrink-0 font-semibold text-ink-2">{w.runs}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Accounts needing attention">
              {data.attention.length === 0 ? (
                <EmptyBlock message="No at-risk accounts detected — every signal is clean." />
              ) : (
                <ul>
                  {data.attention.slice(0, 6).map((u) => (
                    <li key={u.userId} className="border-b border-line py-2.5 last:border-0">
                      <Link href={`/super-admin/users/${u.userId}`} className="group flex items-start gap-2.5">
                        <ShieldAlert size={14} className={u.confidence === "high" ? "mt-0.5 shrink-0 text-danger" : "mt-0.5 shrink-0 text-warning"} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium text-ink group-hover:text-accent">{u.name} · {u.email}</span>
                          <span className="block truncate font-secondary text-[11.5px] text-ink-4">
                            {u.reasons.map((r) => RISK_REASON_LABELS[r]).join(" · ")}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </section>

          {/* recent admin events */}
          <Panel title="Recent account events">
            {data.recentAdminEvents.length === 0 ? (
              <EmptyBlock message="No events recorded yet." />
            ) : (
              <ul>
                {data.recentAdminEvents.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 border-b border-line py-2 text-[13px] last:border-0">
                    <span className="w-40 shrink-0 truncate font-medium text-ink">{e.actor}</span>
                    <span className="shrink-0 rounded-md bg-paper-2 px-2 py-0.5 text-[11px] font-medium text-ink-3">{e.action}</span>
                    <span className="min-w-0 flex-1 truncate font-secondary text-ink-3">{e.detail}</span>
                    <span className="tnum shrink-0 text-[11px] text-ink-4">{timeAgo(e.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* honest unavailability */}
          <section className="rounded-xl border border-dashed border-line-strong bg-paper-2 p-5">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-ink-3">
              <AlertTriangle size={14} className="text-warning" /> Not computable yet — and exactly why
            </h2>
            <ul className="mt-3 space-y-2.5">
              {data.unavailable.map((u) => (
                <li key={u.metric} className="font-secondary text-[13px] leading-relaxed text-ink-3">
                  <span className="font-semibold text-ink-2">{u.metric}:</span> {u.reason} <span className="text-ink-4">Requires {u.required}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex justify-end">
            <Link href="/super-admin/users" className="group flex items-center gap-1.5 text-[13.5px] font-medium text-accent hover:underline">
              Manage users
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-line bg-surface p-5 shadow-soft", className)}>
      <h2 className="title-sm mb-4 text-ink">{title}</h2>
      {children}
    </section>
  );
}
