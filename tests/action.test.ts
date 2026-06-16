import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ACTIONS,
  ACTIONS_BY_ID,
  actionCatalogJsonLd,
  runAction,
  toJsonLd,
  type ActionCapability
} from "@oax/action-engine";
import { certifySkill } from "@oax/certification-engine";

import { sampleContext, sampleSkill } from "./fixtures";

const ALL_CAPABILITIES: ActionCapability[] = [
  "context-fit",
  "evaluate",
  "benchmark",
  "certify",
  "sign",
  "trust",
  "register"
];

test("every marketplace capability is exposed as an action", () => {
  const capabilities = ACTIONS.map((a) => a.capability);
  for (const cap of ALL_CAPABILITIES) {
    assert.ok(capabilities.includes(cap), `missing action for capability: ${cap}`);
  }
  assert.equal(ACTIONS.length, ACTIONS_BY_ID.size);
});

test("actions are model-agnostic", () => {
  assert.ok(ACTIONS.every((a) => a.modelAgnostic === true));
});

test("toJsonLd produces a schema.org Action descriptor", () => {
  const action = ACTIONS_BY_ID.get("action.evaluate");
  assert.ok(action);
  const jsonld = toJsonLd(action!);
  assert.deepEqual(jsonld["@context"], [
    "https://schema.org",
    "https://schema.openautonomyx.com/action/v1"
  ]);
  assert.equal(jsonld["@type"], "Action");
  assert.equal(jsonld.identifier, "action.evaluate");
  assert.equal(jsonld.actionCapability, "evaluate");
  assert.equal(jsonld.modelAgnostic, true);
});

test("the catalog renders as a JSON-LD ItemList of all actions", () => {
  const catalog = actionCatalogJsonLd();
  assert.equal(catalog["@type"], "ItemList");
  assert.equal((catalog.itemListElement as unknown[]).length, ACTIONS.length);
});

test("runAction dispatches context-fit and returns output", () => {
  const result = runAction("action.context-fit", {
    skill: sampleSkill(),
    context: sampleContext()
  });
  assert.equal(result.ok, true);
  assert.equal(result.capability, "context-fit");
  const output = result.output as { overallFit: number };
  assert.ok(output.overallFit > 0);
});

test("runAction dispatches certify and returns a certification", () => {
  const result = runAction("action.certify", {
    skillId: "skill.x",
    contextId: "ctx.x",
    evaluationScore: 88,
    benchmarkScore: 82,
    signed: true,
    publisherVerified: true,
    governanceSatisfied: true
  });
  assert.equal(result.ok, true);
  const output = result.output as ReturnType<typeof certifySkill>;
  assert.ok(output.level);
});

test("runAction reports unknown actions as a failed result, not a throw", () => {
  const result = runAction("action.does-not-exist", {});
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /unknown action/i);
});

test("runAction captures handler errors into the result", () => {
  // Missing required input should fail gracefully, not throw out of runAction.
  const result = runAction("action.context-fit", {});
  assert.equal(result.ok, false);
  assert.ok(result.error);
});
