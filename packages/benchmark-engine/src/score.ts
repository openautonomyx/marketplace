import type { BenchmarkMeasurement, BenchmarkTaskResult } from "./types";

/** Aggregate one task's measurements into a 0..100 task score. */
export function scoreTask(measurements: BenchmarkMeasurement[]): number {
  if (measurements.length === 0) return 0;
  const sum = measurements.reduce((acc, m) => acc + m.value, 0);
  return Math.round((sum / measurements.length) * 100) / 100;
}

/** Aggregate task results into a 0..100 overall benchmark score. */
export function scoreBenchmark(taskResults: BenchmarkTaskResult[]): number {
  if (taskResults.length === 0) return 0;
  const sum = taskResults.reduce((acc, t) => acc + t.taskScore, 0);
  return Math.round((sum / taskResults.length) * 100) / 100;
}
