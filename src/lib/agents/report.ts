import { db } from "@/db";
import { runs, type RunSummary } from "@/db/schema";
import { eq } from "drizzle-orm";
import { loadDocuments, loadBlocks, loadTables, loadFindings, addCitation, type RunContext } from "./context";

/**
 * AGENT 6 — Report Compiler & Citation Binder.
 * Compiles the weighted 0–100 risk score, the executive summary and the
 * full markdown forensic report. Every finding already carries exact
 * EvidenceCitations bound by earlier agents; this agent binds the report-level
 * scope citations and finalizes the run.
 */

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 } as const;

export async function runReportAgent(ctx: RunContext): Promise<void> {
  const [docs, blocks, tables, findingRows] = await Promise.all([
    loadDocuments(ctx.runId),
    loadBlocks(ctx.runId),
    loadTables(ctx.runId),
    loadFindings(ctx.runId),
  ]);

  const sortedFindings = [...findingRows].sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      b.weight - a.weight ||
      a.ref.localeCompare(b.ref)
  );

  const totalWeight = sortedFindings.reduce((acc, f) => acc + f.weight, 0);
  const riskScore = Math.min(100, totalWeight);
  const riskBand =
    riskScore < 25 ? "Low" : riskScore < 50 ? "Moderate" : riskScore < 75 ? "Elevated" : "Severe";

  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of sortedFindings) severityCounts[f.severity]++;

  // Bind a scope citation for every document that produced no findings,
  // so the evidence ledger still shows full-document coverage.
  const citedDocIds = new Set((await runScopeCitedDocIds(ctx.runId)) as string[]);
  for (const doc of docs) {
    if (citedDocIds.has(doc.id)) continue;
    await addCitation({
      runId: ctx.runId,
      findingId: null,
      documentName: doc.name,
      documentId: doc.id,
      pageNumber: 1,
      rawExcerpt: `[Scope coverage] "${doc.name}" ingested in full (${doc.pageCount} page(s), parse mode ${doc.parseMode}). No independent findings were raised against this document.`,
      bbox: null,
      confidence: 1,
    });
  }

  const summary: RunSummary = {
    riskScore,
    riskBand: riskBand as RunSummary["riskBand"],
    severityCounts,
    topFindingRefs: sortedFindings.slice(0, 5).map((f) => f.ref),
    documentsAnalyzed: docs.length,
    blocksExtracted: blocks.length,
    tablesExtracted: tables.length,
  };

  const reportMd = buildReportMd(ctx, summary, sortedFindings);

  await db
    .update(runs)
    .set({
      status: "completed",
      riskScore,
      riskBand: riskBand as RunSummary["riskBand"],
      summary,
      reportMd,
      finishedAt: new Date(),
      progress: 100,
    })
    .where(eq(runs.id, ctx.runId));
}

// Drizzle typed query for citation document coverage
import { citations } from "@/db/schema";
import { sql } from "drizzle-orm";

async function runScopeCitedDocIds(runId: string): Promise<string[]> {
  const rows = await db
    .select({ docId: sql<string>`distinct ${citations.documentId}` })
    .from(citations)
    .where(eq(citations.runId, runId));
  return rows.map((r) => r.docId).filter((v): v is string => v != null);
}

function buildReportMd(
  ctx: RunContext,
  summary: RunSummary,
  findingsList: Awaited<ReturnType<typeof loadFindings>>
): string {
  const lines: string[] = [];
  const dateStr = new Date().toISOString().slice(0, 10);

  lines.push(`# Forensic Review Report`);
  lines.push("");
  lines.push(`**Workflow:** ${ctx.workflow.name} · **Entity:** ${ctx.entityName || "—"} · **Period:** ${ctx.periodLabel || "—"}`);
  lines.push(`**Generated:** ${dateStr} · **Engine:** Cognifina deterministic pipeline v1`);
  lines.push("");
  lines.push(`## Executive Summary`);
  lines.push("");
  lines.push(`Composite risk score: **${summary.riskScore}/100 (${summary.riskBand})**.`);
  lines.push(
    `Findings: ${summary.severityCounts.critical} critical, ${summary.severityCounts.high} high, ${summary.severityCounts.medium} medium, ${summary.severityCounts.low} low, ${summary.severityCounts.info} informational — derived from ${summary.documentsAnalyzed} documents, ${summary.blocksExtracted} extracted text segments and ${summary.tablesExtracted} structured tables.`
  );
  lines.push("");
  if (findingsList.length === 0) {
    lines.push(`No findings met reporting thresholds. The deterministic engines ran to completion with no exceptions raised against the provided evidence.`);
    lines.push("");
  }

  const bySeverity = new Map<string, typeof findingsList>();
  for (const f of findingsList) {
    const list = bySeverity.get(f.severity) ?? [];
    list.push(f);
    bySeverity.set(f.severity, list);
  }
  for (const sev of ["critical", "high", "medium", "low", "info"] as const) {
    const list = bySeverity.get(sev);
    if (!list?.length) continue;
    lines.push(`## ${sev.toUpperCase()} findings`);
    lines.push("");
    for (const f of list) {
      lines.push(`### ${f.ref} — ${f.title}`);
      lines.push("");
      lines.push(f.description);
      if (f.recommendation) {
        lines.push("");
        lines.push(`*Recommended action:* ${f.recommendation}`);
      }
      lines.push("");
      lines.push(`_Agent: ${f.agent}${f.metricRef ? ` · Metric: ${f.metricRef}` : ""}_`);
      lines.push("");
    }
  }

  lines.push(`## Methodology & Limitations`);
  lines.push("");
  lines.push(
    `- Deterministic engines (Benford χ²/Z + MAD, Beneish M-Score, Altman Z'-Score, seeded Isolation Forest, ratio volatility) execute before any model inference; identical inputs reproduce these outputs bit-for-bit.`
  );
  lines.push(
    `- Language-model passes are strictly grounded on extracted evidence and are used only for entity enrichment and post-run Q&A. They never originate numeric findings.`
  );
  lines.push(
    `- Scope is limited to uploaded documents. Absence of findings does not certify accuracy where expected schedules were missing (see gap findings).`
  );
  lines.push("");

  return lines.join("\n");
}
