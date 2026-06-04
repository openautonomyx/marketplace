/**
 * Certification levels from Issue #1, ordered from lowest to highest assurance,
 * followed by the terminal/exception states. The ordering is meaningful: registry
 * views sort and threshold on it.
 */
export const CERTIFICATION_LEVELS = [
  "Unreviewed",
  "Submitted",
  "Validated",
  "Certified Bronze",
  "Certified Silver",
  "Certified Gold",
  "Enterprise Approved",
  // Exception / terminal states (not on the assurance ladder):
  "Restricted",
  "Deprecated",
  "Suspended",
  "Revoked",
  "Expired"
] as const;

export type CertificationLevel = (typeof CERTIFICATION_LEVELS)[number];

/** Levels on the positive assurance ladder, in ascending order. */
export const ASSURANCE_LADDER: CertificationLevel[] = [
  "Unreviewed",
  "Submitted",
  "Validated",
  "Certified Bronze",
  "Certified Silver",
  "Certified Gold",
  "Enterprise Approved"
];

/** Exception states that override ladder placement. */
export const EXCEPTION_LEVELS: CertificationLevel[] = [
  "Restricted",
  "Deprecated",
  "Suspended",
  "Revoked",
  "Expired"
];

/** Rank for sorting; higher means more assurance. Exception states rank below 0. */
export function levelRank(level: CertificationLevel): number {
  const ladderIndex = ASSURANCE_LADDER.indexOf(level);
  if (ladderIndex >= 0) return ladderIndex;
  // Exception states sort below the ladder.
  return -1 - EXCEPTION_LEVELS.indexOf(level);
}

/** Score thresholds (combined evaluation+benchmark, 0..100) for ladder levels. */
export const LEVEL_THRESHOLDS: Record<string, number> = {
  Validated: 60,
  "Certified Bronze": 70,
  "Certified Silver": 80,
  "Certified Gold": 90
};
