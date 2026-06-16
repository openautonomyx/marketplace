import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateDeployment, type Skill, type SkillContext } from "@oax/context-engine";
import { evaluateSkill } from "@oax/evaluation-engine";
import { defineBenchmark, runBenchmark } from "@oax/benchmark-engine";
import { certifySkill } from "@oax/certification-engine";
import { computeTrustProfile, type RuntimeSignal } from "@oax/trust-engine";
import { buildRegistryEntry, reassessEntry, type SkillRegistryEntry } from "@oax/registry-engine";

import { sampleContext, sampleSkill } from "./fixtures";

function makeEntry(skill: Skill, ctx: SkillContext): SkillRegistryEntry {
  const deployment = evaluateDeployment(skill, ctx);
  const evaluation = evaluateSkill(skill, ctx, deployment);
  const benchmark = runBenchmark(skill, defineBenchmark("bench.std", "Standard", ctx));
  const certification = certifySkill({
    skillId: skill.id,
    contextId: ctx.id,
    evaluationScore: evaluation.weightedScore,
    benchmarkScore: benchmark.overallScore,
    signed: true,
    publisherVerified: true,
    governanceSatisfied: true,
    enterpriseApproved: true
  });
  const trust = computeTrustProfile({
    skillId: skill.id,
    contextId: ctx.id,
    certificationLevel: certification.level,
    benchmarkScore: benchmark.overallScore,
    signed: true,
    publisherVerified: true,
    runtimeSignals: []
  });
  return buildRegistryEntry({ skill, context: ctx, evaluation, benchmark, certification, trust });
}

const signal = (health: number): RuntimeSignal => ({
  skillId: "skill.github-pr-review",
  contextId: "ctx.acme-ts-monorepo",
  kind: "success-rate",
  health,
  observedAt: "2026-06-16T00:00:00Z"
});

test("poor runtime health auto-suspends the certification", () => {
  const entry = makeEntry(sampleSkill(), sampleContext());
  const outcome = reassessEntry(entry, [signal(0.1), signal(0.2)]);
  assert.equal(outcome.entry.certification.level, "Suspended");
  assert.equal(outcome.changed, true);
  assert.ok(outcome.runtimeHealth < 0.5);
});

test("healthy runtime keeps the skill certified", () => {
  const entry = makeEntry(sampleSkill(), sampleContext());
  const outcome = reassessEntry(entry, [signal(0.99), signal(0.98)]);
  assert.notEqual(outcome.entry.certification.level, "Suspended");
  assert.ok(outcome.runtimeHealth > 0.9);
});

test("trust profile is recomputed from the new signals", () => {
  const entry = makeEntry(sampleSkill(), sampleContext());
  const healthy = reassessEntry(entry, [signal(0.99)]);
  const poor = reassessEntry(entry, [signal(0.05)]);
  assert.ok(healthy.entry.trust.trustScore > poor.entry.trust.trustScore);
});
