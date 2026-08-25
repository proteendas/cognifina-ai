import { db } from "@/db";
import { users, auditEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ForbiddenError, requireUser, verifyPassword, type SessionUser } from "@/lib/auth/session";

export type AdminPermission =
  | "analytics.view"
  | "users.view"
  | "workspaces.view"
  | "billing.view"
  | "ai.view"
  | "system.view"
  | "data.export"
  | "users.manage"
  | "flags.manage"
  | "admins.manage"
  | "audit.view"
  | "insights.manage";

/** Granular permission model — extend the map when new roles are introduced. */
export const ROLE_PERMISSIONS: Record<"USER" | "SUPER_ADMIN", AdminPermission[] | []> = {
  USER: [],
  SUPER_ADMIN: [
    "analytics.view",
    "users.view",
    "workspaces.view",
    "billing.view",
    "ai.view",
    "system.view",
    "data.export",
    "users.manage",
    "flags.manage",
    "admins.manage",
    "audit.view",
    "insights.manage",
  ],
};

export function can(user: SessionUser | null, permission: AdminPermission): boolean {
  if (!user || user.status !== "active") return false;
  return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
}

/**
 * Server-side guard for every admin API route and page.
 * Throws UnauthorizedError / ForbiddenError — handlers translate to HTTP codes.
 */
export async function requireAdmin(permission?: AdminPermission): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") throw new ForbiddenError("Super admin access required");
  if (permission && !can(user, permission)) throw new ForbiddenError(`Missing permission: ${permission}`);
  return user;
}

/**
 * Re-authentication for sensitive operations: the super admin must re-enter
 * their own password within the request performing the mutation.
 */
export async function assertReauthenticated(admin: SessionUser, password: unknown): Promise<void> {
  if (typeof password !== "string" || password.length === 0) {
    throw new ForbiddenError("Password confirmation required");
  }
  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, admin.id)).limit(1);
  if (!row || !verifyPassword(password, row.hash)) {
    throw new ForbiddenError("Password confirmation failed");
  }
}

/** Audit helper for admin actions — records actor, action, target, result. */
export async function recordAdminAction(
  admin: SessionUser,
  action: string,
  targetId: string,
  detail: string,
  meta: Record<string, unknown> = {}
): Promise<void> {
  try {
    await db.insert(auditEvents).values({
      userId: admin.id,
      action,
      detail: detail.slice(0, 500),
      meta: { ...meta, targetUserId: targetId, actorRole: admin.role },
    });
  } catch (err) {
    console.error("[admin-audit]", action, err);
  }
}
