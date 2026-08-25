"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { KeyRound, Loader2, Search, ShieldCheck, ShieldX, UserCog, UserX } from "lucide-react";
import { AdminPageHeader, EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/admin/kit";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminData } from "@/components/admin/kit";
import type { UserListRow } from "@/lib/admin/dto";
import { formatDate, timeAgo } from "@/lib/utils";

type ListResp = { rows: UserListRow[]; page: number; pageSize: number; total: number };
type ActionKind = "suspend" | "reactivate" | "revoke_sessions" | "grant_admin" | "revoke_admin";

const ACTION_META: Record<ActionKind, { title: string; body: string; cta: string; danger?: boolean; needsPassword: boolean }> = {
  suspend: { title: "Suspend this account?", body: "The user is signed out immediately and cannot sign in until reactivated.", cta: "Suspend", danger: true, needsPassword: false },
  reactivate: { title: "Reactivate this account?", body: "The user can sign in again right away.", cta: "Reactivate", needsPassword: false },
  revoke_sessions: { title: "Revoke all sessions?", body: "Every issued session token for this account becomes invalid instantly.", cta: "Revoke sessions", needsPassword: false },
  grant_admin: { title: "Grant super-admin role?", body: "This user will gain full access to the Super Admin portal. Requires your password to confirm.", cta: "Grant super admin", needsPassword: true },
  revoke_admin: { title: "Revoke super-admin role?", body: "Their admin access ends immediately and their sessions are revoked. Requires your password to confirm.", cta: "Revoke role", danger: true, needsPassword: true },
};

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <UsersInner />
    </Suspense>
  );
}

function UsersInner() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<{ kind: ActionKind; target: UserListRow } | null>(null);

  const params = new URLSearchParams({ page: String(page) });
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (role) params.set("role", role);
  const { data, error, loading, reload } = useAdminData<ListResp>(`/api/admin/users?${params.toString()}`);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Super Admin"
        title="Users"
        sub="Every registered account with live activity aggregates. Sensitive actions are audited."
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor="user-q">Search</Label>
          <div className="relative mt-1.5">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
            <Input
              id="user-q"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Name or email…"
              className="pl-9"
            />
          </div>
        </div>
        <div className="sm:w-44">
          <Label htmlFor="user-status">Status</Label>
          <Select
            id="user-status"
            options={["", "active", "suspended"]}
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            placeholder="All statuses"
            className="mt-1.5"
          />
        </div>
        <div className="sm:w-44">
          <Label htmlFor="user-role">Role</Label>
          <Select
            id="user-role"
            options={["", "USER", "SUPER_ADMIN"]}
            value={role}
            onChange={(v) => {
              setRole(v);
              setPage(1);
            }}
            placeholder="All roles"
            className="mt-1.5"
          />
        </div>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyBlock message="No accounts match these filters." />
      ) : (
        <>
          <div className="mt-5 overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[10.5px] uppercase tracking-wider text-ink-4">
                    <th className="px-4 py-3 font-medium">Account</th>
                    <th className="px-4 py-3 font-medium">Role / status</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell">Created</th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">Last activity</th>
                    <th className="px-4 py-3 text-right font-medium">Runs</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((u) => (
                    <tr key={u.id} className="border-b border-line transition-colors last:border-0 hover:bg-paper-2">
                      <td className="max-w-[240px] px-4 py-3">
                        <Link href={`/super-admin/users/${u.id}`} className="block truncate font-medium text-ink hover:text-accent">
                          {u.name}
                        </Link>
                        <span className="block truncate font-secondary text-[11.5px] text-ink-4">{u.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {u.role === "SUPER_ADMIN" && <Badge className="border-accent/30 bg-accent-soft text-accent">super admin</Badge>}
                          {u.status === "suspended" ? (
                            <Badge severity="critical">suspended</Badge>
                          ) : (
                            <Badge severity="info">active</Badge>
                          )}
                        </div>
                      </td>
                      <td className="tnum hidden whitespace-nowrap px-4 py-3 font-secondary text-[12px] text-ink-4 md:table-cell">{formatDate(u.createdAt)}</td>
                      <td className="tnum hidden whitespace-nowrap px-4 py-3 font-secondary text-[12px] text-ink-4 lg:table-cell">
                        {u.lastActivityAt ? timeAgo(u.lastActivityAt) : "never"}
                      </td>
                      <td className="tnum px-4 py-3 text-right font-medium text-ink-2">
                        {u.totalRuns}
                        <span className="text-ink-4"> / {u.completedRuns}✓</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <IconAction title="Suspend / reactivate" onClick={() => setAction({ kind: u.status === "active" ? "suspend" : "reactivate", target: u })}>
                            {u.status === "active" ? <UserX size={14} /> : <ShieldCheck size={14} />}
                          </IconAction>
                          <IconAction title="Revoke all sessions" onClick={() => setAction({ kind: "revoke_sessions", target: u })}>
                            <ShieldX size={14} />
                          </IconAction>
                          <IconAction title={u.role === "SUPER_ADMIN" ? "Revoke super admin" : "Grant super admin"} onClick={() => setAction({ kind: u.role === "SUPER_ADMIN" ? "revoke_admin" : "grant_admin", target: u })}>
                            <UserCog size={14} />
                          </IconAction>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* pagination */}
          <div className="mt-4 flex items-center justify-between text-[13px] text-ink-3">
            <span className="tnum">
              {data.total} account{data.total === 1 ? "" : "s"} · page {data.page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <ActionDialog action={action} onClose={() => setAction(null)} onDone={() => { setAction(null); reload(); }} />
    </div>
  );
}

function IconAction({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="pressable flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-3 hover:border-accent/40 hover:bg-accent-soft hover:text-accent"
    >
      {children}
    </button>
  );
}

function ActionDialog({
  action,
  onClose,
  onDone,
}: {
  action: { kind: ActionKind; target: UserListRow } | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!action) return null;
  const meta = ACTION_META[action.kind];

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: action.kind, userId: action.target.id, password: password || undefined }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? `Failed (${res.status})`);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={meta.title}>
      <p className="font-secondary text-[13.5px] leading-relaxed text-ink-2">
        {meta.body} Target: <span className="font-medium text-ink">{action.target.email}</span>.
      </p>
      {meta.needsPassword && (
        <div className="mt-4">
          <Label htmlFor="admin-reauth">Your password (re-authentication)</Label>
          <PasswordInput id="admin-reauth" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Confirm your admin password" autoComplete="current-password" className="mt-1.5" />
        </div>
      )}
      {error && <p className="mt-3 font-secondary text-[12.5px] text-danger">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant={meta.danger ? "danger" : "primary"} onClick={() => void run()} disabled={busy || (meta.needsPassword && !password)}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
          {meta.cta}
        </Button>
      </div>
    </Dialog>
  );
}
