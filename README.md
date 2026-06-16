# OpenAutonomyX Marketplace

Certified skill marketplace for OpenAutonomyX.

This repository owns skill discovery, evaluation, benchmarking, certification,
signed contracts, registry publishing, and marketplace trust workflows — ranked by
**performance-in-context**, not popularity.

> Popular means many people tried it.
> Certified performance-in-context means an enterprise can trust it for a specific
> job, environment, toolchain, data boundary, workflow, and governance requirement.

## Core identity

```text
Skill + Context = DeploymentEvaluation
```

A skill never receives one universal score. It receives contextual scores across
organization, industry, role, work, process, toolchain, data sensitivity, policy,
runtime, human-approval, cost, and reliability context.

## Packages

| Package | Responsibility |
|---------|----------------|
| `@oax/context-engine` | Models deployment context; computes `Skill + Context = DeploymentEvaluation`. |
| `@oax/evaluation-engine` | Scores a skill across 12 evaluation dimensions, context-weighted. |
| `@oax/benchmark-engine` | Defines enterprise benchmark scenarios; scores realized performance (13 dimensions). |
| `@oax/certification-engine` | Derives certification level from evaluation, benchmark, signing, and policy. |
| `@oax/signature-engine` | Canonicalizes contracts, computes SHA-256 digests, produces placeholder signatures. |
| `@oax/registry-engine` | Assembles registry entries; exposes performance-in-context views. |
| `@oax/trust-engine` | Combines certification, benchmark, provenance, and runtime signals into a trust profile. |

## Documentation

- [Performance in Context](docs/performance-in-context.md)
- [Evaluation Framework](docs/evaluation-framework.md)
- [Benchmark Framework](docs/benchmark-framework.md)
- [Certification Framework](docs/certification-framework.md)
- [Signed Skill Contract](docs/signed-skill-contract.md)
- [Marketplace Strategy](docs/marketplace-strategy.md)

Worked example contract:
[`examples/skill-contracts/github-pr-review.skill-contract.jsonld`](examples/skill-contracts/github-pr-review.skill-contract.jsonld).

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run test        # node:test via tsx
npm run lint        # eslint
```

Node ≥ 20.11 (CI runs on Node 22). The repo is an npm workspaces monorepo; each
engine lives in `packages/*` and is importable via its `@oax/*` alias.

## Status

This is the first executable scaffold. Benchmark execution is a deterministic
placeholder harness, and contract signing computes a digest only — **no
cryptographic private-key signing yet**. DID/Verifiable Credentials and
Sigstore-backed signing are deliberate later milestones (see platform Issue #2).
