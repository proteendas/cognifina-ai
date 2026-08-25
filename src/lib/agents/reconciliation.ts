import { addFinding, addCitation, checkEnabled, loadTables, loadDocuments, type RunContext } from "./context";
import { parseNumber } from "@/lib/forensic/numbers";

/**
 * AGENT 4 — Cross-Document Reconciliation.
 * Compares totals for identical labels across different documents, ties the
 * balance sheet internally, and fuzzy-matches line items between statement
 * versions (e.g. management accounts vs audited financials).
 */

type LoadedTable = Awaited<ReturnType<typeof loadTables>>[number];
type LoadedDoc = Awaited<ReturnType<typeof loadDocuments>>[number];

type TotalHit = {
  label: string;
  value: number;
  docId: string;
  docName: string;
  page: number;
  tableTitle: string;
  bbox: [number, number, number, number] | null;
};

const TOTAL_LABEL_RE = /^(grand\s+)?total\b|^\btotal\s+(revenue|income|assets|liabilit|equity|expenses|current)/i;

function labelKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z&\s]/g, "").replace(/\s+/g, " ").trim();
}

function collectTotals(tables: LoadedTable[], docs: LoadedDoc[]): Map<string, TotalHit[]> {
  const docNameById = new Map(docs.map((d) => [d.id, d.name]));
  const totals = new Map<string, TotalHit[]>();

  for (const t of tables) {
    for (let r = 0; r < t.rows.length; r++) {
      const raw = (t.rows[r][0] ?? "").trim();
      if (!TOTAL_LABEL_RE.test(raw)) continue;
      // pick the largest-magnitude numeric in the row's period columns
      let best: number | null = null;
      const row = t.numericRows[r] ?? [];
      for (let c = 1; c < row.length; c++) {
        const v = row[c];
        if (v != null && Number.isFinite(v) && (best == null || Math.abs(v) > Math.abs(best))) best = v;
      }
      if (best == null || best === 0) continue;
      const key = labelKey(raw);
      const hit: TotalHit = {
        label: raw,
        value: best,
        docId: t.documentId,
        docName: docNameById.get(t.documentId) ?? t.title.split(" · ")[0],
        page: t.pageNumber,
        tableTitle: t.title,
        bbox: t.bbox ?? null,
      };
      const list = totals.get(key) ?? [];
      list.push(hit);
      totals.set(key, list);
    }
  }
  return totals;
}

function trigramSimilarity(a: string, b: string): number {
  const grams = (s: string): Set<string> => {
    const out = new Set<string>();
    const clean = ` ${s.toLowerCase().replace(/[^a-z0-9\s]/g, "")} `;
    for (let i = 0; i < clean.length - 2; i++) out.add(clean.slice(i, i + 3));
    return out;
  };
  if (!a || !b) return 0;
  const ga = grams(a);
  const gb = grams(b);
  let inter = 0;
  for (const g of ga) if (gb.has(g)) inter++;
  return inter / Math.max(1, ga.size + gb.size - inter);
}

