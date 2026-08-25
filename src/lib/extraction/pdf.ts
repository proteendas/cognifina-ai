import { getDocumentProxy } from "unpdf";
import { sha256Hex } from "@/lib/auth/vault";
import type { BBox } from "@/db/schema";

/**
 * Serverless-safe PDF text extraction WITH per-line bounding boxes.
 * Uses unpdf's bundled serverless pdf.js build — no native deps, no canvas.
 */

export type RawBlock = {
  pageNumber: number;
  seq: number;
  text: string;
  bbox: BBox;
  hash: string;
  source: "native" | "ocr";
};

export type PdfPageResult = {
  pageNumber: number;
  blocks: RawBlock[];
  hasText: boolean;
  width: number;
  height: number;
};

type TextItem = {
  str: string;
  transform: number[]; // [a, b, c, d, e, f] — e = x, f = y (baseline)
  width: number;
  height: number;
};

function groupLines(items: TextItem[], pageHeight: number): { text: string; x0: number; y0: number; x1: number; y1: number }[] {
  type Frag = { str: string; x: number; yTop: number; end: number; h: number };
  const frags: Frag[] = [];
  for (const item of items) {
    if (!item.str || !item.str.trim()) continue;
    const x = item.transform[4];
    const yBaseline = item.transform[5];
    const h = Math.abs(item.height) || Math.abs(item.transform[3]) || 10;
    const yTop = pageHeight - yBaseline - h; // flip to top-origin
    frags.push({ str: item.str, x, yTop, end: x + (item.width ?? 0), h });
  }

  // Cluster by vertical proximity
  frags.sort((a, b) => a.yTop - b.yTop || a.x - b.x);
  const lines: Frag[][] = [];
  let current: Frag[] = [];
  const TOL = 3.5;
  for (const f of frags) {
    if (current.length === 0 || Math.abs(f.yTop - current[current.length - 1].yTop) <= TOL) {
      current.push(f);
    } else {
      lines.push(current);
      current = [f];
    }
  }
  if (current.length) lines.push(current);

  return lines.map((lineFrags) => {
    lineFrags.sort((a, b) => a.x - b.x);
    const text = lineFrags.map((f) => f.str).join(" ").replace(/\s+/g, " ").trim();
    const x0 = Math.min(...lineFrags.map((f) => f.x));
    const y0 = Math.min(...lineFrags.map((f) => f.yTop));
    const x1 = Math.max(...lineFrags.map((f) => f.end));
    const y1 = Math.max(...lineFrags.map((f) => f.yTop + f.h));
    return { text, x0, y0, x1, y1 };
  }).filter((l) => l.text.length > 0);
}

export async function extractPdfPages(data: Uint8Array | Buffer): Promise<{
  pages: PdfPageResult[];
  pageCount: number;
}> {
  const bytes = new Uint8Array(data); // copy out of Buffer into a plain Uint8Array (unpdf requirement)
  const pdf = await getDocumentProxy(bytes);
  const pageCount = pdf.numPages;
  const pages: PdfPageResult[] = [];

  for (let p = 1; p <= pageCount; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = content.items as unknown as TextItem[];
    const lines = groupLines(
      items.filter((i) => typeof i.str === "string"),
      viewport.height
    );
    const blocks: RawBlock[] = lines.map((line, seq) => ({
      pageNumber: p,
      seq,
      text: line.text,
      bbox: [
        Math.round(line.x0 * 100) / 100,
        Math.round(line.y0 * 100) / 100,
        Math.round(line.x1 * 100) / 100,
        Math.round(line.y1 * 100) / 100,
      ],
      hash: sha256Hex(line.text),
      source: "native" as const,
    }));
    const totalChars = blocks.reduce((acc, b) => acc + b.text.length, 0);
    pages.push({
      pageNumber: p,
      blocks,
      hasText: totalChars >= 40,
      width: viewport.width,
      height: viewport.height,
    });
    page.cleanup();
  }

  await pdf.destroy();
  return { pages, pageCount };
}
