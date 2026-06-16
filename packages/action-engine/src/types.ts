/**
 * Agent actions = marketplace capabilities, made declarative.
 *
 * Each engine capability (fit, evaluate, benchmark, certify, sign, trust,
 * register) is exposed as an AgentAction: a JSON-LD-describable, model-agnostic
 * unit of work an agent can discover and invoke. "Model-agnostic" means the
 * action is defined by its capability and I/O contract, not by which model runs
 * the agent — any model can drive it.
 */

export type ActionCapability =
  | "context-fit"
  | "evaluate"
  | "benchmark"
  | "certify"
  | "sign"
  | "trust"
  | "register";

/** A minimal JSON-Schema-shaped object describing an action's I/O. */
export type JsonSchema = Record<string, unknown>;

/** The declarative descriptor for an action (no behavior). */
export interface AgentActionDescriptor {
  "@type": "Action";
  id: string;
  name: string;
  capability: ActionCapability;
  description: string;
  /** Always true: the action is defined by capability + contract, not by model. */
  modelAgnostic: true;
  input: JsonSchema;
  output: JsonSchema;
}

/** An action descriptor plus its executable handler. */
export interface ActionDefinition extends AgentActionDescriptor {
  run: (input: unknown) => unknown;
}

/** The result of invoking an action. */
export interface ActionResult<T = unknown> {
  actionId: string;
  capability?: ActionCapability;
  ok: boolean;
  output?: T;
  error?: string;
  ranAt: string;
}
