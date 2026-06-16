import { ACTIONS } from "@oax/action-engine";

import { ModuleRegistry } from "./registry";
import type { MarketplaceModule } from "./types";

/** The capability engines that make up the marketplace. */
export const ENGINE_MODULES: MarketplaceModule[] = [
  { id: "engine.context", kind: "engine", name: "Context Engine", version: "0.1.0", capability: "context-fit", description: "Skill + Context = DeploymentEvaluation." },
  { id: "engine.evaluation", kind: "engine", name: "Evaluation Engine", version: "0.1.0", capability: "evaluate", description: "Twelve-dimension contextual evaluation." },
  { id: "engine.benchmark", kind: "engine", name: "Benchmark Engine", version: "0.1.0", capability: "benchmark", description: "Realized performance across enterprise scenarios." },
  { id: "engine.certification", kind: "engine", name: "Certification Engine", version: "0.1.0", capability: "certify", description: "Certification level derivation." },
  { id: "engine.signature", kind: "engine", name: "Signature Engine", version: "0.1.0", capability: "sign", description: "Canonicalize, digest, and sign contracts." },
  { id: "engine.trust", kind: "engine", name: "Trust Engine", version: "0.1.0", capability: "trust", description: "Composite trust + continuous assurance." },
  { id: "engine.registry", kind: "engine", name: "Registry Engine", version: "0.1.0", capability: "register", description: "Registry entries and performance-in-context views." },
  { id: "engine.action", kind: "engine", name: "Action Engine", version: "0.1.0", capability: "actions", description: "Capabilities as model-agnostic agent actions." },
  { id: "engine.consumer", kind: "engine", name: "Consumer SDK", version: "0.1.0", capability: "consume", description: "Platform-side consumption of certified entries." }
];

/** Marketplace actions, lifted from the action-engine catalog as modules. */
export function actionModules(): MarketplaceModule[] {
  return ACTIONS.map((a) => ({
    id: a.id,
    kind: "action" as const,
    name: a.name,
    version: "0.1.0",
    capability: a.capability,
    description: a.description
  }));
}

/** A registry pre-loaded with every marketplace module. */
export function defaultRegistry(): ModuleRegistry {
  return new ModuleRegistry().registerAll([...ENGINE_MODULES, ...actionModules()]);
}
