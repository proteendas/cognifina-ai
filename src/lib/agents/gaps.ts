import {
  addFinding,
  addCitation,
  checkEnabled,
  corpusText,
  loadBlocks,
  loadDocuments,
  type RunContext,
} from "./context";

/**
 * AGENT 5 — Gap & Omission Detection.
 * Checklist-driven missing-evidence detection, invoice-sequence discontinuity,
 * and scanned-page coverage warnings.
 */

const INVOICE_SEQ_RE = /(?:inv|invoice|bill|tax invoice)\s*(?:no\.?|#)?\s*[:\-]?\s*([0-9]{3,9})/gi;

export async function runGapAgent(ctx: RunContext): Promise<void> {
  const docs = await loadDocuments(ctx.runId);

  // ---- 1. Workflow checklist omissions ----
  if (checkEnabled(ctx, "gaps")) {
    const corpus = await corpusText(ctx.runId);
    for (const item of ctx.workflow.checklist) {
      const found = item.expectAny.some((kw) => corpus.includes(kw.toLowerCase()));
      if (found) continue;
      const anchorDoc = docs[0];
      const finding = await addFinding(ctx, {
        title: `Missing evidence: ${item.label}`,
        category: "Documentation Gaps",
        severity: "medium",
        description: `The uploaded document set contains no reference to "${item.expectAny.join('" or "')}". For the ${ctx.workflow.name} workflow this item is expected evidence ("${item.label}") and its absence prevents full-scope conclusion.`,
        recommendation: `Provide documentation covering: ${item.label}. Expected sources include ${(ctx.workflow.recommendedDocs.slice(0, 2).join(", ")) || "primary financial records"}.`,
        agent: "gaps",
      });
      if (anchorDoc) {
        await addCitation({
          runId: ctx.runId,
          findingId: finding.id,
          documentName: anchorDoc.name,
          documentId: anchorDoc.id,
          pageNumber: 1,
          rawExcerpt: `Corpus searched for "${item.expectAny.join('", "')}" — no match in ${docs.length} document(s), ${anchorDoc.pageCount}+ pages.`,
          bbox: null,
          confidence: 0.9,
        });
      }
    }
  }

  // ---- 2. Invoice sequence discontinuities ----
  const blocks = await loadBlocks(ctx.runId);
  const numbersByPrefix: number[] = [];
  for (const b of blocks) {
    for (const m of b.text.matchAll(INVOICE_SEQ_RE)) {
      const n = Number(m[1]);
      if (Number.isFinite(n)) numbersByPrefix.push(n);
    }
    if (numbersByPrefix.length > 4000) break;
  }
  const uniqueSorted = [...new Set(numbersByPrefix)].sort((a, b) => a - b).slice(0, 2000);
  if (uniqueSorted.length >= 10) {
    const gaps: { from: number; to: number; missing: number }[] = [];
    for (let i = 1; i < uniqueSorted.length; i++) {
      const span = uniqueSorted[i] - uniqueSorted[i - 1];
      if (span > 1 && span <= 25) {
        gaps.push({ from: uniqueSorted[i - 1], to: uniqueSorted[i], missing: span - 1 });
      }
    }
    const totalMissing = gaps.reduce((acc, g) => acc + g.missing, 0);
    if (gaps.length > 0 && totalMissing >= 3) {
      const sample = gaps
        .slice(0, 5)
        .map((g) => `${g.from}→${g.to} (${g.missing} missing)`)
        .join(", ");
      const finding = await addFinding(ctx, {
        title: `${totalMissing} invoice numbers missing from observed sequences`,
        category: "Sequence Integrity",
        severity: totalMissing > 10 ? "high" : "medium",
        description: `Sequential invoice/bill numbers show ${gaps.length} discontinuity points totalling ${totalMissing} unobserved numbers. Sample gaps: ${sample}. Missing sequence members can indicate deleted, suppressed or off-book transactions.`,
        recommendation: "Reconcile the numbering series against the source register and obtain explanations for each gap.",
        agent: "gaps",
      });
      const anchorDoc = docs[0];
      if (anchorDoc) {
        await addCitation({
          runId: ctx.runId,
          findingId: finding.id,
          documentName: anchorDoc.name,
          documentId: anchorDoc.id,
          pageNumber: Math.min(anchorDoc.pageCount, blocks[0]?.pageNumber ?? 1),
          rawExcerpt: `Observed series sample: ${uniqueSorted.slice(0, 8).join(", ")}…`,
          bbox: null,
          confidence: 0.88,
        });
      }
    }
  }

  // ---- 3. Scanned-page coverage warning ----
  const scannedDocs = docs.filter((d) => (d.scannedPages?.length ?? 0) > 0);
  if (scannedDocs.length > 0) {
    const pagesTotal = scannedDocs.reduce((acc, d) => acc + d.scannedPages.length, 0);
    const finding = await addFinding(ctx, {
      title: `${pagesTotal} scanned page(s) lack a machine-readable text layer`,
      category: "Coverage",
      severity: pagesTotal > 5 ? "medium" : "low",
      description: `Documents ${scannedDocs.map((d) => `"${d.name}"`).join(", ")} contain ${pagesTotal} page(s) with no extractable text. These pages were not analysed by the deterministic engines, which narrows the assurance scope.`,
      recommendation:
        "Re-export the source files with a text layer, or run OCR before uploading, so every page enters the analysis population.",
      agent: "gaps",
    });
    const firstScanned = scannedDocs[0];
    await addCitation({
      runId: ctx.runId,
      findingId: finding.id,
      documentName: firstScanned.name,
      documentId: firstScanned.id,
      pageNumber: firstScanned.scannedPages[0],
      rawExcerpt: `[Page ${firstScanned.scannedPages[0]} rendered as image — no text layer detected by the parser]`,
      bbox: null,
      confidence: 1.0,
    });
  }
}
