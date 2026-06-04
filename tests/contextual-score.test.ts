import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateDeployment } from "@oax/context-engine";
import { aggregateScore, evaluateSkill } from "@oax/evaluation-engine";

import { sampleContext, sampleSkill } from "./fixtures";

test("a fitting skill scores well in its target context", () => {
  const skill = sampleSkill();
  const ctx = sampleContext();
  const deployment = evaluateDeployment(skill, ctx);

  assert.equal(deployment.skillId, skill.id);
  assert.equal(deployment.contextId, ctx.id);
  assert.ok(deployment.overallFit > 0.6, `expected good fit, got ${deployment.overallFit}`);

  const capability = deployment.fits.find((f) => f.dimension === "capability");
  assert.equal(capability?.fit, 1);
});

test("the same skill scores differently in a mismatched context", () => {
  const skill = sampleSkill();
  const fitting = evaluateSkill(skill, sampleContext());

  // A context for different work, denying the skill's permissions.
  const mismatched = evaluateSkill(
    skill,
    sampleContext({
      id: "ctx.mismatch",
      work: { workType: "incident-triage" },
      policy: {
        allowedDataSensitivity: "internal",
        deniedPermissions: ["github.pulls.read", "github.contents.read"],
        requiredControls: ["audit-log"]
      }
    })
  );

  assert.ok(
    mismatched.weightedScore < fitting.weightedScore,
    `expected mismatch (${mismatched.weightedScore}) < fit (${fitting.weightedScore})`
  );
});

test("aggregateScore is a correct weighted mean", () => {
  const score = aggregateScore([
    { dimension: "capabilityFit", score: 100, weight: 1, rationale: "" },
    { dimension: "safety", score: 0, weight: 3, rationale: "" }
  ]);
  // (100*1 + 0*3) / (1+3) = 25
  assert.equal(score, 25);
});

test("evaluation produces a score for every dimension", () => {
  const evaluation = evaluateSkill(sampleSkill(), sampleContext());
  assert.equal(evaluation.scores.length, 12);
  for (const s of evaluation.scores) {
    assert.ok(s.score >= 0 && s.score <= 100, `${s.dimension} out of range: ${s.score}`);
  }
});
