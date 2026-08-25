export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, runs, documents, findings, chatMessages, auditEvents } from "@/db/schema";
import { and, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import { withAdmin, rangeFromUrl } from "@/lib/admin/api";
import {
  assessRisk,
  bucketCountsByDay,
  dailyActiveUsers,
  pctChange,
  rollingActiveUsers,
} from "@/lib/admin/metrics";
import type { AtRiskUser, MetricStat, OverviewDto, TrendPoint } from "@/lib/admin/dto";

export const GET = withAdmin("analytics.view", async ({ req }): Promise<Response> => {
  const { days, from, to } = rangeFromUrl(req.url);
  const prevFrom = new Date(from.getTime() - days * 86400000);
  const now = new Date();

  // ---------- users ----------
  const [{ total: totalUsers }] = await db.select({ total: count() }).from(users);
  const signupRows = await db
    .select({ id: users.id, createdAt: users.createdAt })
    .from(users)
    .where(gte(users.createdAt, prevFrom));
  const signupsCur = signupRows.filter((u) => u.createdAt >= from).length;
  const signupsPrev = signupRows.filter((u) => u.createdAt < from).length;

  // ---------- activity stream (runs + chats + audit) for DAU/WAU/MAU & trends ----------
  const runRows = await db
    .select({ userId: runs.userId, at: runs.createdAt, status: runs.status, riskScore: runs.riskScore, workflowId: runs.workflowId, workflowName: runs.workflowName })
    .from(runs)
    .where(and(gte(runs.createdAt, prevFrom), lt(runs.createdAt, new Date(to.getTime() + 86400000))));

  const chatRows = await db
    .select({ userId: runs.userId, at: chatMessages.createdAt })
    .from(chatMessages)
    .innerJoin(runs, eq(chatMessages.runId, runs.id))
    .where(gte(chatMessages.createdAt, prevFrom));

  const activity = [
    ...runRows.map((r) => ({ userId: r.userId, at: r.at })),
    ...chatRows.map((c) => ({ userId: c.userId, at: c.at })),
  ];

  const dau = rollingActiveUsers(activity, now, 1);
  const wau = rollingActiveUsers(activity, now, 7);
  const mau = rollingActiveUsers(activity, now, 30);

  // ---------- run metrics current vs previous window ----------
  const inCur = runRows.filter((r) => r.at >= from);
  const inPrev = runRows.filter((r) => r.at < from && r.at >= prevFrom);
  const completedCur = inCur.filter((r) => r.status === "completed").length;
  const failedCur = inCur.filter((r) => r.status === "failed").length;
  const failedPrev = inPrev.filter((r) => r.status === "failed").length;
  const scoredCur = inCur.filter((r) => r.riskScore != null);
  const scoredPrev = inPrev.filter((r) => r.riskScore != null);
  const avgScoreCur = scoredCur.length ? Math.round(scoredCur.reduce((s, r) => s + (r.riskScore ?? 0), 0) / scoredCur.length) : null;
  const avgScorePrev = scoredPrev.length ? Math.round(scoredPrev.reduce((s, r) => s + (r.riskScore ?? 0), 0) / scoredPrev.length) : null;
  const errorRateCur = inCur.length ? (failedCur / inCur.length) * 100 : null;
  const errorRatePrev = inPrev.length ? (failedPrev / inPrev.length) * 100 : null;

  const [docCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(documents)
    .where(gte(documents.createdAt, from));
  const [docCountPrev] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(documents)
    .where(and(gte(documents.createdAt, prevFrom), lt(documents.createdAt, from)));
  const [findingCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(findings)
    .innerJoin(runs, eq(findings.runId, runs.id))
    .where(gte(runs.createdAt, from));

  // ---------- top workflows ----------
  const wfMap = new Map<string, { name: string; runs: number }>();
  for (const r of inCur) {
    const entry = wfMap.get(r.workflowId) ?? { name: r.workflowName, runs: 0 };
    entry.runs += 1;
    wfMap.set(r.workflowId, entry);
  }
  const topWorkflows = [...wfMap.entries()]
    .map(([workflowId, v]) => ({ workflowId, name: v.name, runs: v.runs }))
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 5);

  // ---------- trends ----------
  const signupsTrend: TrendPoint[] = bucketCountsByDay(
    signupRows.map((u) => u.createdAt),
    from,
    to
  ).map((b) => ({ day: b.day, value: b.count }));
  const activeTrend = dailyActiveUsers(activity, from, to).map((b) => ({ day: b.day, value: b.users }));
  const runsByDay = new Map<string, number>();
  const failsByDay = new Map<string, number>();
  for (const b of bucketCountsByDay(runRows.map((r) => r.at), from, to)) runsByDay.set(b.day, b.count);
  for (const b of bucketCountsByDay(runRows.filter((r) => r.status === "failed").map((r) => r.at), from, to))
    failsByDay.set(b.day, b.count);
  const runsTrend = [...runsByDay.keys()].sort().map((day) => ({
    day,
    current: runsByDay.get(day) ?? 0,
    previous: failsByDay.get(day) ?? 0,
  }));

  // ---------- attention: at-risk accounts ----------
  const perUser = await buildPerUserActivity();
  const attention: AtRiskUser[] = perUser
    .map((u) => {
      const assessment = assessRisk({
        accountCreatedAt: u.createdAt,
        lastActivityAt: u.lastActivityAt,
        totalRuns: u.totalRuns,
        runsPrevPeriod: u.runsPrev30,
        runsCurrentPeriod: u.runsLast30,
        failedRunsLast30d: u.failedLast30,
        now,
      });
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt.toISOString(),
        lastActivityAt: u.lastActivityAt?.toISOString() ?? null,
        totalRuns: u.totalRuns,
        reasons: assessment.reasons,
        confidence: assessment.confidence,
      };
    })
    .filter((u) => u.reasons.length > 0)
    .sort((a, b) => a.confidence.localeCompare(b.confidence) || a.lastActivityAt?.localeCompare(b.lastActivityAt ?? "") || 0)
    .slice(0, 6);

  // ---------- recent admin events ----------
  const adminEventRows = await db
    .select({ id: auditEvents.id, action: auditEvents.action, detail: auditEvents.detail, at: auditEvents.createdAt, actor: users.email })
    .from(auditEvents)
    .innerJoin(users, eq(auditEvents.userId, users.id))
    .orderBy(desc(auditEvents.createdAt))
    .limit(8);

  const stat = (
    key: string,
    label: string,
    value: number | string | null,
    previous: number | string | null,
    formula: string
  ): MetricStat => ({
    key,
    label,
    value,
    previous,
    changePct:
      typeof value === "number" && typeof previous === "number" ? pctChange(value, previous) : null,
    formula,
  });

  const payload: OverviewDto = {
    rangeDays: days,
    generatedAt: now.toISOString(),
    totals: {
      users: {
        key: "users",
        label: "Total registered users",
        value: Number(totalUsers),
        formula: "count(*) on users table",
      },
      newUsers: stat("new_users", `New users (${days}d)`, signupsCur, signupsPrev, "users.created_at within selected range vs previous equivalent range"),
      dau: { key: "dau", label: "Daily active", value: dau, formula: "distinct users with ≥1 run/chat/audit event in trailing 24h (UTC)" },
      wau: { key: "wau", label: "Weekly active", value: wau, formula: "distinct users with ≥1 event in trailing 7d (UTC)" },
      mau: { key: "mau", label: "Monthly active", value: mau, formula: "distinct users with ≥1 event in trailing 30d (UTC)" },
      runs: stat("runs", `Analyses started (${days}d)`, inCur.length, inPrev.length, "rows inserted into runs within range"),
      completedRuns: stat("completed", "Completed analyses", completedCur, inPrev.filter((r) => r.status === "completed").length, "runs where status='completed'"),
      errorRate: stat(
        "error_rate",
        "Run failure rate",
        errorRateCur == null ? null : `${errorRateCur.toFixed(1)}%`,
        errorRatePrev == null ? null : `${errorRatePrev.toFixed(1)}%`,
        "failed runs ÷ started runs in range"
      ),
      avgRiskScore: stat("avg_score", "Avg risk score", avgScoreCur, avgScorePrev, "mean of runs.risk_score for completed runs"),
      documents: stat("docs", "Documents ingested", docCount?.total ?? 0, docCountPrev?.total ?? 0, "rows in documents created in range"),
      findings: { key: "findings", label: "Findings reported", value: findingCount?.total ?? 0, formula: "findings joined to runs started in range" },
      workspacesNew: stat("ws_new", "New workspaces", signupsCur, signupsPrev, "each account is a single-user workspace; equals new users"),
    },
    trends: { signups: signupsTrend, active: activeTrend, runs: runsTrend },
    topWorkflows,
    attention,
    recentAdminEvents: adminEventRows.map((e) => ({
      id: e.id,
      actor: e.actor,
      action: e.action,
      detail: e.detail,
      at: e.at.toISOString(),
    })),
    unavailable: [
      {
        metric: "Revenue & subscriptions",
        reason: "No billing tables exist in this product (free BYOK model).",
        required: "subscriptions/invoices schema or a payment-provider integration before revenue metrics can render.",
      },
      {
        metric: "AI request volume & cost",
        reason: "Model calls are made directly from the pipeline to user-configured providers; token counts and costs are not recorded.",
        required: "an ai_requests log (provider, model, tokens_in, tokens_out, latency_ms) written in src/lib/ai/client.ts.",
      },
      {
        metric: "API p50/p95 latency & uptime",
        reason: "HTTP request timing is not persisted.",
        required: "request timing middleware writing to a metrics store; DB probe latency is shown under System Health meanwhile.",
      },
    ],
  };

  return NextResponse.json(payload);
});

/** Per-user activity aggregates used by risk classification. */
async function buildPerUserActivity() {
  const userRows = await db
    .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt, status: users.status })
    .from(users);

  const runAgg = await db
    .select({
      userId: runs.userId,
      total: count(),
      last30: sql<number>`sum(case when ${runs.createdAt} >= now() - interval '30 days' then 1 else 0 end)::int`,
      prev30: sql<number>`sum(case when ${runs.createdAt} >= now() - interval '60 days' and ${runs.createdAt} < now() - interval '30 days' then 1 else 0 end)::int`,
      failedLast30: sql<number>`sum(case when ${runs.status} = 'failed' and ${runs.createdAt} >= now() - interval '30 days' then 1 else 0 end)::int`,
      lastRunAt: sql<Date | null>`max(${runs.createdAt})`,
    })
    .from(runs)
    .groupBy(runs.userId);

  const chatAgg = await db
    .select({ userId: runs.userId, lastChatAt: sql<Date | null>`max(${chatMessages.createdAt})` })
    .from(chatMessages)
    .innerJoin(runs, eq(chatMessages.runId, runs.id))
    .groupBy(runs.userId);

  const byId = new Map(userRows.map((u) => [u.id, { ...u, totalRuns: 0, runsLast30: 0, runsPrev30: 0, failedLast30: 0, lastRunAt: null as Date | null, lastChatAt: null as Date | null }]));
  for (const r of runAgg) {
    const u = byId.get(r.userId);
    if (!u) continue;
    u.totalRuns = Number(r.total);
    u.runsLast30 = Number(r.last30 ?? 0);
    u.runsPrev30 = Number(r.prev30 ?? 0);
    u.failedLast30 = Number(r.failedLast30 ?? 0);
    u.lastRunAt = r.lastRunAt ? new Date(r.lastRunAt) : null;
  }
  for (const c of chatAgg) {
    const u = byId.get(c.userId);
    if (!u) continue;
    u.lastChatAt = c.lastChatAt ? new Date(c.lastChatAt) : null;
  }
  return [...byId.values()].map((u) => ({
    ...u,
    lastActivityAt: [u.lastRunAt, u.lastChatAt].reduce<Date | null>(
      (acc, d) => (d && (!acc || d > acc) ? d : acc),
      null
    ),
  }));
}
