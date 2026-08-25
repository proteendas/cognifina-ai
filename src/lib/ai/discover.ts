import type { ProviderSpec } from "./registry";

/**
 * Live model discovery — the model list always comes from the provider's own
 * /models endpoint using the caller's key. Nothing is hardcoded; the first
 * listed model acts as the default when the user hasn't chosen one.
 */

type CacheEntry = { models: string[]; at: number };
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

export async function listProviderModels(
  api: ProviderSpec["api"],
  baseUrl: string,
  key: string,
  opts: { noCache?: boolean } = {}
): Promise<string[]> {
  const cacheKey = `${api}|${baseUrl}|${key.slice(-8)}`;
  if (!opts.noCache) {
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.models;
  }
  const models = await fetchModels(api, baseUrl, key);
  cache.set(cacheKey, { models, at: Date.now() });
  return models;
}

/** Best-effort default: first model the key can access, or "" when none. */
export async function resolveDefaultModel(
  api: ProviderSpec["api"],
  baseUrl: string,
  key: string
): Promise<string> {
  try {
    const models = await listProviderModels(api, baseUrl, key);
    return models[0] ?? "";
  } catch {
    return "";
  }
}

async function fetchModels(api: ProviderSpec["api"], base: string, key: string): Promise<string[]> {
  if (api === "openai-compatible") {
    const res = await fetch(`${base.replace(/\/$/, "")}/models`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await describe(res));
    const json = (await res.json()) as { data?: { id?: string }[] };
    return (json.data ?? []).map((m) => m.id).filter((id): id is string => Boolean(id)).sort();
  }
  if (api === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/models?limit=100", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await describe(res));
    const json = (await res.json()) as { data?: { id?: string }[] };
    return (json.data ?? []).map((m) => m.id).filter((id): id is string => Boolean(id)).sort();
  }
  // google
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}&pageSize=100`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(await describe(res));
  const json = (await res.json()) as { models?: { name?: string; supportedGenerationMethods?: string[] }[] };
  return (json.models ?? [])
    .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes("generateContent"))
    .map((m) => (m.name ?? "").replace(/^models\//, ""))
    .filter(Boolean)
    .sort();
}

async function describe(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } | string };
    const msg = typeof body.error === "string" ? body.error : body.error?.message;
    return msg ? `HTTP ${res.status}: ${msg}` : `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}
