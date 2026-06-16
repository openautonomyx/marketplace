import type { SkillContext } from "./types";

/**
 * Per-dimension weights used when aggregating fit into an overall deployment
 * score. Higher weight means the dimension matters more for *this* context.
 */
export interface ContextWeights {
  capability: number;
  protocol: number;
  permission: number;
  dataRisk: number;
  reliability: number;
  cost: number;
}

export const DEFAULT_CONTEXT_WEIGHTS: ContextWeights = {
  capability: 1,
  protocol: 1,
  permission: 1,
  dataRisk: 1,
  reliability: 1,
  cost: 1
};

/**
 * Derive context-sensitive weights. A regulated, restricted-data, mission
 * critical deployment cares far more about data risk and reliability than a
 * public best-effort one. This is what makes scores *contextual*.
 */
export function deriveContextWeights(ctx: SkillContext): ContextWeights {
  const weights: ContextWeights = { ...DEFAULT_CONTEXT_WEIGHTS };

  if (ctx.industry.regulated) {
    weights.dataRisk += 1;
    weights.permission += 0.5;
  }

  switch (ctx.dataSensitivity) {
    case "restricted":
    case "regulated":
      weights.dataRisk += 1.5;
      weights.permission += 1;
      break;
    case "confidential":
      weights.dataRisk += 0.75;
      break;
    default:
      break;
  }

  switch (ctx.reliability) {
    case "mission-critical":
      weights.reliability += 1.5;
      break;
    case "high":
      weights.reliability += 0.75;
      break;
    default:
      break;
  }

  if (ctx.cost.budgetSensitive) {
    weights.cost += 1;
  }

  return weights;
}

/** Human-readable summary of a context, useful in registry views and reports. */
export function describeContext(ctx: SkillContext): string {
  return [
    `org=${ctx.organization.name}`,
    `industry=${ctx.industry.sector}${ctx.industry.regulated ? " (regulated)" : ""}`,
    `work=${ctx.work.workType}`,
    `toolchain=[${ctx.toolchain.tools.join(", ")}]`,
    `data=${ctx.dataSensitivity}`,
    `reliability=${ctx.reliability}`,
    `approval=${ctx.humanApproval}`
  ].join(" | ");
}
