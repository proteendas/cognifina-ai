export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { withAdmin } from "@/lib/admin/api";
import { assertReauthenticated, recordAdminAction } from "@/lib/auth/admin";

/** Flags shipped with real consumers in the product. */
const KNOWN_FLAGS = [
  {
    key: "chat_suggestions",
    label: "Evidence Chat suggestion chips",
    description: "Show pre-written question chips on the Evidence Chat empty state.",
  },
  {
    key: "marketing_cta_band",
    label: "Marketing CTA band",
    description: "Render the closing call-to-action band on marketing pages.",
  },
] as const;

export const GET = withAdmin("flags.manage", async () => {
  const rows = await db.select().from(featureFlags).orderBy(asc(featureFlags.key));
  // ensure known flags exist
  for (const f of KNOWN_FLAGS) {
    if (!rows.some((r) => r.key === f.key)) {
      await db.insert(featureFlags).values({ key: f.key, label: f.label, description: f.description, enabled: true }).onConflictDoNothing();
    }
  }
  const all = await db.select().from(featureFlags).orderBy(asc(featureFlags.key));
  return NextResponse.json({ flags: all });
});

const putSchema = z.object({
  key: z.string().min(1).max(100),
  enabled: z.boolean(),
  password: z.string().min(1),
});

export const PUT = withAdmin("flags.manage", async ({ req, admin }) => {
  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  await assertReauthenticated(admin, parsed.data.password);

  const known = KNOWN_FLAGS.find((f) => f.key === parsed.data.key);
  const [row] = await db
    .insert(featureFlags)
    .values({
      key: parsed.data.key,
      label: known?.label ?? parsed.data.key,
      description: known?.description ?? "",
      enabled: parsed.data.enabled,
      updatedBy: admin.id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: featureFlags.key,
      set: { enabled: parsed.data.enabled, updatedBy: admin.id, updatedAt: new Date() },
    })
    .returning({ key: featureFlags.key, enabled: featureFlags.enabled });

  await recordAdminAction(admin, "admin.flag_toggled", row.key, `${row.key} → ${row.enabled}`);
  return NextResponse.json({ ok: true, flag: row });
});
