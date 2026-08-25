export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, auditEvents } from "@/db/schema";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { withAdmin } from "@/lib/admin/api";
import type { AuditPage } from "@/lib/admin/dto";

export const GET = withAdmin("audit.view", async ({ req }): Promise<Response> => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const action = url.searchParams.get("action");
  const userId = url.searchParams.get("userId");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") ?? 25)));

  const filters = [];
  if (action) filters.push(eq(auditEvents.action, action));
  if (userId) filters.push(eq(auditEvents.userId, userId));
  if (q) filters.push(or(ilike(auditEvents.action, `%${q}%`), ilike(auditEvents.detail, `%${q}%`), ilike(users.email, `%${q}%`)));
  const where = filters.length ? and(...filters) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(auditEvents)
    .innerJoin(users, eq(auditEvents.userId, users.id))
    .where(where);

  const rows = await db
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      detail: auditEvents.detail,
      meta: auditEvents.meta,
      at: auditEvents.createdAt,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(auditEvents)
    .innerJoin(users, eq(auditEvents.userId, users.id))
    .where(where)
    .orderBy(desc(auditEvents.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const payload: AuditPage = {
    rows: rows.map((r) => ({ ...r, at: r.at.toISOString() })),
    page,
    pageSize,
    total: Number(total),
  };
  return NextResponse.json(payload);
});
