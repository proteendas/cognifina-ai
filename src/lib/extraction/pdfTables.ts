import type { BBox } from "@/db/schema";
import { parseNumber } from "@/lib/forensic/numbers";

/**
 * PDF table inference from coordinate-tagged text lines.
 * Financial statements render as aligned numeric columns; we detect runs of
 * numeric-heavy lines sharing a dominant column x-grid and lift them into
 * structured tables. Deterministic: same page ⇒ same table.
 */

export type InferredTable = {
  title: string;
  pageNumber: number;
  rows: string[][];
  bbox?: BBox;
};

type Line = { text: string; x0: number; y0: number; x1: number; y1: number; seq: number };

const NUMERIC_DENSITY_MIN = 2; // numeric cells per candidate row

function splitRowIntoCells(line: Line): { label: string; cells: { value: string; x0: number }[] } {
  // Split line on 2+ spaces — pdf.js items already joined single-space, so use
  // number-token positions instead: find all numeric tokens and their offsets.
  const tokens: { value: string; start: number }[] = [];
  const re = /[-+(]?\s?(?:₹|$|€|£|Rs\.?)?\s?\d[\d,]*(?:\.\d+)?\)?(?:\s?(?:Cr|Dr|cr|dr|M|K|mn|bn))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line.text)) !== null) {
    tokens.push({ value: m[0].trim(), start: m.index });
  }
  if (tokens.length === 0) return { label: line.text.trim(), cells: [] };

  // Approximate x for each token by proportional character width.
  const charW = (line.x1 - line.x0) / Math.max(line.text.length, 1);
  const cells = tokens.map((t) => ({
    value: t.value,
    x0: Math.round((line.x0 + t.start * charW) / 12) * 12, // quantize to grid
  }));
  const firstTokenStart = tokens[0].start;
  const label = line.text.slice(0, firstTokenStart).replace(/[\s.·|-]+$/, "").trim();
  return { label, cells };
}

export function inferTablesFromLines(
  lines: { pageNumber: number; text: string; bbox: BBox; seq: number }[],
  docTitleHint: string
): InferredTable[] {
  if (lines.length === 0) return [];

  const parsed = lines.map((l) => {
    const line: Line = { text: l.text, x0: l.bbox[0], y0: l.bbox[1], x1: l.bbox[2], y1: l.bbox[3], seq: l.seq };
    return {
      pageNumber: l.pageNumber,
      ...splitRowIntoCells(line),
      text: line.text,
      x0: line.x0,
      y0: line.y0,
      x1: line.x1,
      y1: line.y1,
      seq: line.seq,
    };
  });

  // Candidate rows: >= NUMERIC_DENSITY_MIN numeric cells AND a non-empty label
  let currentGroup: typeof parsed = [];
  const tables: InferredTable[] = [];

  const flushGroup = () => {
    if (currentGroup.length < 4) {
      currentGroup = [];
      return;
    }
    // Dominant column-count via mode of cell counts (ties → higher count)
    const countFreq = new Map<number, number>();
    for (const r of currentGroup) {
      const n = Math.min(r.cells.length, 8);
      countFreq.set(n, (countFreq.get(n) ?? 0) + 1);
    }
    let bestCount = 0;
    let bestFreq = 0;
    for (const [n, f] of [...countFreq.entries()].sort((a, b) => b[0] - a[0])) {
      if (f > bestFreq) {
        bestFreq = f;
        bestCount = n;
      }
    }
    if (bestCount < NUMERIC_DENSITY_MIN) {
      currentGroup = [];
      return;
    }

    // Column x-grids from rows matching dominant count
    const gridRows = currentGroup.filter((r) => r.cells.length === bestCount || r.cells.length === bestCount - 1);
    const colXs: number[] = [];
    for (const r of gridRows) {
      for (const c of r.cells.slice(0, bestCount)) colXs.push(c.x0);
    }
    colXs.sort((a, b) => a - b);

    const rowsOut: string[][] = [];
    for (const r of currentGroup) {
      const rowVals = new Array<string>(bestCount + 1).fill("");
      rowVals[0] = r.label;
      for (const c of r.cells.slice(0, bestCount)) {
        // snap to nearest grid column slot
        let slot = 0;
        let bestDist = Infinity;
        for (let i = 0; i < bestCount; i++) {
          const d = Math.abs(c.x0 - (colXs[i * Math.max(1, Math.floor(colXs.length / bestCount))] ?? c.x0));
          if (d < bestDist) {
            bestDist = d;
            slot = i;
          }
        }
        rowVals[slot + 1] = rowVals[slot + 1] ? `${rowVals[slot + 1]} ${c.value}` : c.value;
      }
      if (parseNumber(rowVals[1]) != null || rowVals.some((v) => parseNumber(v) != null)) {
        rowsOut.push(rowVals.map((v) => v.trim()));
      }
    }

    if (rowsOut.length >= 4) {
      const firstSeq = currentGroup[0].seq;
      const lastSeq = currentGroup[currentGroup.length - 1].seq;
      const y0 = Math.min(...currentGroup.map((r) => r.y0));
      const y1 = Math.max(...currentGroup.map((r) => r.y1));
      const x0 = Math.min(...currentGroup.map((r) => r.x0));
      const x1 = Math.max(...currentGroup.map((r) => r.x1));
      tables.push({
        title: `${docTitleHint} · p${currentGroup[0].pageNumber} · table ${tables.length + 1}`,
        pageNumber: currentGroup[0].pageNumber,
        rows: rowsOut,
        bbox: [x0, y0, x1, y1],
      });
    }
    currentGroup = [];
  };

  let lastPage = parsed[0]?.pageNumber ?? 1;
  for (let i = 0; i < parsed.length; i++) {
    const r = parsed[i];
    const isCandidate = r.cells.length >= NUMERIC_DENSITY_MIN && r.label.length > 0;
    if (r.pageNumber !== lastPage) {
      flushGroup();
      lastPage = r.pageNumber;
    }
    if (isCandidate) {
      // contiguity: allow max 1 intervening non-candidate line
      currentGroup.push(r);
    } else {
      const next = parsed[i + 1];
      if (!next || next.pageNumber !== r.pageNumber || next.cells.length < NUMERIC_DENSITY_MIN) flushGroup();
    }
  }
  flushGroup();

  return tables;
}
