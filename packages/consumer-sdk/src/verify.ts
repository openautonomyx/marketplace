import { levelRank } from "@oax/certification-engine";
import { verifyDigest, type SkillContract } from "@oax/signature-engine";
import type { SkillRegistryEntry } from "@oax/registry-engine";

import type { VerificationResult } from "./types";

/**
 * Verify an entry before a platform consumes it.
 *
 * Checks integrity and governance state, not authenticity — authenticity needs
 * the real (not-yet-implemented) cryptographic signing scheme. If the original
 * signed contract is supplied, its digest is re-verified against its content.
 */
export function verifyEntry(
  entry: SkillRegistryEntry,
  opts: { contract?: SkillContract } = {}
): VerificationResult {
  const checks: VerificationResult["checks"] = [];

  checks.push({
    name: "signature-present",
    ok: Boolean(entry.signature),
    detail: entry.signature ? "Entry has a signature block." : "Entry is unsigned."
  });

  const active = levelRank(entry.certification.level) >= 0;
  checks.push({
    name: "certification-active",
    ok: active,
    detail: `Certification level is ${entry.certification.level}.`
  });

  if (opts.contract) {
    const contract = opts.contract;

    // The contract must be the one this entry was registered with — otherwise a
    // caller could supply an intact contract for a *different* skill and pass.
    checks.push({
      name: "contract-skill-match",
      ok: contract.skillId === entry.skill.id,
      detail:
        contract.skillId === entry.skill.id
          ? "Contract skill id matches the entry."
          : `Contract skill id "${contract.skillId}" does not match entry skill "${entry.skill.id}".`
    });

    // The contract's signature must match the entry's registered signature.
    const digestsMatch =
      Boolean(entry.signature) &&
      Boolean(contract.signature) &&
      contract.signature?.digest === entry.signature?.digest &&
      contract.signature?.signerId === entry.signature?.signerId;
    checks.push({
      name: "contract-signature-match",
      ok: digestsMatch,
      detail: digestsMatch
        ? "Contract signature matches the entry's registered signature."
        : "Contract signature does not match the entry's registered signature."
    });

    const intact = verifyDigest(contract);
    checks.push({
      name: "digest-integrity",
      ok: intact,
      detail: intact
        ? "Contract digest matches its content."
        : "Contract digest does not match — content changed since signing."
    });
  }

  return { ok: checks.every((c) => c.ok), checks };
}
