"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FileSearch, Sigma, Network, GitCompareArrows, ScanSearch, FileCheck2 } from "lucide-react";
import { CtaBand, PageHero, Reveal, SectionShell } from "@/components/marketing/Blocks";

const AGENTS = [
  {
    icon: FileSearch,
    label: "Ingestion & Layout Parsing",
    deliverable: "coordinate-tagged blocks · normalized tables",
    body: "Reads every page of every file — no sampling. PDFs yield per-line bounding boxes via a serverless-safe pdf.js build; spreadsheets arrive as clean matrices; scanned pages are detected and reported rather than skipped.",
  },
  {
    icon: Sigma,
    label: "Deterministic Forensic Math",
    deliverable: "Benford · Beneish · Altman · Isolation Forest",
    body: "Pure statistical engines compute the numbers before any model is consulted. Each result becomes a ForensicMetric with a verdict, severity and a plain-language detail summary.",
  },
  {
    icon: Network,
    label: "Entity Graph & Registry",
    deliverable: "nodes · edges · identifiers",
    body: "Regex-first resolution of companies, directors, UBOs and related parties with registry identifier capture (CIN, PAN, GSTIN, DIN). An optional LLM pass merges in — deduplicated deterministically.",
  },
  {
    icon: GitCompareArrows,
    label: "Cross-Document Reconciliation",
    deliverable: "tolerance breaches · tie-outs",
    body: "Totals for identical labels are compared across documents (0.5% tolerance), the balance sheet must tie internally, and statement line items are fuzzy-matched between document versions to expose unexplained drift.",
  },
  {
    icon: ScanSearch,
    label: "Gap & Omission Detection",
    deliverable: "missing evidence · sequence breaks",
    body: "Workflow-specific checklists are searched against the full corpus; invoice-number sequences are tested for discontinuities; scanned-page coverage gaps narrow the assurance scope explicitly.",
  },
  {
    icon: FileCheck2,
    label: "Report Compilation & Citations",
    deliverable: "0–100 risk score · forensic report",
    body: "Severity-weighted scoring produces the composite risk score and band; findings are ranked, bound to their citations, and compiled into a reproducible markdown report with methodology and limitations.",
  },
];

const WEIGHTS = [
  ["Critical", 25], ["High", 15], ["Medium", 8], ["Low", 3], ["Info", 1],
] as const;

export default function PipelinePage() {
  const reduce = useReducedMotion();
  return (
    <>
      <PageHero
        eyebrow="Pipeline"
        title={<>Six agents. Fixed order. Auditable progress.</>}
        sub="Each stage runs to completion before the next begins — in serverless-friendly steps you can watch live. Stage order never changes; failures stop the line and name the agent that failed."
      />

      <SectionShell className="!pt-8">
        <ol className="relative mx-auto max-w-3xl">
          {/* connecting spine */}
          <span aria-hidden className="absolute bottom-6 left-[27px] top-6 w-px bg-line-strong" />
          {AGENTS.map((a, i) => (
            <motion.li
              key={a.label}
              initial={reduce ? false : { opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ type: "spring", bounce: 0, duration: 0.45, delay: i * 0.03 }}
              className="relative mb-4 flex gap-4 last:mb-0"
            >
              <span className="z-10 flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-surface shadow-soft">
                <a.icon size={18} className="text-accent" />
                <span className="tnum mt-0.5 font-mono text-[9px] font-medium text-ink-4">{String(i + 1).padStart(2, "0")}</span>
              </span>
              <div className="flex-1 rounded-xl border border-line bg-surface p-5 shadow-soft">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="title-sm text-ink">{a.label}</h2>
                  <code className="tnum rounded-md border border-line bg-paper-2 px-2 py-0.5 text-[10.5px] text-ink-3">{a.deliverable}</code>
                </div>
                <p className="body-sm mt-1.5">{a.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>

        <Reveal delay={0.08}>
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-line bg-surface p-7 shadow-pop">
            <p className="eyebrow">Risk score</p>
            <h2 className="display-md mt-2 text-ink">Weighted 0–100 composite</h2>
            <p className="body-sm mt-2 max-w-xl">
              Every finding contributes its severity weight; the sum saturates at 100 and maps to four bands.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {WEIGHTS.map(([label, w]) => (
                <div key={label} className="rounded-lg border border-line bg-surface-2 px-3 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-ink-4">{label}</p>
                  <p className="tnum mt-0.5 text-lg font-semibold text-ink">+{w}</p>
                </div>
              ))}
            </div>
            <p className="tnum mt-4 font-secondary text-[12px] text-ink-4">
              bands: 0–24 Low · 25–49 Moderate · 50–74 Elevated · 75–100 Severe
            </p>
          </div>
        </Reveal>
      </SectionShell>

      <CtaBand />
    </>
  );
}
