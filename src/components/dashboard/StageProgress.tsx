"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  FileSearch,
  Sigma,
  Network,
  GitCompareArrows,
  ScanSearch,
  FileCheck2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGE_LABELS } from "@/lib/types";

const STAGE_ICONS = [FileSearch, Sigma, Network, GitCompareArrows, ScanSearch, FileCheck2];

export function StageProgress({
  currentStage,
  status,
}: {
  currentStage: number; // stages completed so far
  status: "queued" | "running" | "completed" | "failed";
}) {
  const reduce = useReducedMotion();
  return (
    <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {STAGE_LABELS.map((label, i) => {
        const Icon = STAGE_ICONS[i];
        const done = i < currentStage || status === "completed";
        const active = i === currentStage && (status === "running" || status === "queued");
        return (
          <motion.li
            key={label}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4, delay: i * 0.04 }}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3.5 py-3",
              done
                ? "border-emerald-400/25 bg-emerald-400/6"
                : active
                  ? "border-indigo-400/40 bg-indigo-400/8"
                  : "border-white/8 bg-white/[0.03]"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                done ? "bg-emerald-400/15 text-emerald-300" : active ? "bg-indigo-400/15 text-indigo-300" : "bg-white/5 text-slate-500"
              )}
            >
              {done ? (
                <CheckCircle2 size={16} />
              ) : active ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Icon size={16} />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Agent {i + 1}</p>
              <p className={cn("truncate text-[13px] font-medium", done || active ? "text-slate-200" : "text-slate-500")}>
                {label}
              </p>
            </div>
            {!done && active && <Circle className="ml-auto h-2 w-2 animate-pulse-soft fill-indigo-400 text-indigo-400" />}
          </motion.li>
        );
      })}
    </ol>
  );
}
