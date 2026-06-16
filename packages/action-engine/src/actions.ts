import {
  evaluateDeployment,
  type Skill,
  type SkillContext
} from "@oax/context-engine";
import { evaluateSkill } from "@oax/evaluation-engine";
import { runBenchmark, type SkillBenchmark } from "@oax/benchmark-engine";
import { certifySkill, type CertificationInput } from "@oax/certification-engine";
import { signContract, type SkillContract } from "@oax/signature-engine";
import { computeTrustProfile, type TrustInput } from "@oax/trust-engine";
import { buildRegistryEntry, type BuildEntryInput } from "@oax/registry-engine";

import type { ActionDefinition } from "./types";

const obj = (required: string[], properties: Record<string, unknown>) => ({
  type: "object",
  required,
  properties
});

/**
 * The marketplace capabilities, each exposed as a model-agnostic agent action.
 * The `run` handler is a thin wrapper over the corresponding engine function.
 */
export const ACTIONS: ActionDefinition[] = [
  {
    "@type": "Action",
    id: "action.context-fit",
    name: "Compute deployment fit",
    capability: "context-fit",
    description: "Pair a skill with a context to produce Skill + Context = DeploymentEvaluation.",
    modelAgnostic: true,
    input: obj(["skill", "context"], { skill: { $ref: "Skill" }, context: { $ref: "SkillContext" } }),
    output: { $ref: "DeploymentEvaluation" },
    run: (input) => {
      const { skill, context } = input as { skill: Skill; context: SkillContext };
      return evaluateDeployment(skill, context);
    }
  },
  {
    "@type": "Action",
    id: "action.evaluate",
    name: "Evaluate skill in context",
    capability: "evaluate",
    description: "Score a skill across the twelve evaluation dimensions, context-weighted.",
    modelAgnostic: true,
    input: obj(["skill", "context"], { skill: { $ref: "Skill" }, context: { $ref: "SkillContext" } }),
    output: { $ref: "SkillEvaluation" },
    run: (input) => {
      const { skill, context } = input as { skill: Skill; context: SkillContext };
      return evaluateSkill(skill, context);
    }
  },
  {
    "@type": "Action",
    id: "action.benchmark",
    name: "Benchmark skill",
    capability: "benchmark",
    description: "Run a benchmark suite against a skill and score realized performance.",
    modelAgnostic: true,
    input: obj(["skill", "benchmark"], { skill: { $ref: "Skill" }, benchmark: { $ref: "SkillBenchmark" } }),
    output: { $ref: "BenchmarkRun" },
    run: (input) => {
      const { skill, benchmark } = input as { skill: Skill; benchmark: SkillBenchmark };
      return runBenchmark(skill, benchmark);
    }
  },
  {
    "@type": "Action",
    id: "action.certify",
    name: "Certify skill",
    capability: "certify",
    description: "Derive a certification level from evaluation, benchmark, signing, and policy.",
    modelAgnostic: true,
    input: { $ref: "CertificationInput" },
    output: { $ref: "SkillCertification" },
    run: (input) => certifySkill(input as CertificationInput)
  },
  {
    "@type": "Action",
    id: "action.sign",
    name: "Sign skill contract",
    capability: "sign",
    description: "Canonicalize a contract and attach a SHA-256 digest signature block.",
    modelAgnostic: true,
    input: obj(["contract", "signerId"], { contract: { $ref: "SkillContract" }, signerId: { type: "string" } }),
    output: { $ref: "SkillContract" },
    run: (input) => {
      const { contract, signerId } = input as { contract: SkillContract; signerId: string };
      return signContract(contract, signerId);
    }
  },
  {
    "@type": "Action",
    id: "action.trust",
    name: "Compute trust profile",
    capability: "trust",
    description: "Compose certification, benchmark, provenance, and runtime signals into a trust score.",
    modelAgnostic: true,
    input: { $ref: "TrustInput" },
    output: { $ref: "SkillTrustProfile" },
    run: (input) => computeTrustProfile(input as TrustInput)
  },
  {
    "@type": "Action",
    id: "action.register",
    name: "Register skill",
    capability: "register",
    description: "Assemble a registry entry from the artifacts produced by the other actions.",
    modelAgnostic: true,
    input: { $ref: "BuildEntryInput" },
    output: { $ref: "SkillRegistryEntry" },
    run: (input) => buildRegistryEntry(input as BuildEntryInput)
  }
];

/** Index of actions by id for fast dispatch. */
export const ACTIONS_BY_ID: Map<string, ActionDefinition> = new Map(
  ACTIONS.map((a) => [a.id, a])
);
