import { defaultRegistry } from "./modules";
import { ModuleRegistry } from "./registry";

/** JSON-LD context for the marketplace module directory. */
export const MODULE_CATALOG_CONTEXT = [
  "https://schema.org",
  "https://schema.openautonomyx.com/module/v1"
];

/**
 * Render a registry as a JSON-LD ItemList — a discoverable directory of the
 * marketplace's modules, analogous to a project directory.
 */
export function catalogJsonLd(
  registry: ModuleRegistry = defaultRegistry()
): Record<string, unknown> {
  return {
    "@context": MODULE_CATALOG_CONTEXT,
    "@type": "ItemList",
    name: "OpenAutonomyX Marketplace module directory",
    itemListElement: registry.list().map((m) => ({
      "@type": "SoftwareApplication",
      identifier: m.id,
      name: m.name,
      applicationCategory: m.kind,
      softwareVersion: m.version,
      featureList: m.capability,
      description: m.description
    }))
  };
}
