import {
  benfordTest,
  computeBeneish,
  computeAltman,
  isolationForest,
  computeRatios,
  volatilityChecks,
  type JournalEntry,
} from "@/lib/forensic";
import { round } from "@/lib/forensic/numbers";
import {
  addFinding,
  addCitation,
  addMetric,
  checkEnabled,
  loadTables,
  type RunContext,
} from "./context";
import { extractPeriodFields, deriveWorkingCapital, extractJournalEntries } from "./statementFields";

/**
 * AGENT 2 — Deterministic Forensic Math Engine.
 * Pure math first: Benford, Beneish, Altman, Isolation Forest, ratio volatility.
 * No LLM participates in any number produced here.
 */

type LoadedTable = Awaited<ReturnType<typeof loadTables>>[number];

export async function runMathAgent(ctx: RunContext): Promise<void> {
  const tables = await loadTables(ctx.runId);
  await runBenfordAndIsolation(ctx, tables);
  await runBeneishAltman(ctx, tables);
  await runRatios(ctx, tables);
}

function docNameOf(table: LoadedTable): string {
  return table.title.split(" · ")[0] || "document";
}

async function collectAmounts(tables: LoadedTable[]): Promise<number[]> {
  const amounts: number[] = [];
  for (const t of tables) {
    if (t.statementType !== "journal" && t.rowCount < 20) continue;
    for (const row of t.numericRows) {
      for (let c = 1; c < row.length; c++) {
        const v = row[c];
        if (v != null && Number.isFinite(v)) amounts.push(v);
      }
    }
  }
  return amounts;
}

function describeHit(hit: { entry: JournalEntry; anomalyScore: number; reasons: string[] }): string {
  return `[${hit.entry.date ?? "undated"}] ${hit.entry.account || "unknown account"} — amount ${hit.entry.amount} (score ${hit.anomalyScore})${hit.reasons.length ? "; " + hit.reasons.join("; ") : ""}`;
}

