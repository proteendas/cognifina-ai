import { sha256Hex } from "@/lib/auth/vault";
import { parseNumber } from "@/lib/forensic/numbers";
import type { BBox } from "@/db/schema";

/**
 * Table normalization & statement classification.
 * Converts raw matrices / aligned PDF lines into clean structured tables with
 * numeric matrices and deterministic hashes.
 */

export type NormalizedTable = {
  title: string;
  statementType: "balance_sheet" | "profit_loss" | "cash_flow" | "trial_balance" | "journal" | "other";
  pageNumber: number;
  columns: string[];
  rows: string[][];
  numericRows: (number | null)[][];
  bbox?: BBox;
  hash: string;
};

const STATEMENT_SIGNATURES: Array<{ type: NormalizedTable["statementType"]; patterns: RegExp[] }> = [
  {
    type: "balance_sheet",
    patterns: [/balance\s*sheet/i, /financial\s*position/i, /assets\s*&?\s*liabilit/i],
  },
  {
    type: "profit_loss",
    patterns: [/profit\s*&?\s*loss/i, /income\s*statement/i, /statement\s*of\s*operations/i, /p&l|p\/l/i],
  },
  {
    type: "cash_flow",
    patterns: [/cash\s*flow/i, /funds\s*flow/i],
  },
  {
    type: "trial_balance",
    patterns: [/trial\s*balance/i],
  },
  {
    type: "journal",
    patterns: [/journal\s*(entries|entry)/i, /\bledger\b/i, /\btransactions\b/i, /\bregister\b/i],
  },
];

export function classifyStatement(title: string, headerText: string): NormalizedTable["statementType"] {
  const hay = `${title} ${headerText}`;
  for (const sig of STATEMENT_SIGNATURES) {
    if (sig.patterns.some((re) => re.test(hay))) return sig.type;
  }
  return "other";
}

/** Heuristic: does this row look like a header row? */
function isHeaderRow(row: string[]): boolean {
  const joined = row.join(" ").toLowerCase();
  const headerHints = ["particulars", "description", "account", "date", "amount", "debit", "credit", "total", "fy", "year", "period"];
  const hits = headerHints.filter((h) => joined.includes(h)).length;
  const numericCells = row.filter((c) => parseNumber(c) != null).length;
  return hits >= 2 && numericCells <= row.length / 2;
}

export function normalizeMatrix(
  title: string,
  rowsIn: string[][],
  pageNumber: number,
  bbox?: BBox
): NormalizedTable | null {
  // Trim fully-empty rows/columns
  let rows = rowsIn.filter((r) => r.some((c) => c && c.trim() !== ""));
  if (rows.length === 0) return null;

  const width = Math.max(...rows.map((r) => r.length));
  rows = rows.map((r) => {
    const copy = [...r];
    while (copy.length < width) copy.push("");
    return copy.map((c) => (c ?? "").trim());
  });

  // Drop empty trailing columns
  for (let c = width - 1; c >= 1; c--) {
    if (rows.every((r) => !r[c])) {
      rows.forEach((r) => r.splice(c, 1));
    }
  }

  let columns: string[] = [];
  let bodyStart = 0;
  if (rows.length > 1 && isHeaderRow(rows[0])) {
    columns = rows[0].map((c, i) => (c || `col_${i + 1}`));
    bodyStart = 1;
  } else {
    const nCols = rows[0]?.length ?? 0;
    columns = Array.from({ length: nCols }, (_, i) => `col_${i + 1}`);
  }

  const body = rows.slice(bodyStart);
  const numericRows = body.map((r) => r.map((cell) => parseNumber(cell)));

  const hash = sha256Hex(JSON.stringify([title, rows]));
  const statementType = classifyStatement(title, rows.slice(0, Math.min(3, rows.length)).join(" "));

  return {
    title,
    statementType,
    pageNumber,
    columns,
    rows: body,
    numericRows,
    bbox,
    hash,
  };
}
