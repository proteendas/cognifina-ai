"use client";

import { CheckCircle2, Database, EyeOff, FileKey2, KeyRound, Lock, RefreshCcw, ServerCog } from "lucide-react";
import { CtaBand, InfoCard, PageHero, Reveal, SectionShell } from "@/components/marketing/Blocks";

const PILLARS = [
  {
    icon: KeyRound,
    title: "Bring-your-own-key vault",
    body: "Provider keys are encrypted with AES-256-GCM using a key derived from your ENCRYPTION_KEY via scrypt, stored in your own Postgres. Responses and logs only ever carry a masked hint — never the key itself.",
  },
  {
    icon: Database,
    title: "Your database, your data",
    body: "The entire state — users, runs, extracted blocks, citations — lives in a Postgres you provision (Vercel Postgres, Neon, RDS or self-hosted). Deleting a run cascades to every artifact.",
  },
  {
    icon: EyeOff,
    title: "Zero silent retention",
    body: "Documents are parsed for the run that owns them; nothing is shared across workspaces. Model calls go directly from the platform to the provider you configured — no intermediary proxy stores your prompts.",
  },
  {
    icon: RefreshCcw,
    title: "Reproducibility by construction",
    body: "Deterministic engines use seeded PRNGs and fixed iteration order; identical evidence reproduces identical metrics, findings, scores and ledgers — the property that makes review and dispute practical.",
  },
];

const CHECKLIST = [
  "scrypt-derived vault key · AES-256-GCM authenticated encryption",
  "HTTP-only session cookies with HMAC-signed payloads",
  "per-request credential override headers for ephemeral keys",
  "constant-time password verification",
  "run-level authorization on every API route",
  "masked key hints in all read APIs",
];

export default function SecurityPage() {
  return (
    <>
      <PageHero
        eyebrow="Trust"
        title={<>Security is an architecture, not a policy.</>}
        sub="Cognifina is designed so the sensitive parts — your keys and your client documents — stay inside infrastructure you control."
      />
      <SectionShell className="!pt-10">
        <div className="grid gap-4 sm:grid-cols-2">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.04}>
              <InfoCard icon={<p.icon size={18} />} title={p.title}>
                {p.body}
              </InfoCard>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.08}>
          <div className="material-thick mt-6 rounded-[24px] p-7">
            <div className="flex items-center gap-2.5">
              <Lock size={16} className="text-emerald-300" />
              <h2 className="title-sm text-white">Hardening checklist</h2>
            </div>
            <ul className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {CHECKLIST.map((c) => (
                <li key={c} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-slate-300">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-300/80" />
                  <span className="tnum">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Reveal>
            <InfoCard icon={<FileKey2 size={18} />} title="Credential resolution order">
              Per-request headers (<code className="tnum">x-custom-api-key</code>) → user vault → environment
              fallback. The first resolvable credential wins; failed providers fall back deterministically through the
              registry chain.
            </InfoCard>
          </Reveal>
          <Reveal delay={0.05}>
            <InfoCard icon={<ServerCog size={18} />} title="Local model escape hatch">
              Point the Ollama provider at your own endpoint and run the entire language layer inside your network —
              useful when documents cannot leave premises at all.
            </InfoCard>
          </Reveal>
        </div>
      </SectionShell>
      <CtaBand />
    </>
  );
}
