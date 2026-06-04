import assert from "node:assert/strict";
import { test } from "node:test";

import { canonicalize, digestDocument, sha256Hex, signContract, verifyDigest } from "@oax/signature-engine";
import type { SkillContract } from "@oax/signature-engine";

test("sha256Hex matches the known SHA-256 of a string", () => {
  // SHA-256 of "abc".
  assert.equal(
    sha256Hex("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
  );
});

test("canonicalization is independent of key order", () => {
  const a = canonicalize({ b: 1, a: { d: 4, c: 3 } });
  const b = canonicalize({ a: { c: 3, d: 4 }, b: 1 });
  assert.equal(a, b);
});

test("digest is stable for equal documents and changes with content", () => {
  const d1 = digestDocument({ x: 1, y: [2, 3] });
  const d2 = digestDocument({ y: [2, 3], x: 1 });
  const d3 = digestDocument({ x: 1, y: [2, 4] });
  assert.equal(d1.digest, d2.digest);
  assert.notEqual(d1.digest, d3.digest);
  assert.equal(d1.algorithm, "sha-256");
});

function minimalContract(): SkillContract {
  return {
    skillId: "skill.x",
    version: "1.0.0",
    publisher: { id: "pub.x", name: "X", verified: true },
    capabilityClaims: [],
    supportedWorkType: ["code-review"],
    protocolSupport: ["mcp"],
    toolsUsed: [],
    permissionsRequired: [],
    inputSchema: {},
    outputSchema: {},
    dataAccessScope: [],
    environmentAssumptions: [],
    processAssumptions: [],
    performanceClaims: [],
    reliabilityClaims: [],
    failureModes: [],
    auditEvidence: [],
    governanceRequirements: [],
    certificationScope: "code-review"
  };
}

test("placeholder signing attaches a verifiable digest, not a crypto signature", () => {
  const signed = signContract(minimalContract(), "signer.marketplace");
  assert.ok(signed.signature);
  assert.equal(signed.signature?.signatureAlgorithm, "placeholder");
  assert.equal(signed.signature?.digestAlgorithm, "sha-256");
  assert.match(signed.signature?.note ?? "", /placeholder/i);
  assert.equal(verifyDigest(signed), true);
});

test("tampering with a signed contract breaks digest verification", () => {
  const signed = signContract(minimalContract(), "signer.marketplace");
  signed.certificationScope = "incident-triage";
  assert.equal(verifyDigest(signed), false);
});
