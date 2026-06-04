import {
  deriveContextWeights,
  evaluateDeployment,
  type DeploymentEvaluation,
  type Skill,
  type SkillContext
} from "@oax/context-engine";

import { EVALUATION_DIMENSIONS, type EvaluationDimensionId } from "./dimensions";
import { aggregateScore } from "./score";
import type { DimensionScore, SkillEvaluation } from "./types";

const to100 = (fit: number): number => Math.round(fit * 100 * 100) / 100;

/**
 * Map context-derived weights onto evaluation dimensions. Governance-heavy and
 * sensitive contexts up-weight safety, data risk, auditability and governance.
 */
function dimensionWeights(ctx: SkillContext): Record<EvaluationDimensionId, number> {
  const cw = deriveContextWeights(ctx);
  return {
    capabilityFit: cw.capability,
    protocolCompatibility: cw.protocol,
    ioContractQuality: 1,
    permissionScope: cw.permission,
    dataAccessRisk: cw.dataRisk,
    performance: 1,
    reliability: cw.reliability,
    safety: ctx.industry.regulated ? 2 : 1,
    auditability: ctx.policy.requiredControls.includes("audit-log") ? 2 : 1,
    governanceControls: ctx.industry.regulated ? 2 : 1,
    maintainerTrust: 1,
    lifecycleReadiness: 1
  };
}

/**
 * Score a single dimension. Several dimensions reuse the fit values already
 * computed by the context-engine so evaluation and deployment fit stay aligned.
 */
function scoreDimension(
  dimension: EvaluationDimensionId,
  skill: Skill,
  ctx: SkillContext,
  deployment: DeploymentEvaluation
): { score: number; rationale: string } {
  const fitOf = (name: string): number =>
    deployment.fits.find((f) => f.dimension === name)?.fit ?? 0;

  switch (dimension) {
    case "capabilityFit":
      return { score: to100(fitOf("capability")), rationale: "Derived from capability/work-type match." };
    case "protocolCompatibility":
      return { score: to100(fitOf("protocol")), rationale: "Derived from protocol overlap with toolchain." };
    case "ioContractQuality": {
      const hasSchemas = skill.capabilities.length > 0;
      return { score: hasSchemas ? 80 : 40, rationale: "Presence of declared capabilities/contracts." };
    }
    case "permissionScope":
      return { score: to100(fitOf("permission")), rationale: "Requested permissions vs policy deny-list." };
    case "dataAccessRisk":
      return { score: to100(fitOf("dataRisk")), rationale: "Permission breadth vs data sensitivity." };
    case "performance": {
      const claim = skill.claims.find((c) => c.metric === "latencyMs");
      return { score: claim ? 75 : 50, rationale: claim ? "Latency claim present." : "No latency claim." };
    }
    case "reliability":
      return { score: to100(fitOf("reliability")), rationale: "Claimed reliability vs requirement." };
    case "safety": {
      const failureModes = skill.claims.filter((c) => c.metric === "failureMode").length;
      return { score: Math.min(100, 50 + failureModes * 15), rationale: `${failureModes} failure mode(s) declared.` };
    }
    case "auditability": {
      const audit = skill.claims.some((c) => c.metric === "auditEvidence");
      return { score: audit ? 85 : 35, rationale: audit ? "Audit evidence declared." : "No audit evidence declared." };
    }
    case "governanceControls": {
      const required = ctx.policy.requiredControls;
      const declared = skill.claims.filter((c) => c.metric === "control").map((c) => String(c.value));
      const covered = required.filter((r) => declared.includes(r)).length;
      const score = required.length ? (covered / required.length) * 100 : 70;
      return { score: Math.round(score), rationale: `${covered}/${required.length || 0} required controls declared.` };
    }
    case "maintainerTrust":
      return { score: skill.publisher.verified ? 85 : 45, rationale: skill.publisher.verified ? "Verified publisher." : "Unverified publisher." };
    case "lifecycleReadiness":
      return { score: skill.version.changelog ? 75 : 55, rationale: skill.version.changelog ? "Versioned with changelog." : "Versioned." };
    default:
      return { score: 0, rationale: "Unknown dimension." };
  }
}

/**
 * Produce the contextual evaluation of a skill. The deployment fit can be passed
 * in (to avoid recomputation) or is computed on demand.
 */
export function evaluateSkill(
  skill: Skill,
  ctx: SkillContext,
  deployment: DeploymentEvaluation = evaluateDeployment(skill, ctx)
): SkillEvaluation {
  const weights = dimensionWeights(ctx);
  const scores: DimensionScore[] = EVALUATION_DIMENSIONS.map((dimension) => {
    const { score, rationale } = scoreDimension(dimension, skill, ctx, deployment);
    return { dimension, score, weight: weights[dimension], rationale };
  });

  return {
    skillId: skill.id,
    contextId: ctx.id,
    scores,
    weightedScore: aggregateScore(scores),
    evaluatedAt: new Date().toISOString()
  };
}
