import { safeDiv, round } from "./numbers";

/**
 * Beneish M-Score — 8-variable earnings manipulation index.
 * M = -4.84 + 0.920·DSRI + 0.528·GMI + 0.404·AQI + 0.892·SGI
 *     + 0.115·DEPI − 0.172·SGAI + 4.037·TATA + 0.327? — no: + 0.3284? — see COEFFS
 * Flag threshold: M > -1.78 ⇒ elevated manipulation risk.
 *
 * Accepts flexible field aliases so extracted statements map cleanly.
 */

export type FinancialPeriod = Record<string, number | null | undefined>;

const FIELD_ALIASES: Record<string, string[]> = {
  // The canonical camelCase key is always accepted first (agents pass
  // statement-field objects keyed by canonical names).
  accountsReceivable: ["accountsReceivable", "accounts_receivable", "receivables", "debtors", "trade_receivables", "ar"],
  sales: ["sales", "revenue", "total_revenue", "turnover", "net_sales", "sales_revenue"],
  grossProfit: ["grossProfit", "gross_profit", "gross_margin_value"],
  cogs: ["cogs", "cost_of_goods_sold", "cost_of_sales"],
  currentAssets: ["currentAssets", "current_assets", "ca", "total_current_assets"],
  ppe: ["ppe", "fixed_assets", "property_plant_equipment", "net_block", "tangible_assets"],
  totalAssets: ["totalAssets", "total_assets", "ta"],
  depreciation: ["depreciation", "dep_amort", "depreciation_amortisation"],
  sga: ["sga", "selling_general_admin", "admin_expenses"],
  incomeFromContinuingOps: ["incomeFromContinuingOps", "net_income", "profit_before_tax", "pbt", "operating_income", "ebit", "earnings"],
  cashFlowOperations: ["cashFlowOperations", "cash_flow_operations", "cfo", "operating_cash_flow", "net_cash_operating_activities"],
  longTermDebt: ["longTermDebt", "long_term_debt", "total_debt", "borrowings", "ltl"],
  currentLiabilities: ["currentLiabilities", "current_liabilities", "cl"],
};

