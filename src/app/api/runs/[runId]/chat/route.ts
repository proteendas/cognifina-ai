import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { runs, chatMessages } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/auth/session";
import { loadRunContext } from "@/lib/agents/context";
import { answerRunQuestion } from "@/lib/agents/orchestrator";

export const maxDuration = 60;

const chatSchema = z.object({ question: z.string().min(1).max(2000) });

export async function POST(request: Request, { params }: { params: { runId: string } }) {
  try {
    const user = await requireUser();
    const [run] = await db
      .select()
      .from(runs)
      .where(and(eq(runs.id, params.runId), eq(runs.userId, user.id)))
      .limit(1);
    if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
    if (run.status !== "completed") {
      return NextResponse.json({ error: "Chat is available after the run completes" }, { status: 409 });
    }

    const parsed = chatSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid question" }, { status: 400 });

    const history = await db
      .select({ role: chatMessages.role, content: chatMessages.content })
      .from(chatMessages)
      .where(eq(chatMessages.runId, run.id))
      .orderBy(asc(chatMessages.createdAt));

    const ctx = await loadRunContext(run.id, null);
    // Re-resolve credential with request headers for BYOK override
    const { resolveCredential } = await import("@/lib/ai/keys");
    ctx.credential = await resolveCredential({ userId: user.id, headers: request.headers });

    const answer = await answerRunQuestion(ctx, parsed.data.question, history);

    await db.insert(chatMessages).values([
      { runId: run.id, role: "user", content: parsed.data.question, citations: [] },
      {
        runId: run.id,
        role: "assistant",
        content: answer.content,
        citations: answer.citations.map((c) => ({
          documentName: c.documentName,
          documentId: c.documentId ?? undefined,
          pageNumber: c.pageNumber,
          excerpt: c.excerpt,
          bbox: (c.bbox && c.bbox.length === 4 ? [c.bbox[0], c.bbox[1], c.bbox[2], c.bbox[3]] : undefined) as
            | [number, number, number, number]
            | undefined,
        })),
      },
    ]);

    return NextResponse.json({
      content: answer.content,
      citations: answer.citations.map((c) => ({
        documentName: c.documentName,
        documentId: c.documentId ?? null,
        pageNumber: c.pageNumber,
        excerpt: c.excerpt,
        bbox: c.bbox ?? null,
      })),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[chat]", err);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
