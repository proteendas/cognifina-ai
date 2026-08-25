"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Binary, LayoutGrid, LogOut, Menu, PlayCircle, Settings, ShieldCheck, X } from "lucide-react";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/workflows", label: "Workflows", icon: LayoutGrid },
  { href: "/runs", label: "Runs", icon: PlayCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api.auth
      .me()
      .then((res) => setUser(res.user))
      .catch(() => router.push("/login"));
    const onUnauthorized = () => router.push("/login");
    window.addEventListener("cognifina:unauthorized", onUnauthorized);
    return () => window.removeEventListener("cognifina:unauthorized", onUnauthorized);
  }, [router]);

  const logout = async () => {
    await api.auth.logout().catch(() => undefined);
    router.push("/");
  };

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ---------------- single-row floating toolbar ---------------- */}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4">
        <header className="material-thick pointer-events-auto flex h-[54px] w-full max-w-5xl items-center gap-1 rounded-full pl-5 pr-2">
          <Link href="/workflows" className="pressable mr-auto flex items-center gap-2.5 rounded-full py-1.5 pr-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-[0_0_24px_-4px_rgba(99,102,241,0.7)]">
              <Binary size={15} strokeWidth={2.4} />
            </span>
            <span className="font-display text-[16px] font-bold tracking-[-0.02em] text-white">Cognifina</span>
          </Link>

          {/* desktop nav with animated active pill */}
          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Application">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-[13.5px] font-medium tracking-[-0.006em] transition-colors",
                    active ? "text-white" : "text-slate-300 hover:text-white"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="app-active-pill"
                      className="absolute inset-0 rounded-full bg-white/10 ring-1 ring-inset ring-white/10"
                      transition={{ type: "spring", bounce: 0, duration: 0.38 }}
                    />
                  )}
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* user + actions */}
          <div className="ml-1 flex items-center gap-1 md:ml-3">
            {user && (
              <div className="mr-1 hidden text-right leading-tight sm:block">
                <p className="text-[12.5px] font-medium text-slate-200">{user.name}</p>
                <p className="max-w-[180px] truncate text-[10.5px] text-slate-500">{user.email}</p>
              </div>
            )}
            <button
              onClick={() => void logout()}
              aria-label="Sign out"
              title="Sign out"
              className="pressable hidden h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:bg-white/8 hover:text-white sm:flex"
            >
              <LogOut size={15} />
            </button>
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="pressable flex h-9 w-9 items-center justify-center rounded-full text-slate-200 hover:bg-white/8 md:hidden"
            >
              <Menu size={18} />
            </button>
          </div>
        </header>
      </div>

      {/* clearance under floating toolbar */}
      <div className="h-[76px]" aria-hidden />

      {/* trust strip */}
      <div className="mx-auto w-full max-w-5xl px-4">
        <div className="flex items-center gap-2 rounded-xl bg-emerald-400/8 px-3.5 py-2 ring-1 ring-inset ring-emerald-400/20">
          <ShieldCheck size={14} className="shrink-0 text-emerald-300" />
          <p className="text-[11.5px] leading-tight text-emerald-100/85">
            Math before Models — deterministic engines produce every number; language models only assist.
          </p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">{children}</main>

      {/* mobile sheet */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <motion.div
              className="absolute inset-0 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              className="material-thick absolute inset-x-3 top-3 overflow-hidden rounded-3xl p-5"
              initial={{ y: "-108%", opacity: 0.7 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-108%", opacity: 0.7 }}
              transition={{ type: "spring", bounce: 0, duration: 0.42 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-white">{user?.name ?? "Account"}</p>
                  <p className="truncate text-[12px] text-slate-500">{user?.email}</p>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="pressable flex h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:bg-white/8"
                >
                  <X size={17} />
                </button>
              </div>
              <div className="space-y-1">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "pressable flex items-center gap-3 rounded-xl px-4 py-3 text-[16px] font-medium",
                      pathname.startsWith(item.href) ? "bg-white/10 text-white" : "text-slate-200 hover:bg-white/6"
                    )}
                  >
                    <item.icon size={17} />
                    {item.label}
                  </Link>
                ))}
                <Link href="/" onClick={() => setMenuOpen(false)} className="pressable flex items-center gap-3 rounded-xl px-4 py-3 text-[16px] font-medium text-slate-200 hover:bg-white/6">
                  <Binary size={17} /> Marketing site
                </Link>
                <button
                  onClick={() => void logout()}
                  className="pressable flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[16px] font-medium text-rose-300 hover:bg-rose-500/10"
                >
                  <LogOut size={17} /> Sign out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
