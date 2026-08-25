"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CtaBand, PageHero, Reveal, SectionShell } from "@/components/marketing/Blocks";
import { SUPPORT_EMAIL } from "@/components/marketing/MarketingChrome";
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
    cta: { label: "Talk to us", href: `mailto:${SUPPORT_EMAIL}` },
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
      <SectionShell className="!pt-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {TIERS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.05} className="h-full">
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-2xl border bg-surface p-7 transition-shadow hover:shadow-lift",
                  t.highlight ? "border-accent/40 shadow-pop" : "border-line shadow-soft"
                )}
              >
                {t.highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-white shadow-soft">
                    Recommended
                  </span>
                )}
                <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-3">{t.name}</h2>
                <p className="mt-2 flex items-baseline gap-1.5">
                  <span className="tnum text-[38px] font-bold leading-none tracking-tight text-ink">{t.price}</span>
                  <span className="font-secondary text-[13px] text-ink-4">{t.cadence}</span>
                </p>
                <p className="body-sm mt-3 min-h-[44px]">{t.blurb}</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 font-secondary text-[13.5px] leading-relaxed text-ink-2">
                      <Check size={15} className="mt-0.5 shrink-0 text-success" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-7">
                  {t.cta.href.startsWith("mailto") ? (
                    <a href={t.cta.href} className="block">
                      <Button variant={t.highlight ? "primary" : "secondary"} className="w-full">
                        {t.cta.label}
                      </Button>
                    </a>
                  ) : (
                    <Link href={t.cta.href} className="block">
                      <Button variant={t.highlight ? "primary" : "secondary"} className="w-full">
                        {t.cta.label}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <dl className="mt-8 grid gap-x-8 gap-y-4 rounded-2xl border border-line bg-surface p-7 shadow-soft sm:grid-cols-3">
            {FACTS.map(([term, def]) => (
              <div key={term}>
                <dt className="eyebrow">{term}</dt>
                <dd className="body-sm mt-1.5">{def}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mt-6 text-center font-secondary text-[12.5px] text-ink-4">
            Questions about billing or deployment? Write to{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-accent hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </Reveal>
      </SectionShell>
      <CtaBand />
    </>
  );
}
