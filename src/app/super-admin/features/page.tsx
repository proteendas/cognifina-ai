"use client";

import { Suspense } from "react";
import { AdminPageHeader, EmptyBlock, ErrorBlock, LoadingBlock, RangePicker, useAdminData } from "@/components/admin/kit";
import type { FeaturesDto } from "@/lib/admin/dto";
import { cn } from "@/lib/utils";

export default function AdminFeaturesPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <FeaturesInner />
    </Suspense>
  );
}

function FeaturesInner() {
  const { data, error, loading, reload } = useAdminData<FeaturesDto>("/api/admin/features?days=30");

  return (
    <div>
      <AdminPageHeader
        eyebrow="Super Admin"
        title="Feature analytics"
        sub="Adoption, momentum and reliability per product surface — workflows, Evidence Chat and the BYOK vault."
        actions={<RangePicker />}
      />

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyBlock message="No feature usage recorded in this window." />
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[10.5px] uppercase tracking-wider text-ink-4">
                  <th className="px-4 py-3 font-medium">Feature</th>
                  <th className="px-4 py-3 text-right font-medium">Users</th>
                  <th className="px-4 py-3 text-right font-medium">Adoption</th>
                  <th className="px-4 py-3 text-right font-medium">Uses (cur/prev)</th>
                  <th className="px-4 py-3 text-right font-medium">Change</th>
                  <th className="px-4 py-3 text-right font-medium">Errors</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.feature} className="border-b border-line transition-colors last:border-0 hover:bg-paper-2">
                    <td className="px-4 py-3 font-medium text-ink">{r.feature}</td>
                    <td className="tnum px-4 py-3 text-right text-ink-2">{r.users}</td>
                    <td className="tnum px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-2">
                        <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-line sm:block">
                          <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, r.adoptionPct)}%` }} />
                        </span>
                        {r.adoptionPct.toFixed(0)}%
                      </span>
                    </td>
                    <td className="tnum px-4 py-3 text-right text-ink-2">
                      {r.usesCurrent} <span className="text-ink-4">/ {r.usesPrevious}</span>
                    </td>
                    <td className="tnum px-4 py-3 text-right">
                      {r.changePct == null ? (
                        <span className="text-ink-4">—</span>
                      ) : (
                        <span className={cn("font-semibold", r.changePct > 2 ? "text-success" : r.changePct < -2 ? "text-danger" : "text-ink-3")}>
                          {r.changePct > 0 ? "+" : ""}
                          {r.changePct.toFixed(0)}%
                        </span>
                      )}
                    </td>
                    <td className="tnum px-4 py-3 text-right">
                      <span className={r.errors > 0 ? "font-semibold text-danger" : "text-ink-4"}>{r.errors}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
