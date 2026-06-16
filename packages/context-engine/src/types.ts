/**
 * Core skill + context domain model.
 *
 * The context-engine owns the foundational skill description types because every
 * other engine (evaluation, benchmark, certification, signature, registry, trust)
 * reasons about a skill *inside* a deployment context.
 *
 * Core identity of the marketplace:
 *
 *   Skill + Context = DeploymentEvaluation
 *
 * A skill never receives a single universal score. It receives contextual scores.
 */

/** The party that publishes and stands behind a skill. */
export interface SkillPublisher {
  id: string;
  name: string;
  /** True once the publisher identity has been verified by the marketplace. */
  verified: boolean;
  /** Decentralized identifier, when the publisher has one. DID/VC lands later. */
  did?: string;
}

/** A discrete capability a skill claims to provide. */
export interface SkillCapability {
  id: string;
  name: string;
  description: string;
  /** The unit of enterprise work this capability targets, e.g. "code-review". */
  workType: string;
  /** Protocols this capability speaks, e.g. ["mcp", "openai-tools"]. */
  protocols: string[];
}

/** A measurable assertion a publisher makes about a skill. */
export interface SkillClaim {
  id: string;
  statement: string;
  metric?: string;
  value?: number | string;
  /** Pointer to evidence backing the claim (report, dataset, run log). */
  evidenceUri?: string;
}

/** An immutable release of a skill. */
export interface SkillVersion {
  version: string;
  releasedAt: string;
  changelog?: string;
}

/** The publisher-declared description of a skill. */
export interface Skill {
  id: string;
  name: string;
  description: string;
  publisher: SkillPublisher;
  version: SkillVersion;
  capabilities: SkillCapability[];
  claims: SkillClaim[];
  protocols: string[];
  toolsUsed: string[];
  permissionsRequired: string[];
}

export type DataSensitivity =
  | "public"
  | "internal"
  | "confidential"
  | "restricted"
  | "regulated";

export type HumanApprovalModel =
  | "none"
  | "optional"
  | "required"
  | "dual-control";

export type ReliabilityRequirement =
  | "best-effort"
  | "standard"
  | "high"
  | "mission-critical";

export interface OrganizationContext {
  id: string;
  name: string;
  sizeTier?: "smb" | "midmarket" | "enterprise";
}

export interface IndustryContext {
  sector: string;
  regulated: boolean;
  /** Governance frameworks in force, e.g. ["soc2", "hipaa", "pci-dss"]. */
  frameworks: string[];
}

export interface RoleContext {
  role: string;
  seniority?: string;
}

export interface WorkContext {
  workType: string;
  description?: string;
}

export interface ProcessContext {
  processId: string;
  steps: string[];
}

export interface ToolchainContext {
  tools: string[];
  protocols: string[];
}

export interface PolicyConstraints {
  /** Highest data sensitivity this deployment may expose to the skill. */
  allowedDataSensitivity: DataSensitivity;
  /** Permissions the deployment explicitly forbids. */
  deniedPermissions: string[];
  /** Controls the deployment requires (e.g. "audit-log", "pii-redaction"). */
  requiredControls: string[];
}

export interface RuntimeEnvironment {
  platform: string;
  network: "isolated" | "restricted" | "open";
  region?: string;
}

export interface CostConstraints {
  maxCostPerRunUsd?: number;
  budgetSensitive: boolean;
}

/**
 * The full deployment context against which a skill is evaluated. Each field is
 * one of the context dimensions called out in Issue #1.
 */
export interface SkillContext {
  id: string;
  organization: OrganizationContext;
  industry: IndustryContext;
  role: RoleContext;
  work: WorkContext;
  process: ProcessContext;
  toolchain: ToolchainContext;
  dataSensitivity: DataSensitivity;
  policy: PolicyConstraints;
  runtime: RuntimeEnvironment;
  humanApproval: HumanApprovalModel;
  cost: CostConstraints;
  reliability: ReliabilityRequirement;
}

/** Fit of a skill against one context dimension, normalized to 0..1. */
export interface FitResult {
  dimension: string;
  fit: number;
  rationale: string;
}

/**
 * The output of pairing a skill with a context. This is the unit the rest of the
 * marketplace ranks, certifies, and publishes against.
 */
export interface DeploymentEvaluation {
  skillId: string;
  contextId: string;
  fits: FitResult[];
  /** Weighted aggregate fit, 0..1. */
  overallFit: number;
  computedAt: string;
}