async function runBenfordAndIsolation(ctx: RunContext, tables: LoadedTable[]): Promise<void> {
  const journalEntries = tables.flatMap(extractJournalEntries);
  const amounts =
    journalEntries.length >= 30 ? journalEntries.map((e) => e.amount) : await collectAmounts(tables);

  if (checkEnabled(ctx, "benford")) {
    const first = benfordTest(amounts, 1);
    if (first) {
      const worstZ = [...first.perDigit].sort(
        (a, b) => Math.abs(b.zScore) - Math.abs(a.zScore)
      )[0];
      const ref = await addMetric(ctx, {
        key: "benford_first_digit",
        displayName: "Benford's Law — First Digit",
        verdict:
          first.conformity === "close"
            ? "conforming"
            : first.conformity === "nonconforming"
              ? "anomaly"
              : `marginal (${first.conformity})`,
        severity:
          first.conformity === "nonconforming"
            ? "high"
            : first.conformity === "marginal"
              ? "medium"
              : first.conformity === "acceptable"
                ? "low"
                : "info",
        value: first as unknown as Record<string, unknown>,
        detailMd:
          `χ²=${first.chiSquare}, dof=${first.degreesOfFreedom}, p=${first.pValue}, MAD=${first.mad} (${first.conformity}). ` +
          `Largest deviation at digit ${worstZ.digit}: observed ${(worstZ.observedFreq * 100).toFixed(2)}% vs expected ${(worstZ.expectedFreq * 100).toFixed(2)}% (Z=${worstZ.zScore}).`,
      });

      if (first.conformity === "nonconforming" || first.conformity === "marginal") {
        const finding = await addFinding(ctx, {
          title:
            first.conformity === "nonconforming"
              ? "First-digit distribution materially deviates from Benford's Law"
              : "First-digit distribution marginally deviates from Benford's Law",
          category: "Statistical Forensics",
          severity: first.conformity === "nonconforming" ? "high" : "medium",
          description: `Across ${first.used} leading amounts the χ² goodness-of-fit statistic is ${first.chiSquare} on ${first.degreesOfFreedom} degrees of freedom (p=${first.pValue}). Nigrini MAD is ${first.mad} ("${first.conformity}" conformity). Digit ${worstZ.digit} shows the largest excess (Z=${worstZ.zScore}) — a pattern consistent with fabricated or manipulated transaction populations.`,
          recommendation: `Obtain source-system extracts for amounts beginning with digit ${worstZ.digit} and vouch a sample to supporting documents.`,
          agent: "math",
          metricRef: ref,
        });
        const anchor = tables[0];
        if (anchor) {
          await addCitation({
            runId: ctx.runId,
            findingId: finding.id,
            documentName: docNameOf(anchor),
            documentId: anchor.documentId,
            pageNumber: anchor.pageNumber,
            rawExcerpt: `Benford analysis population: ${anchor.title} — ${first.used} amounts tested.`,
            bbox: anchor.bbox ?? null,
            confidence: 0.99,
          });
        }
      }
    }

    const two = benfordTest(amounts, 2);
    if (two) {
      await addMetric(ctx, {
        key: "benford_two_digit",
        displayName: "Benford's Law — First-Two Digits",
        verdict:
          two.conformity === "close"
            ? "conforming"
            : two.conformity === "nonconforming"
              ? "anomaly"
              : `marginal (${two.conformity})`,
        severity: two.conformity === "nonconforming" ? "medium" : "info",
        value: {
          chiSquare: two.chiSquare,
          pValue: two.pValue,
          mad: two.mad,
          conformity: two.conformity,
          used: two.used,
        },
        detailMd: `First-two-digit test over ${two.used} amounts: χ²=${two.chiSquare}, p=${two.pValue}, MAD=${two.mad}.`,
      });
    }
  }

  if (checkEnabled(ctx, "isolation_forest") && journalEntries.length >= 30) {
    const result = isolationForest(journalEntries, { contamination: 0.02, seed: 42 });
    if (result && result.hits.length > 0) {
      const ref = await addMetric(ctx, {
        key: "isolation_forest",
        displayName: "Journal Entry Anomaly Detection",
        verdict: `${result.flagged} anomalies`,
        severity: result.flagged > 10 ? "high" : result.flagged > 3 ? "medium" : "low",
        value: {
          n: result.n,
          trees: result.trees,
          threshold: result.threshold,
          hits: result.hits.slice(0, 25).map((h) => ({
            account: h.entry.account,
            date: h.entry.date,
            amount: h.entry.amount,
            score: h.anomalyScore,
            reasons: h.reasons,
          })),
        },
        detailMd: `Isolation Forest (${result.trees} trees, seed=42) flagged ${result.flagged}/${result.n} entries above score threshold ${result.threshold}.`,
      });

      const finding = await addFinding(ctx, {
        title: `${result.flagged} journal entries flagged as multivariate outliers`,
        category: "Transaction Anomalies",
        severity: result.flagged > 10 ? "high" : result.flagged > 3 ? "medium" : "low",
        description: `Unsupervised isolation-forest scoring over amount, round-sum bias, weekend posting, off-hours posting and account-frequency features flagged ${result.flagged} of ${result.n} journal entries. Top entry: ${describeHit(result.hits[0])}.`,
        recommendation:
          "Vouch flagged entries to source documents; investigate round-sum and weekend clusters first.",
        agent: "math",
        metricRef: ref,
      });

      const anchor = tables.find((t) => t.statementType === "journal") ?? tables[0];
      if (anchor) {
        await addCitation({
          runId: ctx.runId,
          findingId: finding.id,
          documentName: docNameOf(anchor),
          documentId: anchor.documentId,
          pageNumber: anchor.pageNumber,
          rawExcerpt: describeHit(result.hits[0]),
          bbox: anchor.bbox ?? null,
          confidence: 0.95,
        });
      }
    }
  }
}

