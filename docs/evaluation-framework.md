# Evaluation Framework

The evaluation engine (`@oax/evaluation-engine`) answers: *should an enterprise
consider this skill for this context?* It is a structured, mostly
declaration-driven review that complements the empirical benchmark.

## Inputs

- A `Skill` (publisher declarations, capabilities, claims, permissions).
- A `SkillContext` (the twelve context dimensions).
- Optionally a `DeploymentEvaluation` from the context-engine (reused to keep
  evaluation and fit aligned).

## The twelve evaluation dimensions

| # | Dimension | What it asks |
|---|-----------|--------------|
| 1 | Capability Fit | Does the skill cover the context's work type? |
| 2 | Protocol Compatibility | Does it speak the toolchain's protocols? |
| 3 | Input/Output Contract Quality | Are I/O contracts declared and well-formed? |
| 4 | Permission Scope | Are requested permissions within policy? |
| 5 | Data Access Risk | Does permission breadth match data sensitivity? |
| 6 | Performance | Are latency/throughput claims present? |
| 7 | Reliability | Does claimed reliability meet the requirement? |
| 8 | Safety | Are failure modes declared and bounded? |
| 9 | Auditability | Is audit evidence emitted? |
| 10 | Governance Controls | Are required controls satisfied? |
| 11 | Maintainer Trust | Is the publisher verified? |
| 12 | Lifecycle Readiness | Is it versioned with a changelog? |

## Scoring

Each dimension is scored `0..100`. Dimension **weights are context-derived**:
regulated industries up-weight safety and governance; audit-required policies
up-weight auditability; sensitive-data contexts up-weight data access risk. The
weighted mean is the `weightedScore`.

```ts
import { evaluateSkill } from "@oax/evaluation-engine";

const evaluation = evaluateSkill(skill, context);
// evaluation.scores  → DimensionScore[] (12 entries)
// evaluation.weightedScore → 0..100, contextual
```

Because weights depend on context, the same skill yields different evaluations
across deployments — by design.
