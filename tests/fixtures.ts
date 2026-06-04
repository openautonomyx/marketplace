import type { Skill, SkillContext } from "@oax/context-engine";

/** A well-behaved GitHub PR review skill used across tests. */
export function sampleSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: "skill.github-pr-review",
    name: "GitHub PR Review Skill",
    description: "Reviews pull request diffs and produces actionable findings.",
    publisher: {
      id: "pub.openautonomyx",
      name: "OpenAutonomyX",
      verified: true,
      did: "did:web:openautonomyx.com"
    },
    version: { version: "1.0.0", releasedAt: "2026-06-01T00:00:00Z", changelog: "Initial release." },
    capabilities: [
      {
        id: "cap.code-review",
        name: "Code Review",
        description: "Review diffs for correctness and risk.",
        workType: "code-review",
        protocols: ["mcp", "openai-tools"]
      }
    ],
    claims: [
      { id: "claim.reliability", statement: "99.5% successful completion", metric: "reliability", value: 0.995 },
      { id: "claim.latency", statement: "Median latency 1200ms", metric: "latencyMs", value: 1200 },
      { id: "claim.cost", statement: "$0.04 per run", metric: "costPerRunUsd", value: 0.04 },
      { id: "claim.audit", statement: "Emits structured run logs", metric: "auditEvidence", value: "run-log" },
      { id: "claim.control.audit", statement: "Supports audit-log control", metric: "control", value: "audit-log" },
      { id: "claim.failure.timeout", statement: "May time out on very large diffs", metric: "failureMode", value: "timeout" }
    ],
    protocols: ["mcp", "openai-tools"],
    toolsUsed: ["github.pulls.read", "github.contents.read"],
    permissionsRequired: ["github.pulls.read", "github.contents.read"],
    ...overrides
  };
}

/** An enterprise, regulated, audit-required context. */
export function sampleContext(overrides: Partial<SkillContext> = {}): SkillContext {
  return {
    id: "ctx.acme-ts-monorepo",
    organization: { id: "org.acme", name: "Acme Corp", sizeTier: "enterprise" },
    industry: { sector: "fintech", regulated: true, frameworks: ["soc2", "pci-dss"] },
    role: { role: "staff-engineer", seniority: "staff" },
    work: { workType: "code-review", description: "TypeScript monorepo PR review." },
    process: { processId: "proc.pr-review", steps: ["open-pr", "automated-review", "human-approval", "merge"] },
    toolchain: { tools: ["github.pulls.read", "github.contents.read"], protocols: ["mcp"] },
    dataSensitivity: "confidential",
    policy: {
      allowedDataSensitivity: "confidential",
      deniedPermissions: ["github.contents.write"],
      requiredControls: ["audit-log"]
    },
    runtime: { platform: "github-actions", network: "restricted", region: "us" },
    humanApproval: "required",
    cost: { maxCostPerRunUsd: 0.1, budgetSensitive: true },
    reliability: "high",
    ...overrides
  };
}
