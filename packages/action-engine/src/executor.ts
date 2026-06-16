import { ACTIONS_BY_ID } from "./actions";
import type { ActionResult } from "./types";

/**
 * Invoke an action by id with an input payload. Errors are captured into the
 * result rather than thrown, so an agent can reason about failures uniformly
 * regardless of which model is driving it.
 */
export function runAction(actionId: string, input: unknown): ActionResult {
  const def = ACTIONS_BY_ID.get(actionId);
  const ranAt = new Date().toISOString();

  if (!def) {
    return { actionId, ok: false, error: `Unknown action: ${actionId}`, ranAt };
  }

  try {
    const output = def.run(input);
    return { actionId, capability: def.capability, ok: true, output, ranAt };
  } catch (err) {
    return {
      actionId,
      capability: def.capability,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      ranAt
    };
  }
}
