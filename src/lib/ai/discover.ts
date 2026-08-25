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

/** Best-effort default: the most capable model the key can access. */
export async function resolveDefaultModel(
  api: ProviderSpec["api"],
  baseUrl: string,
  key: string
): Promise<string> {
  try {
    const models = await listProviderModels(api, baseUrl, key);
    return pickDefaultModel(models);
  } catch {
    return "";
  }
}

/** Non-chat / tiny models that must never be auto-selected. */
const AVOID = /(whisper|orpheus|tts|embed|guard|prompt-guard|allam|safeguard|-2-7b|-3b|-1b|vision)/i;
/** Capability hints, strongest first-match wins. */
const PREFERRED = /(gpt-oss-120b|gpt-4|claude-(3|4|opus|sonnet)|-70b|-120b|-240b|k2|large-latest|compound|qwen3|gemini-2(\.\d)?-(pro|flash)|deepseek)/i;

export function pickDefaultModel(models: string[]): string {
  const usable = models.filter((m) => !AVOID.test(m));
  const pool = usable.length > 0 ? usable : models;
  return pool.find((m) => PREFERRED.test(m)) ?? pool[0] ?? "";
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
