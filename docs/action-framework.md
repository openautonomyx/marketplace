# Action Framework

Agent actions = marketplace capabilities, made declarative.

`@oax/action-engine` exposes every engine capability as an **AgentAction**: a
model-agnostic, JSON-LD-describable unit of work an agent can discover and invoke.
"Model-agnostic" means an action is defined by its capability and I/O contract —
**any model can drive it**; the action does not depend on which model runs the
agent.

## The action shape

```ts
interface AgentActionDescriptor {
  "@type": "Action";
  id: string;                 // e.g. "action.evaluate"
  name: string;
  capability: ActionCapability;
  description: string;
  modelAgnostic: true;
  input: JsonSchema;          // schema.org "object"
  output: JsonSchema;         // schema.org "result"
}
```

An `ActionDefinition` adds an executable `run(input)` handler that wraps the
corresponding engine.

## The defined actions

| Action id | Capability | Wraps | Input → Output |
|-----------|-----------|-------|----------------|
| `action.context-fit` | context-fit | `evaluateDeployment` | `{skill, context}` → `DeploymentEvaluation` |
| `action.evaluate` | evaluate | `evaluateSkill` | `{skill, context}` → `SkillEvaluation` |
| `action.benchmark` | benchmark | `runBenchmark` | `{skill, benchmark}` → `BenchmarkRun` |
| `action.certify` | certify | `certifySkill` | `CertificationInput` → `SkillCertification` |
| `action.sign` | sign | `signContract` | `{contract, signerId}` → `SkillContract` |
| `action.trust` | trust | `computeTrustProfile` | `TrustInput` → `SkillTrustProfile` |
| `action.register` | register | `buildRegistryEntry` | `BuildEntryInput` → `SkillRegistryEntry` |

Together these compose the full pipeline:

```text
context-fit → evaluate → benchmark → certify → sign → trust → register
```

## Invoking an action

```ts
import { runAction } from "@oax/action-engine";

const result = runAction("action.evaluate", { skill, context });
// result: { actionId, capability, ok, output?, error?, ranAt }
```

`runAction` never throws: unknown ids and handler errors are captured into the
result (`ok: false`, `error`), so an agent can reason about failures uniformly
regardless of the model driving it.

## JSON-LD descriptors

Actions render as schema.org-style JSON-LD. `object` is the input contract and
`result` is the produced output.

```ts
import { toJsonLd, actionCatalogJsonLd } from "@oax/action-engine";

toJsonLd(action);          // a single Action descriptor
actionCatalogJsonLd();     // an ItemList of all actions
```

Worked example:
[`examples/actions/evaluate.action.jsonld`](../examples/actions/evaluate.action.jsonld).

## Why this matters

- **Discoverable** — an agent can read the catalog and learn what the marketplace
  can do without bespoke integration.
- **Model-agnostic** — the same actions work whichever model drives the agent.
- **Composable** — actions chain into the performance-in-context pipeline.
- **Auditable** — every invocation yields a structured, timestamped result.
