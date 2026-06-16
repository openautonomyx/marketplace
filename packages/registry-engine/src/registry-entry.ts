import type { Skill, SkillContext } from "@oax/context-engine";
import type { SkillEvaluation } from "@oax/evaluation-engine";
import type { BenchmarkRun } from "@oax/benchmark-engine";
import type { SkillCertification } from "@oax/certification-engine";
import type { SkillSignature } from "@oax/signature-engine";
import type { SkillTrustProfile } from "@oax/trust-engine";

import type { SkillRegistryEntry } from "./types";

export interface BuildEntryInput {
  skill: Skill;
  context: SkillContext;
  evaluation: SkillEvaluation;
  benchmark: BenchmarkRun;
  certification: SkillCertification;
  signature?: SkillSignature;
  trust: SkillTrustProfile;
  popularity?: { installs: number; stars: number };
}

/** Assemble a registry entry from the artifacts produced by the other engines. */
export function buildRegistryEntry(input: BuildEntryInput): SkillRegistryEntry {
  return {
    skill: input.skill,
    context: input.context,
    evaluation: input.evaluation,
    benchmark: input.benchmark,
    certification: input.certification,
    signature: input.signature,
    trust: input.trust,
    popularity: input.popularity ?? { installs: 0, stars: 0 },
    publishedAt: new Date().toISOString()
  };
}
