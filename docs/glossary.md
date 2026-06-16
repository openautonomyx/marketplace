# Glossary

Core vocabulary for the OpenAutonomyX Marketplace. Terms are grouped by area and
link conceptually to the engine that owns them.

## Core thesis

**Performance-in-context**
: The marketplace's ranking principle. A skill's value is judged by how well it
performs inside a specific organization, environment, toolchain, process, policy
boundary, data context, and workflow — not by popularity.

**Popularity**
: How many people installed or starred a skill. Recorded for transparency, but
never the primary trust signal.

**Model-agnostic**
: A property of agent actions: defined by capability and I/O contract, not by which
model runs the agent. Any model can drive them.

## Skill model (`@oax/context-engine`)

**Skill**
: A publisher's declared unit of capability — capabilities, claims, protocols,
tools used, and required permissions.

**SkillVersion**
: An immutable, semver-tagged release of a skill.

**SkillPublisher**
: The party that publishes and stands behind a skill; may be verified and carry a
DID.

**SkillCapability**
: A discrete capability targeting a unit of enterprise work (a `workType`).

**SkillClaim**
: A measurable assertion about a skill (e.g. reliability, latency), optionally with
evidence.

**SkillContext**
: The full deployment context: organization, industry, role, work, process,
toolchain, data sensitivity, policy, runtime, human-approval model, cost, and
reliability requirements.

**DeploymentEvaluation**
: The result of pairing a skill with a context — `Skill + Context =
DeploymentEvaluation`. Per-dimension fit plus a context-weighted overall fit.

## Evaluation (`@oax/evaluation-engine`)

**Evaluation dimension**
: One of twelve declaration-driven axes (capability fit, protocol compatibility,
I/O contract quality, permission scope, data access risk, performance, reliability,
safety, auditability, governance controls, maintainer trust, lifecycle readiness).

**SkillEvaluation**
: A skill's contextual, weighted score across the evaluation dimensions.

## Benchmark (`@oax/benchmark-engine`)

**Benchmark task**
: A representative unit of enterprise work (e.g. code-review) with permitted tools,
policy constraints, and required evidence.

**BenchmarkRun**
: Realized performance of a skill across a benchmark suite, scored on thirteen
dimensions. (The runner is currently a deterministic placeholder harness.)

## Certification (`@oax/certification-engine`)

**Certification level**
: A governable assurance level. Ladder: Unreviewed → Submitted → Validated →
Certified Bronze → Silver → Gold → Enterprise Approved. Exception states: Restricted,
Deprecated, Suspended, Revoked, Expired.

**SkillCertification**
: An issued certification for a skill in a context, with combined score, rationale,
and scope.

## Contracts & signing (`@oax/signature-engine`)

**Skill contract**
: The hashable, signable document binding publisher claims to a concrete artifact
(capabilities, schemas, data scope, assumptions, claims, failure modes, audit
evidence, governance requirements, certification scope).

**Canonicalization**
: Deterministic JSON serialization (recursively sorted keys) so equal documents
hash identically.

**Digest**
: SHA-256 hash of the canonicalized contract.

**Signature (placeholder)**
: A signature block recording digest, algorithm, signer, and timestamp. It is a
digest only — no cryptographic private-key signing yet (DID/VC/Sigstore later).
Verification checks **integrity**, not authenticity.

## Trust (`@oax/trust-engine`)

**Runtime signal**
: An observation from a skill running in production (success rate, incident, policy
violation), normalized to a 0..1 health contribution.

**SkillTrustProfile**
: A composite 0..100 trust score folding certification, benchmark, provenance, and
runtime health, with explainable factors.

**Continuous Skill Assurance**
: The self-improvement loop (`reassessEntry`) that recomputes trust and re-derives
certification from new runtime signals, auto-suspending on poor health.

## Registry (`@oax/registry-engine`)

**SkillRegistryEntry**
: A fully assembled entry: skill, context, evaluation, benchmark, certification,
signature, trust, and popularity.

**Registry view**
: A filtered/ranked lens over entries (popular, certified, best by
workflow/toolchain/industry/governance, low-risk, enterprise-approved, requires
human approval, restricted by policy).

## Actions (`@oax/action-engine`)

**Agent action**
: A marketplace capability exposed as a model-agnostic, JSON-LD-describable unit of
work (`action.context-fit`, `evaluate`, `benchmark`, `certify`, `sign`, `trust`,
`register`).

**Action catalog**
: The JSON-LD `ItemList` enumerating all available actions for discovery.

## Consumption (`@oax/consumer-sdk`)

**ConsumptionCriteria**
: A platform's performance-in-context query (work type, min certification level, min
trust, signed, enterprise-approved).

**MarketplaceConsumer**
: The platform-side client that finds, recommends, selects, and verifies certified
entries instead of re-deriving trust.