export async function runReconciliationAgent(ctx: RunContext): Promise<void> {
  if (!checkEnabled(ctx, "reconciliation")) return;

  const tables = await loadTables(ctx.runId);
  const docs = await loadDocuments(ctx.runId);
  if (docs.length < 1) return;

  const totals = collectTotals(tables, docs);

  // ---- 1. Cross-document total mismatches ----
  for (const [key, hits] of [...totals.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const byDoc = new Map<string, TotalHit>();
    for (const h of hits) {
      // keep first (deterministic order from table scan)
      if (!byDoc.has(h.docId)) byDoc.set(h.docId, h);
    }
    if (byDoc.size < 2) continue;
    const [docA, docB] = [...byDoc.values()];
    const larger = Math.max(Math.abs(docA.value), Math.abs(docB.value));
    const diff = Math.abs(docA.value - docB.value);
    const relTolerance = Math.max(larger * 0.005, 1);
    if (diff <= relTolerance) continue;

    const finding = await addFinding(ctx, {
      title: `"${docA.label}" differs across documents`,
      category: "Cross-Document Reconciliation",
      severity: diff > larger * 0.05 ? "high" : "medium",
      description:
        `"${docA.label}" is reported as ${formatMoney(docA.value)} in "${docA.docName}" (p.${docA.page}) but ${formatMoney(docB.value)} in "${docB.docName}" (p.${docB.page}). ` +
        `Absolute variance is ${formatMoney(diff)} (${((diff / larger) * 100).toFixed(2)}%), exceeding the 0.5% reconciliation tolerance.`,
      recommendation: "Trace both figures to their underlying schedules; identify restatements, rounding-policy differences or omissions.",
      agent: "reconciliation",
    });
    for (const h of [docA, docB]) {
      await addCitation({
        runId: ctx.runId,
        findingId: finding.id,
        documentName: h.docName,
        documentId: h.docId,
        pageNumber: h.page,
        rawExcerpt: `${h.label}: ${formatMoney(h.value)} (from "${h.tableTitle}")`,
        bbox: h.bbox,
        confidence: 0.93,
      });
    }
  }

  // ---- 2. Balance-sheet internal tie ----
  const bsTables = tables.filter((t) => t.statementType === "balance_sheet");
  for (const t of bsTables.slice(0, 3)) {
    let totalAssets: number | null = null;
    let totalLiabEquity: number | null = null;
    for (let r = 0; r < t.rows.length; r++) {
      const label = labelKey(t.rows[r][0] ?? "");
      const lastNum = lastFinite(t.numericRows[r] ?? []);
      if (lastNum == null) continue;
      if (/^total assets/.test(label)) totalAssets = lastNum;
      if (/(equity and liabilities|liabilities and equity|total liabilities.*equity|^total equity & liabilities)/.test(label))
        totalLiabEquity = lastNum;
    }
    if (totalAssets != null && totalLiabEquity != null) {
      const diff = Math.abs(totalAssets - totalLiabEquity);
      const tol = Math.max(Math.abs(totalAssets) * 0.002, 1);
      if (diff > tol) {
        const finding = await addFinding(ctx, {
          title: "Balance sheet does not balance",
          category: "Statement Integrity",
          severity: "critical",
          description: `In "${t.title}", Total Assets (${formatMoney(totalAssets)}) does not equal Total Liabilities & Equity (${formatMoney(totalLiabEquity)}). Variance: ${formatMoney(diff)}.`,
          recommendation: "Re-run the trial balance; investigate unposted entries or misclassified accounts.",
          agent: "reconciliation",
        });
        await addCitation({
          runId: ctx.runId,
          findingId: finding.id,
          documentName: docNameOfTable(t, docs),
          documentId: t.documentId,
          pageNumber: t.pageNumber,
          rawExcerpt: `Total Assets: ${formatMoney(totalAssets)} vs Total Liabilities & Equity: ${formatMoney(totalLiabEquity)}`,
          bbox: t.bbox ?? null,
          confidence: 0.99,
        });
      }
    }
  }

  // ---- 3. Fuzzy line-item drift between same-type tables in different docs ----
  const byType = new Map<string, LoadedTable[]>();
  for (const t of tables) {
    if (t.statementType === "other" || t.rowCount < 4) continue;
    const list = byType.get(t.statementType) ?? [];
    list.push(t);
    byType.set(t.statementType, list);
  }
  for (const [, list] of byType) {
    const uniqueDocs = new Set(list.map((t) => t.documentId));
    if (uniqueDocs.size < 2) continue;
    const primary = list[0];
    const other = list.find((t) => t.documentId !== primary.documentId);
    if (!other) continue;

    let compared = 0;
    for (let r = 0; r < primary.rows.length && compared < 12; r++) {
      const label = (primary.rows[r][0] ?? "").trim();
      if (!label || TOTAL_LABEL_RE.test(label)) continue;
      const v1 = lastFinite(primary.numericRows[r] ?? []);
      if (v1 == null || Math.abs(v1) < 1) continue;
      // find best fuzzy match in other table
      let bestIdx = -1;
      let bestSim = 0;
      for (let r2 = 0; r2 < other.rows.length; r2++) {
        const sim = trigramSimilarity(label, (other.rows[r2][0] ?? "").trim());
        if (sim > bestSim) {
          bestSim = sim;
          bestIdx = r2;
        }
      }
      if (bestSim < 0.82) continue;
      const v2 = lastFinite(other.numericRows[bestIdx] ?? []);
      compared++;
      if (v2 == null || v2 === 0) continue;
      const relDiff = Math.abs(v1 - v2) / Math.max(Math.abs(v1), Math.abs(v2));
      if (relDiff > 0.05) {
        const finding = await addFinding(ctx, {
          title: `Line item "${label}" diverges between documents`,
          category: "Cross-Document Reconciliation",
          severity: relDiff > 0.25 ? "high" : "medium",
          description: `"${label}" shows ${formatMoney(v1)} in "${primary.title}" but ${formatMoney(v2)} in "${other.title}" — a ${(relDiff * 100).toFixed(1)}% divergence on a fuzzy-matched line pair (similarity ${(bestSim * 100).toFixed(0)}%).`,
          recommendation: "Confirm whether the divergence reflects genuine reclassification or an unexplained variance.",
          agent: "reconciliation",
        });
        await addCitation({
          runId: ctx.runId,
          findingId: finding.id,
          documentName: docNameOfTable(primary, docs),
          documentId: primary.documentId,
          pageNumber: primary.pageNumber,
          rawExcerpt: `${label}: ${formatMoney(v1)}`,
          bbox: primary.bbox ?? null,
          confidence: 0.85,
        });
        await addCitation({
          runId: ctx.runId,
          findingId: finding.id,
          documentName: docNameOfTable(other, docs),
          documentId: other.documentId,
          pageNumber: other.pageNumber,
          rawExcerpt: `${(other.rows[bestIdx][0] ?? "").trim()}: ${formatMoney(v2)}`,
          bbox: other.bbox ?? null,
          confidence: 0.85,
        });
      }
    }
  }
}

function lastFinite(row: (number | null)[]): number | null {
  for (let i = row.length - 1; i >= 1; i--) {
    const v = row[i];
    if (v != null && Number.isFinite(v)) return v;
  }
  return null;
}

function docNameOfTable(t: LoadedTable, docs: LoadedDoc[]): string {
  return docs.find((d) => d.id === t.documentId)?.name ?? t.title.split(" · ")[0];
}

function formatMoney(v: number): string {
  return parseNumber(v.toFixed(2))?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? String(v);
}
