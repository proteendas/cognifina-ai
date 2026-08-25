import { NextResponse } from "next/server";
import { db } from "@/db";
import { runs, documents, chatMessages } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/auth/session";
import { getWorkflow } from "@/lib/workflows/definitions";
import { sha256Hex } from "@/lib/auth/vault";
import { recordAudit } from "@/lib/audit";

export const maxDuration = 60;

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXT = /\.(pdf|xlsx|xls|csv|docx|txt|md)$/i;

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db
      .select({
        id: runs.id,
        workflowId: runs.workflowId,
        workflowName: runs.workflowName,
        entityName: runs.entityName,
        periodLabel: runs.periodLabel,
        status: runs.status,
        progress: runs.progress,
        currentStage: runs.currentStage,
        riskScore: runs.riskScore,
        riskBand: runs.riskBand,
        summary: runs.summary,
        createdAt: runs.createdAt,
        finishedAt: runs.finishedAt,
      })
      .from(runs)
      .where(eq(runs.userId, user.id))
      .orderBy(desc(runs.createdAt))
      .limit(100);
    return NextResponse.json({ runs: rows });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const form = await request.formData();
    const workflowId = String(form.get("workflowId") ?? "");
    const entityName = String(form.get("entityName") ?? "").slice(0, 200);
    const periodLabel = String(form.get("periodLabel") ?? "").slice(0, 120);
    const checksRaw = String(form.get("checks") ?? "");
    const files = form.getAll("files").filter((f): f is File => f instanceof File);

    const workflow = getWorkflow(workflowId);
    if (!workflow) return NextResponse.json({ error: "Unknown workflow" }, { status: 400 });
    if (files.length === 0) return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    if (files.length > 12) return NextResponse.json({ error: "Maximum 12 files per run" }, { status: 400 });

    let enabledChecks = workflow.checks;
    if (checksRaw) {
      try {
        const requested = JSON.parse(checksRaw) as string[];
        enabledChecks = workflow.checks.filter((c) => requested.includes(c));
      } catch {
        // keep defaults
      }
    }

    const [run] = await db
      .insert(runs)
      .values({
        userId: user.id,
        workflowId: workflow.id,
        workflowName: workflow.name,
        entityName,
        periodLabel,
        status: "queued",
        enabledChecks,
      })
      .returning({ id: runs.id });

    for (const file of files) {
      if (!ALLOWED_EXT.test(file.name)) continue;
      if (file.size > MAX_FILE_BYTES) continue;
      const bytes = Buffer.from(await file.arrayBuffer());
      await db.insert(documents).values({
        runId: run.id,
        name: file.name.slice(0, 250),
        mime: file.type || guessMime(file.name),
        sizeBytes: bytes.length,
        sha256: sha256Hex(bytes),
        bytes,
      });
    }

    await recordAudit(user.id, "run.created", `${workflow.name}${entityName ? ` · ${entityName}` : ""} · ${files.length} file${files.length > 1 ? "s" : ""}`);

    return NextResponse.json({ runId: run.id }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[runs.POST]", err);
    return NextResponse.json({ error: "Failed to create run" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const runId = new URL(request.url).searchParams.get("runId");
    if (!runId) return NextResponse.json({ error: "runId required" }, { status: 400 });
    await db.delete(chatMessages).where(eq(chatMessages.runId, runId));
    const deleted = await db.delete(runs).where(and(eq(runs.id, runId), eq(runs.userId, user.id))).returning({ name: runs.workflowName });
    if (deleted.length > 0) await recordAudit(user.id, "run.deleted", deleted[0].name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }
}

function guessMime(name: string): string {
  if (/\.pdf$/i.test(name)) return "application/pdf";
  if (/\.xlsx$/i.test(name)) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (/\.xls$/i.test(name)) return "application/vnd.ms-excel";
  if (/\.csv$/i.test(name)) return "text/csv";
  if (/\.docx$/i.test(name)) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "text/plain";
}
