"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

export const SUPPORT_EMAIL = "prot.das15@gmail.com";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/engines", label: "Engines" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/security", label: "Security" },
  { href: "/pricing", label: "Pricing" },
];

/**
 * Sticky topbar — content scrolls beneath a hairline; the active link carries
 * an interruptible layout-animated pill (spring, bounce 0).
 */
export function MarketingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Logo className="mr-auto" />

          {/* desktop links */}
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "text-ink" : "text-ink-3 hover:text-ink"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-lg border border-line bg-surface shadow-soft"
                      transition={{ type: "spring", bounce: 0, duration: 0.38 }}
                    />
                  )}
                  <span className="relative">{l.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* actions */}
          <div className="ml-1 flex items-center gap-1.5 md:ml-3">
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get started</Button>
            </Link>
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="pressable flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 md:hidden"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* mobile menu sheet */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <motion.div
              className="absolute inset-0 bg-[#1a1d1f]/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="absolute inset-x-3 top-3 overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-pop"
              initial={{ y: "-108%", opacity: 0.7 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-108%", opacity: 0.7 }}
              transition={{ type: "spring", bounce: 0, duration: 0.42 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <Logo />
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="pressable flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 hover:bg-paper-2"
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
                      "pressable block rounded-lg px-4 py-3 text-[15px] font-medium transition-colors",
                      pathname === l.href ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-paper-2 hover:text-ink"
                    )}
                  >
                    {l.label}
                  </Link>
                ))}
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="pressable block rounded-lg px-4 py-3 text-[15px] font-medium text-ink-2 hover:bg-paper-2 hover:text-ink"
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
    <footer className="mt-auto border-t border-line bg-paper-2">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="body-sm mt-3 max-w-xs">
            Deterministic forensic &amp; compliance AI. Same evidence, same verdict — every time.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="pressable mt-4 inline-flex items-center gap-1.5 rounded-lg text-[13px] font-medium text-ink-3 transition-colors hover:text-accent"
          >
            <Mail size={13} /> {SUPPORT_EMAIL}
          </a>
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
      <div className="border-t border-line">
        <div className="tnum mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-[11px] text-ink-4 sm:px-6">
          <span>© {new Date().getFullYear()} Cognifina</span>
          <span>Statistics lead. Models follow.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">{title}</h3>
      <ul className="space-y-2">
        {links.map(([label, href]) => (
          <li key={href + label}>
            <Link href={href} className="rounded text-[13.5px] text-ink-3 transition-colors hover:text-accent">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
