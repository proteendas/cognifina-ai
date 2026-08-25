import type { RawBlock } from "./pdf";

/**
 * Deterministic chunking of ordered text blocks for retrieval.
 * Chunks preserve the block ids they were built from so citations stay exact.
 */

export type TextChunk = {
  id: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
  text: string;
  blockIds: string[];
};

const TARGET_CHARS = 1200;
const OVERLAP_BLOCKS = 1;

export function chunkBlocks(
  blocks: (RawBlock & { id?: string; documentId?: string; documentName?: string })[]
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let buffer: typeof blocks = [];
  let bufferLen = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    const first = buffer[0];
    const text = buffer.map((b) => b.text).join("\n");
    chunks.push({
      id: `chunk-${chunks.length}`,
      documentId: first.documentId ?? "",
      documentName: first.documentName ?? "",
      pageNumber: first.pageNumber,
      text,
      blockIds: buffer.map((b) => b.hash),
    });
    // Keep overlap
    const keep = buffer.slice(Math.max(0, buffer.length - OVERLAP_BLOCKS));
    const keptLen = keep.reduce((acc, b) => acc + b.text.length, 0);
    buffer = keptLen > TARGET_CHARS * 0.5 ? [] : [...keep];
    bufferLen = buffer.reduce((acc, b) => acc + b.text.length, 0);
  };

  for (const block of blocks) {
    if (bufferLen + block.text.length > TARGET_CHARS && buffer.length > 0) flush();
    buffer.push(block);
    bufferLen += block.text.length;
  }
  flush();

  return chunks;
}

export function serializeTableForRetrieval(t: {
  title: string;
  statementType: string;
  columns: string[];
  rows: string[][];
}): string {
  const header = `[TABLE:${t.title} | ${t.statementType}] columns: ${t.columns.join(" | ")}`;
  const bodyRows = t.rows.slice(0, 60).map((r) => r.join(" | ")).join("\n");
  return `${header}\n${bodyRows}`;
}
