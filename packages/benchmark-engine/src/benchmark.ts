import type { SkillContext } from "@oax/context-engine";

import type { BenchmarkTask, SkillBenchmark } from "./types";

/**
 * A small library of representative enterprise work scenarios. Issue #1 lists
 * code review, incident triage, vendor review, policy review, report generation,
 * and more. We seed code-review here; additional scenarios are added the same way.
 */
export const STANDARD_TASKS: BenchmarkTask[] = [
  {
    id: "task.code-review",
    workType: "code-review",
    description: "Review a pull request diff and produce actionable, accurate findings.",
    permittedTools: ["github.pulls.read", "github.contents.read"],
    policyConstraints: ["no-write-without-approval", "audit-log"],
    evidenceRequired: ["run-log", "findings-with-citations"]
  }
];

/** Build a benchmark suite bound to a specific deployment context. */
export function defineBenchmark(
  id: string,
  name: string,
  context: SkillContext,
  tasks: BenchmarkTask[] = STANDARD_TASKS
): SkillBenchmark {
  return { id, name, context, tasks };
}
