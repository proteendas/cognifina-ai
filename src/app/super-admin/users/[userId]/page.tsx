"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { AdminPageHeader, ErrorBlock, LoadingBlock } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea, Label } from "@/components/ui/input";
import { useAdminData } from "@/components/admin/kit";
import type { UserDetailDto } from "@/lib/admin/dto";
import { RISK_REASON_LABELS } from "@/lib/admin/metrics";
import { formatDate, timeAgo } from "@/lib/utils";

export default function AdminUserDetailPage({ params }: { params: { userId: string } }) {
  const userId = params.userId;
  const { data, error, loading, reload } = useAdminData<UserDetailDto>(`/api/admin/users/${userId}`);

  return (
    <div>
      <Link href="/super-admin/users" className="pressable mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3 hover:text-accent">
        <ArrowLeft size={14} /> All users
      </Link>
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : !data ? null : (
        <UserDetail inner={data} onSaved={reload} />
      )}
    </div>
  );
}

function UserDetail({ inner, onSaved }: { inner: UserDetailDto; onSaved: () => void }) {
  const { user, stats, recentRuns, auditHistory, risk } = inner;
  const [notes, setNotes] = useState(user.internalNotes);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  useEffect(() => setNotes(user.internalNotes), [user.internalNotes]);

  const saveNotes = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "set_notes", userId: user.id, notes }),
      });
      setSavedAt(new Date().toISOString());
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        eyebrow="Account"
        title={user.name}
        sub={user.email}
        actions={
          <div className="flex gap-1.5">
            {user.role === "SUPER_ADMIN" && <Badge className="border-accent/30 bg-accent-soft text-accent">super admin</Badge>}
            {user.status === "suspended" ? <Badge severity="critical">suspended</Badge> : <Badge severity="info">active</Badge>}
          </div>
        }
      />
      <p className="tnum mt-2 font-secondary text-[12px] text-ink-4">
        Created {formatDate(user.createdAt)} · last activity {stats.lastActivityAt ? timeAgo(stats.lastActivityAt) : "never"}
      </p>

      {risk && (
        <div className="mt-5 rounded-xl border border-danger/25 bg-danger-soft/50 p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-danger">
            Risk signals <span className="font-normal text-ink-3">· confidence {risk.confidence}</span>
          </p>
          <ul className="mt-2 space-y-1">
            {risk.reasons.map((r) => (
              <li key={r} className="font-secondary text-[12.5px] text-ink-2">
                • {RISK_REASON_LABELS[r]}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* stats */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Runs", stats.totalRuns],
          ["Completed", stats.completedRuns],
          ["Failed", stats.failedRuns],
          ["Documents", stats.documents],
          ["Findings", stats.findings],
          ["Chat messages", stats.chatMessages],
          ["Provider keys", stats.keysConfigured],
          ["Avg risk score", stats.avgRiskScore ?? "—"],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border border-line bg-surface p-4 shadow-soft">
            <p className="text-[11px] font-medium uppercase tracking-wider text-ink-4">{label}</p>
            <p className="tnum mt-1.5 text-xl font-bold leading-none tracking-tight text-ink">{value as number}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* recent runs */}
        <section className="rounded-xl border border-line bg-surface shadow-soft">
          <header className="border-b border-line px-5 py-3.5">
            <h2 className="title-sm text-ink">Recent runs</h2>
          </header>
          {recentRuns.length === 0 ? (
            <p className="px-5 py-8 text-center font-secondary text-[13px] text-ink-4">No runs yet.</p>
          ) : (
            <ul>
              {recentRuns.map((r) => (
                <li key={r.id} className="flex items-center gap-3 border-b border-line px-5 py-2.5 text-[13px] last:border-0">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{r.workflowName}</span>
                    <span className="tnum block truncate font-secondary text-[11px] text-ink-4">{r.entityName || "—"} · {formatDate(r.createdAt)}</span>
                  </span>
                  {r.status === "completed" ? (
                    <span className="tnum shrink-0 font-semibold text-ink">{r.riskScore != null ? `${r.riskScore}/100` : "—"}</span>
                  ) : (
                    <Badge severity={r.status === "failed" ? "critical" : "info"}>{r.status}</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-4">
          {/* internal notes */}
          <section className="rounded-xl border border-line bg-surface p-5 shadow-soft">
            <Label htmlFor="internal-notes">Internal notes (admin-only)</Label>
            <Textarea id="internal-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Context for other administrators…" className="mt-1.5" />
            <div className="mt-3 flex items-center gap-3">
              <Button size="sm" onClick={() => void saveNotes()} disabled={saving || notes === user.internalNotes}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save notes
              </Button>
              {savedAt && <span className="font-secondary text-[12px] text-success">Saved · audited</span>}
            </div>
          </section>

          {/* audit history */}
          <section className="rounded-xl border border-line bg-surface shadow-soft">
            <header className="border-b border-line px-5 py-3.5">
              <h2 className="title-sm text-ink">Account audit history</h2>
            </header>
            {auditHistory.length === 0 ? (
              <p className="px-5 py-8 text-center font-secondary text-[13px] text-ink-4">No events.</p>
            ) : (
              <ol className="max-h-72 overflow-y-auto px-5 py-2">
                {auditHistory.map((h) => (
                  <li key={h.id} className="flex items-start gap-3 border-b border-line py-2 text-[12.5px] last:border-0">
                    <span className="shrink-0 rounded-md bg-paper-2 px-1.5 py-0.5 text-[10.5px] font-medium text-ink-3">{h.action}</span>
                    <span className="min-w-0 flex-1 truncate font-secondary text-ink-3">{h.detail || "—"}</span>
                    <time className="tnum shrink-0 text-[10.5px] text-ink-4">{timeAgo(h.at)}</time>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
