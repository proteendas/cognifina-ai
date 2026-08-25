import { chiSquareSF, twoSidedPFromZ } from "./stats";
import { round } from "./numbers";

/**
 * Benford's Law forensic tests — first digit (1–9) and first-two digits (10–99).
 * P(d) = log10(1 + 1/d)
 */

export type DigitStat = {
  digit: number;
  observedCount: number;
  observedFreq: number;
  expectedFreq: number;
  zScore: number;
  pValue: number;
  deviation: number; // observed - expected
};

export type BenfordResult = {
  test: "first_digit" | "first_two_digits";
  n: number;
  used: number;
  excluded: number;
  chiSquare: number;
  degreesOfFreedom: number;
  pValue: number;
  mad: number;
  conformity: "close" | "acceptable" | "marginal" | "nonconforming";
  perDigit: DigitStat[];
};

const FIRST_EXPECTED = Array.from({ length: 9 }, (_, i) => Math.log10(1 + 1 / (i + 1)));
const TWO_EXPECTED = Array.from({ length: 90 }, (_, i) => Math.log10(1 + 1 / (i + 10)));

function leadingDigits(value: number, take: 1 | 2): number | null {
  if (!Number.isFinite(value) || value === 0) return null;
  const s = value.toExponential(12);
  const mantissa = Number(s.split("e")[0].replace("-", ""));
  const first = Math.trunc(mantissa * Math.pow(10, take - 1));
  const digits = Math.abs(first);
  if (digits < Math.pow(10, take - 1) || digits >= Math.pow(10, take)) return null;
  return digits;
}

export function extractLeadingDigits(values: number[], take: 1 | 2): {
  counts: Map<number, number>;
  used: number;
  excluded: number;
} {
  const counts = new Map<number, number>();
  let used = 0;
  let excluded = 0;
  for (const v of values) {
    if (!Number.isFinite(v) || v === 0 || v < 0) {
      excluded++;
      continue;
    }
    const d = leadingDigits(v, take);
    if (d == null) {
      excluded++;
      continue;
    }
    counts.set(d, (counts.get(d) ?? 0) + 1);
    used++;
  }
  return { counts, used, excluded };
}

/** Nigrini MAD conformity bands. */
function conformityFor(mad: number, take: 1 | 2): BenfordResult["conformity"] {
  const bands =
    take === 1
      ? [
          [0.006, "close"],
          [0.012, "acceptable"],
          [0.015, "marginal"],
        ] as const
      : [
          [0.0012, "close"],
          [0.0018, "acceptable"],
          [0.0022, "marginal"],
        ] as const;
  for (const [limit, label] of bands) {
    if (mad < limit) return label as BenfordResult["conformity"];
  }
  return "nonconforming";
}

export function benfordTest(values: number[], take: 1 | 2 = 1): BenfordResult | null {
  const minSample = take === 1 ? 100 : 300;
  const { counts, used, excluded } = extractLeadingDigits(values, take);
  if (used < minSample) return null;

  const expected = take === 1 ? FIRST_EXPECTED : TWO_EXPECTED;
  const k = expected.length;
  let chi2 = 0;
  let madSum = 0;
  const perDigit: DigitStat[] = [];

  for (let i = 0; i < k; i++) {
    const digit = take === 1 ? i + 1 : i + 10;
    const obsCount = counts.get(digit) ?? 0;
    const expFreq = expected[i];
    const obsFreq = obsCount / used;
    // Chi-square contribution
    const expectedCount = expFreq * used;
    chi2 += ((obsCount - expectedCount) * (obsCount - expectedCount)) / expectedCount;
    // Z-statistic for proportion
    const se = Math.sqrt((expFreq * (1 - expFreq)) / used);
    const z = (obsFreq - expFreq) / (se || 1e-12);
    const dev = obsFreq - expFreq;
    madSum += Math.abs(dev);
    perDigit.push({
      digit,
      observedCount: obsCount,
      observedFreq: round(obsFreq, 6),
      expectedFreq: round(expFreq, 6),
      zScore: round(z, 4),
      pValue: round(twoSidedPFromZ(z), 6),
      deviation: round(dev, 6),
    });
  }

  const dof = k - 1;
  return {
    test: take === 1 ? "first_digit" : "first_two_digits",
    n: values.length,
    used,
    excluded,
    chiSquare: round(chi2, 4),
    degreesOfFreedom: dof,
    pValue: round(chiSquareSF(chi2, dof), 8),
    mad: round(madSum / k, 6),
    conformity: conformityFor(madSum / k, take),
    perDigit,
  };
}
