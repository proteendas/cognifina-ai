export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, runs, chatMessages } from "@/db/schema";
import { eq, gte, sql } from "drizzle-orm";
import { withAdmin, rangeFromUrl } from "@/lib/admin/api";
import { dailyActiveUsers, funnel } from "@/lib/admin/metrics";
import type { AnalyticsDto } from "@/lib/admin/dto";

export const GET = withAdmin("analytics.view", async ({ req }): Promise<Response> => {
  const { days, from, to } = rangeFromUrl(req.url);
  const prevFrom = new Date(from.getTime() - days * 86400000);

  const userRows = await db.select({ id: users.id, createdAt: users.createdAt }).from(users);

  // activity = run creation + chat messages (both user-attributed)
  const runRows = await db
    .select({ userId: runs.userId, at: runs.createdAt, status: runs.status })
    .from(runs)
    .where(gte(runs.createdAt, prevFrom));
  const chatRows = await db
    .select({ userId: runs.userId, at: chatMessages.createdAt })
    .from(chatMessages)
    .innerJoin(runs, eq(chatMessages.runId, runs.id))
    .where(gte(chatMessages.createdAt, prevFrom));
  const activity = [...runRows, ...chatRows].map((r) => ({ userId: r.userId, at: r.at }));

  // all-time runners (for "never used" & "inactive" definitions)
  const everRunners = new Set(
    (await db.select({ userId: runs.userId }).from(runs).groupBy(runs.userId)).map((r) => r.userId)
  );

  // ---- trends ----
  const signupsOverTime = bucketize(
    userRows.map((u) => ({ userId: u.id, at: u.createdAt })),
    from,
    to
  );
  const activeOverTime = dailyActiveUsers(activity, from, to).map((b) => ({ day: b.day, value: b.users }));

  // new vs returning per day: "New" = user's first-ever activity happens on that day
  const newVsReturning = dailyActiveUsers(activity, from, to).map(({ day }) => ({ day, New: 0, Returning: 0 }));
  const dayIndex = new Map(newVsReturning.map((r, i) => [r.day, i]));
  const firstActivityDay = new Map<string, string>();
  for (const e of activity) {
    const key = e.at.toISOString().slice(0, 10);
    const prev = firstActivityDay.get(e.userId);
    if (!prev || key < prev) firstActivityDay.set(e.userId, key);
  }
  for (const e of activity) {
    const key = e.at.toISOString().slice(0, 10);
    const idx = dayIndex.get(key);
    if (idx == null) continue;
    if (firstActivityDay.get(e.userId) === key) newVsReturning[idx].New += 1;
    else newVsReturning[idx].Returning += 1;
  }

  // ---- activation funnel over the real product workflow ----
  const userIds = new Set(userRows.map((u) => u.id));
  const runUsers = new Set([...runRows].filter((r) => userIds.has(r.userId)).map((r) => r.userId));
  const completedUsers = new Set(runRows.filter((r) => r.status === "completed").map((r) => r.userId));
  const chatUsers = new Set(chatRows.map((c) => c.userId));
  const daysByUser = new Map<string, Set<string>>();
  for (const e of activity) {
    if (!daysByUser.has(e.userId)) daysByUser.set(e.userId, new Set());
    daysByUser.get(e.userId)!.add(e.at.toISOString().slice(0, 10));
  }
  const returnedUsers = [...daysByUser.values()].filter((s) => s.size >= 2).length;

  const funnelStages = funnel([
    { stage: "Account created", users: userRows.length },
    { stage: "Started an analysis", users: runUsers.size },
    { stage: "Analysis completed", users: completedUsers.size },
    { stage: "Used Evidence Chat", users: chatUsers.size },
    { stage: "Returned (2+ days)", users: returnedUsers },
  ]);

  // ---- engagement segments ----
  const runCounts = new Map<string, number>();
  for (const r of runRows) runCounts.set(r.userId, (runCounts.get(r.userId) ?? 0) + 1);
  const activeUserCount = runUsers.size || 1;
  const totalRunsCur = runRows.filter((r) => r.at >= from).length;
  const cutoff30 = to.getTime() - 30 * 86400000;
  const lastActivityByUser = new Map<string, number>();
  for (const e of activity) {
    lastActivityByUser.set(e.userId, Math.max(lastActivityByUser.get(e.userId) ?? 0, e.at.getTime()));
  }
  const neverUsed = userIds.size - everRunners.size;
  const startedNotCompleted = [...runUsers].filter((u) => !completedUsers.has(u)).length;
  const inactive30d = [...everRunners].filter((id) => (lastActivityByUser.get(id) ?? 0) > 0 && (lastActivityByUser.get(id) ?? 0) < cutoff30).length;
  const fromKey = from.toISOString().slice(0, 10);
  const prevFromKey = prevFrom.toISOString().slice(0, 10);
  const reengaged = [...daysByUser.values()].filter((days) => {
    if (days.size < 2) return false;
    const sorted = [...days].sort();
    return sorted[0] < prevFromKey && sorted[sorted.length - 1] >= fromKey;
  }).length;

  const roleAgg = await db
    .select({ segment: users.role, users: sql<number>`count(*)::int` })
    .from(users)
    .groupBy(users.role);
  const statusAgg = await db
    .select({ segment: users.status, users: sql<number>`count(*)::int` })
    .from(users)
    .groupBy(users.status);

  const payload: AnalyticsDto = {
    rangeDays: days,
    signupsOverTime,
    activeOverTime,
    newVsReturning,
    funnel: funnelStages,
    engagement: {
      avgRunsPerActiveUser: totalRunsCur / activeUserCount,
      powerUsers: [...runCounts.values()].filter((n) => n >= 5).length,
      neverUsed,
      startedNotCompleted,
      inactive30d,
      reengaged,
    },
    segments: {
      byRole: roleAgg.map((r) => ({ segment: r.segment, users: Number(r.users) })),
      byStatus: statusAgg.map((r) => ({ segment: r.segment, users: Number(r.users) })),
    },
  };

  return NextResponse.json(payload);
});

function bucketize(events: { userId: string; at: Date }[], from: Date, to: Date) {
  const counts = new Map<string, number>();
  const fromKey = from.toISOString().slice(0, 10);
  const toKey = to.toISOString().slice(0, 10);
  for (const e of events) {
    const key = e.at.toISOString().slice(0, 10);
    if (key < fromKey || key > toKey) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const out: { day: string; value: number }[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  while (cursor.getTime() <= to.getTime()) {
    const key = cursor.toISOString().slice(0, 10);
    out.push({ day: key, value: counts.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}
