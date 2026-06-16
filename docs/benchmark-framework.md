# Benchmark Framework

Where evaluation reads *declarations*, the benchmark engine
(`@oax/benchmark-engine`) measures *realized performance* against representative
enterprise work scenarios.

## Benchmark scenarios

A `BenchmarkTask` is a representative unit of enterprise work. Issue #1 calls out:
code review, incident triage, vendor review, policy review, report generation,
customer support, procurement analysis, security evidence review, onboarding.

Each task defines:

- task description and `workType`
- permitted tools
- policy constraints
- evidence required

A `SkillBenchmark` binds a set of tasks to a specific deployment `context`, so
benchmark results are themselves performance-in-context.

## The thirteen benchmark dimensions

```text
task completion · accuracy · latency · reliability · cost efficiency
permission minimization · data exposure risk · auditability
policy compliance · human approval compatibility
process fit · toolchain fit · maintainability
```

Each is measured `0..100` per task; tasks aggregate to a benchmark `overallScore`.

## The runner is a placeholder harness

`runBenchmark(skill, benchmark)` is **deterministic and reproducible**, but it does
not yet execute skills against live datasets. Several dimensions are anchored to
the context-engine's deployment fit (so benchmark output stays consistent with
contextual fit) and nudged by a deterministic per-`(skill, task, dimension)`
signal.

> The real harness — executing skills against curated enterprise datasets with
> rubric-based scoring and captured evidence — is a later milestone. The scaffold
> fixes the types, scoring math, and reproducibility contract now.

```ts
import { defineBenchmark, runBenchmark } from "@oax/benchmark-engine";

const benchmark = defineBenchmark("bench.std", "Standard", context);
const run = runBenchmark(skill, benchmark);
// run.overallScore → 0..100
```
