export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, runs, documents, findings, chatMessages, auditEvents, apiKeys } from "@/db/schema";
import { count, desc, eq, sql } from "drizzle-orm";
import { withAdmin } from "@/lib/admin/api";
import type { AtRiskUser, UserDetailDto } from "@/lib/admin/dto";
import { assessRisk } from "@/lib/admin/metrics";

export const GET = withAdmin("users.view", async ({ req, admin }): Promise<Response> => {
  const userId = new URL(req.url).pathname.split("/").pop()!;
  const [target] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      internalNotes: users.internalNotes,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [runAgg] = await db
    .select({
      total: count(),
      completed: sql<number>`sum(case when ${runs.status} = 'completed' then 1 else 0 end)::int`,
      failed: sql<number>`sum(case when ${runs.status} = 'failed' then 1 else 0 end)::int`,
      avgScore: sql<number | null>`avg(${runs.riskScore})`,
      lastRunAt: sql<Date | null>`max(${runs.createdAt})`,
    })
    .from(runs)
    .where(eq(runs.userId, userId));

  const [docAgg] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(documents)
    .innerJoin(runs, eq(documents.runId, runs.id))
    .where(eq(runs.userId, userId));

  const [findingAgg] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(findings)
    .innerJoin(runs, eq(findings.runId, runs.id))
    .where(eq(runs.userId, userId));

  const [chatAgg] = await db
    .select({ total: count() })
    .from(chatMessages)
    .innerJoin(runs, eq(chatMessages.runId, runs.id))
    .where(eq(runs.userId, userId));

  const [keyAgg] = await db.select({ total: count() }).from(apiKeys).where(eq(apiKeys.userId, userId));

  const recentRuns = await db
    .select({
      id: runs.id,
      workflowName: runs.workflowName,
      entityName: runs.entityName,
      status: runs.status,
      riskScore: runs.riskScore,
      createdAt: runs.createdAt,
    })
    .from(runs)
    .where(eq(runs.userId, userId))
    .orderBy(desc(runs.createdAt))
    .limit(10);

  const history = await db
    .select({ id: auditEvents.id, action: auditEvents.action, detail: auditEvents.detail, at: auditEvents.createdAt })
    .from(auditEvents)
    .where(eq(auditEvents.userId, userId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(20);

  // risk classification (same signals as overview/retention)
  const [riskAgg] = await db
    .select({
      prev30: sql<number>`sum(case when ${runs.createdAt} >= now() - interval '60 days' and ${runs.createdAt} < now() - interval '30 days' then 1 else 0 end)::int`,
      last30: sql<number>`sum(case when ${runs.createdAt} >= now() - interval '30 days' then 1 else 0 end)::int`,
      failedLast30: sql<number>`sum(case when ${runs.status} = 'failed' and ${runs.createdAt} >= now() - interval '30 days' then 1 else 0 end)::int`,
    })
    .from(runs)
    .where(eq(runs.userId, userId));
  const [chatLast] = await db
    .select({ at: sql<Date | null>`max(${chatMessages.createdAt})` })
    .from(chatMessages)
    .innerJoin(runs, eq(chatMessages.runId, runs.id))
    .where(eq(runs.userId, userId));
  const runLast = runAgg.lastRunAt ? new Date(runAgg.lastRunAt) : null;
  const chatLastDate = chatLast?.at ? new Date(chatLast.at) : null;
  const lastActivityAt: Date | null =
    runLast && chatLastDate ? (runLast > chatLastDate ? runLast : chatLastDate) : runLast ?? chatLastDate;
  const assessment = assessRisk({
    accountCreatedAt: target.createdAt,
    lastActivityAt,
    totalRuns: Number(runAgg.total),
    runsPrevPeriod: Number(riskAgg?.prev30 ?? 0),
    runsCurrentPeriod: Number(riskAgg?.last30 ?? 0),
    failedRunsLast30d: Number(riskAgg?.failedLast30 ?? 0),
  });

  const payload: UserDetailDto = {
    user: {
      id: target.id,
      name: target.name,
      email: target.email,
      role: target.role,
      status: target.status,
      internalNotes: target.internalNotes,
      createdAt: target.createdAt.toISOString(),
    },
    stats: {
      totalRuns: Number(runAgg.total),
      completedRuns: Number(runAgg.completed ?? 0),
      failedRuns: Number(runAgg.failed ?? 0),
      documents: docAgg?.total ?? 0,
      findings: findingAgg?.total ?? 0,
      avgRiskScore: runAgg.avgScore != null ? Math.round(Number(runAgg.avgScore)) : null,
      keysConfigured: Number(keyAgg.total),
      chatMessages: Number(chatAgg.total),
      lastActivityAt: lastActivityAt?.toISOString() ?? null,
    },
    recentRuns: recentRuns.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    auditHistory: history.map((h) => ({ id: h.id, action: h.action, detail: h.detail, at: h.at.toISOString() })),
    risk:
      assessment.reasons.length > 0
        ? ({
            userId: target.id,
            name: target.name,
            email: target.email,
            createdAt: target.createdAt.toISOString(),
            lastActivityAt: lastActivityAt?.toISOString() ?? null,
            totalRuns: Number(runAgg.total),
            reasons: assessment.reasons,
            confidence: assessment.confidence,
          } satisfies AtRiskUser)
        : null,
  };

  void admin;
  return NextResponse.json(payload);
});
