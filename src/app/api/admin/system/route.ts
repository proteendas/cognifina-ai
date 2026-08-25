export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { withAdmin } from "@/lib/admin/api";
import type { SystemHealthDto } from "@/lib/admin/dto";

/** DB latency percentiles from N sequential probe queries (dev-scale honesty). */
async function probeDb(samples = 8): Promise<{ p50: number; p95: number; ok: boolean }> {
  const latencies: number[] = [];
  let ok = true;
  for (let i = 0; i < samples; i++) {
    const t0 = performance.now();
    try {
      await db.execute(sql`select 1`);
    } catch {
      ok = false;
    }
    latencies.push(performance.now() - t0);
  }
  latencies.sort((a, b) => a - b);
  const p = (q: number) => Math.round(latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))]);
  return { p50: p(0.5), p95: p(0.95), ok };
}

export const GET = withAdmin("system.view", async (): Promise<Response> => {
  const probe = await probeDb();

  const failed = await db.execute<{ failed_24h: number; total_24h: number }>(sql`
    select
      count(*) filter (where status = 'failed')::int as failed_24h,
      count(*)::int as total_24h
    from runs
    where created_at >= now() - interval '24 hours'
  `);
  const row = failed[0] ?? { failed_24h: 0, total_24h: 0 };

  const payload: SystemHealthDto = {
    dbOk: probe.ok,
    dbLatencyMsP50: probe.p50,
    dbLatencyMsP95: probe.p95,
    uptimeHours: Math.round((process.uptime() / 3600) * 10) / 10,
    nodeVersion: process.version,
    failedRuns24h: Number(row.failed_24h),
    runs24h: Number(row.total_24h),
    totalUsers: 0, // filled below to keep the DTO single-purpose
    activeSessionsNote: "Sessions are stateless HMAC cookies bound to a per-user epoch; revocation is instant via epoch bump.",
  };

  const usersCount = await db.execute<{ total: number }>(sql`select count(*)::int as total from users`);
  payload.totalUsers = Number(usersCount[0]?.total ?? 0);

  return NextResponse.json(payload);
});
