# Performance in Context

## Why popularity is insufficient

Public skill directories rank by popularity: installs, stars, "most used this
week." Popularity answers exactly one question — *how many people tried it* — and
nothing an enterprise actually needs to know before deploying a skill against its
code, customers, or regulated data.

Popularity is a lagging, gameable, context-free signal:

- **Lagging** — it reflects past adoption, not present fitness for your job.
- **Gameable** — installs and stars can be manufactured.
- **Context-free** — a skill that is excellent for a public side project may be
  unacceptable for a regulated fintech monorepo with a strict data boundary.

> Popular means many people tried it.
> Certified performance-in-context means an enterprise can trust it for a specific
> job, environment, toolchain, data boundary, workflow, and governance requirement.

## What performance-in-context means

A skill is only valuable if it performs well *inside a specific context*. The same
skill is simultaneously:

- great for TypeScript monorepos,
- mediocre for polyglot legacy repos,
- **restricted** for regulated codebases without audit hooks.

So the marketplace never assigns one universal score. It computes contextual
scores:

```text
Skill A  ×  Org X / Process Y / Toolchain Z / Data Sensitivity High  =  Deployment Evaluation
```

## The twelve context dimensions

Every evaluation is parameterized by the deployment context (see
`@oax/context-engine`):

1. Organization context
2. Industry context
3. Role context
4. Work context
5. Process context
6. Toolchain context
7. Data sensitivity
8. Policy constraints
9. Runtime environment
10. Human approval model
11. Cost constraints
12. Reliability requirements

## The core identity

```text
Skill + Context = DeploymentEvaluation
```

`evaluateDeployment(skill, context)` returns per-dimension fit and a
context-weighted overall fit. Weights are themselves derived from the context: a
regulated, restricted-data, mission-critical deployment up-weights data risk and
reliability; a public, best-effort one does not. This is what makes the score
*contextual* rather than universal.

## How the engines compose

```text
context-engine     → Skill + Context = DeploymentEvaluation (fit)
evaluation-engine  → 12-dimension contextual evaluation score
benchmark-engine   → realized performance across enterprise work scenarios
certification-engine → certification level from evaluation + benchmark + signing
signature-engine   → canonicalize + SHA-256 digest + (placeholder) signature
trust-engine       → certification + benchmark + runtime + provenance = trust
registry-engine    → registry entries + performance-in-context views
```

Each engine is independently usable and testable; the registry ties them into the
views an enterprise browses.
