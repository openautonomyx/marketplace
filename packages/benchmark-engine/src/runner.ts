import {
  evaluateDeployment,
  type Skill,
  type SkillContext
} from "@oax/context-engine";

import { scoreBenchmark, scoreTask } from "./score";
import {
  BENCHMARK_DIMENSIONS,
  type BenchmarkMeasurement,
  type BenchmarkTask,
  type BenchmarkTaskResult,
  type BenchmarkRun,
  type SkillBenchmark
} from "./types";

/**
 * Deterministic 0..1 pseudo-signal derived from a string. This is a *placeholder*
 * harness: real benchmarking executes skills against datasets and measures
 * outcomes. Determinism keeps the scaffold and its tests reproducible.
 */
function seededSignal(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Map the unsigned 32-bit hash into [0, 1).
  return (h >>> 0) / 0xffffffff;
}

/**
 * Measure one dimension for one task. Several dimensions are anchored to the
 * deployment fit so benchmark output stays consistent with contextual fit, then
 * nudged by a deterministic per-(skill,task,dimension) signal.
 */
function measureDimension(
  dimension: (typeof BENCHMARK_DIMENSIONS)[number],
  skill: Skill,
  ctx: SkillContext,
  task: BenchmarkTask,
  fit: (name: string) => number
): number {
  const noise = seededSignal(`${skill.id}:${task.id}:${dimension}`);
  const anchor: Record<string, number> = {
    taskCompletion: 0.7 + 0.3 * fit("capability"),
    accuracy: 0.6 + 0.3 * fit("capability"),
    latency: 0.7,
    reliability: fit("reliability"),
    costEfficiency: fit("cost"),
    permissionMinimization: fit("permission"),
    dataExposureRisk: fit("dataRisk"),
    auditability: ctx.policy.requiredControls.includes("audit-log") ? 0.6 : 0.8,
    policyCompliance: fit("permission") * fit("dataRisk"),
    humanApprovalCompatibility: ctx.humanApproval === "none" ? 0.7 : 0.9,
    processFit: 0.6 + 0.4 * fit("capability"),
    toolchainFit: fit("protocol"),
    maintainability: skill.publisher.verified ? 0.8 : 0.5
  };
  const base = anchor[dimension] ?? 0.5;
  // Blend the anchor with deterministic noise, then scale to 0..100.
  const blended = Math.max(0, Math.min(1, base * 0.85 + noise * 0.15));
  return Math.round(blended * 100 * 100) / 100;
}

function runTask(
  skill: Skill,
  ctx: SkillContext,
  task: BenchmarkTask,
  fit: (name: string) => number
): BenchmarkTaskResult {
  const measurements: BenchmarkMeasurement[] = BENCHMARK_DIMENSIONS.map(
    (dimension) => ({
      dimension,
      value: measureDimension(dimension, skill, ctx, task, fit)
    })
  );
  return {
    taskId: task.id,
    measurements,
    taskScore: scoreTask(measurements)
  };
}

/**
 * Run a benchmark suite against a skill and return a reproducible BenchmarkRun.
 */
export function runBenchmark(
  skill: Skill,
  benchmark: SkillBenchmark
): BenchmarkRun {
  const startedAt = new Date().toISOString();
  const ctx = benchmark.context;
  const deployment = evaluateDeployment(skill, ctx);
  const fit = (name: string): number =>
    deployment.fits.find((f) => f.dimension === name)?.fit ?? 0;

  const taskResults = benchmark.tasks.map((task) =>
    runTask(skill, ctx, task, fit)
  );

  return {
    skillId: skill.id,
    benchmarkId: benchmark.id,
    contextId: ctx.id,
    taskResults,
    overallScore: scoreBenchmark(taskResults),
    startedAt,
    finishedAt: new Date().toISOString()
  };
}
