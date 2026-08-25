"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CtaBand, PageHero, Reveal, SectionShell } from "@/components/marketing/Blocks";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "The full engine on your own deployment. Bring your own model keys.",
    features: [
      "All 25 workflows",
      "Deterministic math engines",
      "BYOK — all 7 providers",
      "Citation-bound reports & chat",
      "Community support",
    ],
    cta: { label: "Create workspace", href: "/register" },
    highlight: false,
  },
  {
    name: "Team",
    price: "$149",
    cadence: "/ month",
    blurb: "For deal teams running recurring diligence across entities.",
    features: [
      "Everything in Free, hosted for you",
      "Priority processing queue",
      "Shared workspace & run history",
      "Email support · SLA on uptime",
    ],
    cta: { label: "Start with Free", href: "/register" },
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "annual",
    blurb: "Self-hosted or VPC deployment with your compliance perimeter.",
    features: [
      "On-prem / private-cloud install",
      "Local-only model mode (Ollama)",
      "SSO & audit integrations",
      "Dedicated success engineer",
    ],
    cta: { label: "Talk to us", href: "mailto:hello@cognifina.ai" },
    highlight: false,
  },
];

const FACTS = [
  ["Model costs", "You pay providers directly under BYOK — the platform adds no token markup."],
  ["What's metered", "Runs and chat calls hit your own keys; nothing to prepay."],
  ["Data location", "Your Postgres region. Free tier deploys anywhere Vercel runs."],
];

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title={<>Simple tiers. No token markup.</>}
        sub="Cognifina's engines are open about what they cost: bring your own provider keys and the platform never sits between you and your inference bill."
      />
      <SectionShell className="!pt-10">
        <div className="grid gap-4 lg:grid-cols-3">
          {TIERS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.05} className="h-full">
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-[24px] p-7",
                  t.highlight ? "material-thick ring-1 ring-inset ring-indigo-400/40" : "material"
                )}
              >
                {t.highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 px-3 py-1 text-[11px] font-semibold text-white">
                    Recommended
                  </span>
                )}
                <h2 className="title-sm text-slate-300">{t.name}</h2>
                <p className="mt-2 flex items-baseline gap-1.5">
                  <span className="tnum text-[38px] font-bold leading-none tracking-tight text-white">{t.price}</span>
                  <span className="text-[13px] text-slate-500">{t.cadence}</span>
                </p>
                <p className="body-sm mt-3 min-h-[44px]">{t.blurb}</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-slate-300">
                      <Check size={15} className="mt-0.5 shrink-0 text-emerald-300/90" />
                      {f}
                    </li>
                  ))}
                </ul>
                {t.cta.href.startsWith("mailto") ? (
                  <a href={t.cta.href} className="mt-7 block">
                    <Button variant={t.highlight ? "primary" : "secondary"} className="w-full rounded-xl">
                      {t.cta.label}
                    </Button>
                  </a>
                ) : (
                  <Link href={t.cta.href} className="mt-7 block">
                    <Button variant={t.highlight ? "primary" : "secondary"} className="w-full rounded-xl">
                      {t.cta.label}
                    </Button>
                  </Link>
                )}
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <dl className="material mt-8 grid gap-x-8 gap-y-4 rounded-[24px] p-7 sm:grid-cols-3">
            {FACTS.map(([term, def]) => (
              <div key={term}>
                <dt className="eyebrow">{term}</dt>
                <dd className="body-sm mt-1.5">{def}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </SectionShell>
      <CtaBand />
    </>
  );
}
