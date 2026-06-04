import { deriveContextWeights, type ContextWeights } from "./context-profile";
import type {
  DeploymentEvaluation,
  DataSensitivity,
  FitResult,
  Skill,
  SkillContext
} from "./types";

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/** Ordered sensitivity scale; higher index means more sensitive data. */
const SENSITIVITY_ORDER: DataSensitivity[] = [
  "public",
  "internal",
  "confidential",
  "restricted",
  "regulated"
];

/** Does the skill cover the work type the context needs? */
export function computeCapabilityFit(skill: Skill, ctx: SkillContext): FitResult {
  const match = skill.capabilities.some(
    (c) => c.workType === ctx.work.workType
  );
  return {
    dimension: "capability",
    fit: match ? 1 : 0,
    rationale: match
      ? `Skill declares a capability for work type "${ctx.work.workType}".`
      : `Skill declares no capability for work type "${ctx.work.workType}".`
  };
}

/** How much of the context toolchain's protocols does the skill speak? */
export function computeProtocolFit(skill: Skill, ctx: SkillContext): FitResult {
  const required = ctx.toolchain.protocols;
  if (required.length === 0) {
    return {
      dimension: "protocol",
      fit: 1,
      rationale: "Context imposes no protocol requirements."
    };
  }
  const supported = required.filter((p) => skill.protocols.includes(p));
  const fit = supported.length / required.length;
  return {
    dimension: "protocol",
    fit,
    rationale: `Skill supports ${supported.length}/${required.length} required protocols.`
  };
}

/** Penalize skills that request permissions the policy denies. */
export function computePermissionFit(skill: Skill, ctx: SkillContext): FitResult {
  const denied = skill.permissionsRequired.filter((p) =>
    ctx.policy.deniedPermissions.includes(p)
  );
  const fit = skill.permissionsRequired.length
    ? clamp01(1 - denied.length / skill.permissionsRequired.length)
    : 1;
  return {
    dimension: "permission",
    fit,
    rationale: denied.length
      ? `Skill requests ${denied.length} denied permission(s): ${denied.join(", ")}.`
      : "Skill requests no denied permissions."
  };
}

/**
 * Data-access risk fit. If the skill needs broad permissions while the context
 * exposes highly sensitive data, fit drops. This is a heuristic placeholder; the
 * benchmark-engine measures realized data exposure empirically.
 */
export function computeDataRiskFit(skill: Skill, ctx: SkillContext): FitResult {
  const sensitivity = SENSITIVITY_ORDER.indexOf(ctx.dataSensitivity);
  const allowed = SENSITIVITY_ORDER.indexOf(ctx.policy.allowedDataSensitivity);
  if (sensitivity > allowed) {
    return {
      dimension: "dataRisk",
      fit: 0,
      rationale: `Context data sensitivity "${ctx.dataSensitivity}" exceeds policy ceiling "${ctx.policy.allowedDataSensitivity}".`
    };
  }
  // Broad permission surface against sensitive data lowers fit.
  const breadth = skill.permissionsRequired.length;
  const fit = clamp01(1 - (sensitivity * breadth) / 40);
  return {
    dimension: "dataRisk",
    fit,
    rationale: `Permission breadth ${breadth} against sensitivity "${ctx.dataSensitivity}".`
  };
}

/** Does the skill claim a reliability level matching the requirement? */
export function computeReliabilityFit(skill: Skill, ctx: SkillContext): FitResult {
  const claim = skill.claims.find((c) => c.metric === "reliability");
  const claimed = typeof claim?.value === "number" ? claim.value : 0.9;
  const required: Record<SkillContext["reliability"], number> = {
    "best-effort": 0.5,
    standard: 0.9,
    high: 0.99,
    "mission-critical": 0.999
  };
  const target = required[ctx.reliability];
  const fit = clamp01(claimed / target);
  return {
    dimension: "reliability",
    fit,
    rationale: `Claimed reliability ${claimed} vs target ${target} for "${ctx.reliability}".`
  };
}

/** Cost fit: only meaningful when the context is budget sensitive. */
export function computeCostFit(skill: Skill, ctx: SkillContext): FitResult {
  if (!ctx.cost.budgetSensitive || ctx.cost.maxCostPerRunUsd == null) {
    return {
      dimension: "cost",
      fit: 1,
      rationale: "Context is not budget sensitive."
    };
  }
  const claim = skill.claims.find((c) => c.metric === "costPerRunUsd");
  const cost = typeof claim?.value === "number" ? claim.value : ctx.cost.maxCostPerRunUsd;
  const fit = clamp01(ctx.cost.maxCostPerRunUsd / Math.max(cost, 1e-6));
  return {
    dimension: "cost",
    fit,
    rationale: `Claimed cost ${cost} vs budget ${ctx.cost.maxCostPerRunUsd}.`
  };
}

function weightFor(dimension: string, weights: ContextWeights): number {
  switch (dimension) {
    case "capability":
      return weights.capability;
    case "protocol":
      return weights.protocol;
    case "permission":
      return weights.permission;
    case "dataRisk":
      return weights.dataRisk;
    case "reliability":
      return weights.reliability;
    case "cost":
      return weights.cost;
    default:
      return 1;
  }
}

/**
 * Pair a skill with a context to produce the DeploymentEvaluation that the rest
 * of the marketplace ranks and certifies against.
 */
export function evaluateDeployment(
  skill: Skill,
  ctx: SkillContext
): DeploymentEvaluation {
  const fits: FitResult[] = [
    computeCapabilityFit(skill, ctx),
    computeProtocolFit(skill, ctx),
    computePermissionFit(skill, ctx),
    computeDataRiskFit(skill, ctx),
    computeReliabilityFit(skill, ctx),
    computeCostFit(skill, ctx)
  ];

  const weights = deriveContextWeights(ctx);
  let weightedSum = 0;
  let weightTotal = 0;
  for (const f of fits) {
    const w = weightFor(f.dimension, weights);
    weightedSum += f.fit * w;
    weightTotal += w;
  }
  const overallFit = weightTotal ? clamp01(weightedSum / weightTotal) : 0;

  return {
    skillId: skill.id,
    contextId: ctx.id,
    fits,
    overallFit,
    computedAt: new Date().toISOString()
  };
}
