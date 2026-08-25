"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, KeyRound, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { api } from "@/lib/client";
import type { ApiKeyDto, ProviderDto } from "@/lib/types";

export default function SettingsPage() {
  const [keys, setKeys] = useState<ApiKeyDto[]>([]);
  const [providers, setProviders] = useState<ProviderDto[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = () =>
    api.settings
      .keys()
      .then((res) => {
        setKeys(res.keys);
        setProviders(res.providers);
      })
      .finally(() => setLoaded(true));

  useEffect(() => {
    void reload();
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="display text-2xl font-bold tracking-tight text-white">Model providers</h1>
      <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-slate-400">
        Bring your own keys. They are encrypted with AES-256-GCM before storage and used only for your runs. The
        deterministic math engines never require a model key.
      </p>

      {!loaded ? (
        <div className="mt-8 flex items-center gap-2 text-slate-400">
          <Loader2 size={15} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="mt-7 space-y-4">
          {providers.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              saved={keys.find((k) => k.provider === p.id) ?? null}
              onSaved={() => void reload()}
              onDeleted={() => void reload()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProviderCard({
  provider,
  saved,
  onSaved,
  onDeleted,
}: {
  provider: ProviderDto;
  saved: ApiKeyDto | null;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(saved?.defaultModel || provider.models[0] || "");
  const [baseUrl, setBaseUrl] = useState(saved?.baseUrl || "");
  const [busy, setBusy] = useState<"save" | "test" | "delete" | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(
    saved?.status === "verified" ? { ok: true, msg: `verified ${saved.hint}` } : null
  );

  const save = async (testFirst: boolean) => {
    if (!apiKey && !saved) return;
    setBusy(testFirst ? "test" : "save");
    setStatus(null);
    try {
      if (testFirst) {
        const res = await api.settings.testKey({ provider: provider.id, apiKey: apiKey || undefined, baseUrl: baseUrl || undefined, model });
        if (!res.ok) {
          setStatus({ ok: false, msg: res.detail });
          return;
        }
        setStatus({ ok: true, msg: `test passed · ${res.detail}` });
      }
      await api.settings.saveKey(provider.id, apiKey, baseUrl || undefined, model);
      setApiKey("");
      onSaved();
      if (!testFirst) setStatus({ ok: true, msg: "key stored" });
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    try {
      await api.settings.deleteKey(provider.id);
      setBaseUrl("");
      setModel(provider.models[0] || "");
      setStatus(null);
      onDeleted();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="material rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/12 text-indigo-300">
            <KeyRound size={16} />
          </span>
          <div>
            <h2 className="text-[14.5px] font-semibold tracking-tight text-white">{provider.label}</h2>
            {saved ? (
              <p className="tnum text-[11.5px] text-slate-500">stored {saved.hint}</p>
            ) : (
              <a href={provider.docsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11.5px] text-slate-500 hover:text-indigo-300">
                get a key <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
        {status && (
          <span className={`flex items-center gap-1.5 text-[12px] ${status.ok ? "text-emerald-300" : "text-rose-300"}`}>
            {status.ok && <CheckCircle2 size={13} />}
            {status.msg}
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_170px_150px]">
        <div className="space-y-1">
          <Label htmlFor={`${provider.id}-key`}>API key</Label>
          <Input
            id={`${provider.id}-key`}
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={saved ? "•••••••• (stored — paste to replace)" : "Paste key…"}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${provider.id}-model`}>Default model</Label>
          {provider.models.length > 0 ? (
            <Select id={`${provider.id}-model`} value={model} onChange={(e) => setModel(e.target.value)}>
              {[...new Set([...provider.models, ...(model && !provider.models.includes(model) ? [model] : [])])].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          ) : (
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="model id" />
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${provider.id}-base`}>Base URL <span className="text-slate-500">(optional)</span></Label>
          <Input
            id={`${provider.id}-base`}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://…/v1"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => void save(true)} disabled={busy != null || (!apiKey && !saved)}>
          {busy === "test" && <Loader2 size={13} className="animate-spin" />}
          Test &amp; save
        </Button>
        <Button variant="secondary" size="sm" onClick={() => void save(false)} disabled={busy != null || !apiKey}>
          {busy === "save" && <Loader2 size={13} className="animate-spin" />}
          Save without test
        </Button>
        {saved && (
          <Button variant="ghost" size="sm" onClick={() => void remove()} disabled={busy != null} className="ml-auto text-slate-400 hover:text-rose-300">
            <Trash2 size={13} /> Remove
          </Button>
        )}
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
        <ShieldCheck size={12} className="mt-0.5 shrink-0 text-emerald-300/70" />
        Keys never appear in logs or client responses; only a masked hint is ever displayed.
      </p>
    </div>
  );
}
