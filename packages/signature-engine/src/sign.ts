import { digestDocument } from "./digest";
import type { SkillContract, SkillSignature } from "./types";

const PLACEHOLDER_NOTE =
  "Placeholder signature: digest only, no cryptographic private-key signing. " +
  "DID/Verifiable Credential and Sigstore-backed signing land in a later milestone.";

/**
 * Sign a skill contract.
 *
 * IMPORTANT: this does NOT perform real cryptographic signing. It computes a
 * deterministic SHA-256 digest of the canonicalized contract (with any existing
 * signature stripped) and records signer metadata. The returned signature block
 * is explicitly marked as a placeholder so no caller mistakes it for a verifiable
 * cryptographic proof.
 */
export function signContract(
  contract: SkillContract,
  signerId: string
): SkillContract {
  // Never include an existing signature in the digest input.
  const { signature: _ignored, ...unsigned } = contract;
  const { algorithm, digest } = digestDocument(unsigned);

  const signature: SkillSignature = {
    digestAlgorithm: algorithm,
    digest,
    signerId,
    signatureAlgorithm: "placeholder",
    createdAt: new Date().toISOString(),
    note: PLACEHOLDER_NOTE
  };

  return { ...contract, signature };
}

/**
 * Verify that a contract's recorded digest still matches its content. This checks
 * integrity (the contract has not changed since digesting), not authenticity —
 * authenticity requires the real signing scheme that is not yet implemented.
 */
export function verifyDigest(contract: SkillContract): boolean {
  if (!contract.signature) return false;
  const { signature, ...unsigned } = contract;
  const { digest } = digestDocument(unsigned);
  return digest === signature.digest;
}
