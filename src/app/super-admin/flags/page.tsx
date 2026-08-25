"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { AdminPageHeader, ErrorBlock, LoadingBlock, useAdminData } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { cn, formatDate } from "@/lib/utils";

type FlagRow = { key: string; label: string; description: string; enabled: boolean; updatedAt: string };

export default function AdminFlagsPage() {
  const { data, error, loading, reload } = useAdminData<{ flags: FlagRow[] }>("/api/admin/flags");
  const [pending, setPending] = useState<{ flag: FlagRow; enabled: boolean } | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [flagError, setFlagError] = useState<string | null>(null);

  const toggle = async () => {
    if (!pending) return;
    setBusy(true);
    setFlagError(null);
    try {
      const res = await fetch("/api/admin/flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key: pending.flag.key, enabled: pending.enabled, password }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? `Failed (${res.status})`);
      setPending(null);
      setPassword("");
      reload();
    } catch (e) {
      setFlagError(e instanceof Error ? e.message : "Failed to toggle flag");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        eyebrow="Super Admin"
        title="Feature flags"
        sub="Server-side flags with real consumers in the product. Toggling requires password re-authentication and is audited."
      />

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : !data ? null : (
        <div className="mt-6 space-y-3">
          {data.flags.map((f) => (
            <div key={f.key} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", f.enabled ? "bg-success-soft text-success" : "bg-paper-2 text-ink-4")}>
                  <Flag size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-ink">
                    {f.label} <code className="ml-1.5 rounded bg-paper-2 px-1.5 py-0.5 font-mono text-[10.5px] font-normal text-ink-3">{f.key}</code>
                  </p>
                  <p className="mt-0.5 font-secondary text-[12.5px] leading-relaxed text-ink-3">{f.description}</p>
                  <p className="tnum mt-1 text-[11px] text-ink-4">updated {formatDate(f.updatedAt)}</p>
                </div>
              </div>
              <button
                role="switch"
                aria-checked={f.enabled}
                aria-label={`Toggle ${f.key}`}
                onClick={() => {
                  setFlagError(null);
                  setPending({ flag: f, enabled: !f.enabled });
                }}
                className={cn(
                  "pressable relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  f.enabled ? "bg-accent" : "bg-line-strong"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition-[left] duration-200",
                    f.enabled ? "left-[22px]" : "left-0.5"
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1a1d1f]/40" onClick={() => !busy && setPending(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-pop">
            <h2 className="text-lg font-bold tracking-tight text-ink">Confirm flag change</h2>
            <p className="mt-2 font-secondary text-[13.5px] leading-relaxed text-ink-2">
              Set <code className="rounded bg-paper-2 px-1.5 py-0.5 font-mono text-[12px] text-ink">{pending.flag.key}</code> to{" "}
              <span className={pending.enabled ? "font-semibold text-success" : "font-semibold text-danger"}>{pending.enabled ? "ENABLED" : "DISABLED"}</span>? The change applies app-wide immediately.
            </p>
            <div className="mt-4">
              <Label htmlFor="flag-reauth">Your password</Label>
              <PasswordInput id="flag-reauth" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Confirm your admin password" autoComplete="current-password" className="mt-1.5" />
            </div>
            {flagError && <p className="mt-3 font-secondary text-[12.5px] text-danger">{flagError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPending(null)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={() => void toggle()} disabled={busy || !password}>
                {busy && <Loader2 size={14} className="animate-spin" />} Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
