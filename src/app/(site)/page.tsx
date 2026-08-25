"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Binary, KeyRound, Lock, Network, Quote, RefreshCcw, Workflow } from "lucide-react";
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
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-5 pb-16 pt-8 text-center sm:pt-14">
        <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
          <Badge className="mx-auto">Deterministic · Source-cited · Reproducible</Badge>
        </motion.div>

        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="display-hero mt-5 max-w-4xl text-balance"
        >
          Forensic AI that puts <span className="text-gradient">math before models</span>.
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
            <Button size="lg" className="group rounded-full px-7">
              Run your first analysis
              <ArrowRight size={16} className="transition-transform duration-150 group-hover:translate-x-0.5" />
            </Button>
          </Link>
          <Link href="/engines">
            <Button variant="secondary" size="lg" className="rounded-full px-7">See the engines</Button>
          </Link>
        </motion.div>

        {/* hero artifact */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.94, y: 26 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ ...spring, delay: 0.26 }}
          className="material-thick relative mt-16 w-full max-w-2xl rounded-[28px] px-8 py-10 sm:px-12"
        >
          <div className="flex flex-col items-center gap-7 sm:flex-row sm:gap-12">
            <RiskGauge score={72} band="Elevated" />
            <div className="w-full space-y-3 text-left">
              {[
                ["critical", "Balance sheet fails to tie across documents"],
                ["high", "First-digit distribution deviates from Benford"],
                ["medium", "M-Score exceeds manipulation threshold"],
              ].map(([sev, text]) => (
                <div key={text} className="flex items-center gap-2.5">
                  <Badge severity={sev as "critical"}>{sev}</Badge>
                  <span className="body-sm">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ---------------- teasers → real pages ---------------- */}
      {TEASERS.map((t, i) => (
        <SectionShell key={t.href} className={`${i === 0 ? "!pt-6" : ""} !py-10 sm:!py-12`}>
          <Reveal>
            <div className="material group grid gap-8 rounded-[24px] p-7 sm:p-9 lg:grid-cols-[auto_1fr_auto] lg:items-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/12 text-indigo-300">
                <t.icon size={24} />
              </span>
              <div>
                <p className="eyebrow">{t.eyebrow}</p>
                <h2 className="display-md mt-1.5 text-white">{t.title}</h2>
                <p className="body-sm mt-2 max-w-xl">{t.body}</p>
              </div>
              <Link href={t.href} className="pressable inline-flex items-center gap-1.5 self-start rounded-full bg-white/6 px-4 py-2.5 text-[13.5px] font-medium text-slate-200 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/10 lg:self-center">
                Explore
                <ArrowRight size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>
        </SectionShell>
      ))}

      {/* proof strip */}
      <SectionShell className="!pt-2 !pb-20">
        <Reveal>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              [RefreshCcw, "Bit-for-bit reruns", "Same inputs reproduce identical metrics, findings and ledger."],
              [Quote, "Every claim cited", "Document · page · excerpt · bounding box — bound to each finding."],
              [KeyRound, "Zero model lock-in", "OpenAI, Claude, Gemini, Groq, DeepSeek, Mistral or local Ollama."],
            ].map(([Icon, t, b]) => (
              <div key={t as string} className="material rounded-[20px] p-6">
                <Icon className="text-cyan-300" />
                <h3 className="title-sm mt-3 text-white">{t as string}</h3>
                <p className="body-sm mt-1">{b as string}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </SectionShell>

      <CtaBand />
    </>
  );
}
