# Marketplace Strategy

## Positioning

```text
From:  Most popular Agent Skills for Claude, Claude Code, ChatGPT, Codex
To:    Best performing certified skills for your organization, environment,
       tools, workflows, risk profile, and process context.
```

OpenAutonomyX Marketplace **owns performance-in-context**. The platform consumes
certified marketplace entries; the marketplace is the source of truth for how a
skill is evaluated, benchmarked, certified, signed, and registered.

## Registry views

The registry engine (`@oax/registry-engine`) exposes the views an enterprise
browses. Popularity is supported for transparency but is ranked on its own axis —
it is never the primary trust signal.

| View | Ranks / filters by |
|------|--------------------|
| Popular skills | installs, then stars |
| Certified skills | certification level, then trust |
| Best by workflow | benchmark score within a work type |
| Best by toolchain | benchmark score within a toolchain tool |
| Best by industry | benchmark score within a sector |
| Best by governance profile | trust within a framework |
| Low-risk skills | data-access-risk score ≥ threshold |
| Enterprise-approved skills | certification = Enterprise Approved |
| Skills requiring human approval | context human-approval model |
| Skills restricted by policy | certification = Restricted |

```ts
import { REGISTRY_VIEWS, certifiedSkills } from "@oax/registry-engine";

const top = certifiedSkills(entries);
const byWorkflow = REGISTRY_VIEWS.bestByWorkflow(entries, "code-review");
```

## How enterprise skill governance is supported

- **Contracts** make claims explicit and hashable.
- **Evaluation + benchmark** produce contextual, comparable scores.
- **Certification** gives procurement a governable level with an explicit scope.
- **Signing** (digest now, cryptographic later) establishes integrity.
- **Trust** folds in runtime signals for continuous assurance.
- **Registry views** let a governance team find, e.g., *enterprise-approved,
  low-risk, audit-emitting code-review skills for a SOC2 fintech toolchain.*

## Commercial products this enables

Skill Performance Benchmark Reports · Enterprise Skill Readiness Assessment ·
Certified Skill Registry · Skill Governance Platform · Continuous Skill Assurance ·
Internal Enterprise Skill Marketplace.

## Relationship to the platform

This repository (`marketplace`) **produces** certified, signed registry entries.
The `platform` repository (Issue #2: signed skill certification registry)
**consumes** them. Keeping performance-in-context here means the platform never
re-derives trust — it reads it.
