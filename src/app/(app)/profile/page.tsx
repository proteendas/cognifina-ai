"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  Loader2,
  LogOut,
  Save,
  ShieldAlert,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/sheet";
import { api } from "@/lib/client";

type Status = { ok: boolean; msg: string } | null;

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.auth
      .me()
      .then((res) => {
        if (!res.user) return;
        setEmail(res.user.email);
        setName(res.user.name);
      })
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return (
      <div className="flex h-40 items-center justify-center gap-2 text-[13.5px] text-ink-4">
        <Loader2 size={15} className="animate-spin" /> Loading profile…
      </div>
    );
  }

  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "·";

  return (
    <div className="mx-auto max-w-2xl">
      <p className="eyebrow">Account</p>
      <h1 className="display-md mt-1.5 text-ink">Profile</h1>
      <p className="body-sm mt-1">Manage your identity, security and workspace defaults.</p>

      {/* identity */}
      <section className="mt-7 rounded-xl border border-line bg-surface shadow-soft">
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper-2 text-[14px] font-semibold text-accent">
            {initials}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[14.5px] font-semibold text-ink">{name || "Account"}</p>
            <p className="truncate font-secondary text-[12.5px] text-ink-4">{email}</p>
          </div>
          <span className="ml-auto flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-ink-4">
            <UserRound size={12} /> Member
          </span>
        </header>
        <NameForm initialName={name} onSaved={setName} />
      </section>

      {/* password */}
      <PasswordCard />

      {/* preferences */}
      <PreferencesCard />

      {/* danger zone */}
      <DangerZone email={email} />
    </div>
  );
}

/* ------------------------------ identity ------------------------------ */

function NameForm({ initialName, onSaved }: { initialName: string; onSaved: (n: string) => void }) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const dirty = name.trim().length > 0 && name !== initialName;

  const save = async () => {
    if (!dirty) return;
    setBusy(true);
    setStatus(null);
    try {
      await api.profile.update({ name: name.trim() });
      onSaved(name.trim());
      setStatus({ ok: true, msg: "Name updated." });
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : "Failed to update" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-5">
      <Label htmlFor="profile-name">Display name</Label>
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
        <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Your name" />
        <Button onClick={() => void save()} disabled={!dirty || busy} className="sm:w-36">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
        </Button>
      </div>
      {status && (
        <p className={`mt-2 text-[12.5px] ${status.ok ? "text-success" : "text-danger"}`}>{status.msg}</p>
      )}
    </div>
  );
}

/* ------------------------------ password ------------------------------ */

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const save = async () => {
    if (next.length < 8) return setStatus({ ok: false, msg: "New password must be at least 8 characters." });
    if (next !== confirm) return setStatus({ ok: false, msg: "New passwords do not match." });
    setBusy(true);
    setStatus(null);
    try {
      await api.profile.update({ currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      setStatus({ ok: true, msg: "Password changed. Other sessions remain valid until they expire." });
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : "Failed to change password" });
    } finally {
      setBusy(false);
    }
  };

  const fields = [
    ["Current password", current, setCurrent, "••••••••"],
    ["New password", next, setNext, "Minimum 8 characters"],
    ["Confirm new password", confirm, setConfirm, "Repeat new password"],
  ] as const;

  return (
    <section className="mt-5 rounded-xl border border-line bg-surface shadow-soft">
      <header className="flex items-center gap-2 border-b border-line px-5 py-4">
        <KeyRound size={15} className="text-accent" />
        <h2 className="title-sm text-ink">Password</h2>
      </header>
      <div className="space-y-4 p-5">
        {fields.map(([label, value, setter, ph]) => (
          <div key={label}>
            <Label htmlFor={`pw-${label.slice(0, 8)}`}>{label}</Label>
            <PasswordInput
              id={`pw-${label.slice(0, 8)}`}
              value={value}
              onChange={(e) => setter(e.target.value)}
              placeholder={ph}
              autoComplete="new-password"
              className="mt-1.5"
            />
          </div>
        ))}
        {status && <p className={`text-[12.5px] ${status.ok ? "text-success" : "text-danger"}`}>{status.msg}</p>}
        <Button variant="secondary" onClick={() => void save()} disabled={!current || !next || busy}>
          {busy && <Loader2 size={14} className="animate-spin" />} Change password
        </Button>
      </div>
    </section>
  );
}

