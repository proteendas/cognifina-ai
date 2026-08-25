export type ProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "deepseek"
  | "mistral"
  | "ollama";

export type ProviderSpec = {
  id: ProviderId;
  label: string;
  api: "openai-compatible" | "anthropic" | "google";
  defaultBaseUrl?: string;
  envKey?: string;
  /** Intentionally empty — model lists are fetched live from the provider with the user's key. */
  models: { id: string; label: string }[];
  docsUrl: string;
};

export const PROVIDERS: Record<ProviderId, ProviderSpec> = {
  openai: {
    id: "openai",
    label: "OpenAI",
    api: "openai-compatible",
    defaultBaseUrl: "https://api.openai.com/v1",
    envKey: "OPENAI_API_KEY",
    models: [],
    docsUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic Claude",
    api: "anthropic",
    envKey: "ANTHROPIC_API_KEY",
    models: [],
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  google: {
    id: "google",
    label: "Google Gemini",
    api: "google",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    models: [],
    docsUrl: "https://aistudio.google.com/app/apikey",
  },
  groq: {
    id: "groq",
    label: "Groq",
    api: "openai-compatible",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    envKey: "GROQ_API_KEY",
    models: [],
    docsUrl: "https://console.groq.com/keys",
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    api: "openai-compatible",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    envKey: "DEEPSEEK_API_KEY",
    models: [],
    docsUrl: "https://platform.deepseek.com/api_keys",
  },
  mistral: {
    id: "mistral",
    label: "Mistral",
    api: "openai-compatible",
    defaultBaseUrl: "https://api.mistral.ai/v1",
    envKey: "MISTRAL_API_KEY",
    models: [],
    docsUrl: "https://console.mistral.ai/api-keys",
  },
  ollama: {
    id: "ollama",
    label: "Ollama (local)",
    api: "openai-compatible",
    defaultBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
    models: [],
    docsUrl: "https://ollama.com",
  },
};

export const PROVIDER_LIST = Object.values(PROVIDERS);

/** Deterministic fallback chain when the user's primary provider fails. */
export function fallbackChain(primary: ProviderId): ProviderId[] {
  const order: ProviderId[] = [primary];
  for (const p of ["openai", "anthropic", "google", "groq", "deepseek", "mistral"] as ProviderId[]) {
    if (!order.includes(p)) order.push(p);
  }
  return order;
}
