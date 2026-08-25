"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { useRun } from "@/components/dashboard/RunContext";
import { BenfordChart, BenfordDeviationStrip } from "@/components/visualizers/BenfordChart";
import { MetricCard } from "@/components/dashboard/MetricCards";
import type { BenfordDigitStat } from "@/lib/types";

export default function ForensicLedgerPage() {
  const { data } = useRun();

  const benfordFirst = useMemo(
    () => data?.metrics.find((m) => m.key === "benford_first_digit"),
    [data?.metrics]
  );
  const otherMetrics = useMemo(
    () => data?.metrics.filter((m) => m.key !== "benford_first_digit") ?? [],
    [data?.metrics]
  );

  if (!data) return null;

  return (
    <div className="space-y-5">
      {benfordFirst && (
        <div className="material rounded-2xl p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-white">
              <BarChart3 size={16} className="text-indigo-300" />
              Observed vs. expected digit frequency
            </h2>
            <p className="tnum text-[12px] text-slate-500">
              χ²={String((benfordFirst.value as Record<string, unknown>).chiSquare)} · MAD=
              {String((benfordFirst.value as Record<string, unknown>).mad)} ·{" "}
              {String((benfordFirst.value as Record<string, unknown>).conformity)}
            </p>
          </div>
          <BenfordChart perDigit={(benfordFirst.value as Record<string, unknown>).perDigit as BenfordDigitStat[]} />
          <div className="mt-4">
            <BenfordDeviationStrip perDigit={(benfordFirst.value as Record<string, unknown>).perDigit as BenfordDigitStat[]} />
            <p className="mt-2 text-[11px] text-slate-500">
              Red = excess above expectation (|Z| &gt; 2σ) · blue = deficit.
            </p>
          </div>
        </div>
      )}

      {!benfordFirst && data.run.status === "completed" && (
        <div className="material rounded-2xl px-6 py-8 text-center text-[13px] text-slate-400">
          Not enough numeric transactions (&lt;100) for a statistically meaningful Benford test in this run.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {otherMetrics.map((m) => (
          <MetricCard key={m.id} metric={m} />
        ))}
      </div>

      {otherMetrics.length === 0 && benfordFirst == null && data.run.status === "completed" && (
        <div className="material rounded-2xl px-6 py-8 text-center text-[13px] text-slate-400">
          No deterministic metrics were computable from the extracted tables in this run. Ensure financial statements or
          journal registers are included in the upload set.
        </div>
      )}
    </div>
  );
}
