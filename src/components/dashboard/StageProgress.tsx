"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
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
              "flex items-center gap-3 rounded-lg border px-3.5 py-3",
              done
                ? "border-success/25 bg-success-soft"
                : active
                  ? "border-accent/30 bg-accent-soft"
                  : "border-line bg-paper-2"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                done ? "bg-success/10 text-success" : active ? "bg-accent/10 text-accent" : "bg-surface text-ink-4"
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
              <p className="tnum text-[10px] font-medium uppercase tracking-wider text-ink-4">Agent {i + 1}</p>
              <p className={cn("truncate text-[13px] font-medium", done || active ? "text-ink" : "text-ink-4")}>
                {label}
              </p>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
