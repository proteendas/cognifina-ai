"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RunProvider, useRun } from "@/components/dashboard/RunContext";
import { RiskGauge } from "@/components/visualizers/RiskGauge";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/entity-map", label: "Entity Map" },
  { href: "/forensic-ledger", label: "Forensic Ledger" },
  { href: "/chat", label: "Evidence Chat" },
];

export default function RunLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { runId: string };
}) {
  const runId = params.runId;
  return (
    <RunProvider runId={runId}>
      <RunChrome runId={runId}>{children}</RunChrome>
    </RunProvider>
  );
}

function RunChrome({ runId, children }: { runId: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const { data } = useRun();
  const base = `/runs/${runId}`;
  const suffix = pathname.replace(base, "");
  const chatDisabled = data?.run.status !== "completed";

  return (
    <div>
      <Link href="/runs" className="pressable mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3 hover:text-accent">
        <ArrowLeft size={14} /> All runs
      </Link>

      {/* header strip */}
      <div className="flex flex-col items-start justify-between gap-5 rounded-xl border border-line bg-surface p-5 shadow-soft sm:flex-row sm:items-center">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium uppercase tracking-wider text-ink-4">
            {data?.run.workflowName ?? "Run"} · {data?.run.periodLabel || data?.run.entityName || "—"}
          </p>
          <h1 className="mt-1 truncate text-xl font-bold tracking-tight text-ink">
            {data?.run.entityName || "Forensic analysis"}
          </h1>
          {data?.run.modelProvider && (
            <p className="tnum mt-1 truncate font-secondary text-[11.5px] text-ink-4">
              model: {data.run.modelProvider}/{data.run.modelName}
            </p>
          )}
        </div>
        {data?.run.status === "completed" && data.run.riskScore != null && (
          <RiskGauge score={data.run.riskScore} band={data.run.riskBand} size={140} />
        )}
      </div>

      {/* tab nav */}
      <nav aria-label="Run sections" className="mt-4 flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1.5 shadow-soft">
        {TABS.map((t) => {
          const active = suffix === t.href;
          const disabled = t.href === "/chat" && chatDisabled;
          return (
            <Link
              key={t.label}
              href={`${base}${t.href}`}
              aria-disabled={disabled}
              onClick={(e) => disabled && e.preventDefault()}
              className={cn(
                "pressable whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-medium transition-colors",
                active ? "bg-accent-soft text-accent" : "text-ink-3 hover:bg-paper-2 hover:text-ink",
                disabled && "cursor-not-allowed opacity-40 hover:bg-transparent"
              )}
            >
              {t.label}
              {disabled && <span className="ml-1.5 text-[10px] uppercase tracking-wider">after run</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-5">{children}</div>
    </div>
  );
}
