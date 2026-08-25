export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, runs, chatMessages, apiKeys } from "@/db/schema";
import { and, count, eq, gte, lt } from "drizzle-orm";
import { withAdmin, rangeFromUrl } from "@/lib/admin/api";
import { pctChange } from "@/lib/admin/metrics";
import type { FeatureRow, FeaturesDto } from "@/lib/admin/dto";

/**
 * Feature analytics derived strictly from existing tables:
 *  - each workflow = a product feature (runs.workflow_id)
 *  - Evidence Chat (chat_messages per completed run)
 *  - BYOK key vault adoption (api_keys)
 *  - Profile & preferences self-service (audit actions)
 */
export const GET = withAdmin("analytics.view", async ({ req, admin }): Promise<Response> => {
  void admin;
  const { days, from, to } = rangeFromUrl(req.url);
  const prevFrom = new Date(from.getTime() - days * 86400000);

  const [totalUsers] = await db.select({ total: count() }).from(users);

  const curRuns = await db
    .select({ workflowId: runs.workflowId, workflowName: runs.workflowName, userId: runs.userId, status: runs.status, at: runs.createdAt })
    .from(runs)
    .where(and(gte(runs.createdAt, prevFrom), lt(runs.createdAt, new Date(to.getTime() + 1))));
  const curIn = curRuns.filter((r) => r.at >= from);

  const chatRows = await db
    .select({ userId: runs.userId, at: chatMessages.createdAt })
    .from(chatMessages)
    .innerJoin(runs, eq(chatMessages.runId, runs.id));
  const keyRows = await db.select({ userId: apiKeys.userId, createdAt: apiKeys.createdAt }).from(apiKeys);

  const rows: FeatureRow[] = [];

  // per-workflow rows
  const wfAgg = new Map<string, { name: string; users: Set<string>; usesCur: number; usesPrev: number; errors: number }>();
  for (const r of curRuns) {
    const entry = wfAgg.get(r.workflowId) ?? { name: r.workflowName, users: new Set<string>(), usesCur: 0, usesPrev: 0, errors: 0 };
    if (r.at >= from) {
      entry.usesCur += 1;
      entry.users.add(r.userId);
      if (r.status === "failed") entry.errors += 1;
    } else {
      entry.usesPrev += 1;
    }
    wfAgg.set(r.workflowId, entry);
  }
  for (const [, v] of wfAgg) {
    rows.push({
      feature: v.name,
      users: v.users.size,
      adoptionPct: totalUsers.total ? (v.users.size / Number(totalUsers.total)) * 100 : 0,
      usesCurrent: v.usesCur,
      usesPrevious: v.usesPrev,
      changePct: pctChange(v.usesCur, v.usesPrev),
      errors: v.errors,
    });
  }

  // Evidence Chat
  const chatUsersCur = new Set(chatRows.filter((c) => c.at >= from).map((c) => c.userId));
  const chatUsesCur = chatRows.filter((c) => c.at >= from).length;
  const chatUsesPrev = chatRows.filter((c) => c.at < from && c.at >= prevFrom).length;
  rows.push({
    feature: "Evidence Chat (grounded Q&A)",
    users: chatUsersCur.size,
    adoptionPct: totalUsers.total ? (chatUsersCur.size / Number(totalUsers.total)) * 100 : 0,
    usesCurrent: chatUsesCur,
    usesPrevious: chatUsesPrev,
    changePct: pctChange(chatUsesCur, chatUsesPrev),
    errors: 0, // chat failures surface as thrown API errors; not persisted per-call
  });

  // BYOK key vault
  const keyUsers = new Set(keyRows.map((k) => k.userId));
  const keyCur = keyRows.filter((k) => k.createdAt >= from).length;
  const keyPrev = keyRows.filter((k) => k.createdAt < from && k.createdAt >= prevFrom).length;
  rows.push({
    feature: "BYOK key vault",
    users: keyUsers.size,
    adoptionPct: totalUsers.total ? (keyUsers.size / Number(totalUsers.total)) * 100 : 0,
    usesCurrent: keyCur,
    usesPrevious: keyPrev,
    changePct: pctChange(keyCur, keyPrev),
    errors: 0,
  });

  rows.sort((a, b) => b.usesCurrent - a.usesCurrent);

  const payload: FeaturesDto = { rangeDays: days, rows };
  return NextResponse.json(payload);
});
