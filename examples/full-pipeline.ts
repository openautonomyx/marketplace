/*
 * How an agent uses the marketplace capabilities.
 *
 * An agent treats each capability as a model-agnostic action and chains them:
 *
 *   context-fit -> evaluate -> benchmark -> certify -> sign -> trust -> register
 *
 * then a consuming platform selects the certified result. Run:
 *   npx tsx examples/full-pipeline.ts
 */
import type { Skill, SkillContext } from "@oax/context-engine";
import { runAction } from "@oax/action-engine";
import { defineBenchmark } from "@oax/benchmark-engine";
import { contractFromSkill } from "@oax/signature-engine";
import { buildRegistryEntry } from "@oax/registry-engine";
import { MarketplaceConsumer } from "@oax/consumer-sdk";

// --- inputs the agent starts from ------------------------------------------

const skill: Skill = {
  id: "skill.github-pr-review",
  name: "GitHub PR Review",
  description: "Reviews PR diffs and produces actionable findings.",
  publisher: { id: "pub.oax", name: "OpenAutonomyX", verified: true },
  version: { version: "1.0.0", releasedAt: "2026-06-01T00:00:00Z", changelog: "Initial." },
  capabilities: [
    { id: "cap.cr", name: "Code Review", description: "Review diffs.", workType: "code-review", protocols: ["mcp"] }
  ],
  claims: [
    { id: "c.rel", statement: "99.5%", metric: "reliability", value: 0.995 },
    { id: "c.audit", statement: "logs", metric: "auditEvidence", value: "run-log" }
  ],
  protocols: ["mcp"],
  toolsUsed: ["github.pulls.read"],
  permissionsRequired: ["github.pulls.read"]
};

const context: SkillContext = {
  id: "ctx.acme",
  organization: { id: "org.acme", name: "Acme", sizeTier: "enterprise" },
  industry: { sector: "fintech", regulated: true, frameworks: ["soc2"] },
  role: { role: "staff-engineer" },
  work: { workType: "code-review" },
  process: { processId: "p.pr", steps: ["open", "review", "approve", "merge"] },
  toolchain: { tools: ["github.pulls.read"], protocols: ["mcp"] },
  dataSensitivity: "confidential",
  policy: { allowedDataSensitivity: "confidential", deniedPermissions: ["github.contents.write"], requiredControls: ["audit-log"] },
  runtime: { platform: "github-actions", network: "restricted" },
  humanApproval: "required",
  cost: { maxCostPerRunUsd: 0.1, budgetSensitive: true },
  reliability: "high"
};

// --- the agent chains capability actions -----------------------------------

const fit = runAction("action.context-fit", { skill, context });
const evaluation = runAction("action.evaluate", { skill, context });
const benchmark = runAction("action.benchmark", {
  skill,
  benchmark: defineBenchmark("bench.std", "Standard", context)
});

const ev = evaluation.output as { weightedScore: number };
const bm = benchmark.output as { overallScore: number };

const certification = runAction("action.certify", {
  skillId: skill.id,
  contextId: context.id,
  evaluationScore: ev.weightedScore,
  benchmarkScore: bm.overallScore,
  signed: true,
  publisherVerified: true,
  governanceSatisfied: true,
  enterpriseApproved: true
});

const signed = runAction("action.sign", {
  contract: contractFromSkill(skill),
  signerId: "signer.oax"
});

const trust = runAction("action.trust", {
  skillId: skill.id,
  contextId: context.id,
  certificationLevel: (certification.output as { level: string }).level,
  benchmarkScore: bm.overallScore,
  signed: true,
  publisherVerified: true,
  runtimeSignals: []
});

// --- register, then a platform consumes it ---------------------------------

const entry = buildRegistryEntry({
  skill,
  context,
  evaluation: evaluation.output as never,
  benchmark: benchmark.output as never,
  certification: certification.output as never,
  signature: (signed.output as { signature?: unknown }).signature as never,
  trust: trust.output as never
});

const consumer = new MarketplaceConsumer([entry]);
const best = consumer.best({ workType: "code-review", requireSigned: true });

console.log("fit:        ", (fit.output as { overallFit: number }).overallFit.toFixed(3));
console.log("evaluation: ", ev.weightedScore);
console.log("benchmark:  ", bm.overallScore);
console.log("certified:  ", (certification.output as { level: string }).level);
console.log("trust:      ", (trust.output as { trustScore: number }).trustScore);
console.log("selected:   ", best ? best.entry.skill.name : "(none matched)");
