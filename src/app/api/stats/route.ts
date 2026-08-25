export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { runs, documents, findings, auditEvents, apiKeys } from "@/db/schema";
import { count, desc, eq, sql } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/auth/session";
import type { AuditEventDto, RunListItem, Severity, UsageStatsDto } from "@/lib/types";

export async function GET() {
  try {
    const user = await requireUser();

    const runRows = await db
      .select({
        id: runs.id,
        workflowId: runs.workflowId,
        workflowName: runs.workflowName,
        entityName: runs.entityName,
        periodLabel: runs.periodLabel,
        status: runs.status,
        progress: runs.progress,
        currentStage: runs.currentStage,
        riskScore: runs.riskScore,
        riskBand: runs.riskBand,
        summary: runs.summary,
        createdAt: runs.createdAt,
        finishedAt: runs.finishedAt,
      })
      .from(runs)
      .where(eq(runs.userId, user.id))
      .orderBy(desc(runs.createdAt))
      .limit(200);

    const [docCount] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(documents)
      .innerJoin(runs, eq(documents.runId, runs.id))
      .where(eq(runs.userId, user.id));

    const [findingCount] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(findings)
      .innerJoin(runs, eq(findings.runId, runs.id))
      .where(eq(runs.userId, user.id));

    const [keyCount] = await db.select({ total: count() }).from(apiKeys).where(eq(apiKeys.userId, user.id));

    const severityTotals: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    let scoreSum = 0;
    let scoredRuns = 0;
    for (const r of runRows) {
      const sc = r.summary?.severityCounts;
      if (sc) for (const k of Object.keys(severityTotals) as Severity[]) severityTotals[k] += sc[k] ?? 0;
      if (r.status === "completed" && r.riskScore != null) {
        scoreSum += r.riskScore;
        scoredRuns += 1;
      }
    }

    const recentRuns: RunListItem[] = runRows.slice(0, 5).map((r) => ({
      id: r.id,
      workflowId: r.workflowId,
      workflowName: r.workflowName,
      entityName: r.entityName,
      periodLabel: r.periodLabel,
      status: r.status as RunListItem["status"],
      progress: r.progress,
      currentStage: r.currentStage,
      riskScore: r.riskScore,
      riskBand: r.riskBand,
      summary: r.summary,
      createdAt: r.createdAt.toISOString(),
      finishedAt: r.finishedAt?.toISOString() ?? null,
    }));

    let events: AuditEventDto[] = [];
    try {
      const rows = await db
        .select({ id: auditEvents.id, action: auditEvents.action, detail: auditEvents.detail, createdAt: auditEvents.createdAt })
        .from(auditEvents)
        .where(eq(auditEvents.userId, user.id))
        .orderBy(desc(auditEvents.createdAt))
        .limit(12);
      events = rows.map((e) => ({ id: e.id, action: e.action, detail: e.detail, createdAt: e.createdAt.toISOString() }));
    } catch {
      // table not migrated yet — degrade gracefully
    }

    const payload: UsageStatsDto = {
      totals: {
        runs: runRows.length,
        completed: runRows.filter((r) => r.status === "completed").length,
        failed: runRows.filter((r) => r.status === "failed").length,
        activeRuns: runRows.filter((r) => r.status === "queued" || r.status === "running").length,
        documents: docCount?.total ?? 0,
        findings: findingCount?.total ?? 0,
        avgRiskScore: scoredRuns > 0 ? Math.round(scoreSum / scoredRuns) : null,
      },
      severityTotals,
      keysConfigured: Number(keyCount?.total ?? 0),
      recentRuns,
      events,
    };

    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[stats.GET]", err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
