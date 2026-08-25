"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { LogoMark, Wordmark } from "@/components/layout/Logo";
import { SUPPORT_EMAIL } from "@/components/marketing/MarketingChrome";
import { api } from "@/lib/client";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "register") await api.auth.register(email, name, password);
      else await api.auth.login(email, password);

      let target = params.get("next");
      if (!target) {
        // honour the saved "default landing page" preference
        try {
          const prefs = await fetch("/api/profile", { credentials: "include" }).then((r) => r.json());
          target = typeof prefs?.preferences?.landingPage === "string" ? prefs.preferences.landingPage : "/dashboard";
        } catch {
          target = "/dashboard";
        }
      }
      router.push(target || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      <div className="dot-grid pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60" aria-hidden />
      <div className="glow pointer-events-none absolute inset-x-0 top-0 h-72" aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0, duration: 0.45 }}
        className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-pop"
      >
        <Link href="/" className="mb-7 flex items-center justify-center gap-2.5">
          <LogoMark />
          <Wordmark className="text-[16px]" />
        </Link>

        <h1 className="text-center text-[22px] font-bold tracking-tight text-ink">
          {mode === "login" ? "Welcome back" : "Create your workspace"}
        </h1>
        <p className="mt-1.5 text-center font-secondary text-[13px] leading-relaxed text-ink-3">
          {mode === "login" ? "Sign in to your forensic workspace." : "Free to start. Bring your own model keys."}
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === "register" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ada Lovelace" autoComplete="name" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@firm.com" autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder={mode === "register" ? "Minimum 8 characters" : "••••••••"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {error && <p className="rounded-lg bg-danger-soft px-3 py-2 font-secondary text-[13px] text-danger">{error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy && <Loader2 size={15} className="animate-spin" />}
            {mode === "login" ? "Sign in" : "Create workspace"}
          </Button>
        </form>

        <p className="mt-6 text-center font-secondary text-[13px] text-ink-3">
          {mode === "login" ? (
            <>
              New here?{" "}
              <Link href="/register" className="font-medium text-accent hover:underline">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have a workspace?{" "}
              <Link href="/login" className="font-medium text-accent hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>

        <p className="mt-4 flex items-center justify-center gap-1.5 border-t border-line pt-4 text-[11.5px] text-ink-4">
          <Mail size={11} />
          Need help?{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium hover:text-accent">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </motion.div>
    </div>
  );
}
