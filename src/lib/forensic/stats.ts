/**
 * Pure-TypeScript statistical primitives.
 * Deterministic, dependency-free implementations of the regularized
 * incomplete gamma function used for chi-square p-values.
 */

/** Natural log of the gamma function (Lanczos approximation). */
export function logGamma(x: number): number {
  const g = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  x -= 1;
  let a = 0.99999999999980993;
  const t = x + 7.5;
  for (let i = 0; i < g.length; i++) {
    a += g[i] / (x + i + 1);
  }
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Lower regularized incomplete gamma P(a,x) — series expansion (NR gser). */
function gammaSeries(a: number, x: number): number {
  let sum = 1 / a;
  let del = sum;
  let ap = a;
  for (let n = 0; n < 200; n++) {
    ap += 1;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * 1e-14) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
}

/** Upper continued fraction Q(a,x) — NR gcf with Lentz's method. */
function gammaContinuedFraction(a: number, x: number): number {
  const tiny = 1e-30;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 200; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

/** Regularized upper incomplete gamma Q(a, x). */
export function gammaQ(a: number, x: number): number {
  if (!Number.isFinite(x) || x < 0 || a <= 0) return NaN;
  if (x === 0) return 1;
  if (x < a + 1) return 1 - gammaSeries(a, x);
  return gammaContinuedFraction(a, x);
}

/** Chi-square survival function: P(X > x) with dof degrees of freedom. */
export function chiSquareSF(x: number, dof: number): number {
  return gammaQ(dof / 2, x / 2);
}

/** Standard normal CDF (Abramowitz & Stegun 7.1.26 based erf approx). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly =
    t *
    (0.319381530 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const cdf = 1 - pdf(z) * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

function pdf(z: number): number {
  return Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI);
}

/** Two-sided p-value for a standard normal Z statistic. */
export function twoSidedPFromZ(z: number): number {
  return 2 * (1 - normalCdf(Math.abs(z)));
}

export function mean(values: number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stdev(values: number[], sample = true): number {
  const n = values.length;
  if (n < 2) return NaN;
  const m = mean(values);
  const ss = values.reduce((acc, v) => acc + (v - m) * (v - m), 0);
  return Math.sqrt(ss / (sample ? n - 1 : n));
}
