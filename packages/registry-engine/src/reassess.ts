import { certifySkill, type CertificationLevel } from "@oax/certification-engine";
import {
  aggregateRuntimeHealth,
  computeTrustProfile,
  type RuntimeSignal
} from "@oax/trust-engine";

import type { SkillRegistryEntry } from "./types";

/**
 * Terminal / policy states that override ladder placement. Continuous health must
 * NOT clear these — lifting them requires an explicit recovery path, not a good
 * runtime signal. (Suspended is deliberately excluded: it is the health-driven
 * state this loop manages, so it can recover.)
 */
const PRESERVED_STATES: ReadonlySet<CertificationLevel> = new Set<CertificationLevel>([
  "Restricted",
  "Deprecated",
  "Revoked",
  "Expired"
]);

export interface ReassessOptions {
  /** Auto-suspend the certification when runtime health falls below this (0..1). */
  suspendBelowHealth?: number;
}

export interface ReassessOutcome {
  entry: SkillRegistryEntry;
  runtimeHealth: number;
  changed: boolean;
  note: string;
}

/**
 * Continuous Skill Assurance: a self-improvement step.
 *
 * Given new runtime signals for a registered skill, recompute its trust profile
 * and re-derive its certification. Healthy production behaviour keeps (or earns
 * back) standing; poor runtime health auto-suspends the skill. This closes the
 * loop so the registry reflects how a skill actually performs over time, not just
 * how it scored at submission.
 */
export function reassessEntry(
  entry: SkillRegistryEntry,
  newSignals: RuntimeSignal[],
  opts: ReassessOptions = {}
): ReassessOutcome {
  const threshold = opts.suspendBelowHealth ?? 0.5;
  const runtimeHealth = aggregateRuntimeHealth(newSignals);

  // Terminal/policy states are not cleared by runtime health.
  if (PRESERVED_STATES.has(entry.certification.level)) {
    return {
      entry,
      runtimeHealth,
      changed: false,
      note: `Certification ${entry.certification.level} is a terminal/policy state; reassessment leaves it unchanged (recovery requires an explicit path).`
    };
  }

  const suspended = runtimeHealth < threshold;

  const certification = certifySkill(
    {
      skillId: entry.skill.id,
      contextId: entry.context.id,
      evaluationScore: entry.evaluation.weightedScore,
      benchmarkScore: entry.benchmark.overallScore,
      signed: Boolean(entry.signature),
      publisherVerified: entry.skill.publisher.verified,
      governanceSatisfied: true,
      enterpriseApproved: entry.certification.level === "Enterprise Approved",
      suspended
    },
    entry.certification.scope
  );

  const trust = computeTrustProfile({
    skillId: entry.skill.id,
    contextId: entry.context.id,
    certificationLevel: certification.level,
    benchmarkScore: entry.benchmark.overallScore,
    signed: Boolean(entry.signature),
    publisherVerified: entry.skill.publisher.verified,
    runtimeSignals: newSignals
  });

  const changed = certification.level !== entry.certification.level;
  const note = suspended
    ? `Runtime health ${runtimeHealth.toFixed(2)} below ${threshold}; certification reassessed to ${certification.level}.`
    : `Runtime health ${runtimeHealth.toFixed(2)}; certification ${changed ? "updated to" : "held at"} ${certification.level}.`;

  return {
    entry: { ...entry, certification, trust },
    runtimeHealth,
    changed,
    note
  };
}
