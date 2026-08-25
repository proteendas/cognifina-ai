import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/auth/session";
import { encryptSecret, keyHint } from "@/lib/auth/vault";
import { PROVIDER_LIST, PROVIDERS, type ProviderId } from "@/lib/ai/registry";
import { upsertKey, deleteKey } from "@/lib/ai/keys";

const saveSchema = z.object({
  provider: z.string().refine((p) => p in PROVIDERS),
  apiKey: z.string().min(1).max(400),
  baseUrl: z.string().url().max(300).optional().nullable(),
  defaultModel: z.string().max(120).optional().nullable(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db.select().from(apiKeys).where(eq(apiKeys.userId, user.id));
    return NextResponse.json({
      keys: rows.map((r) => ({
        provider: r.provider as ProviderId,
        hint: r.keyHint,
        baseUrl: r.baseUrl,
        defaultModel: r.defaultModel,
        status: r.status,
        lastTestedAt: r.lastTestedAt?.toISOString() ?? null,
      })),
      providers: PROVIDER_LIST.map((p) => ({ id: p.id, label: p.label, models: p.models.map((m) => m.id), docsUrl: p.docsUrl })),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const parsed = saveSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    const { provider, apiKey, baseUrl, defaultModel } = parsed.data;
    await upsertKey({
      userId: user.id,
      provider: provider as ProviderId,
      encryptedKey: encryptSecret(apiKey),
      keyHint: keyHint(apiKey),
      baseUrl: baseUrl ?? null,
      defaultModel: defaultModel ?? null,
      status: "saved",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const provider = new URL(request.url).searchParams.get("provider");
    if (!provider || !(provider in PROVIDERS)) return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    await deleteKey(user.id, provider as ProviderId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }
}
