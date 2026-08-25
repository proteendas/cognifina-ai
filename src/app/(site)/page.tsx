"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Binary, Cpu, FileCheck2, FileUp, Lock, Network, Quote, RefreshCcw, Scale, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RiskGauge } from "@/components/visualizers/RiskGauge";
import { CtaBand, Reveal, spring, SectionShell } from "@/components/marketing/Blocks";

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
            Statistics lead. Models follow.
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

      {/* ---------------- how it works ---------------- */}
      <section className="border-t border-line bg-paper-2">
        <SectionShell>
          <Reveal>
            <p className="eyebrow text-center">How it works</p>
            <h2 className="display-md mt-2 text-center text-balance text-ink">
              You set the scope. The pipeline handles the rest.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [Workflow, "Pick your workflow", "Select the review you need — due diligence, statutory audit prep, KYC/AML. The execution plan is fixed before any document is read."],
              [FileUp, "Bring your documents", "Drop statements, ledgers and filings. Full-document coverage with per-line coordinates — nothing is sampled."],
              [Cpu, "The engines take over", "Six agents work through the evidence in a fixed order — extraction, math, entities, reconciliation, gaps, report — each finishing before the next begins."],
              [FileCheck2, "Read your report", "Ranked findings, a weighted risk score, and a page-level citation behind each claim — ready for review or dispute."],
            ].map(([Icon, title, body], i) => (
              <Reveal key={title as string} delay={i * 0.05} className="h-full">
                <div className="flex h-full flex-col rounded-xl border border-line bg-surface p-5 shadow-soft transition-shadow hover:shadow-lift">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                      <Icon size={17} />
                    </span>
                    <span className="tnum font-mono text-[11px] font-medium text-ink-4">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="title-sm mt-4 text-ink">{title as string}</h3>
                  <p className="body-sm mt-1.5">{body as string}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.15}>
            <p className="mt-8 text-center">
              <Link href="/pipeline" className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-accent hover:underline">
                See the full architecture
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </p>
          </Reveal>
        </SectionShell>
      </section>

      {/* ---------------- the problem ---------------- */}
      <section className="border-t border-line">
        <SectionShell>
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
            <Reveal>
              <p className="eyebrow">The problem</p>
              <h2 className="display-md mt-2 text-balance text-ink">Scope grows. Deadlines don&apos;t move.</h2>
              <p className="lede mt-3 max-w-md">
                Financial review is still a weeks-long, human-hours exercise — and its failure mode is quiet: the things nobody had time to check.
              </p>
            </Reveal>
            <div className="space-y-5">
              {[
                ["How long does a proper review take?", "Weeks of senior analyst time for a single target — and the queue rarely holds just one."],
                ["What does that expertise cost?", "Specialist reviewers bill hundreds of dollars an hour, and much of it goes to mechanical cross-checking."],
                ["Where do reviews fail?", "The cross-document stuff: figures that disagree between versions, receivables that balloon overnight, round-sum entries posted on weekends."],
                ["And multi-entity groups?", "Every added entity multiplies the checklist — ownership chains, registry filings, webs of related parties."],
              ].map(([q, a], i) => (
                <Reveal key={q} delay={i * 0.04}>
                  <div className="rounded-xl border border-line bg-surface p-5 shadow-soft">
                    <p className="text-[14px] font-semibold text-ink">{q}</p>
                    <p className="mt-1.5 font-secondary text-[13.5px] leading-relaxed text-ink-3">{a}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </SectionShell>
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

      {/* ---------------- what makes us different ---------------- */}
      <section className="border-t border-line bg-paper-2">
        <SectionShell className="!pb-20 !pt-12">
          <Reveal>
            <p className="eyebrow text-center">The difference</p>
            <h2 className="display-md mt-2 text-center text-balance text-ink">What Cognifina does differently</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [RefreshCcw, "Reproducible, provably", "Re-run any analysis and the score, findings and ledger come out identical. Bit-for-bit, every time."],
              [Binary, "Statistics first, models second", "Benford, Beneish, Altman and seeded forests compute the numbers. Models only assist — never originate one."],
              [Quote, "Cited to the page", "Each claim carries document · page · excerpt · bounding box. The citation drawer re-renders the proof."],
              [Scale, "Gaps are findings too", "Missing statements, scanned pages and sequence breaks get reported explicitly — never quietly skipped."],
            ].map(([Icon, t, b], i) => (
              <Reveal key={t as string} delay={i * 0.05} className="h-full">
                <div className="h-full rounded-xl border border-line bg-surface p-6 shadow-soft transition-shadow hover:shadow-lift">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Icon size={17} />
                  </span>
                  <h3 className="title-sm mt-4 text-ink">{t as string}</h3>
                  <p className="body-sm mt-1.5">{b as string}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </SectionShell>
      </section>

      <CtaBand />
    </>
  );
}
