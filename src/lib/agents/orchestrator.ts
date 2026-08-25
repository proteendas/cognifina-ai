import { db } from "@/db";
import { runs, textBlocks, documents, findings, forensicMetrics } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { resolveCredential } from "@/lib/ai/keys";
import { loadRunContext, type RunContext } from "./context";
import { runIngestion } from "./ingestion";
import { runMathAgent } from "./mathAgent";
import { runEntityAgent } from "./entity";
import { runReconciliationAgent } from "./reconciliation";
import { runGapAgent } from "./gaps";
import { runReportAgent } from "./report";

/**
 * Orchestrator — a 6-stage deterministic pipeline.
 * Serverless-friendly: each stage executes in its own HTTP request
 * (POST /api/runs/[id]/advance) so no long-running worker is required.
 * Stage order is fixed; progress is monotonic; failures mark the run failed
 * with the stage that errored.
 */

export const STAGES = [
  { key: "ingestion", label: "Ingestion & Layout Parsing", agent: 1 },
  { key: "math", label: "Deterministic Forensic Math", agent: 2 },
  { key: "entities", label: "Entity Graph & Registry", agent: 3 },
  { key: "reconciliation", label: "Cross-Document Reconciliation", agent: 4 },
  { key: "gaps", label: "Gap & Omission Detection", agent: 5 },
  { key: "report", label: "Report Compilation & Citations", agent: 6 },
] as const;

