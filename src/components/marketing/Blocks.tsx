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
      initial={reduce ? false : { opacity: 0, y: 18 }}
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
    <header className="mx-auto w-full max-w-6xl px-5 pt-6 sm:pt-10">
      <Reveal>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display-lg mt-3 max-w-3xl text-balance text-white">{title}</h1>
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
    <section className={`mx-auto w-full max-w-6xl px-5 py-16 sm:py-20 ${className ?? ""}`}>
      {children}
    </section>
  );
}

export function CtaBand() {
  const reduce = useReducedMotion();
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-24 pt-4">
      <Reveal className="relative">
        <div className="material-thick relative overflow-hidden rounded-[28px] px-8 py-14 text-center">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/25 blur-3xl" />
          <h2 className="display-md relative mx-auto max-w-lg text-balance text-white sm:text-[28px]">
            Same evidence. Same verdict. Every time.
          </h2>
          <p className="body-sm relative mx-auto mt-2.5 max-w-md">
            Create a workspace, connect any provider key, and get a citation-bound forensic report.
          </p>
          <div className="relative mt-7 flex justify-center">
            <Link href="/register">
              <Button size="lg" className="group rounded-full px-7">
                Get started
                <ArrowRight size={16} className="transition-transform duration-150 group-hover:translate-x-0.5" />
              </Button>
            </Link>
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
    <div className="material group rounded-[20px] p-6 transition-colors duration-200 hover:border-indigo-400/30">
      <div className="flex items-start justify-between">
        <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-[13px] bg-indigo-500/12 text-indigo-300 transition-colors group-hover:bg-indigo-500/20">
          {icon}
        </span>
        {chip && <code className="tnum rounded-lg bg-white/6 px-2 py-1 text-[11px] text-cyan-300">{chip}</code>}
      </div>
      <h3 className="title-sm text-white">{title}</h3>
      <div className="body-sm mt-1.5">{children}</div>
    </div>
  );
}
