"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
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
          <h1 className="display text-2xl font-bold tracking-tight text-white">Workflows</h1>
          <p className="mt-1 text-[13.5px] text-slate-400">
            25 pre-configured forensic & compliance workflows across four disciplines.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Input placeholder="Search workflows…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={cn(
              "pressable rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition",
              active === c
                ? "border-indigo-400/50 bg-indigo-500/15 text-indigo-200"
                : "border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200"
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
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((w, i) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4, delay: Math.min(i * 0.03, 0.25) }}
            >
              <Link
                href={`/workflows/${w.id}`}
                className="material pressable group flex h-full flex-col rounded-2xl p-5 transition-colors hover:border-indigo-400/35"
              >
                <Badge>{w.category}</Badge>
                <h2 className="mt-3 text-[15px] font-semibold tracking-tight text-white">{w.name}</h2>
                <p className="mt-1.5 line-clamp-3 flex-1 text-[13px] leading-relaxed text-slate-400">{w.description}</p>
                <span className="mt-4 flex items-center gap-1.5 text-[12.5px] font-medium text-indigo-300 opacity-0 transition-opacity group-hover:opacity-100">
                  Open workflow <ArrowRight size={13} />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {workflows && filtered.length === 0 && (
        <p className="mt-12 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 size={14} className="hidden" /> No workflows match this search.
        </p>
      )}
    </div>
  );
}
