import { db } from "@/db";
import { entityNodes, entityEdges } from "@/db/schema";
import { entityExtractSchema } from "@/lib/ai/client";
import { ENTITY_EXTRACTION_SYSTEM } from "@/lib/ai/prompts";
import { budgetSegments, completeJSON } from "@/lib/ai/client";
import { fnv1a } from "@/lib/utils";
import { loadBlocks, type RunContext } from "./context";

/**
 * AGENT 3 — Entity Resolution & Registry Verifier.
 * Deterministic regex extraction first; optional LLM-assisted pass merged in
 * with deduplication. Output is a node-link corporate ownership graph.
 */

type ExtractedEntity = {
  key: string;
  name: string;
  type: string;
  attrs: Record<string, string>;
  confidence: number;
};

type ExtractedEdge = {
  sourceKey: string;
  targetKey: string;
  relation: string;
  weight: number;
  confidence: number;
};

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(pvt|private|ltd|limited|llc|inc|corp|co|company|gmbh|llp|plc)\b\.?/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const COMPANY_RE =
  /\b([A-Z][A-Za-z0-9&.,'’-]*(?:\s+[A-Z][A-Za-z0-9&.,'’-]*){0,4}\s+(?:Pvt\.?|Private|PRIVATE|PVT\.?|Ltd\.?|Limited|LIMITED|LTD\.?|LLC|Inc\.?|INC\.?|Corp\.?|GmbH|LLP|PLC|Co\.))\b/g;
const DIRECTOR_RE =
  /\b(?:board\s+of\s+)?directors?\b[^A-Za-z]{0,8}((?:Mr\.?|Ms\.?|Mrs\.?|Dr\.?)?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/gi;
const DIN_RE = /\bDIN\s*[:\-]?\s*(\d{8})\b/gi;
// "… Robert Vale holds 72.4% of Acme Holdings Private Limited" (explicit target)
const OWNERSHIP_OF_RE =
  /([A-Z][A-Za-z .,'&-]{1,40}?)\s+(?:holds?|owns?|beneficially owns?)\s+(?:approximately\s+)?(\d{1,3}(?:\.\d+)?)\s*%\s*of\s+([A-Z][A-Za-z .,'&-]{1,60}?)(?=\.|,|;|\n|$)/g;
// "Acme Holdings is owned by / controlled by Robert Vale" (subject-first)
const OWNERSHIP_RE =
  /\b([A-Z][A-Za-z0-9&.,'’\- ]{2,60}?)\s+(?:is owned by|is controlled by|controlled by)\s+([A-Z][A-Za-z .,'&-]{2,48}?)(?=\.|,|;|\n|$)/g;
const SUBSIDIARY_RE =
  /\b([A-Z][A-Za-z0-9&.,'’\- ]{2,60}?)\s+(?:is\s+)?(?:a\s+)?(wholly[- ]owned\s+)?subsidiary\s+of\s+([A-Z][A-Za-z0-9&.,'’\- ]{2,60}?)(?=\.|,|;|\n|$)/g;
const CIN_RE = /\b([UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6})\b/g;
const PAN_RE = /\b([A-Z]{5}\d{4}[A-Z])\b/g;
const GSTIN_RE = /\b(\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z][A-Z\d])\b/g;

