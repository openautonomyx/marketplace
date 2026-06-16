/**
 * A pluggable marketplace module.
 *
 * Inspired by Apache's modular design (LoadModule): the marketplace is composed
 * of registered modules — engines, actions, and views — that can be enumerated at
 * runtime and published as a directory. A consumer can discover what the
 * marketplace can do without bespoke integration.
 */
export type ModuleKind = "engine" | "action" | "view" | "tool";

export interface MarketplaceModule {
  /** Unique module id, e.g. "engine.certification" or "action.evaluate". */
  id: string;
  kind: ModuleKind;
  name: string;
  version: string;
  description: string;
  /** The capability the module provides, when applicable. */
  capability?: string;
}
