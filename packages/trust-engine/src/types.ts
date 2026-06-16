import type { CertificationLevel } from "@oax/certification-engine";

/** A signal observed from a skill running in production deployments. */
export interface RuntimeSignal {
  skillId: string;
  contextId: string;
  /** e.g. "success-rate", "incident", "policy-violation", "approval-override". */
  kind: string;
  /** Normalized 0..1 health contribution of this signal (1 = healthy). */
  health: number;
  observedAt: string;
}

/**
 * The aggregated trust posture of a skill in a context. Trust is distinct from a
 * one-off evaluation: it folds in certification, realized benchmark performance,
 * maintainer standing, signing, and continuous runtime signals.
 */
export interface SkillTrustProfile {
  skillId: string;
  contextId: string;
  certificationLevel: CertificationLevel;
  /** 0..100 composite trust score. */
  trustScore: number;
  /** 0..1 freshness factor from runtime signals. */
  runtimeHealth: number;
  signed: boolean;
  publisherVerified: boolean;
  computedAt: string;
  factors: Array<{ name: string; contribution: number }>;
}
