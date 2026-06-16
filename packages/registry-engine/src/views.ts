import { levelRank } from "@oax/certification-engine";

import type { SkillRegistryEntry } from "./types";

/** The performance-in-context registry views from Issue #1. */
export type RegistryViewId =
  | "popular"
  | "certified"
  | "bestByWorkflow"
  | "bestByToolchain"
  | "bestByIndustry"
  | "bestByGovernanceProfile"
  | "lowRisk"
  | "enterpriseApproved"
  | "requiresHumanApproval"
  | "restrictedByPolicy";

const byTrustDesc = (a: SkillRegistryEntry, b: SkillRegistryEntry): number =>
  b.trust.trustScore - a.trust.trustScore;

const CERTIFIED_LEVELS = new Set([
  "Certified Bronze",
  "Certified Silver",
  "Certified Gold",
  "Enterprise Approved"
]);

/**
 * Popular skills. Popularity is supported for transparency but ranked on its own
 * axis — it is explicitly NOT the marketplace's primary trust signal.
 */
export function popularSkills(entries: SkillRegistryEntry[]): SkillRegistryEntry[] {
  return [...entries].sort(
    (a, b) =>
      b.popularity.installs - a.popularity.installs ||
      b.popularity.stars - a.popularity.stars
  );
}

/** Certified skills, ranked by certification level then trust. */
export function certifiedSkills(entries: SkillRegistryEntry[]): SkillRegistryEntry[] {
  return entries
    .filter((e) => CERTIFIED_LEVELS.has(e.certification.level))
    .sort(
      (a, b) =>
        levelRank(b.certification.level) - levelRank(a.certification.level) ||
        byTrustDesc(a, b)
    );
}

/** Best performing skills for a given workflow / work type. */
export function bestByWorkflow(
  entries: SkillRegistryEntry[],
  workType: string
): SkillRegistryEntry[] {
  return entries
    .filter((e) => e.context.work.workType === workType)
    .sort((a, b) => b.benchmark.overallScore - a.benchmark.overallScore || byTrustDesc(a, b));
}

/** Best performing skills for a given toolchain tool. */
export function bestByToolchain(
  entries: SkillRegistryEntry[],
  tool: string
): SkillRegistryEntry[] {
  return entries
    .filter((e) => e.context.toolchain.tools.includes(tool))
    .sort((a, b) => b.benchmark.overallScore - a.benchmark.overallScore || byTrustDesc(a, b));
}

/** Best performing skills for a given industry sector. */
export function bestByIndustry(
  entries: SkillRegistryEntry[],
  sector: string
): SkillRegistryEntry[] {
  return entries
    .filter((e) => e.context.industry.sector === sector)
    .sort((a, b) => b.benchmark.overallScore - a.benchmark.overallScore || byTrustDesc(a, b));
}

/** Best performing skills for a given governance framework. */
export function bestByGovernanceProfile(
  entries: SkillRegistryEntry[],
  framework: string
): SkillRegistryEntry[] {
  return entries
    .filter((e) => e.context.industry.frameworks.includes(framework))
    .sort(byTrustDesc);
}

/**
 * Low-risk skills: high data-risk fit and no denied permissions. Threshold is the
 * minimum acceptable data-access-risk evaluation score (0..100).
 */
export function lowRiskSkills(
  entries: SkillRegistryEntry[],
  minDataRiskScore = 70
): SkillRegistryEntry[] {
  return entries
    .filter((e) => {
      const dataRisk = e.evaluation.scores.find((s) => s.dimension === "dataAccessRisk");
      return (dataRisk?.score ?? 0) >= minDataRiskScore;
    })
    .sort(byTrustDesc);
}

/** Enterprise-approved skills only. */
export function enterpriseApprovedSkills(
  entries: SkillRegistryEntry[]
): SkillRegistryEntry[] {
  return entries
    .filter((e) => e.certification.level === "Enterprise Approved")
    .sort(byTrustDesc);
}

/** Skills whose deployment context requires human approval. */
export function requiresHumanApproval(
  entries: SkillRegistryEntry[]
): SkillRegistryEntry[] {
  return entries.filter(
    (e) =>
      e.context.humanApproval === "required" ||
      e.context.humanApproval === "dual-control"
  );
}

/** Skills restricted by policy in their context. */
export function restrictedByPolicy(
  entries: SkillRegistryEntry[]
): SkillRegistryEntry[] {
  return entries.filter((e) => e.certification.level === "Restricted");
}

/** Dispatch table for view-by-id access. */
export const REGISTRY_VIEWS: Record<
  RegistryViewId,
  (entries: SkillRegistryEntry[], arg?: string) => SkillRegistryEntry[]
> = {
  popular: (e) => popularSkills(e),
  certified: (e) => certifiedSkills(e),
  bestByWorkflow: (e, arg) => bestByWorkflow(e, arg ?? ""),
  bestByToolchain: (e, arg) => bestByToolchain(e, arg ?? ""),
  bestByIndustry: (e, arg) => bestByIndustry(e, arg ?? ""),
  bestByGovernanceProfile: (e, arg) => bestByGovernanceProfile(e, arg ?? ""),
  lowRisk: (e) => lowRiskSkills(e),
  enterpriseApproved: (e) => enterpriseApprovedSkills(e),
  requiresHumanApproval: (e) => requiresHumanApproval(e),
  restrictedByPolicy: (e) => restrictedByPolicy(e)
};
