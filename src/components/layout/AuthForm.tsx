"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Binary, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { api } from "@/lib/client";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/workflows";
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
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0, duration: 0.45 }}
        className="material-thick w-full max-w-sm rounded-3xl p-8"
      >
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-glow-accent">
            <Binary size={17} />
          </span>
          <span className="display text-xl font-bold tracking-tight text-white">Cognifina</span>
        </Link>

        <h1 className="display text-center text-[22px] font-bold tracking-tight text-white">
          {mode === "login" ? "Welcome back" : "Create your workspace"}
        </h1>
        <p className="mt-1.5 text-center text-[13px] text-slate-400">
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
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder={mode === "register" ? "Minimum 8 characters" : "••••••••"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-[13px] text-rose-300">{error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy && <Loader2 size={15} className="animate-spin" />}
            {mode === "login" ? "Sign in" : "Create workspace"}
          </Button>
        </form>

        <p className="mt-6 text-center text-[13px] text-slate-400">
          {mode === "login" ? (
            <>
              New here?{" "}
              <Link href="/register" className="font-medium text-indigo-300 hover:text-indigo-200">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have a workspace?{" "}
              <Link href="/login" className="font-medium text-indigo-300 hover:text-indigo-200">
                Sign in
              </Link>
            </>
          )}
        </p>
      </motion.div>
    </div>
  );
}
