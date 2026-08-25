"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Loader2, PencilLine, Save, X } from "lucide-react";
import { RunProvider, useRun } from "@/components/dashboard/RunContext";
import { RiskGauge } from "@/components/visualizers/RiskGauge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/sheet";
import { Input, Label } from "@/components/ui/input";
import { api } from "@/lib/client";
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
          <div className="mt-1 flex items-center gap-2">
            <h1 className="truncate text-xl font-bold tracking-tight text-ink">
              {data?.run.entityName || "Forensic analysis"}
            </h1>
            {data && <EditRunButton />}
          </div>
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

/** Pencil beside the run title — edit entity name & period label at any time. */
function EditRunButton() {
  const { data, refresh } = useRun();
  const [open, setOpen] = useState(false);
  const [entityName, setEntityName] = useState(data?.run.entityName ?? "");
  const [periodLabel, setPeriodLabel] = useState(data?.run.periodLabel ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openDialog = () => {
    setEntityName(data?.run.entityName ?? "");
    setPeriodLabel(data?.run.periodLabel ?? "");
    setError(null);
    setOpen(true);
  };

  const save = async () => {
    if (!data) return;
    setBusy(true);
    setError(null);
    try {
      await api.runs.update(data.run.id, { entityName, periodLabel });
      await refresh();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={openDialog}
        aria-label="Edit entity name and period"
        title="Edit entity name & period"
        className="pressable flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-4 transition-colors hover:bg-paper-2 hover:text-accent"
      >
        <PencilLine size={14} />
      </button>

      <Dialog open={open} onClose={() => !busy && setOpen(false)} title="Edit run details">
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-entity">Entity under review</Label>
            <Input id="edit-entity" value={entityName} onChange={(e) => setEntityName(e.target.value)} maxLength={200} placeholder="Acme Holdings Pvt Ltd" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="edit-period">Period / label</Label>
            <Input id="edit-period" value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} maxLength={120} placeholder="FY 2024-25 · Buy-side DD" className="mt-1.5" />
          </div>
          {error && <p className="font-secondary text-[12.5px] text-danger">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
            <X size={14} /> Cancel
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </Button>
        </div>
      </Dialog>
    </>
  );
}
