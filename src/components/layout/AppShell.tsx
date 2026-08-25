"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Mail,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PlayCircle,
  Settings,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { LogoMark, Wordmark } from "@/components/layout/Logo";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { SUPPORT_EMAIL } from "@/components/marketing/MarketingChrome";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workflows", label: "Workflows", icon: LayoutGrid },
  { href: "/runs", label: "Runs", icon: PlayCircle },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

type SessionUser = { name: string; email: string };

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("cognifina-sidebar") === "collapsed");
    api.auth
      .me()
      .then((res) => setUser(res.user))
      .catch(() => router.push("/login"));
    const onUnauthorized = () => router.push("/login");
    window.addEventListener("cognifina:unauthorized", onUnauthorized);
    return () => window.removeEventListener("cognifina:unauthorized", onUnauthorized);
  }, [router]);

  // close the mobile drawer on navigation
  useEffect(() => setMobileOpen(false), [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      window.localStorage.setItem("cognifina-sidebar", c ? "expanded" : "collapsed");
      return !c;
    });
  };

  const logout = async () => {
    await api.auth.logout().catch(() => undefined);
    router.push("/");
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const initials = (user?.name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "·";

  /* ------------------------- shared nav renderer ------------------------- */
  const NavLinks = ({ compact, onNavigate }: { compact?: boolean; onNavigate?: () => void }) => (
    <nav aria-label="Application" className="flex flex-col gap-0.5 px-2">
      {NAV.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={compact ? item.label : undefined}
            className={cn(
              "pressable flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
              compact ? "h-10 justify-center px-0" : "px-3 py-2.5",
              active ? "bg-accent-soft text-accent" : "text-ink-3 hover:bg-paper-2 hover:text-ink"
            )}
          >
            <item.icon size={17} className="shrink-0" />
            {!compact && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-dvh">
      {/* ------------------------- desktop sidebar ------------------------- */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 ease-out md:flex",
          collapsed ? "w-[68px]" : "w-60"
        )}
      >
        {/* brand + collapse toggle */}
        <div className={cn("flex h-16 items-center gap-2.5 border-b border-line", collapsed ? "justify-center px-2" : "pl-4 pr-2")}>
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <LogoMark />
            {!collapsed && <Wordmark />}
          </Link>
          {!collapsed && (
            <button
              onClick={toggleCollapsed}
              aria-label="Collapse menu"
              className="pressable ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-ink-4 hover:bg-paper-2 hover:text-ink"
            >
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={toggleCollapsed}
            aria-label="Expand menu"
            className="pressable mx-auto mt-3 flex h-9 w-9 items-center justify-center rounded-lg text-ink-4 hover:bg-paper-2 hover:text-ink"
          >
            <PanelLeftOpen size={17} />
          </button>
        )}

        <div className={cn("min-h-0 flex-1 overflow-y-auto", collapsed ? "pt-3" : "pt-4")}>
          <NavLinks compact={collapsed} />
        </div>

        {/* account block */}
        <div className={cn("border-t border-line", collapsed ? "px-2 py-3" : "p-3")}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-1.5">
              <NotificationBell />
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper-2 text-[11px] font-semibold text-ink-2">
                {initials}
              </span>
              <button
                onClick={() => void logout()}
                aria-label="Sign out"
                title="Sign out"
                className="pressable flex h-9 w-9 items-center justify-center rounded-lg text-ink-4 hover:bg-danger-soft hover:text-danger"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5 rounded-lg px-1 py-1.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-paper-2 text-[11px] font-semibold text-ink-2">
                  {initials}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-[13px] font-medium text-ink">{user?.name ?? "Account"}</p>
                  <p className="truncate text-[11px] text-ink-4">{user?.email ?? "\u00A0"}</p>
                </div>
                <NotificationBell />
              </div>
              <button
                onClick={() => void logout()}
                className="pressable mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-3 hover:bg-danger-soft hover:text-danger"
              >
                <LogOut size={15} /> Sign out
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ------------------------- main column ------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* mobile topbar */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur-md md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="pressable -ml-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2"
          >
            <Menu size={19} />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <LogoMark />
            <Wordmark />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>

        <footer className="border-t border-line">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3.5 text-[11px] text-ink-4 sm:px-6">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-success" />
              Statistics lead. Models follow — deterministic engines produce every number.
            </span>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="tnum inline-flex items-center gap-1 hover:text-accent">
              <Mail size={11} /> {SUPPORT_EMAIL}
            </a>
          </div>
        </footer>
      </div>

      {/* ------------------------- mobile drawer ------------------------- */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <motion.div
              className="absolute inset-0 bg-[#1a1d1f]/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-line bg-surface shadow-pop"
              initial={{ x: "-104%" }}
              animate={{ x: 0 }}
              exit={{ x: "-104%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.42 }}
            >
              <div className="flex h-14 items-center justify-between border-b border-line pl-4 pr-2">
                <div className="flex items-center gap-2.5">
                  <LogoMark />
                  <Wordmark />
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="pressable flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 hover:bg-paper-2"
                >
                  <X size={17} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pt-3 pb-4">
                <NavLinks onNavigate={() => setMobileOpen(false)} />
                <div className="mt-4 border-t border-line px-2 pt-3">
                  <div className="flex items-center gap-2.5 px-1.5 py-1.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-paper-2 text-[11px] font-semibold text-ink-2">
                      {initials}
                    </span>
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-[13px] font-medium text-ink">{user?.name ?? "Account"}</p>
                      <p className="truncate text-[11px] text-ink-4">{user?.email}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-line p-3">
                <button
                  onClick={() => void logout()}
                  className="pressable flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-danger hover:bg-danger-soft"
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
