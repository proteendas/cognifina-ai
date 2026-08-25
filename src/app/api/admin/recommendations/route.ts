export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, runs, adminInsights, auditEvents, chatMessages, featureFlags } from "@/db/schema";
import { count, desc, eq, gte, sql } from "drizzle-orm";
import { withAdmin, rangeFromUrl } from "@/lib/admin/api";
import { recordAdminAction } from "@/lib/auth/admin";
import type { RecommendationRow } from "@/lib/admin/dto";

type Rule = {
  ruleKey: string;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  priority: "high" | "medium" | "low";
  confidence: "high" | "medium" | "low";
  affectedSegment: string;
  affectedArea: string;
  recommendation: string;
  expectedOutcome: string;
};

/**
 * Rule-based insight engine. Every rule must cite the exact aggregate that
 * triggered it — insights without supporting data are never generated.
 */
async function generateRules(days: number, from: Date): Promise<Rule[]> {
  const rules: Rule[] = [];

  const [{ total: totalUsers }] = await db.select({ total: count() }).from(users);
  const N = Number(totalUsers);

  const runAgg = await db
    .select({
      status: runs.status,
      total: count(),
    })
    .from(runs)
    .where(gte(runs.createdAt, from))
    .groupBy(runs.status);
  const byStatus = new Map(runAgg.map((r) => [r.status, Number(r.total)]));
  const started = [...byStatus.values()].reduce((s, n) => s + n, 0);
  const completed = byStatus.get("completed") ?? 0;
  const failed = byStatus.get("failed") ?? 0;

  // 1 · activation drop-off: signed up ≥3d ago but never ran
  const [{ never_ran }] = await db
    .select({
      never_ran: sql<number>`(
        select count(*)::int from ${users} u
        where not exists (select 1 from ${runs} r where r.user_id = u.id)
          and u.created_at < now() - interval '3 days'
      )`,
    })
    .from(users)
    .limit(1);
  const neverPct = N ? (Number(never_ran) / N) * 100 : 0;
  if (N >= 5 && neverPct >= 30) {
    rules.push({
      ruleKey: "activation_never_ran",
      title: `${Math.round(neverPct)}% of accounts never start an analysis`,
      description: `${never_ran} of ${N} accounts (older than 3 days) have zero runs. The first-analysis step is the product's core activation event.`,
      evidence: { metric: "users with 0 runs ÷ all users older than 3d", value: `${never_ran}/${N}`, window: `${days}d snapshot`, source: "users ⨯ runs anti-join" },
      priority: neverPct >= 50 ? "high" : "medium",
      confidence: "high",
      affectedSegment: "New signups",
      affectedArea: "Onboarding → first run",
      recommendation: "Surface a sample-documents quick start on the Workflows page and link it from the dashboard empty state.",
      expectedOutcome: "Higher share of accounts reaching a first completed analysis within 24h of signup.",
    });
  }

  // 2 · reliability: failure rate rising vs previous window
  const [{ prev_total, prev_failed }] = await db
    .select({
      prev_total: sql<number>`count(*)::int`,
      prev_failed: sql<number>`sum(case when ${runs.status} = 'failed' then 1 else 0 end)::int`,
    })
    .from(runs)
    .where(sql`${runs.createdAt} >= now() - (${days} * interval '1 day') * 2 and ${runs.createdAt} < now() - (${days} * interval '1 day')`);
  const curRate = started ? (failed / started) * 100 : 0;
  const prevRate = Number(prev_total) ? (Number(prev_failed) / Number(prev_total)) * 100 : 0;
  if (started >= 10 && curRate >= 15 && curRate > prevRate) {
    rules.push({
      ruleKey: "reliability_failures_rising",
      title: `Run failure rate at ${curRate.toFixed(0)}% (was ${prevRate.toFixed(0)}%)`,
      description: `${failed} of ${started} runs failed in the last ${days}d. Failed runs block the entire downstream report.`,
      evidence: { metric: "failed ÷ started runs", current: `${failed}/${started}`, previous: `${prev_failed}/${prev_total}`, source: "runs.status" },
      priority: "high",
      confidence: "high",
      affectedSegment: "All analysing users",
      affectedArea: "Pipeline reliability",
      recommendation: "Group recent runs.error messages by type and fix the most frequent failure cause first.",
      expectedOutcome: "Failure rate back below the 15% alert threshold.",
    });
  }

  // 3 · abandonment: runs started but never completed
  const abandoned = started - completed - failed;
  const abandonRate = started ? (abandoned / started) * 100 : 0;
  if (started >= 10 && abandonRate >= 25) {
    rules.push({
      ruleKey: "workflow_abandonment",
      title: `${Math.round(abandonRate)}% of started analyses are abandoned`,
      description: `${abandoned} runs in the last ${days}d are stuck in queued/running state without completing.`,
      evidence: { metric: "started − completed − failed", value: `${abandoned}/${started}`, source: "runs.status distribution" },
      priority: "medium",
      confidence: "medium",
      affectedSegment: "Active analysers",
      affectedArea: "Run completion",
      recommendation: "Investigate long-running stages and add resumable progress or clearer in-run status feedback.",
      expectedOutcome: "Fewer stalled runs; higher workflow completion rate.",
    });
  }

  // 4 · chat adoption low among users who completed a run
  const completedRunUsers = await db
    .selectDistinct({ userId: runs.userId })
    .from(runs)
    .where(eq(runs.status, "completed"));
  const chatUsers = await db
    .selectDistinct({ userId: runs.userId })
    .from(chatMessages)
    .innerJoin(runs, eq(chatMessages.runId, runs.id));
  const chatSet = new Set(chatUsers.map((c) => c.userId));
  const adopters = completedRunUsers.filter((u) => chatSet.has(u.userId)).length;
  const adoptionPct = completedRunUsers.length ? (adopters / completedRunUsers.length) * 100 : 0;
  if (completedRunUsers.length >= 5 && adoptionPct < 30) {
    const flags = await db.select().from(featureFlags).where(eq(featureFlags.key, "chat_suggestions"));
    rules.push({
      ruleKey: "chat_adoption_low",
      title: `Only ${Math.round(adoptionPct)}% of completed-run users try Evidence Chat`,
      description: `${adopters} of ${completedRunUsers.length} users who finished an analysis used the grounded chat — the product's stickiest surface is under-discovered.`,
      evidence: { metric: "chat users ÷ completed-run users", value: `${adopters}/${completedRunUsers.length}`, source: "chat_messages ⨯ runs" },
      priority: "medium",
      confidence: "medium",
      affectedSegment: "Users with completed runs",
      affectedArea: "Evidence Chat discoverability",
      recommendation: flags[0]?.enabled === false ? "Re-enable the chat_suggestions feature flag to restore prompt chips on the chat page." : "Add a chat teaser card to the run overview tab once the run completes.",
      expectedOutcome: "Evidence Chat adoption above 30% of completers; improved return-visit rate.",
    });
  }

  // 5 · signup momentum falling
  const [{ cur_signups, prev_signups }] = await db
    .select({
      cur_signups: sql<number>`count(*) filter (where created_at >= now() - (${days} * interval '1 day'))::int`,
      prev_signups: sql<number>`count(*) filter (where created_at >= now() - (${days} * interval '1 day') * 2 and created_at < now() - (${days} * interval '1 day'))::int`,
    })
    .from(users);
  if (Number(prev_signups) >= 5 && Number(cur_signups) < Number(prev_signups) * 0.7) {
    rules.push({
      ruleKey: "signup_momentum_down",
      title: `Signups down ${Math.round((1 - Number(cur_signups) / Number(prev_signups)) * 100)}% vs previous ${days}d`,
      description: `${cur_signups} new accounts vs ${prev_signups} in the prior window.`,
      evidence: { metric: "users.created_at per window", current: cur_signups, previous: prev_signups, source: "users" },
      priority: "medium",
      confidence: "low",
      affectedSegment: "Acquisition",
      affectedArea: "Marketing site → register",
      recommendation: "Review top-of-funnel traffic and the register page conversion before investing in feature work.",
      expectedOutcome: "Identify whether the decline is traffic- or conversion-driven.",
    });
  }

  return rules;
}