export async function advanceRun(runId: string, headers?: Headers): Promise<{
  status: string;
  currentStage: number;
  progress: number;
}> {
  const [run] = await db.select().from(runs).where(eq(runs.id, runId)).limit(1);
  if (!run) throw new Error("Run not found");
  if (run.status === "completed" || run.status === "failed") {
    return { status: run.status, currentStage: run.currentStage, progress: run.progress };
  }

  const stageIndex = run.currentStage;
  if (stageIndex >= STAGES.length) {
    return { status: run.status, currentStage: run.currentStage, progress: run.progress };
  }

  const credential = await resolveCredential({ userId: run.userId, headers });
  const ctx: RunContext = await loadRunContext(runId, credential);

  if (run.status !== "running") {
    await db.update(runs).set({ status: "running", startedAt: new Date() }).where(eq(runs.id, runId));
  }

  try {
    switch (STAGES[stageIndex].key) {
      case "ingestion":
        await runIngestion(ctx);
        break;
      case "math":
        await runMathAgent(ctx);
        break;
      case "entities":
        await runEntityAgent(ctx);
        break;
      case "reconciliation":
        await runReconciliationAgent(ctx);
        break;
      case "gaps":
        await runGapAgent(ctx);
        break;
      case "report":
        await runReportAgent(ctx);
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? `${STAGES[stageIndex].label}: ${err.message}` : String(err);
    await db
      .update(runs)
      .set({ status: "failed", error: message.slice(0, 500), finishedAt: new Date() })
      .where(eq(runs.id, runId));
    throw err;
  }

  const nextStage = stageIndex + 1;
  const isLast = nextStage >= STAGES.length;
  const progress = Math.round((nextStage / STAGES.length) * 100);

  await db
    .update(runs)
    .set({
      currentStage: nextStage,
      progress,
      ...(isLast ? {} : {}),
      modelProvider: ctx.credential?.provider ?? null,
      modelName: ctx.credential?.model ?? null,
    })
    .where(eq(runs.id, runId));

  return {
    status: isLast ? "completed" : "running",
    currentStage: nextStage,
    progress,
  };
}

/** Grounded post-run chat: strict evidence-pack retrieval + refusal on gaps. */
export type RunChatCitation = {
  documentName: string;
  documentId?: string;
  pageNumber: number;
  excerpt: string;
  bbox?: number[];
};

export async function answerRunQuestion(
  ctx: RunContext,
  question: string,
  history: { role: string; content: string }[]
): Promise<{ content: string; citations: RunChatCitation[] }> {
  // Build deterministic retrieval corpus: blocks (tf-idf lexical scoring)
  const [blocks, docs] = await Promise.all([loadAllBlocks(ctx.runId), loadDocs(ctx.runId)]);
  const docNameById = new Map(docs.map((d) => [d.id, d.name]));
  const queryTokens = tokenize(question);
  const df = new Map<string, number>();
  for (const b of blocks) {
    for (const t of new Set(tokenize(b.text))) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const N = Math.max(1, blocks.length);
  const scored = blocks.map((b) => {
    const tokens = tokenize(b.text);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    let score = 0;
    for (const qt of queryTokens) {
      const f = tf.get(qt);
      if (!f) continue;
      const idf = Math.log(N / (1 + (df.get(qt) ?? 0))) + 1;
      score += f * idf;
    }
    return { block: b, score };
  });
  const top = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.block.seq - b.block.seq)
    .slice(0, 8);

  const packSegments = top.map((s, i) => ({
    id: `seg-${i}`,
    text: `[${docNameById.get(s.block.documentId) ?? "document"} · p.${s.block.pageNumber}] ${s.block.text}`,
    meta: s.block,
  }));

  // Deterministic metrics join the pack as authoritative context (no seg ids —
  // they are engine outputs, not document excerpts).
  const metricRows = await db
    .select({ ref: forensicMetrics.ref, displayName: forensicMetrics.displayName, verdict: forensicMetrics.verdict, detailMd: forensicMetrics.detailMd })
    .from(forensicMetrics)
    .where(eq(forensicMetrics.runId, ctx.runId));
  const metricContext = metricRows.length
    ? `COMPUTED METRICS (authoritative, produced by the deterministic engines):\n${metricRows.map((m) => `• [${m.ref}] ${m.displayName}: ${m.verdict} — ${m.detailMd}`).join("\n")}\n\n`
    : "";

  // The run's findings are authoritative too — questions like "what are the
  // most severe findings" must be answerable even when no document passage
  // lexically matches.
  const findingRows = await db
    .select({
      ref: findings.ref,
      title: findings.title,
      severity: findings.severity,
      category: findings.category,
      description: findings.description,
      recommendation: findings.recommendation,
    })
    .from(findings)
    .where(eq(findings.runId, ctx.runId))
    .orderBy(asc(findings.ref));
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 } as const;
  const rankedFindings = [...findingRows].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity] || a.ref.localeCompare(b.ref)
  );
  const findingContext = rankedFindings.length
    ? `RUN FINDINGS (authoritative, severity-ranked by the engines — most severe first):\n${rankedFindings
        .map(
          (f) =>
            `• [${f.ref}] ${f.severity.toUpperCase()} — ${f.title} (${f.category}): ${f.description}${f.recommendation ? ` Recommended action: ${f.recommendation}` : ""}`
        )
        .join("\n")}\n\n`
    : "";

  const citationIndex = new Map<string, RunChatCitation>();
  let modelError: string | null = null;
  const packText =
    findingContext +
    metricContext +
    packSegments
      .map((s) => {
        const c = buildCitation(s.meta, docNameById);
        citationIndex.set(s.id, c);
        return `[${s.id}] ${s.text}`;
      })
      .join("\n\n");

  if (ctx.credential && packText) {
    const { completeJSON, chatAnswerSchema } = await import("@/lib/ai/client");
    const { CHAT_GROUNDING_TEMPLATE } = await import("@/lib/ai/prompts");
    try {
      const { data: d } = await completeJSON({
        credential: ctx.credential,
        system: CHAT_GROUNDING_TEMPLATE(packText),
        prompt:
          history.slice(-6).map((h) => `${h.role.toUpperCase()}: ${h.content}`).join("\n") +
          `\nUSER: ${question}`,
        schema: chatAnswerSchema,
        maxTokens: 1200,
      });
      if (!d.sufficientEvidence) {
        return {
          content: `The ingested evidence does not cover this question. ${d.answer}\n\nYou may need to upload additional documents covering this area and re-run the analysis.`,
          citations: [],
        };
      }
      const cited = dedupeCitations(
        d.citations.map((c) => citationIndex.get(c.ref)).filter((c): c is RunChatCitation => c != null)
      );
      return { content: d.answer, citations: cited };
    } catch (e) {
      // surface the real reason the model path failed (bad key, dead model, timeout…)
      modelError = e instanceof Error ? e.message.slice(0, 200) : "model call failed";
    }
  }

  // Deterministic extractive fallback / refusal
  if (top.length === 0 && metricRows.length === 0 && rankedFindings.length === 0) {
    return {
      content:
        "I can only answer using the evidence ingested in this run. Your question does not match any extracted passage with sufficient confidence — please upload relevant documents or re-run analysis.",
      citations: [],
    };
  }

  // No lexical passage hits, but the engines produced authoritative outputs —
  // answer deterministically from findings/metrics instead of refusing.
  if (top.length === 0) {
    const reason = ctx.credential
      ? `The connected model call failed (${modelError ?? "unknown error"}).`
      : "No language model is connected to this workspace.";
    const topFindings = rankedFindings.slice(0, 5);
    const findingsList = topFindings
      .map((f) => `• [${f.ref}] ${f.severity.toUpperCase()} — ${f.title}: ${f.description}`)
      .join("\n");
    const metricSummary = metricRows.length
      ? `\n\nComputed metrics for reference: ${metricRows.map((m) => `${m.displayName} (${m.verdict})`).join("; ")}.`
      : "";
    return {
      content: `${reason} Here is a deterministic summary from the run's computed results:\n\n${findingsList}${metricSummary}`,
      citations: [],
    };
  }
  const excerptList = top.slice(0, 3).map((s) => `> ${trimExcerpt(s.block.text)}\n\n— ${docNameById.get(s.block.documentId) ?? ""}, page ${s.block.pageNumber}`);
  const metricSummary = metricRows.length
    ? `\n\nComputed metrics for reference: ${metricRows.map((m) => `${m.displayName} (${m.verdict})`).join("; ")}.`
    : "";
  const modelNote = ctx.credential
    ? `The connected model call failed (${modelError ?? "unknown error"}), so this is a strictly extractive answer`
    : "No language model is connected to this workspace, so this is a strictly extractive answer";
  return {
    content: `No language model is connected to this workspace, so here is a strictly extractive answer drawn from the highest-scoring passages:\n\n${excerptList.join("\n\n")}${metricSummary}`,
    citations: dedupeCitations(top.slice(0, 4).map((s) => buildCitation(s.block, docNameById))),
  };

  function buildCitation(block: (typeof blocks)[number], nameMap: Map<string, string>) {
    return {
      documentName: nameMap.get(block.documentId) ?? "document",
      documentId: block.documentId,
      pageNumber: block.pageNumber,
      excerpt: trimExcerpt(block.text),
      bbox: block.bbox as unknown as number[],
    };
  }

  function dedupeCitations(list: RunChatCitation[]) {
    const seen = new Set<string>();
    return list.filter((c) => {
      const k = `${c.documentName}|${c.pageNumber}|${c.excerpt.slice(0, 60)}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
}

function trimExcerpt(text: string): string {
  return text.length > 280 ? `${text.slice(0, 280)}…` : text;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s₹$%.]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "was", "were", "are", "has", "have",
  "had", "not", "but", "all", "can", "what", "which", "who", "whom", "how", "why", "when",
  "where", "does", "did", "you", "your", "our", "their", "its", "any", "into", "onto",
]);

async function loadAllBlocks(runId: string) {
  return db
    .select()
    .from(textBlocks)
    .where(eq(textBlocks.runId, runId))
    .orderBy(textBlocks.seq)
    .limit(3000);
}

async function loadDocs(runId: string) {
  return db.select().from(documents).where(eq(documents.runId, runId));
}
