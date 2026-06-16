/**
 * The twelve evaluation dimensions from Issue #1. Evaluation answers "should an
 * enterprise consider this skill for this context?" — it is a structured,
 * mostly declaration-driven review, complementary to the empirical benchmark.
 */
export const EVALUATION_DIMENSIONS = [
  "capabilityFit",
  "protocolCompatibility",
  "ioContractQuality",
  "permissionScope",
  "dataAccessRisk",
  "performance",
  "reliability",
  "safety",
  "auditability",
  "governanceControls",
  "maintainerTrust",
  "lifecycleReadiness"
] as const;

export type EvaluationDimensionId = (typeof EVALUATION_DIMENSIONS)[number];

/** Human-facing labels for reports and registry views. */
export const EVALUATION_DIMENSION_LABELS: Record<EvaluationDimensionId, string> = {
  capabilityFit: "Capability Fit",
  protocolCompatibility: "Protocol Compatibility",
  ioContractQuality: "Input/Output Contract Quality",
  permissionScope: "Permission Scope",
  dataAccessRisk: "Data Access Risk",
  performance: "Performance",
  reliability: "Reliability",
  safety: "Safety",
  auditability: "Auditability",
  governanceControls: "Governance Controls",
  maintainerTrust: "Maintainer Trust",
  lifecycleReadiness: "Lifecycle Readiness"
};
