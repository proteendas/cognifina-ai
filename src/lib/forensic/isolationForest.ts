import { round, safeDiv } from "./numbers";
import { mean, stdev } from "./stats";

/**
 * Isolation Forest — dependency-free deterministic implementation.
 * Builds an ensemble of random isolation trees with a seeded PRNG so runs are
 * fully reproducible ("Statistics lead. Models follow.": same input ⇒ same anomalies).
 */

export type JournalEntry = {
  index: number;
  date?: string | null;
  account?: string | null;
  description?: string | null;
  amount: number;
};

export type AnomalyHit = {
  entryIndex: number;
  anomalyScore: number; // 0..1, higher = more anomalous
  isAnomaly: boolean;
  reasons: string[];
  entry: JournalEntry;
};

export type IsolationForestResult = {
  n: number;
  trees: number;
  contamination: number;
  flagged: number;
  threshold: number;
  hits: AnomalyHit[];
};

/** Mulberry32 seeded PRNG — deterministic across platforms. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type TreeNode =
  | { kind: "leaf"; size: number }
  | { kind: "split"; feature: number; threshold: number; left: TreeNode; right: TreeNode };

type FeatureRow = { features: number[]; entry: JournalEntry; reasons: Map<number, string> };

function isWeekend(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

function hasTimeComponent(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  return /T\d{2}:\d{2}/.test(dateStr);
}

function offHours(dateStr?: string | null): boolean {
  if (!dateStr || !hasTimeComponent(dateStr)) return false;
  const h = new Date(dateStr).getUTCHours();
  return h < 6 || h >= 22;
}

function buildFeatureRows(entries: JournalEntry[]): FeatureRow[] {
  const accountFreq = new Map<string, number>();
  for (const e of entries) {
    const key = e.account ?? "";
    accountFreq.set(key, (accountFreq.get(key) ?? 0) + 1);
  }
  const maxFreq = Math.max(1, ...accountFreq.values());

  return entries.map((e) => {
    const absAmount = Math.abs(e.amount);
    const logAmount = Math.log10(Math.max(absAmount, 1));
    const roundSum100 = absAmount > 0 && absAmount % 100 === 0 ? 1 : 0;
    const roundSum1k = absAmount > 0 && absAmount % 1000 === 0 ? 1 : 0;
    const weekend = isWeekend(e.date) ? 1 : 0;
    const afterHours = offHours(e.date) ? 1 : 0;
    const freq = safeDiv(accountFreq.get(e.account ?? "") ?? 0, maxFreq) ?? 0;

    const reasons = new Map<number, string>();
    if (roundSum1k) reasons.set(2, "Round-sum amount (multiple of 1,000)");
    else if (roundSum100) reasons.set(2, "Round-sum amount (multiple of 100)");
    if (weekend) reasons.set(3, "Posted on a weekend");
    if (afterHours) reasons.set(4, "Posted outside business hours");
    if ((accountFreq.get(e.account ?? "") ?? 0) === 1 && absAmount > 0)
      reasons.set(5, "Unique/one-off account in the ledger");

    return {
      features: [logAmount, absAmount, roundSum100 + roundSum1k, weekend, afterHours, freq],
      entry: e,
      reasons,
    };
  });
}

function iTree(rows: FeatureRow[], depth: number, maxDepth: number, rand: () => number): TreeNode {
  if (depth >= maxDepth || rows.length <= 1) return { kind: "leaf", size: rows.length };
  const nFeatures = rows[0].features.length;
  // Choose feature with actual variance
  const candidates: number[] = [];
  for (let f = 0; f < nFeatures; f++) {
    let min = Infinity;
    let max = -Infinity;
    for (const r of rows) {
      const v = r.features[f];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (max > min) candidates.push(f);
  }
  if (candidates.length === 0) return { kind: "leaf", size: rows.length };

  const feature = candidates[Math.floor(rand() * candidates.length)];
  const values = rows.map((r) => r.features[feature]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const threshold = min + rand() * (max - min);

  const left: FeatureRow[] = [];
  const right: FeatureRow[] = [];
  for (const r of rows) (r.features[feature] < threshold ? left : right).push(r);

  return {
    kind: "split",
    feature,
    threshold,
    left: iTree(left, depth + 1, maxDepth, rand),
    right: iTree(right, depth + 1, maxDepth, rand),
  };
}

function pathLength(node: TreeNode, row: FeatureRow[], depth: number): number {
  if (node.kind === "leaf") return depth + cFactor(node.size);
  const value = row[0].features[node.feature];
  return pathLength(value < node.threshold ? node.left : node.right, row, depth + 1);
}

/** Average unsuccessful BST search length c(n). */
function cFactor(n: number): number {
  if (n <= 1) return 0;
  return 2 * (Math.log(n - 1) + 0.5772156649);
}

export function isolationForest(
  entries: JournalEntry[],
  opts: { nTrees?: number; subsampleSize?: number; contamination?: number; seed?: number } = {}
): IsolationForestResult | null {
  const nTrees = opts.nTrees ?? 100;
  const psi = opts.subsampleSize ?? 256;
  const contamination = opts.contamination ?? 0.02;
  const seed = opts.seed ?? 42;

  if (entries.length < 30) return null;

  const rows = buildFeatureRows(entries);
  const rand = mulberry32(seed);
  const maxDepth = Math.ceil(Math.log2(Math.max(psi, 2)));

  const trees: TreeNode[] = [];
  for (let t = 0; t < nTrees; t++) {
    const subsample: FeatureRow[] = [];
    const usedIdx = new Set<number>();
    const take = Math.min(psi, rows.length);
    while (subsample.length < take) {
      const i = Math.floor(rand() * rows.length);
      if (!usedIdx.has(i)) {
        usedIdx.add(i);
        subsample.push(rows[i]);
      }
    }
    trees.push(iTree(subsample, 0, maxDepth, rand));
  }

  // Score all rows
  const scored = rows.map((row, idx) => {
    let total = 0;
    for (const tree of trees) total += pathLength(tree, [row], 0);
    const avgLen = total / trees.length;
    const score = Math.pow(2, -avgLen / cFactor(Math.min(psi, rows.length)));
    return { idx, row, score };
  });

  // Threshold = (1-contamination) quantile
  const sortedScores = [...scored].map((s) => s.score).sort((a, b) => a - b);
  const qIndex = Math.min(sortedScores.length - 1, Math.floor((1 - contamination) * sortedScores.length));
  const threshold = sortedScores[qIndex];

  const hits: AnomalyHit[] = scored
    .filter((s) => s.score > threshold)
    .map(({ idx, row, score }) => ({
      entryIndex: idx,
      anomalyScore: round(score, 4),
      isAnomaly: true,
      reasons: [...row.reasons.entries()].sort((a, b) => a[0] - b[0]).map(([, text]) => text),
      entry: row.entry,
    }))
    .sort((a, b) => b.anomalyScore - a.anomalyScore);

  return {
    n: entries.length,
    trees: nTrees,
    contamination,
    flagged: hits.length,
    threshold: round(threshold, 4),
    hits,
  };
}

/** Amount volatility profile used by the ratio agent. */
export function volatilityProfile(values: number[]): { mean: number; stdev: number; cv: number } | null {
  if (values.length < 3) return null;
  const m = mean(values);
  const s = stdev(values);
  const cv = m !== 0 ? Math.abs(s / m) : NaN;
  return { mean: round(m, 4), stdev: round(s, 4), cv: Number.isFinite(cv) ? round(cv, 4) : NaN };
}
