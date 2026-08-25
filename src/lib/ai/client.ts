import { z } from "zod";
import type { ZodType } from "zod";
import { PROVIDERS, type ProviderId } from "./registry";

/**
 * Unified BYOK model client.
 * - temperature = 0.0 everywhere ("Statistics lead. Models follow.": LLM never invents numbers)
 * - structured JSON output validated with Zod; one deterministic repair retry
 * - keys resolved per-request: headers > user vault > env
 */

export class ProviderError extends Error {
  constructor(
    message: string,
    public provider?: string
  ) {
    super(message);
  }
}

export type ResolvedCredential = {
  provider: ProviderId;
  apiKey: string | null;
  baseUrl: string | null;
  model: string;
};

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const MAX_RETRIES = 2;

/** Extract the first balanced JSON object/array from arbitrary text. */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.search(/[[{]/);
  if (start === -1) throw new Error("No JSON found in model output");
  const openChar = cleaned[start];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) return JSON.parse(cleaned.slice(start, i + 1));
    }
  }
  throw new Error("Unbalanced JSON in model output");
}

async function callOpenAICompatible(
  cred: ResolvedCredential,
  messages: ChatMessage[],
  maxTokens: number,
  jsonMode: boolean
): Promise<string> {
  const baseUrl = cred.baseUrl || PROVIDERS[cred.provider].defaultBaseUrl!;
  // Reasoning models (gpt-oss etc.) burn completion tokens thinking — keep it low
  const isReasoning = /gpt-oss|deepseek-r1|qwen3/i.test(cred.model);
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cred.apiKey ? { Authorization: `Bearer ${cred.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: cred.model,
      temperature: 0,
      max_tokens: maxTokens,
      messages: isReasoning
        ? [{ role: "system", content: "Reasoning: low" }, ...messages]
        : messages,
      ...(isReasoning ? { reasoning_effort: "low" } : {}),
      ...(jsonMode && cred.provider !== "ollama" ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(55_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ProviderError(`HTTP ${res.status}: ${body.slice(0, 300)}`, cred.provider);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string; reasoning?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    const reasoning = data.choices?.[0]?.message?.reasoning;
    if (reasoning) {
      throw new ProviderError(
        "Model spent its entire token budget on reasoning — increase max tokens or pick a non-reasoning model",
        cred.provider
      );
    }
    throw new ProviderError("Empty completion", cred.provider);
  }
  return content;
}

async function callAnthropic(
  cred: ResolvedCredential,
  messages: ChatMessage[],
  maxTokens: number
): Promise<string> {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const rest = messages.filter((m) => m.role !== "system");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": cred.apiKey ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: cred.model,
      max_tokens: maxTokens,
      temperature: 0,
      system: system || undefined,
      messages: rest.map((m) => ({ role: m.role, content: m.content })),
    }),
    signal: AbortSignal.timeout(55_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ProviderError(`HTTP ${res.status}: ${body.slice(0, 300)}`, cred.provider);
  }
  const data = (await res.json()) as { content?: { text?: string }[] };
  const text = data.content?.map((c) => c.text ?? "").join("");
  if (!text) throw new ProviderError("Empty completion", cred.provider);
  return text;
}

async function callGoogle(
  cred: ResolvedCredential,
  messages: ChatMessage[],
  maxTokens: number
): Promise<string> {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cred.model}:generateContent?key=${cred.apiKey ?? ""}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      generationConfig: { temperature: 0, maxOutputTokens: maxTokens },
    }),
    signal: AbortSignal.timeout(55_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ProviderError(`HTTP ${res.status}: ${body.slice(0, 300)}`, cred.provider);
  }
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
  if (!text) throw new ProviderError("Empty completion", cred.provider);
  return text;
}

async function rawComplete(cred: ResolvedCredential, messages: ChatMessage[], maxTokens: number, jsonMode: boolean): Promise<string> {
  switch (PROVIDERS[cred.provider].api) {
    case "openai-compatible":
      return callOpenAICompatible(cred, messages, maxTokens, jsonMode);
    case "anthropic":
      return callAnthropic(cred, messages, maxTokens);
    case "google":
      return callGoogle(cred, messages, maxTokens);
  }
}

export async function completeJSON<T>(opts: {
  credential: ResolvedCredential;
  system: string;
  prompt: string;
  schema: ZodType<T>;
  maxTokens?: number;
}): Promise<{ data: T; attempts: number }> {
  const { credential, system, prompt, schema } = opts;
  const maxTokens = opts.maxTokens ?? 2000;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const repairNote =
      attempt > 1 && lastError
        ? `\n\nYour previous response failed validation with: "${lastError.message}". Return ONLY corrected JSON matching the schema.`
        : "";
    try {
      const text = await rawComplete(
        credential,
        [
          { role: "system", content: `${system}\nRespond with ONLY valid JSON — no prose, no markdown fences.${repairNote}` },
          { role: "user", content: prompt },
        ],
        maxTokens,
        true
      );
      const parsed = schema.safeParse(extractJson(text));
      if (parsed.success) return { data: parsed.data, attempts: attempt };
      lastError = parsed.error.issues.length
        ? new Error(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "))
        : new Error("Schema mismatch");
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw new ProviderError(`Structured completion failed after ${MAX_RETRIES} attempts: ${lastError?.message}`, credential.provider);
}

/** Plain-text grounded chat completion (used by evidence chat). */
export async function completeText(opts: {
  credential: ResolvedCredential;
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  return rawComplete(
    opts.credential,
    [
      { role: "system", content: opts.system },
      { role: "user", content: opts.prompt },
    ],
    opts.maxTokens ?? 1500,
    false
  );
}

/** Lightweight connectivity/auth test used by the settings screen. */
export async function testCredential(cred: ResolvedCredential): Promise<{ ok: boolean; detail: string }> {
  try {
    const text = await rawComplete(
      cred,
      [
        { role: "system", content: "Reply with exactly one word: OK" },
        { role: "user", content: "ping" },
      ],
      600, // reasoning models need headroom to think before answering
      false
    );
    return { ok: true, detail: text.trim().slice(0, 40) || "ok" };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message.slice(0, 200) : "unknown error" };
  }
}

/**
 * Token budgeting: pack ordered text segments into a character budget.
 * Deterministic truncation preserves segment order and head-of-segment content.
 */
export function budgetSegments(segments: { id: string; text: string }[], maxChars: number): { id: string; text: string }[] {
  const out: { id: string; text: string }[] = [];
  let used = 0;
  for (const seg of segments) {
    const remaining = maxChars - used;
    if (remaining <= 200) break;
    if (seg.text.length <= remaining) {
      out.push(seg);
      used += seg.text.length;
    } else {
      out.push({ id: seg.id, text: `${seg.text.slice(0, remaining)}…[truncated]` });
      used += remaining;
      break;
    }
  }
  return out;
}

// ---------- shared zod schemas for agent outputs ----------

export const entityExtractSchema = z.object({
  entities: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["company", "director", "ubo", "subsidiary", "related_party", "person"]),
      attributes: z.record(z.string()).default({}),
      sourceQuote: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),
  relationships: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      relation: z.string(),
      confidence: z.number().min(0).max(1),
      sourceQuote: z.string(),
    })
  ),
});

export const chatAnswerSchema = z.object({
  answer: z.string(),
  citations: z.array(
    z.object({
      ref: z.string(), // segment id from grounding pack
      quote: z.string(),
    })
  ),
  sufficientEvidence: z.boolean(),
});
