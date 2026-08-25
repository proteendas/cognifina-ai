import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  runs,
  documents,
  textBlocks,
  extractedTables,
  findings,
  citations,
  forensicMetrics,
  entityNodes,
  entityEdges,
  chatMessages,
} from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/auth/session";

export const maxDuration = 60;

export async function GET(_request: Request, { params }: { params: { runId: string } }) {
  try {
    const user = await requireUser();
    const [run] = await db
      .select()
      .from(runs)
      .where(and(eq(runs.id, params.runId), eq(runs.userId, user.id)))
      .limit(1);
    if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

    // Strip raw bytes from documents payload
    const docRows = await db
      .select({
        id: documents.id,
        name: documents.name,
        mime: documents.mime,
        sizeBytes: documents.sizeBytes,
        sha256: documents.sha256,
        pageCount: documents.pageCount,
        parseMode: documents.parseMode,
        scannedPages: documents.scannedPages,
      })
      .from(documents)
      .where(eq(documents.runId, run.id));

    const [findingRows, citationRows, metricRows, nodeRows, edgeRows, chatRows, tableMeta] =
      await Promise.all([
        db.select().from(findings).where(eq(findings.runId, run.id)).orderBy(asc(findings.ref)),
        db.select().from(citations).where(eq(citations.runId, run.id)),
        db.select().from(forensicMetrics).where(eq(forensicMetrics.runId, run.id)).orderBy(asc(forensicMetrics.ref)),
        db.select().from(entityNodes).where(eq(entityNodes.runId, run.id)),
        db.select().from(entityEdges).where(eq(entityEdges.runId, run.id)),
        db.select().from(chatMessages).where(eq(chatMessages.runId, run.id)).orderBy(asc(chatMessages.createdAt)),
        db
          .select({
            id: extractedTables.id,
            documentId: extractedTables.documentId,
            title: extractedTables.title,
            statementType: extractedTables.statementType,
            pageNumber: extractedTables.pageNumber,
            rowCount: extractedTables.rowCount,
            colCount: extractedTables.colCount,
          })
          .from(extractedTables)
          .where(eq(extractedTables.runId, run.id)),
      ]);

    return NextResponse.json({
      run: {
        id: run.id,
        workflowId: run.workflowId,
        workflowName: run.workflowName,
        entityName: run.entityName,
        periodLabel: run.periodLabel,
        status: run.status,
        currentStage: run.currentStage,
        progress: run.progress,
        error: run.error,
        modelProvider: run.modelProvider,
        modelName: run.modelName,
        riskScore: run.riskScore,
        riskBand: run.riskBand,
        summary: run.summary,
        reportMd: run.reportMd,
        enabledChecks: run.enabledChecks,
        createdAt: run.createdAt.toISOString(),
        finishedAt: run.finishedAt?.toISOString() ?? null,
      },
      documents: docRows.map((d) => ({ ...d, scannedPages: d.scannedPages ?? [] })),
      findings: findingRows.map((f) => ({
        id: f.id,
        ref: f.ref,
        title: f.title,
        category: f.category,
        severity: f.severity,
        description: f.description,
        recommendation: f.recommendation,
        agent: f.agent,
        metricRef: f.metricRef,
      })),
      citations: citationRows.map((c) => ({
        id: c.id,
        findingId: c.findingId,
        documentName: c.documentName,
        documentId: c.documentId,
        pageNumber: c.pageNumber,
        rawExcerpt: c.rawExcerpt,
        bbox: c.bbox,
        confidence: c.confidence,
      })),
      metrics: metricRows.map((m) => ({
        id: m.id,
        ref: m.ref,
        key: m.key,
        displayName: m.displayName,
        verdict: m.verdict,
        severity: m.severity,
        value: m.value,
        detailMd: m.detailMd,
      })),
      entities: {
        nodes: nodeRows.map((n) => ({ key: n.key, name: n.name, type: n.type, attrs: n.attrs, confidence: n.confidence })),
        edges: edgeRows.map((e) => ({
          source: e.sourceKey,
          target: e.targetKey,
          relation: e.relation,
          weight: e.weight,
          confidence: e.confidence,
        })),
      },
      tables: tableMeta,
      chat: chatRows.map((m) => ({ role: m.role, content: m.content, citations: m.citations ?? [] })),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[runs/:id.GET]", err);
    return NextResponse.json({ error: "Failed to load run" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { runId: string } }) {
  try {
    const user = await requireUser();
    await db.delete(runs).where(and(eq(runs.id, params.runId), eq(runs.userId, user.id)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }
}
