export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/auth/session";
import { decryptSecret } from "@/lib/auth/vault";
import { PROVIDERS, type ProviderId } from "@/lib/ai/registry";
import { listProviderModels } from "@/lib/ai/discover";

const schema = z.object({
  provider: z.string().refine((p) => p in PROVIDERS),
  apiKey: z.string().max(400).optional(),
  baseUrl: z.string().url().max(300).optional().nullable(),
});

/**
 * Live model discovery: queries the provider's own /models endpoint with the
 * caller's key (freshly pasted, or the stored vault key) so the model list is
 * always exactly what the key can access — nothing hardcoded.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    const { provider, apiKey, baseUrl } = parsed.data;
    const spec = PROVIDERS[provider as ProviderId];

    let key = apiKey?.trim();
    if (!key) {
      const [row] = await db
        .select({ encrypted: apiKeys.encryptedKey })
        .from(apiKeys)
        .where(and(eq(apiKeys.userId, user.id), eq(apiKeys.provider, provider)))
        .limit(1);
      if (!row) return NextResponse.json({ models: [], source: "none" });
      key = decryptSecret(row.encrypted);
    }

    const base = (baseUrl || spec.defaultBaseUrl || "").replace(/\/$/, "");
    try {
      const models = await listProviderModels(spec.api, base, key!, { noCache: Boolean(apiKey?.trim()) });
      return NextResponse.json({ models, source: "live" });
    } catch (err) {
      return NextResponse.json(
        { models: [], source: "error", error: err instanceof Error ? err.message : "Model listing failed" },
        { status: 200 }
      );
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[models.POST]", err);
    return NextResponse.json({ error: "Failed to list models" }, { status: 500 });
  }
}
