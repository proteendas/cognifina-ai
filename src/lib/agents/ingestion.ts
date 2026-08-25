import { db } from "@/db";
import { documents, textBlocks, extractedTables, type BBox } from "@/db/schema";
import { eq } from "drizzle-orm";
import { extractPdfPages } from "@/lib/extraction/pdf";
import { extractWorkbookTables, extractCsvTable, extractDocxParagraphs } from "@/lib/extraction/sheets";
import { normalizeMatrix } from "@/lib/extraction/tables";
import { inferTablesFromLines } from "@/lib/extraction/pdfTables";
import { serializeTableForRetrieval } from "@/lib/extraction/chunker";
import { sha256Hex } from "@/lib/auth/vault";
import type { RunContext } from "./context";

/**
 * AGENT 1 — Ingestion & Layout-Aware Parser.
 * Parses every stored document byte-for-byte (no sampling), producing
 * coordinate-tagged text blocks and normalized tables.
 */

export async function runIngestion(ctx: RunContext): Promise<void> {
  const docs = await db.select().from(documents).where(eq(documents.runId, ctx.runId));

  for (const doc of docs) {
    const bytes = doc.bytes;
    if (!bytes) continue;

    let pageCount = 1;
    let parseMode = "native";
    let scannedPages: number[] = [];

    if (doc.mime === "application/pdf" || doc.name.toLowerCase().endsWith(".pdf")) {
      const { pages, pageCount: pc } = await extractPdfPages(bytes);
      pageCount = pc;
      const seqBase = await nextBlockSeq(ctx.runId);
      let seq = seqBase;

      for (const page of pages) {
        if (!page.hasText) scannedPages.push(page.pageNumber);
        for (const block of page.blocks) {
          await db.insert(textBlocks).values({
            documentId: doc.id,
            runId: ctx.runId,
            pageNumber: block.pageNumber,
            seq: seq++,
            text: block.text,
            bbox: block.bbox,
            hash: block.hash,
            source: "native",
          });
        }

        // Table inference from aligned lines
        const inferred = inferTablesFromLines(
          page.blocks.map((b) => ({ pageNumber: b.pageNumber, text: b.text, bbox: b.bbox, seq: b.seq })),
          doc.name.replace(/\.pdf$/i, "")
        );
        for (const t of inferred) {
          const norm = normalizeMatrix(t.title, t.rows, t.pageNumber, t.bbox as BBox);
          if (!norm || norm.rows.length < 3) continue;
          await db.insert(extractedTables).values({
            documentId: doc.id,
            runId: ctx.runId,
            title: norm.title.slice(0, 200),
            statementType: norm.statementType,
            pageNumber: norm.pageNumber,
            rowCount: norm.rows.length,
            colCount: norm.columns.length,
            columns: norm.columns,
            rows: norm.rows,
            numericRows: norm.numericRows,
            bbox: norm.bbox ?? null,
            hash: norm.hash,
          });
        }
      }
      parseMode = scannedPages.length > 0 ? "native-partial" : "native";
    } else if (
      /\.(xlsx|xls)$/i.test(doc.name) ||
      doc.mime.includes("spreadsheet") ||
      doc.mime.includes("excel")
    ) {
      const sheets = extractWorkbookTables(Buffer.from(bytes));
      let seq = await nextBlockSeq(ctx.runId);
      for (const sheet of sheets) {
        const norm = normalizeMatrix(sheet.title, sheet.rows, sheet.pageNumber);
        if (!norm) continue;
        await db.insert(extractedTables).values({
          documentId: doc.id,
          runId: ctx.runId,
          title: `${doc.name.replace(/\.(xlsx|xls)$/i, "")} · ${norm.title}`.slice(0, 200),
          statementType: norm.statementType,
          pageNumber: norm.pageNumber,
          rowCount: norm.rows.length,
          colCount: norm.columns.length,
          columns: norm.columns,
          rows: norm.rows,
          numericRows: norm.numericRows,
          hash: norm.hash,
        });
        // Synthetic retrieval block so tables participate in chat grounding
        await db.insert(textBlocks).values({
          documentId: doc.id,
          runId: ctx.runId,
          pageNumber: norm.pageNumber,
          seq: seq++,
          text: `Sheet "${sheet.title}" from ${doc.name}:\n${serializeTableForRetrieval({ title: norm.title, statementType: norm.statementType, columns: norm.columns, rows: norm.rows.slice(0, 40) })}`,
          bbox: [0, 0, 0, 0],
          hash: sha256Hex(`${doc.id}:${norm.hash}`),
          source: "native",
        });
      }
      parseMode = "tabular";
      pageCount = Math.max(1, sheets.length);
    } else if (/\.csv$/i.test(doc.name) || doc.mime === "text/csv") {
      const csv = extractCsvTable(Buffer.from(bytes).toString("utf-8"), doc.name.replace(/\.csv$/i, ""));
      if (csv) {
        const norm = normalizeMatrix(csv.title, csv.rows, csv.pageNumber);
        if (norm) {
          await db.insert(extractedTables).values({
            documentId: doc.id,
            runId: ctx.runId,
            title: norm.title.slice(0, 200),
            statementType: norm.statementType,
            pageNumber: 1,
            rowCount: norm.rows.length,
            colCount: norm.columns.length,
            columns: norm.columns,
            rows: norm.rows,
            numericRows: norm.numericRows,
            hash: norm.hash,
          });
        }
      }
      parseMode = "tabular";
    } else if (/\.docx$/i.test(doc.name) || doc.mime.includes("wordprocessingml")) {
      const paragraphs = await extractDocxParagraphs(Buffer.from(bytes));
      let seq = await nextBlockSeq(ctx.runId);
      const PER_PAGE = 35;
      for (let i = 0; i < paragraphs.length; i += PER_PAGE) {
        const pageBlocks = paragraphs.slice(i, i + PER_PAGE);
        for (const p of pageBlocks) {
          await db.insert(textBlocks).values({
            documentId: doc.id,
            runId: ctx.runId,
            pageNumber: Math.floor(i / PER_PAGE) + 1,
            seq: seq++,
            text: p,
            bbox: [0, 0, 0, 0],
            hash: sha256Hex(p),
            source: "native",
          });
        }
      }
      pageCount = Math.max(1, Math.ceil(paragraphs.length / PER_PAGE));
      parseMode = "text";
    } else {
      // Plain text / markdown fallback
      const raw = Buffer.from(bytes).toString("utf-8");
      const lines = raw.split(/\r?\n/);
      let seq = await nextBlockSeq(ctx.runId);
      const PER_PAGE = 50;
      for (let i = 0; i < lines.length; i += PER_PAGE) {
        const chunk = lines.slice(i, i + PER_PAGE).join("\n").trim();
        if (!chunk) continue;
        await db.insert(textBlocks).values({
          documentId: doc.id,
          runId: ctx.runId,
          pageNumber: Math.floor(i / PER_PAGE) + 1,
          seq: seq++,
          text: chunk,
          bbox: [0, 0, 0, 0],
          hash: sha256Hex(chunk),
          source: "native",
        });
      }
      parseMode = "text";
      pageCount = Math.max(1, Math.ceil(lines.length / PER_PAGE));
    }

    await db
      .update(documents)
      .set({ pageCount, parseMode, scannedPages })
      .where(eq(documents.id, doc.id));
  }
}

async function nextBlockSeq(runId: string): Promise<number> {
  const existing = await db
    .select({ seq: textBlocks.seq })
    .from(textBlocks)
    .where(eq(textBlocks.runId, runId));
  return existing.reduce((max, r) => Math.max(max, r.seq), -1) + 1;
}