async function runBeneishAltman(ctx: RunContext, tables: LoadedTable[]): Promise<void> {
  const candidates = tables
    .filter(
      (t) =>
        t.statementType === "balance_sheet" ||
        t.statementType === "profit_loss" ||
        t.statementType === "cash_flow"
    )
    .map((t) => ({ t, fields: extractPeriodFields(t), richness: t.rowCount }))
    .filter((x) => x.fields.size > 0)
    .sort((a, b) => b.richness - a.richness);

  const merged = new Map<number, Record<string, number>>();
  for (const cand of candidates.slice(0, 4)) {
    for (const [col, fields] of cand.fields) {
      merged.set(col, { ...(merged.get(col) ?? {}), ...fields });
    }
  }
  if (merged.size < 2) return;

  const columnsSorted = [...merged.keys()].sort((a, b) => b - a); // last column = most recent
  const currentFields = merged.get(columnsSorted[0])!;
  const priorFields = merged.get(columnsSorted[1])!;
  deriveWorkingCapital(currentFields);
  deriveWorkingCapital(priorFields);

  // ---- Beneish ----
  if (checkEnabled(ctx, "beneish")) {
    const beneish = computeBeneish(currentFields, priorFields);
    const ref = await addMetric(ctx, {
      key: "beneish_m_score",
      displayName: "Beneish M-Score",
      verdict: beneish.mScore == null ? "inconclusive" : beneish.flagged ? "flagged" : "clear",
      severity:
        beneish.mScore == null ? "info" : beneish.flagged ? "high" : "info",
      value: {
        mScore: beneish.mScore,
        ratios: beneish.ratios,
        missing: beneish.mScore == null ? beneish.missingFields : [],
        threshold: -1.78,
      },
      detailMd: beneish.interpretation,
    });

    if (beneish.flagged) {
      const drivers = Object.entries(beneish.ratios)
        .filter(([k, v]) => k !== "SGAI" && typeof v === "number" && (v as number) > 1.15)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 3)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      const finding = await addFinding(ctx, {
        title: "Beneish M-Score exceeds earnings-manipulation threshold",
        category: "Earnings Quality",
        severity: "high",
        description: `M-Score of ${beneish.mScore} exceeds −1.78, classifying the entity in the manipulation-risk zone.${drivers ? ` Primary upward drivers: ${drivers}.` : ""}`,
        recommendation:
          "Interview management on accrual composition; obtain AR ageing and gross-margin bridges by segment.",
        agent: "math",
        metricRef: ref,
      });
      const anchor = candidates[0]?.t ?? tables[0];
      if (anchor) {
        await addCitation({
          runId: ctx.runId,
          findingId: finding.id,
          documentName: docNameOf(anchor),
          documentId: anchor.documentId,
          pageNumber: anchor.pageNumber,
          rawExcerpt: `M-Score inputs derived from "${anchor.title}" (${anchor.rowCount} rows).`,
          bbox: anchor.bbox ?? null,
          confidence: 0.97,
        });
      }
    }
  }

  // ---- Altman ----
  if (checkEnabled(ctx, "altman")) {
    const wc =
      currentFields.workingCapital ??
      (currentFields.currentAssets != null && currentFields.currentLiabilities != null
        ? currentFields.currentAssets - currentFields.currentLiabilities
        : null);
    const altman = computeAltman(
      {
        workingCapital: wc,
        retainedEarnings: currentFields.retainedEarnings ?? null,
        ebit: currentFields.ebit ?? currentFields.incomeFromContinuingOps ?? null,
        bookValueEquity: currentFields.equity ?? null,
        totalLiabilities: currentFields.totalLiabilities ?? currentFields.longTermDebt ?? null,
        sales: currentFields.sales ?? null,
        totalAssets: currentFields.totalAssets ?? null,
      },
      "private"
    );

    const ref = await addMetric(ctx, {
      key: "altman_zprime",
      displayName: "Altman Z'-Score (Private Firms)",
      verdict:
        altman.score == null ? "inconclusive" : altman.zone === "Safe" ? "safe" : altman.zone === "Grey" ? "grey zone" : "distress",
      severity:
        altman.zone === "Distress" ? "critical" : altman.zone === "Grey" ? "medium" : altman.score == null ? "info" : "info",
      value: { ...altman },
      detailMd: altman.interpretation,
    });

    if (altman.zone === "Distress" || altman.zone === "Grey") {
      const finding = await addFinding(ctx, {
        title: `Altman Z'-Score places entity in the ${altman.zone} zone`,
        category: "Solvency Risk",
        severity: altman.zone === "Distress" ? "critical" : "medium",
        description: `${altman.interpretation} Component ratios: X1(WC/TA)=${altman.x.x1}, X2(RE/TA)=${altman.x.x2}, X3(EBIT/TA)=${altman.x.x3}, X4(BVE/TL)=${altman.x.x4}.`,
        recommendation:
          "Obtain covenant compliance certificates and a 12-month cash forecast; assess going-concern disclosure adequacy.",
        agent: "math",
        metricRef: ref,
      });
      const anchor = candidates[0]?.t ?? tables[0];
      if (anchor) {
        await addCitation({
          runId: ctx.runId,
          findingId: finding.id,
          documentName: docNameOf(anchor),
          documentId: anchor.documentId,
          pageNumber: anchor.pageNumber,
          rawExcerpt: `Z'-Score inputs derived from "${anchor.title}".`,
          bbox: anchor.bbox ?? null,
          confidence: 0.97,
        });
      }
    }
  }
}

