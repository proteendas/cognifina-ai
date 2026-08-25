"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { RiskBand } from "@/lib/types";

const BAND_COLORS: Record<RiskBand | "none", string> = {
  Low: "#1E874B",
  Moderate: "#C98A1E",
  Elevated: "#CE6A23",
  Severe: "#D64545",
  none: "#8B9096",
};

export function RiskGauge({
  score,
  band,
  size = 190,
}: {
  score: number | null;
  band: RiskBand | null;
  size?: number;
}) {
  const reduce = useReducedMotion();
  const max = 100;
  const pct = score == null ? 0 : Math.min(max, Math.max(0, score)) / max;

  const stroke = Math.max(8, Math.round(size * 0.075));
  const r = (120 - stroke) / 2 - 2;
  const circumference = 2 * Math.PI * r;
  const color = BAND_COLORS[band ?? "none"];

  return (
    <div className="inline-flex shrink-0 flex-col items-center" style={{ width: size }}>
      {/* donut ring — number is absolutely centred, so alignment holds at every size */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 120 120" className="-rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
          <motion.circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={reduce ? false : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - pct) }}
            transition={{ type: "spring", bounce: 0, duration: 0.9, delay: 0.15 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tnum font-bold leading-none tracking-tight text-ink" style={{ fontSize: Math.round(size * 0.24) }}>
            {score ?? "—"}
          </span>
          <span className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-4">/ 100 risk</span>
        </div>
      </div>
      {band && (
        <span
          className="mt-3 rounded-full border px-3 py-1 text-[12px] font-semibold tracking-wide"
          style={{ background: `${color}14`, borderColor: `${color}33`, color }}
        >
          {band}
        </span>
      )}
    </div>
  );
}
