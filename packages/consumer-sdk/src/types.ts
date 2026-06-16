import type { CertificationLevel } from "@oax/certification-engine";
import type { SkillRegistryEntry } from "@oax/registry-engine";

/**
 * What a consuming platform asks for when selecting a skill. This is the
 * performance-in-context query: not "what's popular" but "what is trusted enough
 * for this work, at this certification level, signed, for my governance posture."
 */
export interface ConsumptionCriteria {
  /** Restrict to entries assessed for this work type. */
  workType?: string;
  /** Minimum certification level on the assurance ladder. */
  minCertificationLevel?: CertificationLevel;
  /** Minimum composite trust score, 0..100. */
  minTrustScore?: number;
  /** Require an attached (digest) signature. */
  requireSigned?: boolean;
  /** Require the highest level: Enterprise Approved. */
  requireEnterpriseApproved?: boolean;
  /**
   * Drop entries in an exception state (Restricted/Deprecated/Suspended/
   * Revoked/Expired). Defaults to true — a platform should never auto-select one.
   */
  excludeExceptionStates?: boolean;
}

/** A ranked recommendation with an explainable rationale. */
export interface SkillRecommendation {
  entry: SkillRegistryEntry;
  /** Ranking score used to order recommendations (higher is better). */
  score: number;
  /** Human-readable reasons the entry was selected and ranked where it is. */
  reasons: string[];
}

/** The outcome of verifying an entry before consumption. */
export interface VerificationResult {
  ok: boolean;
  checks: Array<{ name: string; ok: boolean; detail: string }>;
}
