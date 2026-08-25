/** Numeric parsing/formatting helpers shared by extraction and forensic code. */

const CLEAN_RE = /[,\s'’\u00A0]/g;

/**
 * Parse a human/ledger formatted number.
 * Handles: "1,234.56", "(1,234)" negatives, "$1.2M"/"₹4.5 Cr" style suffixes,
 * trailing dashes as negatives, percentages.
 * Returns null when no numeric value can be extracted.
 */
export function parseNumber(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  let s = String(raw).trim();
  if (!s || s === "-" || s === "–") return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (/-$/.test(s)) {
    negative = true;
    s = s.slice(0, -1);
  }
  if (/^[-–]/.test(s)) {
    negative = true;
    s = s.slice(1);
  }

  const suffixMatch = s.match(/(cr|crore|mn|m|mm|k|bn|b)\.?$/i);
  let multiplier = 1;
  if (suffixMatch) {
    const suf = suffixMatch[1].toLowerCase();
    if (suf === "k") multiplier = 1e3;
    else if (suf === "m" || suf === "mm" || suf === "mn") multiplier = 1e6;
    else if (suf === "bn" || suf === "b") multiplier = 1e9;
    else if (suf === "cr" || suf === "crore") multiplier = 1e7;
    s = s.slice(0, s.length - suffixMatch[0].length);
  }

  s = s.replace(CLEAN_RE, "").replace(/[^0-9.\-+eE]/g, "");
  if (!s || !/\d/.test(s)) return null;

  // Guard against multi-dot artifacts like "1.2.3"
  const firstDot = s.indexOf(".");
  if (firstDot !== -1 && s.indexOf(".", firstDot + 1) !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }

  const value = Number(s);
  if (!Number.isFinite(value)) return null;
  return (negative ? -value : value) * multiplier;
}

export function round(value: number, digits = 4): number {
  const f = Math.pow(10, digits);
  return Math.round(value * f) / f;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function safeDiv(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return a / b;
}
