"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
          <XAxis dataKey="digit" tick={{ fill: "#6f767e", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: "#6f767e", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            unit="%"
            width={52}
          />
          <Tooltip
            cursor={{ fill: "rgba(15,61,62,0.05)" }}
            contentStyle={{
              background: "rgba(255,255,255,0.98)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              fontSize: 13,
              color: "#1a1d1f",
              boxShadow: "0 12px 32px -8px rgba(26,29,31,0.18)",
            }}
            formatter={(value: number | string, name: string) => [`${value}%`, name === "observed" ? "Observed" : "Benford expected"]}
            labelFormatter={(label) => `Digit ${label}`}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#6f767e" }} />
          <Bar dataKey="expected" fill="#DAD7D1" radius={[5, 5, 0, 0]} maxBarSize={30} />
          <Bar dataKey="observed" fill="#0F3D3E" radius={[5, 5, 0, 0]} maxBarSize={30} />
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
            className={`tnum flex h-9 min-w-11 flex-col items-center justify-center rounded-lg border px-1.5 font-secondary text-[10px] leading-none ${
              flagged
                ? excess
                  ? "border-danger/40 bg-danger-soft text-danger"
                  : "border-info/40 bg-info-soft text-info"
                : "border-line bg-paper-2 text-ink-3"
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
