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
      <Link href="/runs" className="pressable mb-4 inline-flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-white">
        <ArrowLeft size={14} /> All runs
      </Link>

      {/* header strip */}
      <div className="material flex flex-col items-start justify-between gap-5 rounded-2xl p-5 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">
            {data?.run.workflowName ?? "Run"} · {data?.run.periodLabel || data?.run.entityName || "—"}
          </p>
          <h1 className="display mt-0.5 truncate text-xl font-bold tracking-tight text-white">
            {data?.run.entityName || "Forensic analysis"}
          </h1>
          {data?.run.modelProvider && (
            <p className="tnum mt-1 text-[11.5px] text-slate-500">
              model: {data.run.modelProvider}/{data.run.modelName}
            </p>
          )}
        </div>
        {data?.run.status === "completed" && data.run.riskScore != null && (
          <RiskGauge score={data.run.riskScore} band={data.run.riskBand} size={150} />
        )}
      </div>

      {/* tab nav */}
      <nav className="material mt-4 flex gap-1 overflow-x-auto rounded-2xl p-1.5">
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
                "pressable whitespace-nowrap rounded-xl px-4 py-2 text-[13px] font-medium transition",
                active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
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
