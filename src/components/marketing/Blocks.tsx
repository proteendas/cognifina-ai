"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const spring = { type: "spring" as const, bounce: 0, duration: 0.5 };

/** Scroll-triggered reveal — critically damped, stagger-friendly. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ ...spring, delay }}
    >
      {children}
    </motion.div>
  );
}

export function PageHero({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub: string;
}) {
  return (
    <header className="mx-auto w-full max-w-6xl px-4 pb-2 pt-12 sm:px-6 sm:pt-16">
      <Reveal>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display-lg mt-3 max-w-3xl text-balance text-ink">{title}</h1>
        <p className="lede mt-4 max-w-2xl text-balance">{sub}</p>
      </Reveal>
    </header>
  );
}

export function SectionShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 ${className ?? ""}`}>
      {children}
    </section>
  );
}

export function CtaBand() {
  const reduce = useReducedMotion();
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4 sm:px-6">
      <Reveal className="relative">
        <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-accent/5 blur-2xl" aria-hidden />
        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface px-6 py-14 text-center shadow-pop">
          <div className="dot-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
          <div className="relative">
            <p className="eyebrow">Get started</p>
            <h2 className="display-md mx-auto mt-2 max-w-lg text-balance text-ink">
              Same evidence. Same verdict. Every time.
            </h2>
            <p className="body-sm mx-auto mt-3 max-w-md">
              Create a workspace, connect any provider key, and get a citation-bound forensic report.
            </p>
            <div className="mt-7 flex justify-center">
              <Link href="/register">
                <Button size="lg" className="group px-7">
                  Get started
                  <ArrowRight size={16} className="transition-transform duration-150 group-hover:translate-x-0.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/** Card grid item used across marketing pages. */
export function InfoCard({
  icon,
  title,
  children,
  chip,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  chip?: string;
}) {
  return (
    <div className="group h-full rounded-xl border border-line bg-surface p-5 shadow-soft transition-shadow duration-200 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-accent transition-colors group-hover:border-accent/30 group-hover:bg-accent-soft">
          {icon}
        </span>
        {chip && (
          <code className="tnum shrink-0 rounded-md border border-line bg-paper-2 px-2 py-1 text-[10.5px] text-ink-3">
            {chip}
          </code>
        )}
      </div>
      <h3 className="title-sm mb-1.5 mt-4 text-ink">{title}</h3>
      <div className="body-sm">{children}</div>
    </div>
  );
}
