"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BenfordDigitStat } from "@/lib/types";

export function BenfordChart({ perDigit }: { perDigit: BenfordDigitStat[] }) {
  const data = perDigit.map((d) => ({
    digit: String(d.digit),
    observed: +(d.observedFreq * 100).toFixed(2),
    expected: +(d.expectedFreq * 100).toFixed(2),
    z: d.zScore,
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="digit" tick={{ fill: "#8394b8", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: "#8394b8", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            unit="%"
            width={52}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: "rgba(12,14,26,0.95)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              fontSize: 13,
            }}
            formatter={(value: number | string, name: string) => [`${value}%`, name === "observed" ? "Observed" : "Benford expected"]}
            labelFormatter={(label) => `Digit ${label}`}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#8394b8" }} />
          <Bar dataKey="expected" fill="#334155" radius={[5, 5, 0, 0]} maxBarSize={30} />
          <Bar dataKey="observed" fill="#6366f1" radius={[5, 5, 0, 0]} maxBarSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Compact deviation strip highlighting digits with |Z| > 2. */
export function BenfordDeviationStrip({ perDigit }: { perDigit: BenfordDigitStat[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {perDigit.map((d) => {
        const flagged = Math.abs(d.zScore) > 2;
        const excess = d.deviation > 0;
        return (
          <div
            key={d.digit}
            title={`Digit ${d.digit}: Z=${d.zScore}, p=${d.pValue}`}
            className={`tnum flex h-9 min-w-11 flex-col items-center justify-center rounded-lg border px-1.5 text-[10px] leading-none ${
              flagged
                ? excess
                  ? "border-rose-500/40 bg-rose-500/12 text-rose-300"
                  : "border-sky-400/40 bg-sky-400/12 text-sky-300"
                : "border-white/8 bg-white/4 text-slate-400"
            }`}
          >
            <span className="text-[12px] font-semibold">{d.digit}</span>
            <span>{d.zScore > 0 ? "+" : ""}{d.zScore.toFixed(1)}σ</span>
          </div>
        );
      })}
    </div>
  );
}
