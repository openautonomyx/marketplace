import type { Skill, SkillContext } from "@oax/context-engine";
import type { SkillEvaluation } from "@oax/evaluation-engine";
import type { BenchmarkRun } from "@oax/benchmark-engine";
import type { SkillCertification } from "@oax/certification-engine";
import type { SkillSignature } from "@oax/signature-engine";
import type { SkillTrustProfile } from "@oax/trust-engine";

/**
 * A fully assembled registry entry: a skill, the context it was assessed in, and
 * every downstream artifact. Entries are the unit registry views filter and rank.
 */
export interface SkillRegistryEntry {
  skill: Skill;
  context: SkillContext;
  evaluation: SkillEvaluation;
  benchmark: BenchmarkRun;
  certification: SkillCertification;
  signature?: SkillSignature;
  trust: SkillTrustProfile;
  /** Popularity is recorded but never the primary ranking key. */
  popularity: {
    installs: number;
    stars: number;
  };
  publishedAt: string;
}
