import { LEVEL_THRESHOLDS, type CertificationLevel } from "./levels";
import type { CertificationInput, SkillCertification } from "./types";

/**
 * Derive a certification level from evaluation, benchmark, signing, and policy
 * state. Exception flags short-circuit the assurance ladder; otherwise the
 * combined score plus signing/governance gates determine the ladder level.
 */
export function deriveCertificationLevel(
  input: CertificationInput
): { level: CertificationLevel; combinedScore: number; rationale: string } {
  const combinedScore =
    Math.round(((input.evaluationScore + input.benchmarkScore) / 2) * 100) / 100;

  // Exception states take precedence, most severe first.
  if (input.revoked) return { level: "Revoked", combinedScore, rationale: "Certification revoked." };
  if (input.expired) return { level: "Expired", combinedScore, rationale: "Certification expired." };
  if (input.suspended) return { level: "Suspended", combinedScore, rationale: "Certification suspended." };
  if (input.deprecated) return { level: "Deprecated", combinedScore, rationale: "Skill deprecated." };
  if (input.policyRestricted) return { level: "Restricted", combinedScore, rationale: "Restricted by policy for this context." };

  // Not yet through intake.
  if (!input.signed) {
    return { level: "Unreviewed", combinedScore, rationale: "No signed contract attached." };
  }
  if (combinedScore < LEVEL_THRESHOLDS.Validated) {
    return { level: "Submitted", combinedScore, rationale: `Signed but below validation threshold (${LEVEL_THRESHOLDS.Validated}).` };
  }

  // Ladder placement by combined score.
  let level: CertificationLevel = "Validated";
  if (combinedScore >= LEVEL_THRESHOLDS["Certified Gold"]) level = "Certified Gold";
  else if (combinedScore >= LEVEL_THRESHOLDS["Certified Silver"]) level = "Certified Silver";
  else if (combinedScore >= LEVEL_THRESHOLDS["Certified Bronze"]) level = "Certified Bronze";

  // Enterprise Approved requires Gold + verified publisher + governance + sign-off.
  if (
    level === "Certified Gold" &&
    input.publisherVerified &&
    input.governanceSatisfied &&
    input.enterpriseApproved
  ) {
    return {
      level: "Enterprise Approved",
      combinedScore,
      rationale: "Gold certified, verified publisher, governance satisfied, enterprise sign-off."
    };
  }

  return { level, combinedScore, rationale: `Combined score ${combinedScore} places skill at ${level}.` };
}

/** Issue a full certification record for a skill in a context. */
export function certifySkill(
  input: CertificationInput,
  scope: SkillCertification["scope"] = {}
): SkillCertification {
  const { level, combinedScore, rationale } = deriveCertificationLevel(input);
  return {
    skillId: input.skillId,
    contextId: input.contextId,
    level,
    combinedScore,
    rationale,
    issuedAt: new Date().toISOString(),
    scope
  };
}
