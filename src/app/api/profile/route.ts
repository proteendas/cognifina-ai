import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, apiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  requireUser,
  UnauthorizedError,
  hashPassword,
  verifyPassword,
  clearSessionCookie,
} from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(200).optional(),
  preferences: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { name, currentPassword, newPassword, preferences } = parsed.data;

    // password change requires the current one
    if (newPassword) {
      if (!currentPassword) return NextResponse.json({ error: "Current password is required" }, { status: 400 });
      const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
      if (!row || !verifyPassword(currentPassword, row.hash)) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
      }
    }

    const update: Partial<{ name: string; passwordHash: string; preferences: Record<string, unknown> }> = {};
    if (name && name !== user.name) update.name = name;
    if (newPassword) update.passwordHash = hashPassword(newPassword);
    if (preferences) {
      const [row] = await db.select({ prefs: users.preferences }).from(users).where(eq(users.id, user.id)).limit(1);
      update.preferences = { ...(row?.prefs ?? {}), ...preferences };
    }
    if (Object.keys(update).length === 0) return NextResponse.json({ user });

    const [updated] = await db
      .update(users)
      .set(update)
      .where(eq(users.id, user.id))
      .returning({ id: users.id, email: users.email, name: users.name });

    for (const [action, detail] of [
      [update.name ? "profile.renamed" : null, `→ ${name}`],
      [update.passwordHash ? "password.changed" : null, ""],
      [preferences ? "preferences.updated" : null, Object.keys(preferences ?? {}).join(", ")],
    ] as const) {
      if (action) await recordAudit(user.id, action, detail);
    }

    return NextResponse.json({ user: updated });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[profile.PATCH]", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json().catch(() => null)) as { password?: string } | null;
    if (!body?.password) return NextResponse.json({ error: "Password confirmation is required" }, { status: 400 });

    const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
    if (!row || !verifyPassword(body.password, row.hash)) {
      return NextResponse.json({ error: "Password is incorrect" }, { status: 403 });
    }

    await recordAudit(user.id, "account.deleted", user.email);
    await db.delete(apiKeys).where(eq(apiKeys.userId, user.id)); // explicit wipe of encrypted material
    await clearSessionCookie();
    await db.delete(users).where(eq(users.id, user.id)); // cascades to runs · documents · findings · audit

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[profile.DELETE]", err);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
