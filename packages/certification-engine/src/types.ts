import type { CertificationLevel } from "./levels";

/** Inputs the certification engine reasons over. */
export interface CertificationInput {
  skillId: string;
  contextId: string;
  /** Contextual evaluation score, 0..100. */
  evaluationScore: number;
  /** Benchmark run score, 0..100. */
  benchmarkScore: number;
  /** Whether a valid signed contract is attached. */
  signed: boolean;
  /** Whether the publisher has been verified. */
  publisherVerified: boolean;
  /** Whether required governance controls are all satisfied. */
  governanceSatisfied: boolean;
  /** Whether the deployment has been explicitly approved for enterprise use. */
  enterpriseApproved?: boolean;
  /** Exception flags override ladder placement. */
  policyRestricted?: boolean;
  deprecated?: boolean;
  suspended?: boolean;
  revoked?: boolean;
  expired?: boolean;
}

/** The issued certification for a skill in a context. */
export interface SkillCertification {
  skillId: string;
  contextId: string;
  level: CertificationLevel;
  combinedScore: number;
  rationale: string;
  issuedAt: string;
  /** Scope the certification applies to (work type, toolchain, governance). */
  scope: {
    workType?: string;
    toolchain?: string[];
    governanceProfile?: string;
  };
}
