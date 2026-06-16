import type { DimensionScore } from "./types";

/**
 * Weighted aggregate of dimension scores, normalized to 0..100. Exposed
 * separately so it can be unit-tested in isolation and reused by reports.
 */
export function aggregateScore(scores: DimensionScore[]): number {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const s of scores) {
    weightedSum += s.score * s.weight;
    weightTotal += s.weight;
  }
  if (weightTotal === 0) return 0;
  const value = weightedSum / weightTotal;
  return Math.round(value * 100) / 100;
}
