"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Binary, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/engines", label: "Engines" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/security", label: "Security" },
  { href: "/pricing", label: "Pricing" },
];

/**
 * Floating translucent toolbar. Content scrolls beneath it; the active link
 * carries an interruptible layout-animated pill (spring, bounce 0).
 */
export function MarketingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4 sm:top-4">
        <nav
          aria-label="Primary"
          className="material-thick pointer-events-auto flex h-[54px] w-full max-w-4xl items-center gap-1 rounded-full pl-5 pr-2"
        >
          {/* wordmark */}
          <Link href="/" className="pressable mr-auto flex items-center gap-2.5 rounded-full py-1.5 pr-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-[0_0_24px_-4px_rgba(99,102,241,0.7)]">
              <Binary size={15} strokeWidth={2.4} />
            </span>
            <span className="font-display text-[17px] font-bold tracking-[-0.02em] text-white">Cognifina</span>
          </Link>

          {/* desktop links */}
          <div className="hidden items-center gap-0.5 md:flex">
            {LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-[13.5px] font-medium tracking-[-0.006em] transition-colors",
                    active ? "text-white" : "text-slate-300 hover:text-white"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-full bg-white/10 ring-1 ring-inset ring-white/10"
                      transition={{ type: "spring", bounce: 0, duration: 0.38 }}
                    />
                  )}
                  <span className="relative">{l.label}</span>
                </Link>
              );
            })}
          </div>

          {/* actions */}
          <div className="ml-1 flex items-center gap-1.5 md:ml-3">
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="rounded-full">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="rounded-full">Get started</Button>
            </Link>
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="pressable ml-0.5 flex h-9 w-9 items-center justify-center rounded-full text-slate-200 hover:bg-white/8 md:hidden"
            >
              <Menu size={18} />
            </button>
          </div>
        </nav>
      </div>

      {/* mobile menu sheet */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <motion.div
              className="absolute inset-0 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="material-thick absolute inset-x-3 top-3 overflow-hidden rounded-3xl p-5"
              initial={{ y: "-108%", opacity: 0.7 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-108%", opacity: 0.7 }}
              transition={{ type: "spring", bounce: 0, duration: 0.42 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-display text-[16px] font-bold text-white">Cognifina</span>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="pressable flex h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:bg-white/8"
                >
                  <X size={17} />
                </button>
              </div>
              <div className="space-y-1">
                {[{ href: "/", label: "Home" }, ...LINKS].map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "pressable block rounded-xl px-4 py-3 text-[16px] font-medium",
                      pathname === l.href ? "bg-white/10 text-white" : "text-slate-200 hover:bg-white/6"
                    )}
                  >
                    {l.label}
                  </Link>
                ))}
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="pressable block rounded-xl px-4 py-3 text-[16px] font-medium text-slate-200 hover:bg-white/6"
                >
                  Sign in
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export function MarketingFooter() {
  return (
    <footer className="mt-auto border-t border-white/6">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-white">
              <Binary size={13} />
            </span>
            <span className="font-display text-[15px] font-bold tracking-tight text-white">Cognifina</span>
          </div>
          <p className="body-sm mt-3 max-w-xs">
            Deterministic forensic &amp; compliance AI. Same evidence, same verdict — every time.
          </p>
        </div>
        <FooterCol
          title="Product"
          links={[
            ["Features", "/features"],
            ["Forensic engines", "/engines"],
            ["Agent pipeline", "/pipeline"],
            ["Workflows", "/workflows"],
          ]}
        />
        <FooterCol
          title="Trust"
          links={[
            ["Security & BYOK", "/security"],
            ["Reproducibility", "/features#deterministic"],
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            ["Pricing", "/pricing"],
            ["Sign in", "/login"],
            ["Create workspace", "/register"],
          ]}
        />
      </div>
      <div className="border-t border-white/5">
        <div className="tnum mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 text-[11.5px] text-slate-500">
          <span>© {new Date().getFullYear()} Cognifina</span>
          <span>Math before Models.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="eyebrow mb-3">{title}</h3>
      <ul className="space-y-2">
        {links.map(([label, href]) => (
          <li key={href + label}>
            <Link href={href} className="pressable inline-block rounded text-[13.5px] text-slate-400 hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
