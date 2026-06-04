import { levelRank, type CertificationLevel } from "@oax/certification-engine";

import { aggregateRuntimeHealth } from "./runtime-signal";
import type { RuntimeSignal, SkillTrustProfile } from "./types";

export interface TrustInput {
  skillId: string;
  contextId: string;
  certificationLevel: CertificationLevel;
  /** Benchmark overall score, 0..100. */
  benchmarkScore: number;
  signed: boolean;
  publisherVerified: boolean;
  runtimeSignals: RuntimeSignal[];
}

/**
 * Compose a trust score from certification standing, realized benchmark
 * performance, signing, maintainer verification, and runtime health. Each factor
 * is recorded so the score is explainable in registry views and reports.
 */
export function computeTrustProfile(input: TrustInput): SkillTrustProfile {
  // Certification contributes up to 40 points, scaled by ladder rank.
  // Max ladder rank is "Enterprise Approved" at index 6.
  const rank = levelRank(input.certificationLevel);
  const certContribution = rank >= 0 ? (rank / 6) * 40 : 0;

  // Benchmark contributes up to 30 points.
  const benchContribution = (clamp01(input.benchmarkScore / 100)) * 30;

  // Runtime health contributes up to 20 points.
  const runtimeHealth = aggregateRuntimeHealth(input.runtimeSignals);
  const runtimeContribution = runtimeHealth * 20;

  // Signing + verified publisher contribute up to 10 points combined.
  const provenanceContribution =
    (input.signed ? 5 : 0) + (input.publisherVerified ? 5 : 0);

  const factors = [
    { name: "certification", contribution: round2(certContribution) },
    { name: "benchmark", contribution: round2(benchContribution) },
    { name: "runtimeHealth", contribution: round2(runtimeContribution) },
    { name: "provenance", contribution: round2(provenanceContribution) }
  ];

  const trustScore = round2(
    factors.reduce((acc, f) => acc + f.contribution, 0)
  );

  return {
    skillId: input.skillId,
    contextId: input.contextId,
    certificationLevel: input.certificationLevel,
    trustScore,
    runtimeHealth: round2(runtimeHealth),
    signed: input.signed,
    publisherVerified: input.publisherVerified,
    computedAt: new Date().toISOString(),
    factors
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
