import { levelRank } from "@oax/certification-engine";
import type { SkillRegistryEntry } from "@oax/registry-engine";

import type { ConsumptionCriteria, SkillRecommendation } from "./types";

/** True when the entry satisfies every criterion in the query. */
export function matchesCriteria(
  entry: SkillRegistryEntry,
  criteria: ConsumptionCriteria
): boolean {
  const excludeExceptions = criteria.excludeExceptionStates ?? true;
  if (excludeExceptions && levelRank(entry.certification.level) < 0) return false;

  if (criteria.workType && entry.context.work.workType !== criteria.workType) return false;

  if (
    criteria.minCertificationLevel &&
    levelRank(entry.certification.level) < levelRank(criteria.minCertificationLevel)
  ) {
    return false;
  }

  if (criteria.minTrustScore != null && entry.trust.trustScore < criteria.minTrustScore) {
    return false;
  }

  if (criteria.requireSigned && !entry.signature) return false;

  if (criteria.requireEnterpriseApproved && entry.certification.level !== "Enterprise Approved") {
    return false;
  }

  return true;
}

/** Filter entries to those matching the criteria. */
export function findEntries(
  entries: SkillRegistryEntry[],
  criteria: ConsumptionCriteria = {}
): SkillRegistryEntry[] {
  return entries.filter((e) => matchesCriteria(e, criteria));
}

/**
 * Ranking score for a matched entry. Performance-in-context order: trust first
 * (it already folds in certification, benchmark, provenance, and runtime), then
 * realized benchmark performance, then certification rank as a tiebreak.
 */
export function scoreEntry(entry: SkillRegistryEntry): number {
  return (
    entry.trust.trustScore * 1000 +
    entry.benchmark.overallScore * 10 +
    Math.max(levelRank(entry.certification.level), 0)
  );
}

function reasonsFor(entry: SkillRegistryEntry): string[] {
  return [
    `Certification: ${entry.certification.level}`,
    `Trust score: ${entry.trust.trustScore}`,
    `Benchmark: ${entry.benchmark.overallScore}`,
    `Work type: ${entry.context.work.workType}`,
    entry.signature ? "Signed contract attached" : "No signature attached"
  ];
}

/** Matched entries as ranked, explainable recommendations (best first). */
export function recommend(
  entries: SkillRegistryEntry[],
  criteria: ConsumptionCriteria = {}
): SkillRecommendation[] {
  return findEntries(entries, criteria)
    .map((entry) => ({ entry, score: scoreEntry(entry), reasons: reasonsFor(entry) }))
    .sort((a, b) => b.score - a.score);
}

/** The single best recommendation, or undefined if none match. */
export function selectBest(
  entries: SkillRegistryEntry[],
  criteria: ConsumptionCriteria = {}
): SkillRecommendation | undefined {
  return recommend(entries, criteria)[0];
}
