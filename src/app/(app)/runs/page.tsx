"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/progress";
import { api } from "@/lib/client";
import type { RunListItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function RunsPage() {
  const [runs, setRuns] = useState<RunListItem[] | null>(null);
  const [pending, setPending] = useState<RunListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api.runs
      .list()
      .then((r) => setRuns(r.runs))
      .catch(() => setRuns([]));

  useEffect(() => {
    void load();
  }, []);

  const destroy = async () => {
    if (!pending) return;
    setDeleting(true);
    setError(null);
    try {
      await api.runs.delete(pending.id);
      setPending(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete run");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <p className="eyebrow">History</p>
      <h1 className="display-md mt-1.5 text-ink">Runs</h1>
      <p className="body-sm mt-1">Every analysis is reproducible — same evidence, same result.</p>

      {!runs ? (
        <div className="mt-8 space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <div className="mt-8 rounded-xl border border-line bg-surface px-6 py-12 text-center shadow-soft">
          <p className="text-[14px] font-medium text-ink-2">No runs yet</p>
          <p className="mt-1 font-secondary text-[13px] leading-relaxed text-ink-4">
            Pick a workflow to start your first forensic analysis.
          </p>
          <Link href="/workflows" className="mt-5 inline-block">
            <span className="pressable inline-flex h-9 items-center rounded-lg bg-accent px-4 text-[13px] font-medium text-white shadow-soft hover:bg-accent-hover">
              Browse workflows
            </span>
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wider text-ink-4">
                  <th className="px-5 py-3 font-medium">Workflow</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Entity</th>
                  <th className="hidden px-5 py-3 font-medium lg:table-cell">Created</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Score</th>
                  <th className="px-5 py-3 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="group border-b border-line transition-colors last:border-0 hover:bg-paper-2">
                    <td className="max-w-[240px] px-5 py-3.5">
                      <Link href={`/runs/${r.id}`} className="block truncate text-[13.5px] font-medium text-ink group-hover:text-accent">
                        {r.workflowName}
                      </Link>
                      <span className="block truncate font-secondary text-[11.5px] text-ink-4">{r.periodLabel || r.entityName || "\u00A0"}</span>
                    </td>
                    <td className="hidden max-w-[180px] truncate px-5 py-3.5 font-secondary text-[13px] text-ink-2 md:table-cell">
                      {r.entityName || "—"}
                    </td>
                    <td className="tnum hidden whitespace-nowrap px-5 py-3.5 font-secondary text-[12px] text-ink-4 lg:table-cell">{formatDate(r.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      {r.status === "completed" ? (
                        <Badge severity="info">completed</Badge>
                      ) : r.status === "failed" ? (
                        <Badge severity="critical">failed</Badge>
                      ) : (
                        <Badge>{r.status} · {r.progress}%</Badge>
                      )}
                    </td>
                    <td className="tnum px-5 py-3.5 text-right text-[14px] font-semibold text-ink">
                      {r.riskScore != null ? `${r.riskScore}/100` : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setError(null);
                          setPending(r);
                        }}
                        aria-label={`Delete ${r.workflowName} run`}
                        title="Delete run"
                        className="pressable inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-4 transition-colors hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* delete confirmation */}
      <Dialog open={pending !== null} onClose={() => !deleting && setPending(null)} title="Delete this run?">
        <p className="font-secondary text-[13.5px] leading-relaxed text-ink-2">
          Permanently delete <span className="font-medium text-ink">{pending?.workflowName}</span>
          {pending?.entityName ? ` for ${pending.entityName}` : ""}? All documents, findings, citations and chat
          history for this run are erased immediately and cannot be recovered.
        </p>
        {error && <p className="mt-3 font-secondary text-[12.5px] text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPending(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => void destroy()} disabled={deleting}>
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete run
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
