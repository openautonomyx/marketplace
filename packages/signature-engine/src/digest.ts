import { createHash } from "node:crypto";

import { canonicalize } from "./canonicalize";

/** SHA-256 hex digest of a UTF-8 string. */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Canonicalize a value and return its SHA-256 digest plus the canonical form.
 * Used by the signer; exposed for verification and tests.
 */
export function digestDocument(value: unknown): {
  algorithm: "sha-256";
  digest: string;
  canonical: string;
} {
  const canonical = canonicalize(value);
  return {
    algorithm: "sha-256",
    digest: sha256Hex(canonical),
    canonical
  };
}
