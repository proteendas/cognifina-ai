export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/lib/auth/session";
import { PROVIDERS, type ProviderId } from "@/lib/ai/registry";
import { resolveCredential, upsertKey } from "@/lib/ai/keys";
import { resolveDefaultModel } from "@/lib/ai/discover";
import { testCredential, type ResolvedCredential } from "@/lib/ai/client";
import { keyHint } from "@/lib/auth/vault";

const testSchema = z.object({
  provider: z.string().refine((p) => p in PROVIDERS),
  apiKey: z.string().max(400).optional(),
  baseUrl: z.string().url().max(300).optional(),
  model: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = testSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const { provider, apiKey, baseUrl, model } = parsed.data;
    let cred: ResolvedCredential;

    if (apiKey) {
      // Test the pasted key without persisting it
      const spec = PROVIDERS[provider as ProviderId];
      const base = baseUrl ?? spec.defaultBaseUrl ?? null;
      cred = {
        provider: provider as ProviderId,
        apiKey,
        baseUrl: base,
        model: model ?? (await resolveDefaultModel(spec.api, base ?? "", apiKey)),
      };
    } else {
      const resolved = await resolveCredential({ userId: user.id });
      if (!resolved || resolved.provider !== provider) {
        return NextResponse.json({ ok: false, detail: `No stored key for ${provider}` });
      }
      cred = { ...resolved, baseUrl: baseUrl ?? resolved.baseUrl };
    }

    const result = await testCredential(cred);
    if (result.ok && apiKey) {
      await upsertKey({
        userId: user.id,
        provider: provider as ProviderId,
        encryptedKey: (await import("@/lib/auth/vault")).encryptSecret(apiKey),
        keyHint: keyHint(apiKey),
        baseUrl: baseUrl ?? null,
        defaultModel: model ?? null,
        status: "verified",
      });
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }
}
