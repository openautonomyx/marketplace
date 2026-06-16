import type { SkillContext } from "@oax/context-engine";

/** The thirteen benchmark dimensions from Issue #1. */
export const BENCHMARK_DIMENSIONS = [
  "taskCompletion",
  "accuracy",
  "latency",
  "reliability",
  "costEfficiency",
  "permissionMinimization",
  "dataExposureRisk",
  "auditability",
  "policyCompliance",
  "humanApprovalCompatibility",
  "processFit",
  "toolchainFit",
  "maintainability"
] as const;

export type BenchmarkDimensionId = (typeof BENCHMARK_DIMENSIONS)[number];

/** A representative enterprise work scenario, e.g. "code-review". */
export interface BenchmarkTask {
  id: string;
  workType: string;
  description: string;
  /** Tools the task permits the skill to use. */
  permittedTools: string[];
  /** Policy constraints the task enforces. */
  policyConstraints: string[];
  /** Evidence the task requires to count a run as auditable. */
  evidenceRequired: string[];
}

/** A named suite of benchmark tasks evaluated against a context. */
export interface SkillBenchmark {
  id: string;
  name: string;
  context: SkillContext;
  tasks: BenchmarkTask[];
}

/** Per-dimension measured value for one task, normalized to 0..100. */
export interface BenchmarkMeasurement {
  dimension: BenchmarkDimensionId;
  value: number;
}

/** Result of running one task. */
export interface BenchmarkTaskResult {
  taskId: string;
  measurements: BenchmarkMeasurement[];
  /** Aggregate for this task, 0..100. */
  taskScore: number;
}

/** Result of running a full benchmark suite against a skill. */
export interface BenchmarkRun {
  skillId: string;
  benchmarkId: string;
  contextId: string;
  taskResults: BenchmarkTaskResult[];
  /** Aggregate across all tasks, 0..100. */
  overallScore: number;
  startedAt: string;
  finishedAt: string;
}
