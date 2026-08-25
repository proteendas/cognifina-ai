import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { decryptSecret } from "@/lib/auth/vault";
import { PROVIDERS, type ProviderId } from "./registry";
import type { ResolvedCredential } from "./client";

/**
 * Credential resolution order (deterministic):
 *  1. Per-request headers: x-cognifina-provider / x-custom-api-key / x-custom-base-url
 *  2. User vault (AES-256-GCM encrypted rows in Postgres)
 *  3. Server environment fallback
 */

export function credentialFromHeaders(headers: Headers): ResolvedCredential | null {
  const providerName = headers.get("x-cognifina-provider");
  if (!providerName) return null;
  const spec = PROVIDERS[providerName as ProviderId];
  if (!spec) return null;
  const apiKey = headers.get("x-custom-api-key") || null;
  const baseUrl = headers.get("x-custom-base-url");
  const model =
    headers.get("x-custom-model") || (spec.models.length > 0 ? spec.models[0].id : "gpt-4o-mini");
  if (!apiKey && providerName !== "ollama") return null;
  return { provider: providerName as ProviderId, apiKey, baseUrl, model };
}

export async function resolveCredential(opts: {
  userId: string;
  headers?: Headers;
}): Promise<ResolvedCredential | null> {
  // 1) request-level overrides
  const headerCred = opts.headers ? credentialFromHeaders(opts.headers) : null;
  if (headerCred?.apiKey || headerCred?.provider === "ollama") return headerCred;

  // 2) user's saved vault keys, in registry priority order
  const rows = await db.select().from(apiKeys).where(eq(apiKeys.userId, opts.userId));
  for (const provider of ["openai", "anthropic", "google", "groq", "deepseek", "mistral", "ollama"] as ProviderId[]) {
    const row = rows.find((r) => r.provider === provider);
    if (!row) continue;
    const spec = PROVIDERS[provider];
    try {
      const apiKey = decryptSecret(row.encryptedKey);
      return {
        provider,
        apiKey,
        baseUrl: row.baseUrl ?? spec.defaultBaseUrl ?? null,
        model: row.defaultModel ?? spec.models[0]?.id ?? "",
      };
    } catch {
      continue; // corrupted entry — try next
    }
  }

  // 3) environment fallback
  for (const provider of Object.keys(PROVIDERS) as ProviderId[]) {
    const envVar = PROVIDERS[provider].envKey;
    if (envVar && process.env[envVar]) {
      return {
        provider,
        apiKey: process.env[envVar] as string,
        baseUrl: PROVIDERS[provider].defaultBaseUrl ?? null,
        model: PROVIDERS[provider].models[0]?.id ?? "",
      };
    }
  }
  return null;
}

export async function upsertKey(params: {
  userId: string;
  provider: ProviderId;
  encryptedKey: string;
  keyHint: string;
  baseUrl?: string | null;
  defaultModel?: string | null;
  status?: string;
}): Promise<void> {
  await db
    .insert(apiKeys)
    .values({
      userId: params.userId,
      provider: params.provider,
      encryptedKey: params.encryptedKey,
      keyHint: params.keyHint,
      baseUrl: params.baseUrl ?? null,
      defaultModel: params.defaultModel ?? null,
      status: params.status ?? "unverified",
    })
    .onConflictDoUpdate({
      target: [apiKeys.userId, apiKeys.provider],
      set: {
        encryptedKey: params.encryptedKey,
        keyHint: params.keyHint,
        baseUrl: params.baseUrl ?? null,
        defaultModel: params.defaultModel ?? null,
        ...(params.status ? { status: params.status } : {}),
      },
    });
}

export async function deleteKey(userId: string, provider: ProviderId): Promise<void> {
  await db.delete(apiKeys).where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, provider)));
}
