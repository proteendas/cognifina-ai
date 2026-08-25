import { safeDiv, round } from "./numbers";
import { mean, stdev } from "./stats";

/** Financial ratio suite with cross-period volatility checks. */

export type RatioPeriod = Record<string, number | null | undefined>;

function pick(p: RatioPeriod, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = p[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

export type RatioSet = {
  period: string;
  currentRatio: number | null;
  quickRatio: number | null;
  debtEquity: number | null;
  grossMarginPct: number | null;
  netMarginPct: number | null;
  interestCoverage: number | null;
};

export function computeRatios(period: RatioPeriod, label = ""): RatioSet {
  const ca = pick(period, "current_assets", "total_current_assets");
  const cl = pick(period, "current_liabilities");
  const inventory = pick(period, "inventory", "inventories", "stock_in_trade");
  const debt = pick(period, "total_debt", "long_term_debt", "borrowings");
  const equity = pick(period, "shareholders_equity", "equity", "net_worth");
  const sales = pick(period, "revenue", "sales", "total_revenue", "turnover");
  const grossProfit = pick(period, "gross_profit");
  const cogs = pick(period, "cost_of_goods_sold", "cost_of_sales");
  const netIncome = pick(period, "net_income", "profit_before_tax", "pbt");
  const ebit = pick(period, "ebit", "operating_income") ?? netIncome;
  const interest = pick(period, "interest_expense", "finance_cost");

  const gp = grossProfit ?? (sales != null && cogs != null ? sales - cogs : null);

  return {
    period: label,
    currentRatio: safeDiv(ca, cl),
    quickRatio: safeDiv(ca != null && inventory != null ? ca - inventory : null, cl),
    debtEquity: safeDiv(debt, equity),
    grossMarginPct: (() => {
      const v = safeDiv(gp, sales);
      return v == null ? null : round(v * 100, 2);
    })(),
    netMarginPct: (() => {
      const v = safeDiv(netIncome, sales);
      return v == null ? null : round(v * 100, 2);
    })(),
    interestCoverage: (() => {
      if (ebit == null || interest == null) return null;
      return interest === 0 ? null : round(ebit / interest, 3);
    })(),
  };
}

export type VolatilityFlag = { ratio: keyof Omit<RatioSet, "period">; cv: number; threshold: number };

const CV_THRESHOLDS: Partial<Record<keyof Omit<RatioSet, "period">, number>> = {
  currentRatio: 0.35,
  quickRatio: 0.4,
  debtEquity: 0.4,
  grossMarginPct: 0.25,
  netMarginPct: 0.45,
};

export function volatilityChecks(sets: RatioSet[]): VolatilityFlag[] {
  const flags: VolatilityFlag[] = [];
  const keys = Object.keys(CV_THRESHOLDS) as (keyof Omit<RatioSet, "period">)[];
  for (const key of keys) {
    const vals = sets.map((s) => s[key]).filter((v): v is number => v != null && Number.isFinite(v));
    if (vals.length < 3) continue;
    const m = mean(vals);
    const sd = stdev(vals);
    if (m === 0) continue;
    const cv = Math.abs(sd / m);
    const threshold = CV_THRESHOLDS[key] as number;
    if (cv > threshold) flags.push({ ratio: key, cv: round(cv, 3), threshold });
  }
  return flags.sort((a, b) => b.cv - a.cv);
}
