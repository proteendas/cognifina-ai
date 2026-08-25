"use client";

import Link from "next/link";
import { AdminPageHeader, EmptyBlock, ErrorBlock, LoadingBlock, StatCard, useAdminData } from "@/components/admin/kit";
import { CohortGrid } from "@/components/admin/charts";
import type { RetentionDto } from "@/lib/admin/dto";
import { RISK_REASON_LABELS } from "@/lib/admin/metrics";
import { formatDate } from "@/lib/utils";
import { ShieldAlert } from "lucide-react";

export default function AdminRetentionPage() {
  const { data, error, loading, reload } = useAdminData<RetentionDto>("/api/admin/retention");

  return (
    <div>
      <AdminPageHeader
        eyebrow="Super Admin"
        title="Retention & churn"
        sub="Weekly signup cohorts, churned accounts and at-risk users with the exact signals that triggered classification."
      />

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : !data ? null : (
        <div className="mt-7 space-y-6">
          <section className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Cohort weeks tracked" value={data.cohorts.length} formula="last 8 Monday-aligned signup weeks" />
            <StatCard label="Churned (30d silent)" value={data.churned.length} formula="≥1 run all-time, zero activity in trailing 30 days" />
            <StatCard label="Avg lifetime before churn" value={data.avgLifetimeBeforeChurnDays != null ? `${data.avgLifetimeBeforeChurnDays}d` : "—"} formula="mean days between signup and last activity, churned accounts" />
          </section>

          <Panel title="Weekly retention cohorts">
            {data.cohorts.length === 0 ? (
              <EmptyBlock message="No cohorts yet." />
            ) : (
              <CohortGrid cohorts={data.cohorts} />
            )}
            <p className="mt-3 font-secondary text-[12px] text-ink-4">
              Cell = share of the cohort with ≥1 activity event (run or chat) in that week of life. “—” = period not yet observable.
            </p>
          </Panel>

          <Panel title={`At-risk accounts (${data.atRisk.length})`}>
            {data.atRisk.length === 0 ? (
              <EmptyBlock message="No at-risk signals — every account looks healthy." />
            ) : (
              <ul>
                {data.atRisk.map((u) => (
                  <li key={u.userId} className="border-b border-line py-3 last:border-0">
                    <Link href={`/super-admin/users/${u.userId}`} className="group flex items-start gap-3">
                      <ShieldAlert size={15} className={u.confidence === "high" ? "mt-0.5 shrink-0 text-danger" : "mt-0.5 shrink-0 text-warning"} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-ink group-hover:text-accent">
                          {u.name} · {u.email}
                        </span>
                        <span className="tnum block truncate font-secondary text-[11.5px] text-ink-4">
                          created {formatDate(u.createdAt)} · {u.totalRuns} run{u.totalRuns === 1 ? "" : "s"} · last {u.lastActivityAt ? formatDate(u.lastActivityAt) : "never"} · confidence {u.confidence}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-1.5">
                          {u.reasons.map((r) => (
                            <span key={r} className="rounded-md border border-line bg-paper-2 px-1.5 py-0.5 text-[10.5px] font-medium text-ink-3">
                              {RISK_REASON_LABELS[r]}
                            </span>
                          ))}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={`Churned accounts (${data.churned.length})`}>
            {data.churned.length === 0 ? (
              <EmptyBlock message="Nobody has gone quiet for 30+ days yet." />
            ) : (
              <ul>
                {data.churned.map((u) => (
                  <li key={u.userId} className="flex items-center gap-3 border-b border-line py-2.5 text-[13px] last:border-0">
                    <Link href={`/super-admin/users/${u.userId}`} className="min-w-0 flex-1 truncate font-medium text-ink hover:text-accent">
                      {u.name} · <span className="font-normal text-ink-3">{u.email}</span>
                    </Link>
                    <span className="tnum hidden shrink-0 font-secondary text-[11.5px] text-ink-4 sm:block">{u.totalRuns} runs · last {u.lastActivityAt ? formatDate(u.lastActivityAt) : "never"}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
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
