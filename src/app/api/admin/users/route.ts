export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, runs, chatMessages, auditEvents, apiKeys } from "@/db/schema";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { withAdmin } from "@/lib/admin/api";
import { assertReauthenticated, recordAdminAction } from "@/lib/auth/admin";
import type { UserListRow } from "@/lib/admin/dto";

const PAGE_SIZE = 20;

export const GET = withAdmin("users.view", async ({ req }) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const status = url.searchParams.get("status");
  const role = url.searchParams.get("role");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));

  const filters = [];
  if (q) filters.push(or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`)));
  if (status === "active" || status === "suspended") filters.push(eq(users.status, status));
  if (role === "USER" || role === "SUPER_ADMIN") filters.push(eq(users.role, role));
  const where = filters.length ? and(...filters) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(users).where(where);

  // last activity per user = max(runs.createdAt), max(chat via run), max(audit)
  const lastRunAgg = await db
    .select({ userId: runs.userId, lastAt: sql<Date | null>`max(${runs.createdAt})` })
    .from(runs)
    .groupBy(runs.userId);
  const runCountAgg = await db
    .select({
      userId: runs.userId,
      total: count(),
      completed: sql<number>`sum(case when ${runs.status} = 'completed' then 1 else 0 end)::int`,
    })
    .from(runs)
    .groupBy(runs.userId);
  const keyAgg = await db
    .select({ userId: apiKeys.userId, total: count() })
    .from(apiKeys)
    .groupBy(apiKeys.userId);
  const chatAgg = await db
    .select({ userId: runs.userId, lastAt: sql<Date | null>`max(${chatMessages.createdAt})` })
    .from(chatMessages)
    .innerJoin(runs, eq(chatMessages.runId, runs.id))
    .groupBy(runs.userId);
  const auditAgg = await db
    .select({ userId: auditEvents.userId, lastAt: sql<Date | null>`max(${auditEvents.createdAt})` })
    .from(auditEvents)
    .groupBy(auditEvents.userId);

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const lastMap = new Map<string, Date | null>();
  for (const m of [...lastRunAgg, ...chatAgg, ...auditAgg]) {
    const prev = lastMap.get(m.userId) ?? null;
    const at = m.lastAt ? new Date(m.lastAt) : null;
    if (at && (!prev || at > prev)) lastMap.set(m.userId, at);
  }
  const runMap = new Map(runCountAgg.map((r) => [r.userId, r]));
  const keyMap = new Map(keyAgg.map((k) => [k.userId, Number(k.total)]));

  const list: UserListRow[] = rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt.toISOString(),
    lastActivityAt: lastMap.get(u.id)?.toISOString() ?? null,
    totalRuns: Number(runMap.get(u.id)?.total ?? 0),
    completedRuns: Number(runMap.get(u.id)?.completed ?? 0),
    keysConfigured: keyMap.get(u.id) ?? 0,
  }));

  return NextResponse.json({ rows: list, page, pageSize: PAGE_SIZE, total: Number(total) });
});

const actionSchema = z.object({
  action: z.enum(["suspend", "reactivate", "revoke_sessions", "grant_admin", "revoke_admin", "set_notes"]),
  userId: z.string().uuid(),
  password: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export const PUT = withAdmin("users.manage", async ({ req, admin }) => {
  const parsed = actionSchema.safeParse(await requestJson(req));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const { action, userId } = parsed.data;

  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Guard-rails
  if ((action === "grant_admin" || action === "revoke_admin") && !parsed.data.password) {
    return NextResponse.json({ error: "Password confirmation required for role changes" }, { status: 403 });
  }
  if (action === "revoke_admin" && target.id === admin.id) {
    return NextResponse.json({ error: "You cannot revoke your own super-admin role" }, { status: 400 });
  }
  if (action === "suspend" && target.id === admin.id) {
    return NextResponse.json({ error: "You cannot suspend your own account" }, { status: 400 });
  }

  switch (action) {
    case "suspend": {
      if (target.role === "SUPER_ADMIN" && !parsed.data.password) {
        return NextResponse.json({ error: "Suspending a super admin requires password confirmation" }, { status: 403 });
      }
      await db.update(users).set({ status: "suspended", sessionEpoch: sql`${users.sessionEpoch} + 1` }).where(eq(users.id, userId));
      await recordAdminAction(admin, "admin.user_suspended", userId, target.email);
      break;
    }
    case "reactivate": {
      await db.update(users).set({ status: "active" }).where(eq(users.id, userId));
      await recordAdminAction(admin, "admin.user_reactivated", userId, target.email);
      break;
    }
    case "revoke_sessions": {
      await db.update(users).set({ sessionEpoch: sql`${users.sessionEpoch} + 1` }).where(eq(users.id, userId));
      await recordAdminAction(admin, "admin.sessions_revoked", userId, target.email);
      break;
    }
    case "grant_admin": {
      await assertReauthenticated(admin, parsed.data.password);
      await db.update(users).set({ role: "SUPER_ADMIN" }).where(eq(users.id, userId));
      await recordAdminAction(admin, "admin.grant_super_admin", userId, target.email);
      break;
    }
    case "revoke_admin": {
      await assertReauthenticated(admin, parsed.data.password);
      await db.update(users).set({ role: "USER", sessionEpoch: sql`${users.sessionEpoch} + 1` }).where(eq(users.id, userId));
      await recordAdminAction(admin, "admin.revoke_super_admin", userId, target.email);
      break;
    }
    case "set_notes": {
      await db.update(users).set({ internalNotes: (parsed.data.notes ?? "").slice(0, 2000) }).where(eq(users.id, userId));
      await recordAdminAction(admin, "admin.notes_updated", userId, `${target.email} · ${parsed.data.notes?.length ?? 0} chars`);
      break;
    }
  }

  return NextResponse.json({ ok: true });
});

async function requestJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
