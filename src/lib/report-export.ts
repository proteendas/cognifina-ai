import type { RunDetailDto } from "@/lib/types";

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 } as const;

/**
 * Assemble the downloadable forensic report: the compiled markdown report,
 * a findings register and a citation annexure keyed by finding ref.
 */
export function buildReportMarkdown(data: RunDetailDto): string {
  const { run, findings, citations, documents, metrics } = data;
  const lines: string[] = [];

  lines.push(`# Forensic Report — ${run.entityName || "Unnamed entity"}`);
  lines.push("");
  lines.push(`- **Workflow:** ${run.workflowName}`);
  if (run.periodLabel) lines.push(`- **Period:** ${run.periodLabel}`);
  lines.push(`- **Run ID:** \`${run.id}\``);
  lines.push(`- **Generated:** ${new Date().toISOString()} (UTC)`);
  if (run.riskScore != null) lines.push(`- **Risk score:** ${run.riskScore}/100 (${run.riskBand ?? "unbanded"})`);
  lines.push(`- **Deterministic:** same evidence + scope reproduces this report bit-for-bit.`);
  lines.push("");
  lines.push("---");
  lines.push("");

  if (run.reportMd) {
    lines.push(run.reportMd.trim());
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  // findings register
  const ranked = [...findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.ref.localeCompare(b.ref)
  );
  if (ranked.length > 0) {
    lines.push("## Findings register");
    lines.push("");
    for (const f of ranked) {
      lines.push(`### ${f.ref} · ${f.severity.toUpperCase()} — ${f.title}`);
      lines.push(`*Category:* ${f.category} · *Agent:* ${f.agent}${f.metricRef ? ` · *Metric:* ${f.metricRef}` : ""}`);
      lines.push("");
      lines.push(f.description);
      if (f.recommendation) {
        lines.push("");
        lines.push(`**Recommended action:** ${f.recommendation}`);
      }
      lines.push("");
    }
  }

  // metrics register
  if (metrics.length > 0) {
    lines.push("## Deterministic metrics");
    lines.push("");
    for (const m of metrics) {
      lines.push(`- **${m.ref} · ${m.displayName}** — ${m.verdict} (${m.severity})`);
    }
    lines.push("");
  }

  // evidence register
  if (documents.length > 0) {
    lines.push("## Evidence register");
    lines.push("");
    for (const d of documents) {
      lines.push(`- ${d.name} — ${d.pageCount} page(s), ${d.parseMode}, sha256 \`${d.sha256.slice(0, 16)}…\`${d.scannedPages.length ? ` · scanned pages: ${d.scannedPages.join(", ")}` : ""}`);
    }
    lines.push("");
  }

  // citation annexure
  if (citations.length > 0) {
    lines.push("## Citation annexure");
    lines.push("");
    lines.push("| Finding | Document | Page | Excerpt | Confidence |");
    lines.push("|---|---|---|---|---|");
    for (const c of citations) {
      const findingRef = findings.find((f) => f.id === c.findingId)?.ref ?? "—";
      const excerpt = c.rawExcerpt.replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 140);
      lines.push(`| ${findingRef} | ${c.documentName} | ${c.pageNumber} | ${excerpt}${c.rawExcerpt.length > 140 ? "…" : ""} | ${(c.confidence * 100).toFixed(0)}% |`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("*Compiled by Cognifina — deterministic forensic & compliance AI. Math before Models.*");
  return lines.join("\n");
}

/** Trigger a client-side download of the assembled report. */
export function downloadReport(data: RunDetailDto): void {
  const md = buildReportMarkdown(data);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `cognifina-report-${(data.run.entityName || "run").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${stamp}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
