"use client";

import { AlertTriangle, CheckCircle2, Info, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MetricDto } from "@/lib/types";

export function MetricCard({ metric }: { metric: MetricDto }) {
  const tone =
    metric.severity === "critical" || metric.severity === "high"
      ? "text-rose-300"
      : metric.severity === "medium"
        ? "text-yellow-200"
        : "text-emerald-300";
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle>{metric.displayName}</CardTitle>
          <CardDescription>{metric.ref}</CardDescription>
        </div>
        <Badge severity={metric.severity}>{metric.verdict}</Badge>
      </CardHeader>
      <CardContent>
        <MetricValueBody metric={metric} />
        <p className={`mt-3 text-[12.5px] leading-relaxed ${tone}`}>{metric.detailMd}</p>
      </CardContent>
    </Card>
  );
}

function MetricValueBody({ metric }: { metric: MetricDto }) {
  const v = metric.value;
  if (metric.key === "beneish_m_score") {
    const m = v.mScore as number | null;
    const ratios = (v.ratios ?? {}) as Record<string, number | null>;
    return (
      <div>
        <p className="tnum text-3xl font-bold text-white">{m != null ? m.toFixed(2) : "n/a"}</p>
        <p className="tnum mt-1 text-[11px] text-slate-500">threshold −1.78</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(ratios).map(([k, val]) => (
            <span key={k} className="tnum rounded-md bg-white/5 px-2 py-0.5 text-[10.5px] text-slate-400">
              {k} {val != null ? Number(val).toFixed(2) : "—"}
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (metric.key === "altman_zprime") {
    const x = (v.x ?? {}) as Record<string, number | null>;
    return (
      <div>
        <p className="tnum text-3xl font-bold text-white">{(v.score as number | null)?.toFixed(2) ?? "n/a"}</p>
        <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">{String(v.zone ?? "")} zone</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(x).map(([k, val]) => (
            <span key={k} className="tnum rounded-md bg-white/5 px-2 py-0.5 text-[10.5px] text-slate-400">
              {k.toUpperCase()} {val != null ? Number(val).toFixed(2) : "—"}
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (metric.key === "isolation_forest") {
    const hits = (v.hits ?? []) as Array<{ account?: string; amount?: number; score?: number; reasons?: string[] }>;
    return (
      <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
        {hits.slice(0, 10).map((h, i) => (
          <div key={i} className="rounded-lg bg-white/4 px-3 py-2 text-[12px]">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium text-slate-200">{h.account || "entry"}</span>
              <span className="tnum shrink-0 text-rose-300">{h.score?.toFixed(2)}</span>
            </div>
            <p className="tnum mt-0.5 truncate text-[11px] text-slate-500">
              amt {h.amount?.toLocaleString()} · {(h.reasons ?? []).slice(0, 2).join(" · ")}
            </p>
          </div>
        ))}
      </div>
    );
  }
  if (metric.key === "ratio_volatility") {
    const periods = (v.periods ?? []) as Array<Record<string, unknown>>;
    return (
      <div className="overflow-x-auto">
        <table className="tnum w-full text-[12px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
              <th className="pb-1 pr-3">Period</th>
              <th className="pb-1 pr-3">Current</th>
              <th className="pb-1 pr-3">D/E</th>
              <th className="pb-1">GM%</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {periods.map((p, i) => (
              <tr key={i}>
                <td className="py-0.5 pr-3">{String(p.period)}</td>
                <td className="py-0.5 pr-3">{fmtV(p.currentRatio)}</td>
                <td className="py-0.5 pr-3">{fmtV(p.debtEquity)}</td>
                <td className="py-0.5">{fmtV(p.grossMarginPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  // benford & others
  const chi = v.chiSquare as number | undefined;
  const mad = v.mad as number | undefined;
  return (
    <div className="flex gap-4">
      <Stat label="χ²" value={chi?.toFixed(2)} />
      <Stat label="MAD" value={mad?.toFixed(4)} />
      <Stat label="conformity" value={String(v.conformity ?? v.verdict)} icon />
    </div>
  );
}

function fmtV(v: unknown): string {
  return typeof v === "number" ? v.toFixed(2) : "—";
}

function Stat({ label, value, icon }: { label: string; value?: string; icon?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="tnum mt-0.5 flex items-center gap-1.5 text-[15px] font-semibold text-slate-100">
        {icon && (value === "close" ? <CheckCircle2 size={13} className="text-emerald-300" /> : value === "anomaly" ? <AlertTriangle size={13} className="text-rose-300" /> : <Minus size={13} className="text-yellow-200" />)}
        {!icon && <Info size={0} />}
        {value ?? "—"}
      </p>
    </div>
  );
}