export async function runEntityAgent(ctx: RunContext): Promise<void> {
  const blocks = await loadBlocks(ctx.runId);
  const nodes = new Map<string, ExtractedEntity>();
  const edges: ExtractedEdge[] = [];

  const addNode = (name: string, type: string, attrs: Record<string, string> = {}, confidence = 0.85) => {
    const clean = name.trim().replace(/\s+/g, " ");
    if (clean.length < 3 || clean.length > 90) return null;
    const key = `n-${fnv1a(normalizeName(clean) || clean)}`;
    const existing = nodes.get(key);
    if (existing) {
      existing.attrs = { ...existing.attrs, ...attrs };
      existing.confidence = Math.max(existing.confidence, confidence);
      return key;
    }
    nodes.set(key, { key, name: clean, type, attrs, confidence });
    return key;
  };

  const fullText = blocks
    .slice()
    .sort((a, b) => a.seq - b.seq)
    .map((b) => b.text)
    .join("\n");

  // --- deterministic regex passes ---
  for (const m of fullText.matchAll(COMPANY_RE)) addNode(m[1], "company", {}, 0.8);
  for (const m of fullText.matchAll(DIRECTOR_RE)) {
    const name = m[1]
      .replace(/^(Mr\.?|Ms\.?|Mrs\.?|Dr\.?)\s*/i, "")
      .replace(/[^A-Za-z\s'-]+$/, "")
      .trim();
    if (name.split(/\s+/).length >= 2) addNode(name, "person", { role: "Director" }, 0.75);
  }
  for (const m of fullText.matchAll(DIN_RE)) {
    for (const [, node] of nodes) {
      if (node.attrs.din === undefined && node.type === "person") {
        node.attrs.din = m[1];
        break;
      }
    }
  }
  // Explicit "X holds N% of Y" — most precise form
  for (const m of fullText.matchAll(OWNERSHIP_OF_RE)) {
    const ownerKey = addNode(m[1].trim(), "ubo", {}, 0.92);
    const pct = Number(m[2]);
    const targetKey = addNode(m[3].replace(/[^A-Za-z\s&.'-]+$/, "").trim(), "company", {}, 0.9);
    if (ownerKey && targetKey) {
      edges.push({ sourceKey: ownerKey, targetKey, relation: `holds ${pct}%`, weight: pct / 100, confidence: 0.9 });
    }
  }
  // Subject-first "X is owned by / controlled by Y"
  for (const m of fullText.matchAll(OWNERSHIP_RE)) {
    const targetKey = addNode(m[1].trim(), "company", {}, 0.85);
    const ownerKey = addNode(m[2].trim(), "ubo", {}, 0.85);
    if (ownerKey && targetKey) {
      edges.push({ sourceKey: ownerKey, targetKey, relation: "controls", weight: 1, confidence: 0.82 });
    }
  }
  for (const m of fullText.matchAll(SUBSIDIARY_RE)) {
    const subKey = addNode(m[1].trim(), "subsidiary", {}, 0.85);
    const parentKey = addNode(m[3].trim(), "company", {}, 0.85);
    if (subKey && parentKey) {
      edges.push({
        sourceKey: parentKey,
        targetKey: subKey,
        relation: m[2] ? "wholly owns" : "parent of",
        weight: m[2] ? 1 : 0.75,
        confidence: 0.85,
      });
    }
  }
  const cinMatches = [...fullText.matchAll(CIN_RE)].map((m) => m[1]);
  if (cinMatches.length > 0) {
    const subjectKey = ensureSubject(addNode, ctx.entityName, nodes);
    if (subjectKey) nodes.get(subjectKey)!.attrs.cin = cinMatches[0];
  }
  const panMatches = [...new Set([...fullText.matchAll(PAN_RE)].map((m) => m[1]))];
  const gstinMatches = [...new Set([...fullText.matchAll(GSTIN_RE)].map((m) => m[1]))];
  if ((panMatches.length > 0 || gstinMatches.length > 0) && nodes.size > 0) {
    const subjectKey = ensureSubject(addNode, ctx.entityName, nodes);
    if (subjectKey) {
      if (panMatches[0]) nodes.get(subjectKey)!.attrs.pan = panMatches[0];
      if (gstinMatches[0]) nodes.get(subjectKey)!.attrs.gstin = gstinMatches[0];
    }
  }

  // --- optional LLM-assisted pass ---
  if (ctx.credential) {
    try {
      const segments = blocks.slice(0, 400).map((b, i) => ({ id: `seg-${i}`, text: b.text }));
      const pack = budgetSegments(segments, 14000).map((s) => `[${s.id}] ${s.text}`).join("\n\n");
      const { data } = await completeJSON({
        credential: ctx.credential,
        system: ENTITY_EXTRACTION_SYSTEM,
        prompt: `Subject entity under review: "${ctx.entityName}".\n\nExcerpts:\n${pack}`,
        schema: entityExtractSchema,
        maxTokens: 3000,
      });

      for (const e of data.entities) {
        addNode(e.name, e.type, e.attributes, Math.min(0.95, e.confidence * 0.95));
      }
      for (const r of data.relationships) {
        const fromKey =
          [...nodes.values()].find((n) => normalizeName(n.name) === normalizeName(r.from))?.key ??
          addNode(r.from, "company", {}, r.confidence * 0.9);
        const toKey =
          [...nodes.values()].find((n) => normalizeName(n.name) === normalizeName(r.to))?.key ??
          addNode(r.to, "company", {}, r.confidence * 0.9);
        if (fromKey && toKey) {
          edges.push({ sourceKey: fromKey, targetKey: toKey, relation: r.relation, weight: 1, confidence: r.confidence * 0.9 });
        }
      }
    } catch {
      // LLM pass is best-effort only — regex graph stands on its own
    }
  }

  if (nodes.size === 0) {
    ensureSubject(addNode, ctx.entityName, nodes);
  }

  // Deduplicate edges deterministically
  const seen = new Set<string>();
  const uniqueEdges = edges
    .filter((e) => {
      const k = `${e.sourceKey}|${e.targetKey}|${e.relation}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.sourceKey.localeCompare(b.sourceKey) || a.targetKey.localeCompare(b.targetKey));

  const nodeRows = [...nodes.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((n) => ({
      runId: ctx.runId,
      key: n.key,
      name: n.name,
      type: n.type,
      attrs: n.attrs,
      confidence: n.confidence,
    }));
  if (nodeRows.length > 0) await db.insert(entityNodes).values(nodeRows);
  if (uniqueEdges.length > 0)
    await db.insert(entityEdges).values(
      uniqueEdges.map((e) => ({
        runId: ctx.runId,
        sourceKey: e.sourceKey,
        targetKey: e.targetKey,
        relation: e.relation,
        weight: e.weight,
        confidence: e.confidence,
      }))
    );
}

function ensureSubject(
  addNode: (name: string, type: string, attrs?: Record<string, string>, confidence?: number) => string | null,
  entityName: string,
  nodes: Map<string, ExtractedEntity>
): string | null {
  const name = entityName?.trim() || "Subject Entity";
  const existing = [...nodes.values()].find(
    (n) => n.type === "company" && normalizeName(n.name) === normalizeName(name)
  );
  if (existing) return existing.key;
  return addNode(name, "company", { subject: "true" }, 1);
}
