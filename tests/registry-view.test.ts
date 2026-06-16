import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateDeployment, type Skill, type SkillContext } from "@oax/context-engine";
import { evaluateSkill } from "@oax/evaluation-engine";
import { defineBenchmark, runBenchmark } from "@oax/benchmark-engine";
import { certifySkill, type CertificationInput } from "@oax/certification-engine";
import { computeTrustProfile } from "@oax/trust-engine";
import {
  buildRegistryEntry,
  certifiedSkills,
  enterpriseApprovedSkills,
  popularSkills,
  requiresHumanApproval,
  restrictedByPolicy,
  type SkillRegistryEntry
} from "@oax/registry-engine";

import { sampleContext, sampleSkill } from "./fixtures";

function makeEntry(
  skill: Skill,
  ctx: SkillContext,
  opts: { popularity?: { installs: number; stars: number }; certOverrides?: Partial<CertificationInput> } = {}
): SkillRegistryEntry {
  const deployment = evaluateDeployment(skill, ctx);
  const evaluation = evaluateSkill(skill, ctx, deployment);
  const benchmark = runBenchmark(skill, defineBenchmark("bench.std", "Standard", ctx));

  const certification = certifySkill({
    skillId: skill.id,
    contextId: ctx.id,
    evaluationScore: evaluation.weightedScore,
    benchmarkScore: benchmark.overallScore,
    signed: true,
    publisherVerified: skill.publisher.verified,
    governanceSatisfied: true,
    enterpriseApproved: true,
    ...opts.certOverrides
  });

  const trust = computeTrustProfile({
    skillId: skill.id,
    contextId: ctx.id,
    certificationLevel: certification.level,
    benchmarkScore: benchmark.overallScore,
    signed: true,
    publisherVerified: skill.publisher.verified,
    runtimeSignals: []
  });

  return buildRegistryEntry({
    skill,
    context: ctx,
    evaluation,
    benchmark,
    certification,
    trust,
    popularity: opts.popularity
  });
}

test("popular view ranks by installs, not trust", () => {
  const trusted = makeEntry(sampleSkill({ id: "skill.trusted" }), sampleContext(), {
    popularity: { installs: 10, stars: 1 }
  });
  const popular = makeEntry(sampleSkill({ id: "skill.popular" }), sampleContext({ id: "ctx.b" }), {
    popularity: { installs: 1000, stars: 50 }
  });

  const ranked = popularSkills([trusted, popular]);
  assert.equal(ranked[0].skill.id, "skill.popular");
});

test("certified view excludes unsigned/unreviewed entries", () => {
  const certified = makeEntry(sampleSkill({ id: "skill.certified" }), sampleContext());
  const unreviewed = makeEntry(sampleSkill({ id: "skill.unreviewed" }), sampleContext({ id: "ctx.c" }), {
    certOverrides: { signed: false }
  });

  const view = certifiedSkills([certified, unreviewed]);
  const ids = view.map((e) => e.skill.id);
  assert.ok(ids.includes("skill.certified"));
  assert.ok(!ids.includes("skill.unreviewed"));
});

test("restricted-by-policy view surfaces only restricted entries", () => {
  const restricted = makeEntry(sampleSkill({ id: "skill.restricted" }), sampleContext(), {
    certOverrides: { policyRestricted: true }
  });
  const ok = makeEntry(sampleSkill({ id: "skill.ok" }), sampleContext({ id: "ctx.d" }));

  const view = restrictedByPolicy([restricted, ok]);
  assert.equal(view.length, 1);
  assert.equal(view[0].skill.id, "skill.restricted");
});

test("human-approval view filters on the deployment context", () => {
  const requires = makeEntry(sampleSkill(), sampleContext({ id: "ctx.req", humanApproval: "required" }));
  const none = makeEntry(sampleSkill({ id: "skill.auto" }), sampleContext({ id: "ctx.none", humanApproval: "none" }));

  const view = requiresHumanApproval([requires, none]);
  assert.equal(view.length, 1);
  assert.equal(view[0].context.id, "ctx.req");
});

test("enterprise-approved view returns only enterprise-approved certifications", () => {
  const approved = makeEntry(sampleSkill(), sampleContext());
  const view = enterpriseApprovedSkills([approved]);
  // The sample skill/context are designed to reach Enterprise Approved.
  assert.ok(view.every((e) => e.certification.level === "Enterprise Approved"));
});
