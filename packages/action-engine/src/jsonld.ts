import { ACTIONS } from "./actions";
import type { AgentActionDescriptor } from "./types";

/** JSON-LD context for marketplace agent actions. */
export const ACTION_JSONLD_CONTEXT = [
  "https://schema.org",
  "https://schema.openautonomyx.com/action/v1"
];

/**
 * Render an action descriptor as a schema.org-style JSON-LD Action. `object` and
 * `result` mirror schema.org Action semantics (the input and produced output).
 */
export function toJsonLd(action: AgentActionDescriptor): Record<string, unknown> {
  return {
    "@context": ACTION_JSONLD_CONTEXT,
    "@type": action["@type"],
    identifier: action.id,
    name: action.name,
    description: action.description,
    actionCapability: action.capability,
    modelAgnostic: action.modelAgnostic,
    object: action.input,
    result: action.output
  };
}

/** Render the full action catalog as a JSON-LD ItemList. */
export function actionCatalogJsonLd(
  actions: AgentActionDescriptor[] = ACTIONS
): Record<string, unknown> {
  return {
    "@context": ACTION_JSONLD_CONTEXT,
    "@type": "ItemList",
    name: "OpenAutonomyX Marketplace agent actions",
    itemListElement: actions.map((a) => toJsonLd(a))
  };
}
