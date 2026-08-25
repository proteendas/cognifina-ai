"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import type { CitationTarget } from "@/components/visualizers/CitationDrawer";
import type { RunDetailDto } from "@/lib/types";

type RunContextValue = {
  data: RunDetailDto | null;
  error: string | null;
  loading: boolean;
  /** Executes the next pipeline stage while the run is active; returns true when still active. */
  advance: () => Promise<boolean>;
  openCitation: (c: CitationTarget) => void;
  refresh: () => Promise<void>;
};

const RunCtx = createContext<RunContextValue>({
  data: null,
  error: null,
  loading: true,
  advance: async () => false,
  openCitation: () => undefined,
  refresh: async () => undefined,
});

export function useRun(): RunContextValue {
  return useContext(RunCtx);
}

export function RunProvider({ runId, children }: { runId: string; children: React.ReactNode }) {
  const [data, setData] = useState<RunDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [citation, setCitation] = useState<CitationTarget | null>(null);
  const advancing = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await api.runs.get(runId);
      setData(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load run");
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    void load();
  }, [load]);

  const advance = useCallback(async (): Promise<boolean> => {
    if (!data || advancing.current) return false;
    if (data.run.status === "completed" || data.run.status === "failed") return false;
    advancing.current = true;
    try {
      await api.runs.advance(runId);
      await load();
      return true;
    } catch (e) {
      await load();
      setError(e instanceof Error ? e.message : "Stage failed");
      return false;
    } finally {
      advancing.current = false;
    }
  }, [data, runId, load]);

  // Drive the pipeline: keep advancing while queued/running
  useEffect(() => {
    const status = data?.run.status;
    if ((status === "queued" || status === "running") && !advancing.current) {
      const t = setTimeout(() => void advance(), 400);
      return () => clearTimeout(t);
    }
  }, [data?.run.status, data?.run.currentStage, advance]);

  return (
    <RunCtx.Provider
      value={{
        data,
        error,
        loading,
        advance,
        openCitation: setCitation,
        refresh: load,
      }}
    >
      {children}
      {/* Citation drawer lives at provider level so any tab can open citations */}
      {citation && <CitationDrawerLazy citation={citation} onClose={() => setCitation(null)} />}
    </RunCtx.Provider>
  );
}

function CitationDrawerLazy(props: { citation: CitationTarget; onClose: () => void }) {
  const [Comp, setComp] = useState<React.ComponentType<{ citation: CitationTarget; onClose: () => void }> | null>(null);
  useEffect(() => {
    import("@/components/visualizers/CitationDrawer").then((m) => setComp(() => m.CitationDrawer));
  }, []);
  return Comp ? <Comp {...props} /> : null;
}
