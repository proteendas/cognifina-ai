"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertTriangle, Inbox, Loader2, ShieldQuestion, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------ data hooks ------------------------------ */

export function useAdminData<T>(path: string | null): {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setLoading(true);
    fetch(path, { credentials: "include" })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status})`);
        return json as T;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setError(null);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}

export function useRange(): { days: string; setDays: (d: string) => void } {
  const router = useRouter();
  const params = useSearchParams();
  const days = params.get("days") ?? "30";
  const setDays = (d: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("days", d);
    router.replace(`?${next.toString()}`);
  };
  return { days, setDays };
}

export function RangePicker() {
  const { days, setDays } = useRange();
  return (
    <div role="group" aria-label="Date range" className="flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 shadow-soft">
      {["7", "14", "30", "90"].map((d) => (
        <button
          key={d}
          onClick={() => setDays(d)}
          className={cn(
            "pressable rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors",
            days === d ? "bg-accent-soft text-accent" : "text-ink-3 hover:bg-paper-2 hover:text-ink"
          )}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ page header ------------------------------ */

export function AdminPageHeader({
  eyebrow,
  title,
  sub,
  actions,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display-md mt-1.5 text-ink">{title}</h1>
        {sub && <p className="body-sm mt-1 max-w-2xl">{sub}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------ states ------------------------------ */

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex h-40 items-center justify-center gap-2 text-[13.5px] text-ink-4" role="status" aria-live="polite">
      <Loader2 size={15} className="animate-spin" /> {label}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-danger/25 bg-danger-soft/50 text-center">
      <AlertTriangle size={18} className="text-danger" />
      <p className="max-w-sm font-secondary text-[13px] text-danger">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="pressable rounded-lg border border-danger/30 bg-surface px-3 py-1.5 text-[12.5px] font-medium text-danger">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
      <Inbox size={18} className="text-ink-4" />
      <p className="font-secondary text-[13px] text-ink-4">{message}</p>
    </div>
  );
}

/* ------------------------------ stat card ------------------------------ */

export function StatCard({
  label,
  value,
  previous,
  changePct,
  formula,
  href,
  unavailableReason,
}: {
  label: string;
  value: number | string | null;
  previous?: number | string | null;
  changePct?: number | null;
  formula: string;
  href?: string;
  unavailableReason?: string;
}) {
  const body = unavailableReason ? (
    <div className="rounded-xl border border-dashed border-line-strong bg-paper-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium uppercase tracking-wider text-ink-4">{label}</p>
        <ShieldQuestion size={13} className="shrink-0 text-ink-4" />
      </div>
      <p className="mt-2 text-[15px] font-semibold text-ink-4">Unavailable</p>
      <p className="mt-1 font-secondary text-[11.5px] leading-relaxed text-ink-4" title={unavailableReason}>
        {unavailableReason}
      </p>
    </div>
  ) : (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-soft transition-shadow hover:shadow-lift" title={formula}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium uppercase tracking-wider text-ink-4">{label}</p>
        {changePct != null && (
          <span
            className={cn(
              "tnum flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
              changePct > 0 ? "bg-success-soft text-success" : changePct < 0 ? "bg-danger-soft text-danger" : "bg-paper-2 text-ink-4"
            )}
          >
            {changePct > 0 ? <TrendingUp size={11} /> : changePct < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
            {Math.abs(changePct).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="tnum mt-2 text-[24px] font-bold leading-none tracking-tight text-ink">{value ?? "—"}</p>
      {previous != null && (
        <p className="tnum mt-1.5 font-secondary text-[11px] text-ink-4">prev: {previous}</p>
      )}
    </div>
  );

  if (href && !unavailableReason) {
    return (
      <Link href={href} className="block">
        {body}
      </Link>
    );
  }
  return body;
}