/* ----------------------------- preferences ----------------------------- */

function PreferencesCard() {
  const [landing, setLanding] = useState<string>("/dashboard");
  const [density, setDensity] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    // hydrate current preferences
    fetch("/api/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.preferences?.landingPage) setLanding(d.preferences.landingPage);
        if (typeof d?.preferences?.compactTables === "boolean") setDensity(d.preferences.compactTables);
      })
      .catch(() => undefined);
  }, []);

  const save = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await api.profile.update({ preferences: { landingPage: landing, compactTables: density } });
      setStatus({ ok: true, msg: "Preferences saved." });
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : "Failed to save preferences" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-5 rounded-xl border border-line bg-surface shadow-soft">
      <header className="flex items-center gap-2 border-b border-line px-5 py-4">
        <SlidersHorizontal size={15} className="text-accent" />
        <h2 className="title-sm text-ink">Workspace preferences</h2>
      </header>
      <div className="space-y-4 p-5">
        <div>
          <Label htmlFor="pref-landing">Default landing page</Label>
          <Select
            id="pref-landing"
            options={["/dashboard", "/workflows", "/runs"]}
            value={landing}
            onChange={setLanding}
            className="mt-1.5 sm:w-72"
          />
        </div>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={density}
            onChange={(e) => setDensity(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-line-strong accent-[#0F3D3E]"
          />
          <span>
            <span className="block text-[13.5px] font-medium text-ink">Compact tables</span>
            <span className="block font-secondary text-[12.5px] leading-relaxed text-ink-3">
              Tighter row spacing across runs and ledgers — more rows per screen.
            </span>
          </span>
        </label>
        {status && <p className={`text-[12.5px] ${status.ok ? "text-success" : "text-danger"}`}>{status.msg}</p>}
        <Button onClick={() => void save()} disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save preferences
        </Button>
      </div>
    </section>
  );
}

/* ------------------------------ danger zone ------------------------------ */

function DangerZone({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destroy = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.profile.remove(password);
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete account");
      setBusy(false);
    }
  };

  return (
    <>
      <section className="mt-5 rounded-xl border border-danger/30 bg-danger-soft/50 shadow-soft">
        <header className="flex items-center gap-2 border-b border-danger/20 px-5 py-4">
          <ShieldAlert size={15} className="text-danger" />
          <h2 className="title-sm text-danger">Danger zone</h2>
        </header>
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md font-secondary text-[13px] leading-relaxed text-ink-2">
            Permanently delete this workspace — every run, document, finding, citation and API key is erased
            immediately and cannot be recovered.
          </p>
          <Button variant="danger" onClick={() => setOpen(true)} className="shrink-0">
            Delete account
          </Button>
        </div>
      </section>

      <Dialog open={open} onClose={() => !busy && setOpen(false)} title="Delete account permanently?">
        <p className="font-secondary text-[13.5px] leading-relaxed text-ink-2">
          This removes <span className="tnum font-medium text-ink">{email}</span> and all associated data. Enter your
          password and type <code className="rounded bg-paper-2 px-1.5 py-0.5 text-[12px] font-medium text-ink">DELETE</code> to confirm.
        </p>
        <div className="mt-4 space-y-3">
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
          />
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder='Type "DELETE"' />
          {error && <p className="text-[12.5px] text-danger">{error}</p>}
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => void destroy()}
            disabled={busy || !password || confirmText !== "DELETE"}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            Delete everything
          </Button>
        </div>
      </Dialog>
    </>
  );
}
