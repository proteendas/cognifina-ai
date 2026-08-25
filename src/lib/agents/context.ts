import { db } from "@/db";
import {
  runs,
  documents,
  textBlocks,
  extractedTables,
  findings,
  citations,
  forensicMetrics,
  type Severity,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getWorkflow, type WorkflowDef } from "@/lib/workflows/definitions";
import type { ResolvedCredential } from "@/lib/ai/client";
import { computeRiskScore, riskBandFor, fnv1a } from "@/lib/utils";

export type RunContext = {
  runId: string;
  workflow: WorkflowDef;
  entityName: string;
  periodLabel: string;
  enabledChecks: string[];
  credential: ResolvedCredential | null;
};

export async function loadRunContext(runId: string, credential: ResolvedCredential | null): Promise<RunContext> {
  const [run] = await db.select().from(runs).where(eq(runs.id, runId)).limit(1);
  const workflow = getWorkflow(run.workflowId)!;
  return {
    runId,
    workflow,
    entityName: run.entityName,
    periodLabel: run.periodLabel,
    enabledChecks: run.enabledChecks ?? [],
    credential,
  };
}

// ---------- artifact loaders ----------

export type LoadedDoc = typeof documents.$inferSelect;

export async function loadDocuments(runId: string): Promise<LoadedDoc[]> {
  return db.select().from(documents).where(eq(documents.runId, runId));
}

export async function loadBlocks(runId: string) {
  return db
    .select({
      id: textBlocks.id,
      documentId: textBlocks.documentId,
      pageNumber: textBlocks.pageNumber,
      seq: textBlocks.seq,
      text: textBlocks.text,
      bbox: textBlocks.bbox,
      hash: textBlocks.hash,
      source: textBlocks.source,
    })
    .from(textBlocks)
    .where(eq(textBlocks.runId, runId));
}

export async function loadTables(runId: string) {
  return db.select().from(extractedTables).where(eq(extractedTables.runId, runId));
}

export async function loadFindings(runId: string) {
  return db.select().from(findings).where(eq(findings.runId, runId));
}

// ---------- writers ----------

export async function nextRef(runId: string, kind: "FINDING" | "METRIC"): Promise<string> {
  const existing =
    kind === "FINDING"
      ? await db.select({ ref: findings.ref }).from(findings).where(eq(findings.runId, runId))
      : await db.select({ ref: forensicMetrics.ref }).from(forensicMetrics).where(eq(forensicMetrics.runId, runId));
  return `${kind}-${String(existing.length + 1).padStart(3, "0")}`;
}

export async function addFinding(ctx: RunContext, input: {
  title: string;
  category: string;
  severity: Severity;
  description: string;
  recommendation?: string;
  agent: string;
  metricRef?: string | null;
}): Promise<{ id: string; ref: string }> {
  const ref = await nextRef(ctx.runId, "FINDING");
  const weight = { critical: 25, high: 15, medium: 8, low: 3, info: 1 }[input.severity];
  const [row] = await db
    .insert(findings)
    .values({
      runId: ctx.runId,
      ref,
      title: input.title,
      category: input.category,
      severity: input.severity,
      description: input.description,
      recommendation: input.recommendation ?? "",
      agent: input.agent,
      metricRef: input.metricRef ?? null,
      weight,
    })
    .returning({ id: findings.id });
  return { id: row.id, ref };
}

export async function addCitation(input: {
  runId: string;
  findingId?: string | null;
  documentName: string;
  documentId?: string | null;
  pageNumber: number;
  rawExcerpt: string;
  bbox?: [number, number, number, number] | null;
  confidence?: number;
  hash?: string;
}): Promise<void> {
  await db.insert(citations).values({
    runId: input.runId,
    findingId: input.findingId ?? null,
    documentName: input.documentName,
    documentId: input.documentId ?? null,
    pageNumber: input.pageNumber,
    rawExcerpt: input.rawExcerpt.slice(0, 600),
    bbox: input.bbox ?? null,
    confidence: input.confidence ?? 0.92,
    hash: input.hash ?? fnv1a(input.rawExcerpt),
  });
}

export async function addMetric(ctx: RunContext, input: {
  key: string;
  displayName: string;
  verdict: string;
  severity: Severity;
  value: Record<string, unknown>;
  detailMd: string;
}): Promise<string> {
  const ref = await nextRef(ctx.runId, "METRIC");
  await db.insert(forensicMetrics).values({
    runId: ctx.runId,
    ref,
    key: input.key,
    displayName: input.displayName,
    verdict: input.verdict,
    severity: input.severity,
    value: input.value,
    detailMd: input.detailMd,
  });
  return ref;
}

/** Full-corpus text (deterministic order) used by gap/reconciliation/chat retrieval. */
export async function corpusText(runId: string): Promise<string> {
  const blocks = await loadBlocks(runId);
  return blocks.sort((a, b) => a.documentId.localeCompare(b.documentId) || a.pageNumber - b.pageNumber || a.seq - b.seq).map((b) => b.text).join("\n").toLowerCase();
}

export function checkEnabled(ctx: RunContext, key: string): boolean {
  return ctx.enabledChecks.includes(key);
}
