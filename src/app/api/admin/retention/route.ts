export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, runs, chatMessages } from "@/db/schema";
import { eq, gte, sql } from "drizzle-orm";
import { withAdmin } from "@/lib/admin/api";
import { weeklyRetention, assessRisk } from "@/lib/admin/metrics";
import type { AtRiskUser, RetentionDto } from "@/lib/admin/dto";

export const GET = withAdmin("analytics.view", async (): Promise<Response> => {
  const now = new Date();

  const userRows = await db
    .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
    .from(users);

  // All-time activity for cohort math (bounded tables; add windowing at scale)
  const runRows = await db.select({ userId: runs.userId, at: runs.createdAt, status: runs.status }).from(runs);
  const chatRows = await db
    .select({ userId: runs.userId, at: chatMessages.createdAt })
    .from(chatMessages)
    .innerJoin(runs, eq(chatMessages.runId, runs.id));
  const activity = [...runRows, ...chatRows].map((r) => ({ userId: r.userId, at: r.at }));

  // ---- weekly signup cohorts (last 8 weeks, 6 observable periods) ----
  const cohorts = weeklyRetention(
    userRows.map((u) => ({ userId: u.id, at: u.createdAt })),
    activity,
    8,
    6
  );

  // ---- churned: ran at least once, no activity in trailing 30d ----
  const cutoff = now.getTime() - 30 * 86400000;
  const lastActivity = new Map<string, number>();
  for (const a of activity) lastActivity.set(a.userId, Math.max(lastActivity.get(a.userId) ?? 0, a.at.getTime()));
  const totalRunsByUser = new Map<string, number>();
  for (const r of runRows) totalRunsByUser.set(r.userId, (totalRunsByUser.get(r.userId) ?? 0) + 1);

  const churned = [...lastActivity.entries()]
    .filter(([id, at]) => at < cutoff && (totalRunsByUser.get(id) ?? 0) > 0)
    .map(([id, at]) => {
      const u = userRows.find((x) => x.id === id)!;
      return {
        userId: id,
        name: u.name,
        email: u.email,
        lastActivityAt: new Date(at).toISOString(),
        totalRuns: totalRunsByUser.get(id) ?? 0,
      };
    })
    .sort((a, b) => (a.lastActivityAt < b.lastActivityAt ? -1 : 1))
    .slice(0, 50);

  const lifetimeDays = churned.map((c) => (new Date(c.lastActivityAt).getTime() - new Date(userRows.find((u) => u.id === c.userId)!.createdAt).getTime()) / 86400000);
  const avgLifetimeBeforeChurnDays = lifetimeDays.length
    ? Math.round((lifetimeDays.reduce((s, d) => s + d, 0) / lifetimeDays.length) * 10) / 10
    : null;

  // ---- at-risk (with explicit, displayed reasons) ----
  const riskAgg = await db
    .select({
      userId: runs.userId,
      prev30: sql<number>`sum(case when ${runs.createdAt} >= now() - interval '60 days' and ${runs.createdAt} < now() - interval '30 days' then 1 else 0 end)::int`,
      last30: sql<number>`sum(case when ${runs.createdAt} >= now() - interval '30 days' then 1 else 0 end)::int`,
      failedLast30: sql<number>`sum(case when ${runs.status} = 'failed' and ${runs.createdAt} >= now() - interval '30 days' then 1 else 0 end)::int`,
    })
    .from(runs)
    .groupBy(runs.userId);
  const riskMap = new Map(riskAgg.map((r) => [r.userId, r]));

  const atRisk: AtRiskUser[] = userRows
    .map((u) => {
      const agg = riskMap.get(u.id);
      const last = lastActivity.get(u.id);
      const assessment = assessRisk({
        accountCreatedAt: u.createdAt,
        lastActivityAt: last ? new Date(last) : null,
        totalRuns: totalRunsByUser.get(u.id) ?? 0,
        runsPrevPeriod: Number(agg?.prev30 ?? 0),
        runsCurrentPeriod: Number(agg?.last30 ?? 0),
        failedRunsLast30d: Number(agg?.failedLast30 ?? 0),
        now,
      });
      if (assessment.reasons.length === 0) return null;
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt.toISOString(),
        lastActivityAt: last ? new Date(last).toISOString() : null,
        totalRuns: totalRunsByUser.get(u.id) ?? 0,
        reasons: assessment.reasons,
        confidence: assessment.confidence,
      } satisfies AtRiskUser;
    })
    .filter((x): x is AtRiskUser => x !== null)
    .sort((a, b) => (a.confidence === b.confidence ? (a.lastActivityAt ?? "").localeCompare(b.lastActivityAt ?? "") : a.confidence === "high" ? -1 : 1));

  const payload: RetentionDto = { cohorts, churned, avgLifetimeBeforeChurnDays, atRisk };
  return NextResponse.json(payload);
});
