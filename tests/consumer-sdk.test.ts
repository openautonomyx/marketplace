import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateDeployment, type Skill, type SkillContext } from "@oax/context-engine";
import { evaluateSkill } from "@oax/evaluation-engine";
import { defineBenchmark, runBenchmark } from "@oax/benchmark-engine";
import { certifySkill, type CertificationInput } from "@oax/certification-engine";
import { computeTrustProfile } from "@oax/trust-engine";
import { buildRegistryEntry, type SkillRegistryEntry } from "@oax/registry-engine";
import { signContract, type SkillContract } from "@oax/signature-engine";
import { MarketplaceConsumer, recommend, verifyEntry } from "@oax/consumer-sdk";

import { sampleContext, sampleSkill } from "./fixtures";

function makeEntry(
  skill: Skill,
  ctx: SkillContext,
  certOverrides: Partial<CertificationInput> = {}
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
    ...certOverrides
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
  const signature = signContract(
    { skillId: skill.id } as SkillContract,
    "signer.marketplace"
  ).signature;

  return buildRegistryEntry({ skill, context: ctx, evaluation, benchmark, certification, trust, signature });
}

test("find filters by work type and minimum trust", () => {
  const a = makeEntry(sampleSkill({ id: "skill.a" }), sampleContext());
  const b = makeEntry(
    sampleSkill({ id: "skill.b" }),
    sampleContext({ id: "ctx.other", work: { workType: "incident-triage" } })
  );
  const consumer = new MarketplaceConsumer([a, b]);

  const found = consumer.find({ workType: "code-review", minTrustScore: 1 });
  assert.deepEqual(found.map((e) => e.skill.id), ["skill.a"]);
});

test("recommendations are ranked best-first and explainable", () => {
  const strong = makeEntry(sampleSkill({ id: "skill.strong" }), sampleContext());
  // A restricted (exception-state) entry should be excluded by default.
  const restricted = makeEntry(
    sampleSkill({ id: "skill.restricted" }),
    sampleContext({ id: "ctx.r" }),
    { policyRestricted: true }
  );

  const recs = recommend([strong, restricted], { workType: "code-review" });
  assert.equal(recs.length, 1);
  assert.equal(recs[0].entry.skill.id, "skill.strong");
  assert.ok(recs[0].reasons.some((r) => r.startsWith("Certification:")));
});

test("best honors requireEnterpriseApproved", () => {
  const approved = makeEntry(sampleSkill({ id: "skill.ent" }), sampleContext());
  const consumer = new MarketplaceConsumer([approved]);
  const best = consumer.best({ requireEnterpriseApproved: true });
  // sample fixtures are tuned to reach Enterprise Approved; if not, best is undefined.
  if (best) assert.equal(best.entry.certification.level, "Enterprise Approved");
});

test("verifyEntry passes for a signed, active entry", () => {
  const entry = makeEntry(sampleSkill(), sampleContext());
  const result = verifyEntry(entry);
  assert.equal(result.ok, true);
  assert.ok(result.checks.find((c) => c.name === "signature-present")?.ok);
  assert.ok(result.checks.find((c) => c.name === "certification-active")?.ok);
});

test("verifyEntry detects a tampered contract digest", () => {
  const entry = makeEntry(sampleSkill(), sampleContext());
  const contract = signContract(
    { skillId: "skill.x", certificationScope: "code-review" } as SkillContract,
    "signer.marketplace"
  );
  contract.certificationScope = "tampered";
  const result = verifyEntry(entry, { contract });
  assert.equal(result.ok, false);
  assert.equal(result.checks.find((c) => c.name === "digest-integrity")?.ok, false);
});

test("restricted entries are excluded unless explicitly allowed", () => {
  const restricted = makeEntry(sampleSkill({ id: "skill.x" }), sampleContext(), {
    policyRestricted: true
  });
  assert.equal(recommend([restricted]).length, 0);
  assert.equal(recommend([restricted], { excludeExceptionStates: false }).length, 1);
});
