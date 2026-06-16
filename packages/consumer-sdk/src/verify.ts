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
    const intact = verifyDigest(opts.contract);
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
