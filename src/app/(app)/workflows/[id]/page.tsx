"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Play, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileDropzone, UploadingOverlay, type StagedFile } from "@/components/dashboard/FileDropzone";
import { api } from "@/lib/client";
import type { WorkflowDto } from "@/lib/types";
import { cn } from "@/lib/utils";

const CHECK_LABELS: Record<string, string> = {
  benford: "Benford's Law",
  beneish: "Beneish M-Score",
  altman: "Altman Z'-Score",
  isolation_forest: "Isolation Forest",
  ratios: "Ratio volatility",
  reconciliation: "Reconciliation",
  gaps: "Gap detection",
};

export default function WorkflowDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const router = useRouter();
  const [workflow, setWorkflow] = useState<WorkflowDto | null>(null);
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [entityName, setEntityName] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [checks, setChecks] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.workflows.list().then((res) => {
      const wf = res.workflows.find((w) => w.id === id) ?? null;
      setWorkflow(wf);
      if (wf) setChecks(new Set(wf.checks));
    });
  }, [id]);

  const start = async () => {
    if (!workflow || files.length === 0 || uploading) return;
    setError(null);
    setUploading(true);
    setUploadPct(8);
    const timer = setInterval(() => setUploadPct((p) => Math.min(92, p + Math.random() * 12)), 350);
    try {
      const form = new FormData();
      form.set("workflowId", workflow.id);
      form.set("entityName", entityName);
      form.set("periodLabel", periodLabel);
      form.set("checks", JSON.stringify([...checks]));
      for (const f of files) form.append("files", f.file, f.file.name);
      const { runId } = await api.runs.create(form);
      clearInterval(timer);
      setUploadPct(100);
      router.push(`/runs/${runId}`);
    } catch (e) {
      clearInterval(timer);
      setError(e instanceof Error ? e.message : "Upload failed");
      setUploading(false);
    }
  };

  if (!workflow) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-[13.5px] text-ink-4">
        <Loader2 className="animate-spin" size={16} /> Loading workflow…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/workflows" className="pressable mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3 hover:text-accent">
        <ArrowLeft size={14} /> All workflows
      </Link>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.4 }}>
        <Badge>{workflow.category}</Badge>
        <h1 className="display-md mt-2.5 text-ink">{workflow.name}</h1>
        <p className="mt-2 max-w-xl font-secondary text-[13.5px] leading-relaxed text-ink-3">{workflow.description}</p>
      </motion.div>

      <section className="mt-7 rounded-xl border border-line bg-surface shadow-soft">
        <header className="flex items-center gap-2 border-b border-line px-5 py-4">
          <ShieldCheck size={14} className="text-success" />
          <h2 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">Recommended documents</h2>
        </header>
        <ul className="grid gap-1.5 p-5 sm:grid-cols-2">
          {workflow.recommendedDocs.map((d) => (
            <li key={d} className="rounded-lg border border-line bg-paper-2 px-3 py-2 font-secondary text-[12.5px] text-ink-2">
              {d}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-5 space-y-5">
        <FileDropzone files={files} onChange={setFiles} disabled={uploading} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="entity">Entity under review</Label>
            <Input id="entity" value={entityName} onChange={(e) => setEntityName(e.target.value)} placeholder="Acme Holdings Pvt Ltd" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="period">Period / label</Label>
            <Input id="period" value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} placeholder="FY 2024-25 · Buy-side DD" />
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-4">Deterministic checks</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {Object.entries(CHECK_LABELS).map(([key, label]) => {
              const enabledHere = workflow.checks.includes(key);
              const on = checks.has(key);
              return (
                <button
                  key={key}
                  disabled={!enabledHere}
                  onClick={() =>
                    setChecks((prev) => {
                      const next = new Set(prev);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    })
                  }
                  className={cn(
                    "pressable rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                    on && enabledHere
                      ? "border-accent/30 bg-accent-soft text-accent"
                      : enabledHere
                        ? "border-line-strong bg-surface text-ink-3 hover:text-ink"
                        : "cursor-not-allowed border-line bg-paper-2 text-ink-4/60 line-through"
                  )}
                  title={enabledHere ? undefined : "Not part of this workflow"}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {uploading ? (
          <UploadingOverlay progress={Math.round(uploadPct)} label="Uploading & queueing run…" />
        ) : (
          error && <p className="font-secondary text-[13px] text-danger">{error}</p>
        )}

        <Button size="lg" onClick={start} disabled={files.length === 0 || uploading} className="w-full">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Play size={15} />}
          Start analysis{files.length > 0 ? ` · ${files.length} file${files.length > 1 ? "s" : ""}` : ""}
        </Button>
      </div>
    </div>
  );
}