function pick(period: FinancialPeriod, canonical: string): number | null {
  for (const alias of FIELD_ALIASES[canonical]) {
    const v = (period as Record<string, unknown>)[alias];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

export type RatioResult = { name: string; value: number | null; missing?: string[] };

export type BeneishResult = {
  available: boolean;
  missingFields: string[];
  ratios: Record<string, number | null>;
  mScore: number | null;
  flagged: boolean;
  interpretation: string;
};

/**
 * Coefficients follow the platform specification:
 *   M = -4.84 + 0.920·DSRI + 0.528·GMI + 0.404·AQI + 0.892·SGI
 *       + 0.115·DEPI − 0.172·SGAI + 4.037·TATA + 0.0327·LVGI
 * NOTE: the original Beneish (1999) paper uses 4.679·TATA − 0.327·LVGI.
 * Both variants are provided; SPEC_COEFFS is the default so outputs match
 * the platform contract.
 */
export const BENEISH_SPEC_COEFFS = {
  intercept: -4.84,
  DSRI: 0.92,
  GMI: 0.528,
  AQI: 0.404,
  SGI: 0.892,
  DEPI: 0.115,
  SGAI: -0.172,
  LVGI: 0.0327,
  TATA: 4.037,
} as const;

export const BENEISH_CANONICAL_COEFFS = {
  intercept: -4.84,
  DSRI: 0.92,
  GMI: 0.528,
  AQI: 0.404,
  SGI: 0.892,
  DEPI: 0.115,
  SGAI: -0.172,
  LVGI: -0.327,
  TATA: 4.679,
} as const;

export const BENEISH_COEFFICIENTS = BENEISH_SPEC_COEFFS;

export function computeBeneish(current: FinancialPeriod, prior: FinancialPeriod): BeneishResult {
  const missing: string[] = [];

  const arC = pick(current, "accountsReceivable");
  const arP = pick(prior, "accountsReceivable");
  const salesC = pick(current, "sales");
  const salesP = pick(prior, "sales");

  const gpC = pick(current, "grossProfit") ?? (() => {
    const s = pick(current, "sales");
    const cogs = pick(current, "cogs");
    return s != null && cogs != null ? s - cogs : null;
  })();
  const gpP = pick(prior, "grossProfit") ?? (() => {
    const s = pick(prior, "sales");
    const cogs = pick(prior, "cogs");
    return s != null && cogs != null ? s - cogs : null;
  })();

  const caC = pick(current, "currentAssets");
  const caP = pick(prior, "currentAssets");
  const ppeC = pick(current, "ppe");
  const ppeP = pick(prior, "ppe");
  const taC = pick(current, "totalAssets");
  const taP = pick(prior, "totalAssets");
  const depC = pick(current, "depreciation");
  const depP = pick(prior, "depreciation");
  const sgaC = pick(current, "sga");
  const sgaP = pick(prior, "sga");
  const debtC = pick(current, "longTermDebt");
  const debtP = pick(prior, "longTermDebt");
  const incomeC = pick(current, "incomeFromContinuingOps");
  const cfoC = pick(current, "cashFlowOperations");

  // DSRI — Days Sales in Receivables Index
  const dsri = (() => {
    if (arC == null || salesC == null || arP == null || salesP == null) return null;
    return safeDiv(safeDiv(arC, salesC), safeDiv(arP, salesP));
  })();

  // GMI — Gross Margin Index (prior GM / current GM)
  const gmi = (() => {
    const gmC = safeDiv(gpC, salesC);
    const gmP = safeDiv(gpP, salesP);
    return safeDiv(gmP, gmC);
  })();

  // AQI — Asset Quality Index (soft assets ratio)
  const aqi = (() => {
    if (taC == null || taP == null) return null;
    const softC = taC - ((caC ?? 0) + (ppeC ?? 0));
    const softP = taP - ((caP ?? 0) + (ppeP ?? 0));
    return safeDiv(safeDiv(softC, taC), safeDiv(softP, taP));
  })();

  // SGI — Sales Growth Index
  const sgi = safeDiv(salesC, salesP);

  // DEPI — Depreciation Index (rate slows => higher future earnings)
  const depi = (() => {
    if (depP == null || ppeP == null || depC == null || ppeC == null) return null;
    const rateP = safeDiv(depP, depP + ppeP);
    const rateC = safeDiv(depC, depC + ppeC);
    return safeDiv(rateP, rateC);
  })();

  // SGAI — SG&A to Sales index
  const sgai = (() => {
    return safeDiv(safeDiv(sgaC, salesC), safeDiv(sgaP, salesP));
  })();

  // LVGI — Leverage Index
  const lvgi = safeDiv(safeDiv(debtC, taC), safeDiv(debtP, taP));

  // TATA — Total Accruals to Total Assets
  const tata = (() => {
    if (incomeC == null || cfoC == null || taC == null) return null;
    return safeDiv(incomeC - cfoC, taC);
  })();

  const parts: Record<string, number | null> = { DSRI: dsri, GMI: gmi, AQI: aqi, SGI: sgi, DEPI: depi, SGAI: sgai, LVGI: lvgi, TATA: tata };
  for (const [k, v] of Object.entries(parts)) {
    if (v == null) missing.push(k);
  }

  const allPresent = missing.length === 0;
  let mScore: number | null = null;
  if (allPresent) {
    mScore =
      BENEISH_COEFFICIENTS.intercept +
      BENEISH_COEFFICIENTS.DSRI * (dsri as number) +
      BENEISH_COEFFICIENTS.GMI * (gmi as number) +
      BENEISH_COEFFICIENTS.AQI * (aqi as number) +
      BENEISH_COEFFICIENTS.SGI * (sgi as number) +
      BENEISH_COEFFICIENTS.DEPI * (depi as number) +
      BENEISH_COEFFICIENTS.SGAI * (sgai as number) +
      BENEISH_COEFFICIENTS.LVGI * (lvgi as number) +
      BENEISH_COEFFICIENTS.TATA * (tata as number);
  }

  const flagged = mScore != null && mScore > -1.78;
  const interpretation =
    mScore == null
      ? `Insufficient inputs to compute M-Score. Missing: ${missing.join(", ")}.`
      : flagged
        ? `M-Score ${round(mScore, 3)} > −1.78 — the model classifies the entity in the manipulation-risk zone.`
        : `M-Score ${round(mScore, 3)} ≤ −1.78 — below the standard manipulation-risk threshold.`;

  return {
    available: allPresent,
    missingFields: missing,
    ratios: Object.fromEntries(Object.entries({ ...parts }).map(([k, v]) => [k, v == null ? null : round(v, 5)])),
    mScore: mScore == null ? null : round(mScore, 4),
    flagged,
    interpretation,
  };
}
