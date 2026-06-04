import assert from "node:assert/strict";
import { test } from "node:test";

import { deriveCertificationLevel, levelRank } from "@oax/certification-engine";

const base = {
  skillId: "skill.x",
  contextId: "ctx.x",
  signed: true,
  publisherVerified: true,
  governanceSatisfied: true
};

test("high scores with sign-off yield Enterprise Approved", () => {
  const { level } = deriveCertificationLevel({
    ...base,
    evaluationScore: 95,
    benchmarkScore: 93,
    enterpriseApproved: true
  });
  assert.equal(level, "Enterprise Approved");
});

test("gold scores without enterprise sign-off stay Certified Gold", () => {
  const { level } = deriveCertificationLevel({
    ...base,
    evaluationScore: 95,
    benchmarkScore: 93
  });
  assert.equal(level, "Certified Gold");
});

test("score bands map to bronze/silver", () => {
  assert.equal(
    deriveCertificationLevel({ ...base, evaluationScore: 72, benchmarkScore: 70 }).level,
    "Certified Bronze"
  );
  assert.equal(
    deriveCertificationLevel({ ...base, evaluationScore: 82, benchmarkScore: 80 }).level,
    "Certified Silver"
  );
});

test("unsigned skills are Unreviewed regardless of score", () => {
  const { level } = deriveCertificationLevel({
    ...base,
    signed: false,
    evaluationScore: 99,
    benchmarkScore: 99
  });
  assert.equal(level, "Unreviewed");
});

test("signed but low-scoring skills are Submitted", () => {
  const { level } = deriveCertificationLevel({
    ...base,
    evaluationScore: 40,
    benchmarkScore: 30
  });
  assert.equal(level, "Submitted");
});

test("exception flags override the ladder", () => {
  assert.equal(
    deriveCertificationLevel({ ...base, evaluationScore: 99, benchmarkScore: 99, revoked: true }).level,
    "Revoked"
  );
  assert.equal(
    deriveCertificationLevel({ ...base, evaluationScore: 99, benchmarkScore: 99, policyRestricted: true }).level,
    "Restricted"
  );
});

test("ladder rank is ordered and exception states rank below it", () => {
  assert.ok(levelRank("Enterprise Approved") > levelRank("Certified Gold"));
  assert.ok(levelRank("Certified Gold") > levelRank("Validated"));
  assert.ok(levelRank("Revoked") < levelRank("Unreviewed"));
});
