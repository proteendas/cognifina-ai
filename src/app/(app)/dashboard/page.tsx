"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Gauge,
  KeyRound,
  LogIn,
  LogOut,
  PlayCircle,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/progress";
import { api } from "@/lib/client";
import type { AuditEventDto, UsageStatsDto } from "@/lib/types";
import { timeAgo, formatDate } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const AUDIT_META: Record<string, { label: string; icon: LucideIcon }> = {
  "account.created": { label: "Workspace created", icon: Sparkles },
  "auth.login": { label: "Signed in", icon: LogIn },
  "auth.logout": { label: "Signed out", icon: LogOut },
  "run.created": { label: "Run started", icon: PlayCircle },
  "run.completed": { label: "Run completed", icon: CheckCircle2 },
  "run.failed": { label: "Run failed", icon: AlertTriangle },
  "run.deleted": { label: "Run deleted", icon: Trash2 },
  "key.saved": { label: "API key saved", icon: KeyRound },
  "key.removed": { label: "API key removed", icon: KeyRound },
  "profile.renamed": { label: "Profile updated", icon: UserRound },
  "password.changed": { label: "Password changed", icon: KeyRound },
  "preferences.updated": { label: "Preferences updated", icon: Settings },
  "account.deleted": { label: "Account deleted", icon: Trash2 },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<UsageStatsDto | null>(null);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    api.stats.get().then(setStats).catch(() => setStats(null));
    api.auth.me().then((r) => setUserName(r.user?.name?.split(" ")[0] ?? "")).catch(() => undefined);
  }, []);

  return (
    <div>
      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="display-md mt-1.5 text-ink">
            Welcome back{userName ? `, ${userName}` : ""}.
          </h1>
          <p className="body-sm mt-1">Usage overview and account activity at a glance.</p>
        </div>
        <Link href="/workflows" className="shrink-0">
          <Button className="group">
            <Plus size={15} /> New analysis
          </Button>
        </Link>
      </div>

      {/* usage stats */}
      {!stats ? (
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[118px]" />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatCard icon={PlayCircle} label="Total runs" value={stats.totals.runs} sub={`${stats.totals.activeRuns} active · ${stats.totals.failed} failed`} />
          <StatCard icon={CheckCircle2} label="Completed" value={stats.totals.completed} sub="runs finished successfully" />
          <StatCard icon={FileText} label="Documents analyzed" value={stats.totals.documents} sub={`${stats.totals.findings} findings reported`} />
          <StatCard
            icon={Gauge}
            label="Avg risk score"
            value={stats.totals.avgRiskScore != null ? `${stats.totals.avgRiskScore}/100` : "—"}
            sub={stats.keysConfigured > 0 ? `${stats.keysConfigured} provider key${stats.keysConfigured > 1 ? "s" : ""} configured` : "no model keys yet"}
          />
        </motion.div>
      )}

      {/* severity strip */}
      {stats && stats.totals.findings > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-line bg-surface px-5 py-3.5 shadow-soft">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-4">Findings by severity</span>
          {(["critical", "high", "medium", "low", "info"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-[13px]">
              <Badge severity={s}>{s}</Badge>
              <span className="tnum font-semibold text-ink">{stats.severityTotals[s]}</span>
            </span>
          ))}
        </div>
      )}

      {/* recent runs + audit log */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <section aria-label="Recent runs" className="rounded-xl border border-line bg-surface shadow-soft">
          <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="title-sm text-ink">Recent runs</h2>
            <Link href="/runs" className="group flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
              View all
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </header>
          {!stats ? (
            <div className="space-y-2 p-5">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : stats.recentRuns.length === 0 ? (
            <EmptyRuns />
          ) : (
            <ul>
              {stats.recentRuns.map((r) => (
                <li key={r.id} className="border-b border-line last:border-0">
                  <Link href={`/runs/${r.id}`} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-paper-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-ink group-hover:text-accent">{r.workflowName}</span>
                      <span className="tnum block truncate text-[11.5px] text-ink-4">
                        {r.entityName || r.periodLabel || "—"} · {formatDate(r.createdAt)}
                      </span>
                    </span>
                    {r.status === "completed" ? (
                      r.riskScore != null && (
                        <span className="tnum shrink-0 rounded-md border border-line bg-surface-2 px-2 py-0.5 text-[12px] font-semibold text-ink">
                          {r.riskScore}/100
                        </span>
                      )
                    ) : (
                      <Badge severity={r.status === "failed" ? "critical" : "info"} className="shrink-0">
                        {r.status}
                      </Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Audit log" className="rounded-xl border border-line bg-surface shadow-soft">
          <header className="border-b border-line px-5 py-3.5">
            <h2 className="title-sm text-ink">Audit log</h2>
          </header>
          {!stats ? (
            <div className="space-y-2 p-5">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-9" />
              ))}
            </div>
          ) : stats.events.length === 0 ? (
            <p className="px-5 py-8 text-center font-secondary text-[13px] text-ink-4">
              Account activity will appear here.
            </p>
          ) : (
            <ol className="px-5 py-2">
              {stats.events.map((e: AuditEventDto) => {
                const meta = AUDIT_META[e.action] ?? { label: e.action, icon: Sparkles };
                return (
                  <li key={e.id} className="flex items-start gap-3 border-b border-line py-2.5 last:border-0">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-paper-2 text-ink-3">
                      <meta.icon size={13} />
                    </span>
                    <span className="min-w-0 flex-1 leading-snug">
                      <span className="block truncate text-[13px] font-medium text-ink">{meta.label}</span>
                      {e.detail && <span className="block truncate font-secondary text-[11.5px] text-ink-4">{e.detail}</span>}
                    </span>
                    <time className="tnum shrink-0 pt-0.5 text-[11px] text-ink-4" dateTime={e.createdAt}>
                      {timeAgo(e.createdAt)}
                    </time>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      {/* quick links */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/settings" className="group flex items-center gap-4 rounded-xl border border-line bg-surface p-5 shadow-soft transition-shadow hover:shadow-lift">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <KeyRound size={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold text-ink">Model providers</span>
            <span className="block truncate font-secondary text-[12.5px] text-ink-3">
              {stats && stats.keysConfigured > 0 ? `${stats.keysConfigured} key(s) in your encrypted vault` : "Add a BYOK key to enable the language agents"}
            </span>
          </span>
          <ArrowRight size={16} className="ml-auto shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
        </Link>
        <Link href="/profile" className="group flex items-center gap-4 rounded-xl border border-line bg-surface p-5 shadow-soft transition-shadow hover:shadow-lift">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <UserRound size={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold text-ink">Profile & preferences</span>
            <span className="block truncate font-secondary text-[12.5px] text-ink-3">Name, password, workspace defaults</span>
          </span>
          <ArrowRight size={16} className="ml-auto shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-soft transition-shadow hover:shadow-lift">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Icon size={15} />
        </span>
        <p className="text-[12px] font-medium uppercase tracking-wider text-ink-4">{label}</p>
      </div>
      <p className="tnum mt-3 text-[28px] font-bold leading-none tracking-tight text-ink">{value}</p>
      <p className="mt-1.5 truncate font-secondary text-[12px] text-ink-4">{sub}</p>
    </div>
  );
}

function EmptyRuns() {
  return (
    <div className="px-6 py-10 text-center">
      <p className="text-[14px] font-medium text-ink-2">No runs yet</p>
      <p className="mx-auto mt-1 max-w-xs font-secondary text-[13px] leading-relaxed text-ink-4">
        Pick a workflow to start your first deterministic forensic analysis.
      </p>
      <Link href="/workflows">
        <Button size="sm" variant="secondary" className="mt-4">Browse workflows</Button>
      </Link>
    </div>
  );
}
