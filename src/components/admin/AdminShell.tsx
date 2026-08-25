"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  ChevronRight,
  Flag,
  Gauge,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  ScrollText,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { LogoMark } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/super-admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/super-admin/users", label: "Users", icon: Users },
  { href: "/super-admin/analytics", label: "Product analytics", icon: TrendingUp },
  { href: "/super-admin/retention", label: "Retention & churn", icon: Activity },
  { href: "/super-admin/features", label: "Feature analytics", icon: Gauge },
  { href: "/super-admin/recommendations", label: "Recommendations", icon: Lightbulb },
  { href: "/super-admin/flags", label: "Feature flags", icon: Flag },
  { href: "/super-admin/system", label: "System health", icon: Activity },
  { href: "/super-admin/audit", label: "Audit logs", icon: ScrollText },
];

export type AdminUser = { name: string; email: string; role: string };

export function AdminShell({ user, children }: { user: AdminUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => setMobileOpen(false), [pathname]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const crumbs = buildCrumbs(pathname);

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav aria-label="Admin" className="flex flex-col gap-0.5 px-2">
      {NAV.map((item) => {
        const active = isActive(item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "pressable flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-accent-soft text-accent" : "text-ink-3 hover:bg-paper-2 hover:text-ink"
            )}
          >
            <item.icon size={16} className="shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-dvh">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-line pl-4 pr-2">
          <LogoMark />
          <div className="leading-tight">
            <p className="text-[13.5px] font-semibold tracking-tight text-ink">Cognifina</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">Super Admin</p>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-4 pt-3">
          <NavLinks />
        </div>
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-1 py-1.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-paper-2 text-[11px] font-semibold text-accent">
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[13px] font-medium text-ink">{user.name}</p>
              <p className="truncate text-[11px] text-ink-4">{user.email}</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="pressable mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-3 hover:bg-paper-2 hover:text-ink"
          >
            <Gauge size={15} /> Back to app
          </Link>
          <form action="/api/auth?action=logout" method="post">
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/auth?action=logout", { method: "POST", credentials: "include" });
                window.location.href = "/";
              }}
              className="pressable flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-3 hover:bg-danger-soft hover:text-danger"
            >
              <LogOut size={15} /> Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open admin menu"
              className="pressable -ml-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 md:hidden"
            >
              <Menu size={19} />
            </button>
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[12.5px]">
              {crumbs.map((c, i) => (
                <span key={c.href} className="flex min-w-0 items-center gap-1.5">
                  {i > 0 && <ChevronRight size={12} className="shrink-0 text-ink-4" />}
                  {i === crumbs.length - 1 ? (
                    <span className="truncate font-medium text-ink">{c.label}</span>
                  ) : (
                    <Link href={c.href} className="shrink-0 text-ink-4 hover:text-accent">
                      {c.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>
            <span className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-md bg-accent-soft px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-accent sm:flex">
              {user.role}
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <div className="absolute inset-0 bg-[#1a1d1f]/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-line bg-surface shadow-pop">
            <div className="flex h-14 items-center justify-between border-b border-line pl-4 pr-2">
              <div className="flex items-center gap-2.5">
                <LogoMark />
                <div className="leading-tight">
                  <p className="text-[13.5px] font-semibold tracking-tight text-ink">Cognifina</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">Super Admin</p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="pressable flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 hover:bg-paper-2"
              >
                <X size={17} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto py-3">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="border-t border-line p-3">
              <Link href="/dashboard" className="pressable flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-3 hover:bg-paper-2">
                <Gauge size={15} /> Back to app
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildCrumbs(pathname: string): { href: string; label: string }[] {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: { href: string; label: string }[] = [{ href: "/super-admin", label: "Super Admin" }];
  let acc = "";
  for (const part of parts.slice(1)) {
    acc += `/${part}`;
    const nav = NAV.find((n) => n.href === `/super-admin${acc}`);
    crumbs.push({
      href: `/super-admin${acc}`,
      label: nav?.label ?? (part.length > 20 ? `${part.slice(0, 8)}…` : part),
    });
  }
  return crumbs;
}
