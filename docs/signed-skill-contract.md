# Signed Skill Contract

A **skill contract** is the hashable, signable document that binds a publisher's
claims to a concrete artifact. It is what an enterprise verifies to know *exactly
what was certified*.

See the worked example:
[`examples/skill-contracts/github-pr-review.skill-contract.jsonld`](../examples/skill-contracts/github-pr-review.skill-contract.jsonld).

## What a contract declares

- skill id, version, publisher
- capability claims and supported work types
- protocol support, tools used, permissions required
- input schema and output schema
- data access scope
- environment assumptions, process assumptions
- performance claims, reliability claims, failure modes
- audit evidence
- governance requirements
- certification scope
- a signature block

## Canonicalization and digest

`@oax/signature-engine` provides:

- `canonicalize(value)` — deterministic JSON serialization with recursively
  sorted object keys, so semantically identical documents serialize (and hash)
  identically. This is a pragmatic subset of RFC 8785 (JCS).
- `sha256Hex(string)` and `digestDocument(value)` — SHA-256 digest of the
  canonical form.

```ts
import { signContract, verifyDigest } from "@oax/signature-engine";

const signed = signContract(contract, "signer.openautonomyx.marketplace");
verifyDigest(signed); // true — integrity holds until the contract changes
```

## The signature is a placeholder — on purpose

`signContract` computes the digest and records signer metadata, algorithm, and
timestamp. It **does not** perform real cryptographic private-key signing, and the
signature block is explicitly marked `signatureAlgorithm: "placeholder"` with a
note saying so.

`verifyDigest` therefore checks **integrity** (the contract has not changed since
digesting), not **authenticity**.

> Real authenticity — DID / Verifiable Credentials and Sigstore-backed signing —
> is a deliberate later milestone. The scaffold establishes the canonicalization
> and digest contract now so the wire format is stable when real signing lands.
> This satisfies the signed certification registry direction in platform Issue #2.
