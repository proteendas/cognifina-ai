"use client";

import { FileSearch, GitCompareArrows, KeyRound, Lock, Network, Quote, RefreshCcw, Workflow } from "lucide-react";
import { CtaBand, InfoCard, PageHero, Reveal, SectionShell } from "@/components/marketing/Blocks";

const FEATURES = [
  {
    icon: RefreshCcw,
    title: "Deterministic execution",
    chip: "idempotent",
    body: "Re-running the same evidence produces the exact same execution plan, deterministic metrics and structured ledger. No sampling. No drift. No “different answer each time”.",
  },
  {
    icon: KeyRound,
    title: "Bring your own keys",
    chip: "7 providers",
    body: "OpenAI GPT-4o, Claude 3.5, Gemini 2.0/1.5, Groq Llama 3.3, DeepSeek V3, Mistral Large or a local Ollama endpoint. Keys are AES-256-GCM encrypted in your database and resolved per-request — headers override vault overrides env.",
  },
  {
    icon: Quote,
    title: "Page-level citations",
    chip: "bbox-precise",
    body: "Every finding binds an EvidenceCitation: document name, page number, raw excerpt, bounding-box coordinates and a confidence score. The citation drawer reconstructs the cited page and highlights the exact lines.",
  },
  {
    icon: Network,
    title: "Entity & ownership graph",
    chip: "UBO tracing",
    body: "Directors, ultimate beneficial owners, subsidiaries and conflicted related parties are resolved with regex-first determinism (CIN / PAN / GSTIN / DIN patterns) plus optional model enrichment — deduplicated into an interactive React Flow canvas.",
  },
  {
    icon: Workflow,
    title: "25 pre-built workflows",
    chip: "4 disciplines",
    body: "Due diligence, statutory audit prep, revenue recognition, transfer pricing, GST/VAT reconciliation, PEP & sanctions screening and more — each with its own document checklist, enabled checks and gap-detection rules.",
  },
  {
    icon: Lock,
    title: "Grounded post-run chat",
    chip: "no speculation",
    body: "Interrogate a completed run through strict retrieval over the ingested evidence pack. Answers carry segment citations; when evidence is insufficient the assistant says so instead of inventing one.",
  },
];

const EXTRAS = [
  {
    icon: FileSearch,
    title: "Full-document coverage",
    body: "Every page of every file is parsed — PDFs with per-line coordinates, spreadsheets sheet-by-sheet, CSVs, DOCX and plain text. Scanned pages are detected and surfaced rather than silently skipped.",
  },
  {
    icon: GitCompareArrows,
    title: "Cross-document reconciliation",
    body: "Totals for identical labels are compared across documents against a 0.5% tolerance; balance sheets must tie internally; statement line items are fuzzy-matched between versions to expose unexplained drift.",
  },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="Platform"
        title={<>Everything you need to defend a conclusion.</>}
        sub="Cognifina is not a chatbot bolted onto documents. It is a structured forensic pipeline that treats language models as optional assistants — and mathematics as the source of truth."
      />
      <SectionShell className="!pt-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.04}>
              <InfoCard icon={<f.icon size={18} />} title={f.title} chip={f.chip}>
                {f.body}
              </InfoCard>
            </Reveal>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {EXTRAS.map((f, i) => (
            <Reveal key={f.title} delay={0.08 + i * 0.04}>
              <InfoCard icon={<f.icon size={18} />} title={f.title}>
                {f.body}
              </InfoCard>
            </Reveal>
          ))}
        </div>
      </SectionShell>
      <CtaBand />
    </>
  );
}
