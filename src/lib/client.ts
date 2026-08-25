import type {
  ApiKeyDto,
  ChatCitationDto,
  ChatMessageDto,
  ProviderDto,
  RunDetailDto,
  RunListItem,
  WorkflowDto,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_APP_URL?.startsWith("http")
  ? undefined
  : undefined;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path.startsWith("http") ? path : `${BASE ?? ""}/api${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore parse errors
    }
    if (res.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cognifina:unauthorized"));
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const api = {
  auth: {
    me: () => request<{ user: { id: string; email: string; name: string } | null }>("/auth"),
    login: (email: string, password: string) =>
      request<{ user: { id: string; email: string; name: string } }>("/auth?action=login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, name: string, password: string) =>
      request<{ user: { id: string; email: string; name: string } }>("/auth?action=register", {
        method: "POST",
        body: JSON.stringify({ email, name, password }),
      }),
    logout: () => request<{ ok: true }>("/auth?action=logout", { method: "POST" }),
  },
  settings: {
    keys: () => request<{ keys: ApiKeyDto[]; providers: ProviderDto[] }>("/settings/keys"),
    saveKey: (provider: string, apiKey: string, baseUrl?: string, defaultModel?: string) =>
      request<{ ok: true }>("/settings/keys", {
        method: "PUT",
        body: JSON.stringify({ provider, apiKey, baseUrl: baseUrl || null, defaultModel: defaultModel || null }),
      }),
    deleteKey: (provider: string) => request<{ ok: true }>(`/settings/keys?provider=${encodeURIComponent(provider)}`, { method: "DELETE" }),
    testKey: (payload: { provider: string; apiKey?: string; baseUrl?: string; model?: string }) =>
      request<{ ok: boolean; detail: string }>("/settings/test", { method: "POST", body: JSON.stringify(payload) }),
  },
  workflows: {
    list: () => request<{ workflows: WorkflowDto[]; categories: string[] }>("/workflows"),
  },
  runs: {
    list: () => request<{ runs: RunListItem[] }>("/runs"),
    create: (form: FormData) => request<{ runId: string }>("/runs", { method: "POST", body: form }),
    get: (runId: string) => request<RunDetailDto>(`/runs/${runId}`),
    advance: (runId: string) =>
      request<{ status: string; currentStage: number; progress: number; stageLabel: string; totalStages: number }>(
        `/runs/${runId}/advance`,
        { method: "POST" }
      ),
    delete: (runId: string) => request<{ ok: true }>(`/runs/${runId}`, { method: "DELETE" }),
    chat: (runId: string, question: string) =>
      request<{ content: string; citations: ChatCitationDto[] }>(`/runs/${runId}/chat`, {
        method: "POST",
        body: JSON.stringify({ question }),
      }),
  },
  documents: {
    pageBlocks: (docId: string, pageNumber: number) =>
      request<{
        documentName: string;
        pageNumber: number;
        blocks: { id: string; seq: number; text: string; bbox: [number, number, number, number]; source: string }[];
      }>(`/documents/${docId}/pages/${pageNumber}`),
  },
};

export type { ChatMessageDto };
