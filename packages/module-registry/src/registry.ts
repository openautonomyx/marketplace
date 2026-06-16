import type { MarketplaceModule, ModuleKind } from "./types";

/**
 * A runtime registry of marketplace modules. Ids are unique: registering the same
 * id twice throws, mirroring Apache's "more than one MPM loaded" guard.
 */
export class ModuleRegistry {
  private readonly modules = new Map<string, MarketplaceModule>();

  register(module: MarketplaceModule): this {
    if (this.modules.has(module.id)) {
      throw new Error(`Module already registered: ${module.id}`);
    }
    this.modules.set(module.id, module);
    return this;
  }

  registerAll(modules: MarketplaceModule[]): this {
    for (const m of modules) this.register(m);
    return this;
  }

  has(id: string): boolean {
    return this.modules.has(id);
  }

  get(id: string): MarketplaceModule | undefined {
    return this.modules.get(id);
  }

  list(): MarketplaceModule[] {
    return [...this.modules.values()];
  }

  listByKind(kind: ModuleKind): MarketplaceModule[] {
    return this.list().filter((m) => m.kind === kind);
  }

  get size(): number {
    return this.modules.size;
  }
}
