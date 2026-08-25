import type { JournalEntry } from "@/lib/forensic/isolationForest";

/**
 * Statement field extraction: maps row labels in financial-statement tables
 * to canonical field names per period column.
 */

export const FIELD_PATTERNS: Record<string, RegExp> = {
  // NOTE: order matters — first match wins per row. Specific patterns first.
  accountsReceivable: /receivable|debtor|sundry debtors/,
  cashFlowOperations: /operating activities|operating cash flow|\bcfo\b/,
  grossProfit: /gross profit|gross margin\b/,
  cogs: /cost of (goods|sales|revenue|materials)|cogs/,
  sales:
    /^total.*(revenue|sales|income)|^revenue|^sales|^turnover|net sales|revenue from operations/,
  currentAssets: /current assets(?!.*liabilit)/,
  currentLiabilities: /current liabilities(?!.*assets)/,
  ppe: /fixed asset|property,? plant|net block|\bppe\b|tangible asset|right.of.use/,
  totalAssets: /total assets/,
  depreciation: /depreciation|amortisation|amortization/,
  sga: /selling.*(general|admin)|administrative expenses|general & admin|operating expenses/,
  retainedEarnings: /retained earnings|reserves (&|and) surplus|^reserves/,
  ebit: /\bebit\b|pbit|profit before interest|operating profit/,
  incomeFromContinuingOps:
    /profit (before|after) tax|net (profit|income)|profit for the|^earnings|profit\/\(loss\)/,
  longTermDebt:
    /(long.term|total)\s+(debt|borrowings|liabilit\w*)|secured loans|unsecured loans|\bborrowings\b/,
  equity:
    /shareholders?.{0,3} (funds|equity)|stockholders?.{0,3} equity|total equity|net worth|owners.{0,3} equity/,
};

type TableLike = {
  columns: string[];
  rows: string[][];
  numericRows: (number | null)[][];
  rowCount: number;
};

/** For each numeric-heavy column, map row labels → canonical fields. */
export function extractPeriodFields(table: TableLike): Map<number, Record<string, number>> {
  const perColumn = new Map<number, Record<string, number>>();
  if (table.rows.length < 3) return perColumn;

  const width = Math.max(...table.rows.map((r) => r.length));
  const numericCountPerCol = new Array<number>(width).fill(0);
  for (const row of table.numericRows) {
    for (let c = 1; c < Math.min(row.length, width); c++) {
      const v = row[c];
      if (v != null && Number.isFinite(v)) numericCountPerCol[c]++;
    }
  }
  // Sparse statements (cash flows) legitimately have few lines — scale the bar.
  const minNumeric = table.rows.length >= 12 ? 4 : 3;
  const periodCols: number[] = [];
  for (let c = 1; c < numericCountPerCol.length; c++) {
    if (numericCountPerCol[c] >= minNumeric) periodCols.push(c);
  }

  for (const col of periodCols) {
    const fields: Record<string, number> = {};
    for (let r = 0; r < table.rows.length; r++) {
      const label = (table.rows[r][0] ?? "").toLowerCase().trim();
      if (!label) continue;
      const value = table.numericRows[r]?.[col];
      if (value == null || !Number.isFinite(value)) continue;
      for (const [canonical, re] of Object.entries(FIELD_PATTERNS)) {
        if (!(canonical in fields) && re.test(label)) {
          fields[canonical] = value;
          break;
        }
      }
    }
    // Statement-classified callers may legitimately contribute a single field
    if (Object.keys(fields).length >= 1) perColumn.set(col, fields);
  }
  return perColumn;
}

export function deriveWorkingCapital(f: Record<string, number>): void {
  if (
    f.workingCapital == null &&
    f.currentAssets != null &&
    f.currentLiabilities != null
  ) {
    f.workingCapital = f.currentAssets - f.currentLiabilities;
  }
}

const DATE_RE =
  /^\d{4}-\d{2}-\d{2}|^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|^[A-Z][a-z]{2}[\s-]\d{4}/;

/** Detect journal-entry tables and lift entries for anomaly detection. */
export function extractJournalEntries(table: TableLike): JournalEntry[] {
  const headerText = table.columns.join(" ").toLowerCase();
  const looksJournal =
    headerText.includes("journal") ||
    ((headerText.includes("date")) &&
      (headerText.includes("debit") ||
        headerText.includes("credit") ||
        headerText.includes("amount") ||
        headerText.includes("balance")));

  if (!looksJournal || table.rowCount < 10) return [];

  // Find the date column by scanning first data rows
  let dateCol = -1;
  for (let r = 0; r < Math.min(5, table.rows.length); r++) {
    for (let c = 0; c < Math.min(3, table.rows[r].length); c++) {
      if (DATE_RE.test(String(table.rows[r][c] ?? "").trim())) {
        dateCol = c;
        break;
      }
    }
    if (dateCol !== -1) break;
  }

  const entries: JournalEntry[] = [];
  for (let r = 0; r < table.rows.length; r++) {
    let amount: number | null = null;
    for (let c = table.columns.length - 1; c >= 1; c--) {
      const v = table.numericRows[r]?.[c];
      if (v != null && v !== 0 && Number.isFinite(v)) {
        amount = v;
        break;
      }
    }
    if (amount == null || Math.abs(amount) < 0.005) continue;

    const dateCellRaw = String(table.rows[r][Math.max(dateCol, 0)] ?? "").trim();
    entries.push({
      index: entries.length,
      date: DATE_RE.test(dateCellRaw) ? dateCellRaw : null,
      account: (table.rows[r][dateCol === 0 ? 1 : 0] ?? "").trim(),
      description: (table.rows[r][2] ?? "").trim(),
      amount,
    });
  }
  return entries;
}
