"use client";

import { AlertTriangle, CheckCircle2, Minus } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CtaBand, InfoCard, PageHero, Reveal, SectionShell } from "@/components/marketing/Blocks";

const ENGINES = [
  {
    name: "Benford's Law",
    chip: "P(d) = log₁₀(1+1/d)",
    body: "First-digit and first-two-digit goodness-of-fit over every leading amount: χ² statistic with degrees of freedom and p-value, per-digit Z-scores to pinpoint the exact digits carrying excess weight, and Nigrini MAD conformity bands (close / acceptable / marginal / nonconforming).",
  },
  {
    name: "Beneish M-Score",
    chip: "8 variables",
    body: "DSRI, GMI, AQI, SGI, DEPI, SGAI, LVGI and TATA are derived from consecutive reporting periods and combined with the platform coefficients. Scores above −1.78 classify the entity in the manipulation-risk zone; upward-driving indices are reported alongside.",
  },
  {
    name: "Altman Z′-Score",
    chip: "solvency zones",
    body: "Working-capital, retained-earnings, EBIT and equity-to-liability ratios feed the private-firm model. Zones are classified Safe (>2.6), Grey (1.23–2.6) or Distress (<1.23) — distress and grey placements raise findings automatically.",
  },
  {
    name: "Isolation Forest",
    chip: "seed = 42",
    body: "A dependency-free ensemble of 100 isolation trees scores each journal entry on amount magnitude, round-sum bias, weekend posting, off-hours posting and account frequency. The seeded PRNG makes anomaly selection bit-for-bit reproducible.",
  },
];

/** Static demo data for the landing illustration of expected vs observed. */
const DEMO = [
  { digit: "1", expected: 30.1, observed: 24.0 },
  { digit: "2", expected: 17.6, observed: 15.2 },
  { digit: "3", expected: 12.5, observed: 21.8 },
  { digit: "4", expected: 9.7, observed: 6.4 },
  { digit: "5", expected: 7.9, observed: 10.5 },
  { digit: "6", expected: 6.7, observed: 5.9 },
  { digit: "7", expected: 5.8, observed: 4.3 },
  { digit: "8", expected: 5.1, observed: 6.2 },
  { digit: "9", expected: 4.6, observed: 5.7 },
];

export default function EnginesPage() {
  return (
    <>
      <PageHero
        eyebrow="Hard math"
        title={<>Statistics first. Models second. Never the reverse.</>}
        sub="Each engine is a pure-TypeScript implementation of its source definition — no heavyweight runtimes, no probabilistic shortcuts, identical outputs on every machine."
      />

      <SectionShell className="!pt-10">
        <Reveal>
          <div className="material-thick overflow-hidden rounded-[24px] p-6 sm:p-8">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="display-md text-white">Observed vs. Benford-expected frequency</h2>
              <p className="tnum text-[12px] text-slate-400">illustrative sample · digit 3 carries excess weight</p>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DEMO} margin={{ top: 4, right: 4, left: -14, bottom: 0 }} barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="digit" tick={{ fill: "#8394b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis unit="%" width={52} tick={{ fill: "#8394b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{ background: "rgba(13,16,28,0.96)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, fontSize: 13 }}
                    formatter={(v: number, n: string) => [`${v}%`, n === "observed" ? "Observed" : "Benford expected"]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#8394b8" }} />
                  <Bar dataKey="expected" fill="#334155" radius={[5, 5, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="observed" fill="#6366f1" radius={[5, 5, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[["1", "-1.8σ", false], ["3", "+3.1σ", true], ["4", "-2.2σ", false]].map(([d, z, bad]) => (
                <span key={d as string} className={`tnum flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] ${bad ? "border-rose-500/40 bg-rose-500/12 text-rose-300" : "border-white/8 bg-white/4 text-slate-400"}`}>
                  digit {d} · {z}
                </span>
              ))}
              <span className="flex items-center gap-3 pl-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><AlertTriangle size={11} className="text-rose-300" /> excess</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-emerald-300" /> conforming</span>
                <Minus size={0} />
              </span>
            </div>
          </div>
        </Reveal>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {ENGINES.map((e, i) => (
            <Reveal key={e.name} delay={i * 0.05}>
              <InfoCard icon={<span className="font-display text-[15px] font-bold">0{i + 1}</span>} title={e.name} chip={e.chip}>
                {e.body}
              </InfoCard>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <p className="body-sm mx-auto mt-8 max-w-2xl text-center">
            Ratio volatility checks complete the suite: current &amp; quick ratios, debt/equity, gross and net margins
            and interest coverage are computed per period, with coefficient-of-variation flags when erratic behaviour
            suggests window dressing.
          </p>
        </Reveal>
      </SectionShell>

      <CtaBand />
    </>
  );
}
