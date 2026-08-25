"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Binary, KeyRound, Lock, Network, Quote, RefreshCcw, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RiskGauge } from "@/components/visualizers/RiskGauge";
import { CtaBand, Reveal, SectionShell } from "@/components/marketing/Blocks";

const TEASERS = [
  {
    href: "/features",
    eyebrow: "Platform",
    title: "Built for defensible conclusions",
    body: "BYOK across seven providers, page-level citations, entity graphs and grounded chat — engineered as one deterministic ledger.",
    icon: Workflow,
  },
  {
    href: "/engines",
    eyebrow: "Hard math",
    title: "The engines do the counting",
    body: "Benford χ²/Z + MAD, the eight-variable Beneish M-Score, Altman Z′ zones and a seeded Isolation Forest — implemented from source definitions.",
    icon: Binary,
  },
  {
    href: "/pipeline",
    eyebrow: "Pipeline",
    title: "Six agents, fixed order",
    body: "Ingestion → math → entities → reconciliation → gaps → report. Each stage completes before the next begins; progress you can audit.",
    icon: Network,
  },
  {
    href: "/security",
    eyebrow: "Trust",
    title: "Your keys never leave your vault",
    body: "AES-256-GCM encrypted at rest in your own Postgres. No shared key store, no silent retention, reproducible artifacts for review.",
    icon: Lock,
  },
];

export default function HomePage() {
  const reduce = useReducedMotion();

  return (
    <>
      {/* ---------------- hero ---------------- */}
      <section className="relative overflow-hidden">
        <div className="dot-grid pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-60" aria-hidden />
        <div className="glow pointer-events-none absolute inset-x-0 top-0 h-[360px]" aria-hidden />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-16 pt-12 text-center sm:px-6 sm:pt-16">
          <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.5 }}>
            <Badge>Deterministic · Source-cited · Reproducible</Badge>
          </motion.div>

          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.05 }}
            className="display-hero mt-5 max-w-4xl text-balance text-ink"
          >
            Forensic AI that puts <span className="text-accent">math before models</span>.
          </motion.h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.11 }}
            className="lede mt-5 max-w-xl text-balance"
          >
            Cognifina runs 25 finance &amp; compliance workflows — due diligence, statutory audit review,
            KYC/AML screening — on a deterministic multi-agent engine. Every finding cites the exact page it came from.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.17 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link href="/register">
              <Button size="lg" className="group px-7">
                Run your first analysis
                <ArrowRight size={16} className="transition-transform duration-150 group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link href="/engines">
              <Button variant="secondary" size="lg" className="px-7">See the engines</Button>
            </Link>
          </motion.div>

          {/* hero artifact */}
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.94, y: 26 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...spring, delay: 0.26 }}
            className="relative mt-16 w-full max-w-2xl"
          >
            <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-accent/5 blur-2xl" aria-hidden />
            <div className="relative rounded-2xl border border-line bg-surface p-6 shadow-pop sm:p-8">
              <div className="flex flex-col items-center gap-8 sm:flex-row sm:gap-10">
                <RiskGauge score={72} band="Elevated" size={180} />
                <div className="w-full min-w-0 space-y-3">
                  {[
                    ["critical", "Balance sheet fails to tie across documents"],
                    ["high", "First-digit distribution deviates from Benford"],
                    ["medium", "M-Score exceeds manipulation threshold"],
                  ].map(([sev, text]) => (
                    <div key={text} className="flex items-start gap-2.5">
                      <Badge severity={sev as "critical"} className="mt-0.5 shrink-0">{sev}</Badge>
                      <span className="body-sm text-left">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------------- teasers → real pages ---------------- */}
      {TEASERS.map((t) => (
        <SectionShell key={t.href} className="!py-6">
          <Reveal>
            <Link
              href={t.href}
              className="group grid h-full gap-6 rounded-2xl border border-line bg-surface p-6 shadow-soft transition-shadow hover:shadow-lift sm:p-7 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-8"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface-2 text-accent transition-colors group-hover:border-accent/30 group-hover:bg-accent-soft">
                <t.icon size={22} />
              </span>
              <div className="min-w-0">
                <p className="eyebrow">{t.eyebrow}</p>
                <h2 className="display-md mt-1.5 text-ink">{t.title}</h2>
                <p className="body-sm mt-2 max-w-xl">{t.body}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 self-start rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-[13.5px] font-medium text-ink-2 transition-colors hover:bg-surface-2 lg:self-center">
                Explore
                <ArrowRight size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" />
              </span>
            </Link>
          </Reveal>
        </SectionShell>
      ))}

      {/* proof strip */}
      <SectionShell className="!pb-24 !pt-8">
        <Reveal>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              [RefreshCcw, "Bit-for-bit reruns", "Same inputs reproduce identical metrics, findings and ledger."],
              [Quote, "Every claim cited", "Document · page · excerpt · bounding box — bound to each finding."],
              [KeyRound, "Zero model lock-in", "OpenAI, Claude, Gemini, Groq, DeepSeek, Mistral or local Ollama."],
            ].map(([Icon, t, b]) => (
              <div key={t as string} className="rounded-xl border border-line bg-surface p-5 shadow-soft transition-shadow hover:shadow-lift">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Icon size={17} />
                </span>
                <h3 className="title-sm mt-4 text-ink">{t as string}</h3>
                <p className="body-sm mt-1.5">{b as string}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </SectionShell>

      <CtaBand />
    </>
  );
}
