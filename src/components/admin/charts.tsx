"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

const TOOLTIP_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.98)",
  border: "1px solid #E8E6E3",
  borderRadius: 12,
  fontSize: 12.5,
  color: "#1A1D1F",
  boxShadow: "0 12px 32px -8px rgba(26,29,31,0.18)",
};

const tick = { fill: "#6f767e", fontSize: 11 };
const shortDay = (d: string) => d.slice(5);

export function TrendArea({
  data,
  dataKey,
  label,
  color = "#0F3D3E",
  height = 220,
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  label: string;
  color?: string;
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
          <XAxis dataKey="day" tickFormatter={shortDay} tick={tick} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis tick={tick} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "#DAD7D1" }} />
          <Area type="monotone" dataKey={dataKey} name={label} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey}-${color.slice(1)})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DualBar({
  data,
  aKey,
  bKey,
  aLabel,
  bLabel,
  aColor = "#0F3D3E",
  bColor = "#D64545",
  height = 220,
}: {
  data: Record<string, unknown>[];
  aKey: string;
  bKey: string;
  aLabel: string;
  bLabel: string;
  aColor?: string;
  bColor?: string;
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
          <XAxis dataKey="day" tickFormatter={shortDay} tick={tick} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis tick={tick} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(15,61,62,0.05)" }} />
          <Legend wrapperStyle={{ fontSize: 12, color: "#6f767e" }} />
          <Bar dataKey={aKey} name={aLabel} fill={aColor} radius={[4, 4, 0, 0]} maxBarSize={26} />
          <Bar dataKey={bKey} name={bLabel} fill={bColor} radius={[4, 4, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FunnelBars({ stages }: { stages: { stage: string; users: number; conversionFromPrev: number | null }[] }) {
  const max = Math.max(1, ...stages.map((s) => s.users));
  return (
    <ol className="space-y-2.5">
      {stages.map((s, i) => (
        <li key={s.stage}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="font-medium text-ink">
              <span className="tnum mr-2 font-mono text-[10px] text-ink-4">{String(i + 1).padStart(2, "0")}</span>
              {s.stage}
            </span>
            <span className="tnum shrink-0 text-ink-2">
              <span className="font-semibold text-ink">{s.users.toLocaleString()}</span>
              {s.conversionFromPrev != null && (
                <span className={cn("ml-2 text-[11.5px]", s.conversionFromPrev >= 50 ? "text-success" : s.conversionFromPrev >= 20 ? "text-warning" : "text-danger")}>
                  {s.conversionFromPrev.toFixed(0)}%
                </span>
              )}
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
              style={{ width: `${(s.users / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function CohortGrid({
  cohorts,
}: {
  cohorts: { cohortStart: string; cohortSize: number; retention: (number | null)[] }[];
}) {
  const periods = Math.max(0, ...cohorts.map((c) => c.retention.length));
  const cell = (v: number | null) => {
    if (v == null) return <span className="text-ink-4/50">—</span>;
    const tone =
      v >= 40 ? "bg-success-soft text-success" : v >= 20 ? "bg-warning-soft text-warning" : v > 0 ? "bg-danger-soft text-danger" : "bg-paper-2 text-ink-4";
    return <span className={cn("tnum inline-flex h-7 w-full items-center justify-center rounded-md text-[11.5px] font-medium", tone)}>{v.toFixed(0)}%</span>;
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[12px]">
        <thead>
          <tr className="text-[10.5px] uppercase tracking-wider text-ink-4">
            <th className="px-2 py-2 font-medium">Cohort week</th>
            <th className="px-2 py-2 font-medium">Size</th>
            {Array.from({ length: periods }, (_, i) => (
              <th key={i} className="px-2 py-2 text-center font-medium">
                W{i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.cohortStart} className="border-t border-line">
              <td className="tnum px-2 py-1.5 text-ink-2">{c.cohortStart}</td>
              <td className="tnum px-2 py-1.5 font-medium text-ink">{c.cohortSize}</td>
              {Array.from({ length: periods }, (_, i) => (
                <td key={i} className="px-1 py-1.5">
                  {cell(c.retention[i] ?? null)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
