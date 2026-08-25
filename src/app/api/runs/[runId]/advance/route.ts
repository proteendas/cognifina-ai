import { NextResponse } from "next/server";
import { db } from "@/db";
import { runs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/auth/session";
import { advanceRun, STAGES } from "@/lib/agents/orchestrator";
import { recordAudit } from "@/lib/audit";

export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: { runId: string } }) {
  try {
    const user = await requireUser();
    const [run] = await db
      .select({ id: runs.id })
      .from(runs)
      .where(and(eq(runs.id, params.runId), eq(runs.userId, user.id)))
      .limit(1);
    if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

    const result = await advanceRun(run.id, request.headers);
    if (result.status === "completed") await recordAudit(user.id, "run.completed", STAGES[Math.min(result.currentStage, STAGES.length - 1)].label);
    if (result.status === "failed") await recordAudit(user.id, "run.failed");
    return NextResponse.json({
      ...result,
      stageLabel: STAGES[Math.min(result.currentStage, STAGES.length - 1)].label,
      totalStages: STAGES.length,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[advance]", err);
    try {
      const u = await requireUser();
      await recordAudit(u.id, "run.failed", err instanceof Error ? err.message.slice(0, 200) : "");
    } catch {
      // session may already be gone
    }
    const message = err instanceof Error ? err.message.slice(0, 300) : "Stage execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
