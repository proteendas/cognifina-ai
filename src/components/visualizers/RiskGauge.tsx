"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { RiskBand } from "@/lib/types";

const BAND_COLORS: Record<RiskBand | "none", [string, string]> = {
  Low: ["#34d399", "#22d3ee"],
  Moderate: ["#facc15", "#fb923c"],
  Elevated: ["#fb923c", "#f43f5e"],
  Severe: ["#f43f5e", "#e11d48"],
  none: ["#475569", "#64748b"],
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
  const radius = 80;
  const circumference = Math.PI * radius; // semicircle
  const [c1, c2] = BAND_COLORS[band ?? "none"];

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size * 0.62} viewBox="0 0 200 124" className="overflow-visible">
        <defs>
          <linearGradient id={`gauge-grad-${band ?? "none"}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>
        <path
          d={`M ${100 - radius} 110 A ${radius} ${radius} 0 0 1 ${100 + radius} 110`}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={13}
          strokeLinecap="round"
        />
        <motion.path
          d={`M ${100 - radius} 110 A ${radius} ${radius} 0 0 1 ${100 + radius} 110`}
          fill="none"
          stroke={`url(#gauge-grad-${band ?? "none"})`}
          strokeWidth={13}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduce ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ type: "spring", bounce: 0, duration: 0.9, delay: 0.15 }}
        />
      </svg>
      <div className="-mt-[calc(38%+8px)] flex flex-col items-center">
        <span className="tnum text-[44px] font-bold leading-none text-white">{score ?? "—"}</span>
        <span className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">/ 100 risk</span>
        {band && (
          <span
            className="mt-2 rounded-full px-3 py-1 text-[12px] font-semibold tracking-wide"
            style={{ background: `${c1}1f`, color: c1 }}
          >
            {band}
          </span>
        )}
      </div>
    </div>
  );
}