export const GET = withAdmin("insights.manage", async ({ req, admin }): Promise<Response> => {
  const { days, from } = rangeFromUrl(req.url);

  const rules = await generateRules(days, from);
  for (const rule of rules) {
    // Upsert by stable rule key; keep the existing review status if present.
    await db
      .insert(adminInsights)
      .values({
        ruleKey: rule.ruleKey,
        title: rule.title,
        description: rule.description,
        evidence: rule.evidence,
        priority: rule.priority,
        confidence: rule.confidence,
        affectedSegment: rule.affectedSegment,
        affectedArea: rule.affectedArea,
        recommendation: rule.recommendation,
        expectedOutcome: rule.expectedOutcome,
        status: "new",
        generatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: adminInsights.ruleKey,
        set: {
          title: rule.title,
          description: rule.description,
          evidence: rule.evidence,
          priority: rule.priority,
          confidence: rule.confidence,
          recommendation: rule.recommendation,
          expectedOutcome: rule.expectedOutcome,
          generatedAt: new Date(),
        },
      });
  }

  const rows = await db.select().from(adminInsights).orderBy(desc(adminInsights.generatedAt));
  const payload: RecommendationRow[] = rows.map((r) => ({
    id: r.id,
    ruleKey: r.ruleKey,
    title: r.title,
    description: r.description,
    evidence: r.evidence,
    priority: r.priority,
    confidence: r.confidence,
    affectedSegment: r.affectedSegment,
    affectedArea: r.affectedArea,
    recommendation: r.recommendation,
    expectedOutcome: r.expectedOutcome,
    status: r.status,
    generatedAt: r.generatedAt.toISOString(),
  }));
  void admin;
  return NextResponse.json({ rows });
});

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "reviewed", "in_progress", "completed", "dismissed"]),
});

export const PATCH = withAdmin("insights.manage", async ({ req, admin }) => {
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const [row] = await db
    .update(adminInsights)
    .set({ status: parsed.data.status, reviewedBy: admin.id, reviewedAt: new Date() })
    .where(eq(adminInsights.id, parsed.data.id))
    .returning({ ruleKey: adminInsights.ruleKey });
  if (!row) return NextResponse.json({ error: "Insight not found" }, { status: 404 });
  await recordAdminAction(admin, "admin.insight_status", parsed.data.id, `${row.ruleKey} → ${parsed.data.status}`);
  await db.insert(auditEvents).values({ userId: admin.id, action: "admin.insight_status", detail: `${row.ruleKey} → ${parsed.data.status}` });
  return NextResponse.json({ ok: true });
});
