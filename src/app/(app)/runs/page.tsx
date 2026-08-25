"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/progress";
import { api } from "@/lib/client";
import type { RunListItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function RunsPage() {
  const [runs, setRuns] = useState<RunListItem[] | null>(null);

  useEffect(() => {
    api.runs
      .list()
      .then((r) => setRuns(r.runs))
      .catch(() => setRuns([]));
  }, []);

  return (
    <div>
      <h1 className="display text-2xl font-bold tracking-tight text-white">Runs</h1>
      <p className="mt-1 text-[13.5px] text-slate-400">Every analysis is reproducible — same evidence, same result.</p>

      {!runs ? (
        <div className="mt-8 space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <div className="material mt-8 rounded-2xl px-6 py-12 text-center">
          <p className="text-[14px] font-medium text-slate-300">No runs yet</p>
          <p className="mt-1 text-[13px] text-slate-500">
            Pick a workflow to start your first forensic analysis.
          </p>
          <Link href="/workflows" className="mt-5 inline-block rounded-xl bg-indigo-500 px-4 py-2 text-[13px] font-medium text-white hover:bg-indigo-400">
            Browse workflows
          </Link>
        </div>
      ) : (
        <div className="material mt-6 overflow-hidden rounded-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/6 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 font-medium">Workflow</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">Entity</th>
                <th className="hidden px-5 py-3 font-medium lg:table-cell">Created</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="group border-b border-white/4 transition-colors last:border-0 hover:bg-white/[0.03]">
                  <td className="max-w-[240px] px-5 py-3.5">
                    <Link href={`/runs/${r.id}`} className="block truncate text-[13.5px] font-medium text-slate-100 group-hover:text-indigo-300">
                      {r.workflowName}
                    </Link>
                    <span className="text-[11.5px] text-slate-500">{r.periodLabel || r.entityName || "\u00A0"}</span>
                  </td>
                  <td className="hidden max-w-[180px] truncate px-5 py-3.5 text-[13px] text-slate-300 md:table-cell">
                    {r.entityName || "—"}
                  </td>
                  <td className="tnum hidden px-5 py-3.5 text-[12px] text-slate-500 lg:table-cell">{formatDate(r.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    {r.status === "completed" ? (
                      <Badge severity="info">completed</Badge>
                    ) : r.status === "failed" ? (
                      <Badge severity="critical">failed</Badge>
                    ) : (
                      <Badge>{r.status} · {r.progress}%</Badge>
                    )}
                  </td>
                  <td className="tnum px-5 py-3.5 text-right text-[14px] font-semibold text-slate-200">
                    {r.riskScore != null ? `${r.riskScore}/100` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
