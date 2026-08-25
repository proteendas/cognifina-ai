"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/progress";
import { api } from "@/lib/client";
import type { WorkflowDto } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowDto[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [active, setActive] = useState<string>("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.workflows
      .list()
      .then((res) => {
        setWorkflows(res.workflows);
        setCategories(["All", ...res.categories]);
      })
      .catch(() => setWorkflows([]));
  }, []);

  const filtered = useMemo(() => {
    if (!workflows) return [];
    const q = query.toLowerCase();
    return workflows.filter(
      (w) =>
        (active === "All" || w.category === active) &&
        (!q || w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q))
    );
  }, [workflows, active, query]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Library</p>
          <h1 className="display-md mt-1.5 text-ink">Workflows</h1>
          <p className="body-sm mt-1">25 pre-configured forensic &amp; compliance workflows across four disciplines.</p>
        </div>
        <div className="w-full shrink-0 sm:w-64">
          <Input placeholder="Search workflows…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={cn(
              "pressable rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
              active === c
                ? "border-accent/30 bg-accent-soft text-accent"
                : "border-line-strong bg-surface text-ink-3 hover:bg-surface-2 hover:text-ink"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {!workflows ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((w, i) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4, delay: Math.min(i * 0.03, 0.25) }}
              className="h-full"
            >
              <Link
                href={`/workflows/${w.id}`}
                className="pressable group flex h-full flex-col rounded-xl border border-line bg-surface p-5 shadow-soft transition-shadow hover:shadow-lift"
              >
                <Badge>{w.category}</Badge>
                <h2 className="mt-3 text-[15px] font-semibold leading-snug tracking-tight text-ink">{w.name}</h2>
                <p className="mt-1.5 line-clamp-3 flex-1 font-secondary text-[13px] leading-relaxed text-ink-3">{w.description}</p>
                <span className="mt-4 flex items-center gap-1.5 text-[12.5px] font-medium text-accent">
                  Open workflow <ArrowRight size={13} className="transition-transform duration-150 group-hover:translate-x-0.5" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {workflows && filtered.length === 0 && (
        <p className="mt-12 text-center font-secondary text-sm text-ink-4">No workflows match this search.</p>
      )}
    </div>
  );
}
