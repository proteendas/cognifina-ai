import { NextResponse } from "next/server";
import { db } from "@/db";
import { documents, textBlocks, runs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/auth/session";

/** Serves extracted page blocks for the citation drawer / page reconstruction view. */
export async function GET(_request: Request, { params }: { params: { docId: string; pageNumber: string } }) {
  try {
    const user = await requireUser();
    const [doc] = await db
      .select({
        id: documents.id,
        name: documents.name,
        runId: documents.runId,
        userId: runs.userId,
      })
      .from(documents)
      .innerJoin(runs, eq(runs.id, documents.runId))
      .where(eq(documents.id, params.docId))
      .limit(1);
    if (!doc || doc.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const blocks = await db
      .select({
        id: textBlocks.id,
        seq: textBlocks.seq,
        text: textBlocks.text,
        bbox: textBlocks.bbox,
        source: textBlocks.source,
      })
      .from(textBlocks)
      .where(and(eq(textBlocks.documentId, doc.id), eq(textBlocks.pageNumber, Number(params.pageNumber))))
      .orderBy(textBlocks.seq);

    return NextResponse.json({ documentName: doc.name, pageNumber: Number(params.pageNumber), blocks });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }
}
