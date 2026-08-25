import * as XLSX from "xlsx";
import { sha256Hex } from "@/lib/auth/vault";

export type RawSheetTable = {
  title: string;
  pageNumber: number; // sheets are treated as "pages"
  rows: string[][];
  hash: string;
};

/** Parse XLSX/XLS into per-sheet raw string matrices. */
export function extractWorkbookTables(data: Buffer): RawSheetTable[] {
  const wb = XLSX.read(data, { type: "buffer", cellDates: true, raw: false });
  const tables: RawSheetTable[] = [];
  wb.SheetNames.forEach((name, idx) => {
    const sheet = wb.Sheets[name];
    if (!sheet) return;
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: "",
      raw: false,
    });
    const rows = matrix
      .map((row) => (row as unknown[]).map((cell) => (cell == null ? "" : String(cell).trim())))
      .filter((row) => row.some((c) => c !== ""));
    if (rows.length === 0) return;
    tables.push({
      title: name,
      pageNumber: idx + 1,
      rows,
      hash: sha256Hex(JSON.stringify(rows)),
    });
  });
  return tables;
}

/** Parse CSV text into a raw matrix. */
export function extractCsvTable(text: string, title: string): RawSheetTable | null {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cur.push(field.trim());
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      cur.push(field.trim());
      field = "";
      if (cur.some((c) => c !== "")) rows.push(cur);
      cur = [];
    } else {
      field += ch;
    }
  }
  cur.push(field.trim());
  if (cur.some((c) => c !== "")) rows.push(cur);

  if (rows.length === 0) return null;
  return { title, pageNumber: 1, rows, hash: sha256Hex(JSON.stringify(rows)) };
}

/** Extract paragraph text from DOCX via mammoth. */
export async function extractDocxParagraphs(data: Buffer): Promise<string[]> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: data });
  return result.value
    .split(/\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);
}
