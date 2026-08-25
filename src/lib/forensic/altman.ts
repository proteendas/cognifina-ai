import { safeDiv, round } from "./numbers";

/**
 * Altman Z-Score (public manufacturing) and Z'-Score (private firms).
 *  Z  = 1.2·X1 + 1.4·X2 + 3.3·X3 + 0.6·X4 + 0.999·X5
 *  Z' = 6.56·X1 + 3.26·X2 + 6.72·X3 + 1.05·X4'
 * Zones:
 *   Z:      Safe > 2.99, Grey 1.81–2.99, Distress < 1.81
 *   Z':     Safe > 2.60, Grey 1.23–2.60, Distress < 1.23
 */

export type AltmanInputs = {
  workingCapital?: number | null;
  retainedEarnings?: number | null;
  ebit?: number | null;
  marketValueEquity?: number | null; // public model
  bookValueEquity?: number | null; // private model
  totalLiabilities: number | null;
  sales?: number | null;
  totalAssets: number | null;
};

export type AltmanResult = {
  model: "public_manufacturing" | "private";
  x: { x1: number | null; x2: number | null; x3: number | null; x4: number | null; x5: number | null };
  score: number | null;
  zone: "Safe" | "Grey" | "Distress" | "Inconclusive";
  interpretation: string;
};

function zone(score: number, model: "public_manufacturing" | "private"): AltmanResult["zone"] {
  if (model === "public_manufacturing") {
    if (score > 2.99) return "Safe";
    if (score >= 1.81) return "Grey";
    return "Distress";
  }
  if (score > 2.6) return "Safe";
  if (score >= 1.23) return "Grey";
  return "Distress";
}

export function computeAltman(inputs: AltmanInputs, model: "public_manufacturing" | "private"): AltmanResult {
  const ta = inputs.totalAssets;
  const tl = inputs.totalLiabilities;
  const x1 = safeDiv(inputs.workingCapital ?? null, ta);
  const x2 = safeDiv(inputs.retainedEarnings ?? null, ta);
  const x3 = safeDiv(inputs.ebit ?? null, ta);
  const equity = model === "public_manufacturing" ? inputs.marketValueEquity : inputs.bookValueEquity;
  const x4 = safeDiv(equity ?? null, tl);
  const x5 = safeDiv(inputs.sales ?? null, ta);

  const missing =
    [x1, x2, x3, x4, ...(model === "public_manufacturing" ? [x5] : [])].filter((v) => v == null).length > 0;

  let score: number | null = null;
  if (!missing) {
    score =
      model === "public_manufacturing"
        ? 1.2 * (x1 as number) + 1.4 * (x2 as number) + 3.3 * (x3 as number) + 0.6 * (x4 as number) + 0.999 * (x5 as number)
        : 6.56 * (x1 as number) + 3.26 * (x2 as number) + 6.72 * (x3 as number) + 1.05 * (x4 as number);
  }

  const z = score == null ? null : round(score, 4);
  const zoned = z == null ? "Inconclusive" : zone(z, model);

  const interpretation =
    z == null
      ? "Insufficient statement data to compute the Altman score."
      : `Altman ${model === "public_manufacturing" ? "Z" : "Z'"}-Score ${z} places the entity in the ${zoned} zone.`;

  return {
    model,
    x: { x1: x1 == null ? null : round(x1, 5), x2: x2 == null ? null : round(x2, 5), x3: x3 == null ? null : round(x3, 5), x4: x4 == null ? null : round(x4, 5), x5: x5 == null ? null : round(x5, 5) },
    score: z,
    zone: zoned,
    interpretation,
  };
}
