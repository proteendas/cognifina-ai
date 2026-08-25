"use client";

import { Suspense, useState } from "react";
import { AdminPageHeader, EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useAdminData } from "@/components/admin/kit";
import type { AuditPage } from "@/lib/admin/dto";
import { formatDate } from "@/lib/utils";

export default function AdminAuditPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <AuditInner />
    </Suspense>
  );
}

function AuditInner() {
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), pageSize: "25" });
  if (q) params.set("q", q);
  if (action) params.set("action", action);
  const { data, error, loading, reload } = useAdminData<AuditPage>(`/api/admin/audit?${params.toString()}`);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const adminOnly = action === "admin";

  return (
    <div>
      <AdminPageHeader
        eyebrow="Super Admin"
        title="Audit logs"
        sub="Append-only trail: account events and admin actions with actor, detail, structured metadata and UTC timestamp."
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor="audit-q">Search</Label>
          <div className="relative mt-1.5">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
            <Input
              id="audit-q"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Action, detail or actor email…"
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex gap-2">
          {[
            ["", "All events"],
            ["admin", "Admin actions"],
            ["run.", "Run events"],
            ["auth.", "Auth events"],
            ["key.", "Key events"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                setAction(value);
                setPage(1);
              }}
              className={`pressable rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                action === value ? "border-accent/30 bg-accent-soft text-accent" : "border-line-strong bg-surface text-ink-3 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyBlock message="No audit events match." />
      ) : (
        <>
          <div className="mt-5 overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[10.5px] uppercase tracking-wider text-ink-4">
                    <th className="px-4 py-3 font-medium">When (UTC)</th>
                    <th className="px-4 py-3 font-medium">Actor</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Detail</th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">Meta</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id} className="border-b border-line transition-colors last:border-0 hover:bg-paper-2">
                      <td className="tnum whitespace-nowrap px-4 py-3 font-secondary text-[12px] text-ink-4">{formatDate(r.at)}</td>
                      <td className="max-w-[180px] truncate px-4 py-3 font-medium text-ink" title={r.actorEmail}>
                        {r.actorName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium ${
                            r.action.startsWith("admin.") ? "bg-accent-soft text-accent" : "bg-paper-2 text-ink-3"
                          }`}
                        >
                          {r.action}
                        </span>
                      </td>
                      <td className="max-w-[280px] truncate px-4 py-3 font-secondary text-ink-2" title={r.detail}>
                        {r.detail || "—"}
                      </td>
                      <td className="hidden max-w-[220px] truncate px-4 py-3 font-mono text-[11px] text-ink-4 lg:table-cell" title={JSON.stringify(r.meta)}>
                        {Object.keys(r.meta ?? {}).length ? JSON.stringify(r.meta) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-[13px] text-ink-3">
            <span className="tnum">
              {data.total} event{data.total === 1 ? "" : "s"} · page {data.page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