async function runRatios(ctx: RunContext, tables: LoadedTable[]): Promise<void> {
  if (!checkEnabled(ctx, "ratios")) return;

  const candidates = tables
    .filter((t) => t.statementType !== "other")
    .map((t) => ({ t, fields: extractPeriodFields(t) }))
    .filter((x) => x.fields.size > 0);

  const perColumn = new Map<number, Record<string, number>>();
  for (const cand of candidates.slice(0, 6)) {
    for (const [col, fields] of cand.fields) {
      perColumn.set(col, { ...(perColumn.get(col) ?? {}), ...fields });
    }
  }
  if (perColumn.size < 1) return;

  const sets = [...perColumn.entries()]
    .sort((a, b) => b[0] - a[0])
    .slice(0, 5)
    .reverse()
    .map(([col], idx) => computeRatios(perColumn.get(col)!, `P${idx + 1}`));

  const flags = volatilityChecks(sets);
  const ref = await addMetric(ctx, {
    key: "ratio_volatility",
    displayName: "Ratio Suite & Volatility",
    verdict: flags.length > 0 ? `${flags.length} volatile` : "stable",
    severity: flags.length >= 2 ? "medium" : flags.length === 1 ? "low" : "info",
    value: { periods: sets, flags },
    detailMd:
      sets.map((s) => `**${s.period}**: current ${fmt(s.currentRatio)}, D/E ${fmt(s.debtEquity)}, GM% ${fmt(s.grossMarginPct)}, NM% ${fmt(s.netMarginPct)}`).join("\n") +
      (flags.length ? `\n\nVolatility flags: ${flags.map((f) => `${f.ratio} CV=${f.cv}`).join(", ")}` : ""),
  });

  for (const flag of flags.slice(0, 3)) {
    await addFinding(ctx, {
      title: `High volatility in ${humanize(flag.ratio)} across periods`,
      category: "Financial Stability",
      severity: flag.cv > flag.threshold * 1.8 ? "medium" : "low",
      description: `Coefficient of variation of ${flag.ratio} across ${sets.length} periods is ${flag.cv} against an expected ceiling of ${flag.threshold}. Erratic ratio behaviour can mask period-end window dressing or inconsistent accounting policies.`,
      recommendation: "Compare monthly movement within each period; confirm policy consistency across years.",
      agent: "math",
      metricRef: ref,
    });
  }
}

function fmt(v: number | null): string {
  return v == null ? "n/a" : String(round(v, 2));
}

function humanize(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).replace(/Pct/, "%");
}
