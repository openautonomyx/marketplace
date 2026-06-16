import type { SkillContract } from "@oax/signature-engine";
import type { SkillRegistryEntry } from "@oax/registry-engine";

import { findEntries, recommend, selectBest } from "./select";
import { verifyEntry } from "./verify";
import type {
  ConsumptionCriteria,
  SkillRecommendation,
  VerificationResult
} from "./types";

/**
 * A consuming platform's view over a set of certified marketplace registry
 * entries. This is the seam the platform uses instead of re-deriving trust: it
 * reads the marketplace's certified, signed, performance-in-context entries and
 * selects against them.
 */
export class MarketplaceConsumer {
  constructor(private readonly entries: SkillRegistryEntry[]) {}

  /** All entries currently known to the consumer. */
  all(): SkillRegistryEntry[] {
    return [...this.entries];
  }

  /** Entries matching the criteria, unranked. */
  find(criteria: ConsumptionCriteria = {}): SkillRegistryEntry[] {
    return findEntries(this.entries, criteria);
  }

  /** Ranked, explainable recommendations (best first). */
  recommend(criteria: ConsumptionCriteria = {}): SkillRecommendation[] {
    return recommend(this.entries, criteria);
  }

  /** The single best recommendation, or undefined if none match. */
  best(criteria: ConsumptionCriteria = {}): SkillRecommendation | undefined {
    return selectBest(this.entries, criteria);
  }

  /** Verify an entry (optionally against its original signed contract). */
  verify(
    entry: SkillRegistryEntry,
    opts: { contract?: SkillContract } = {}
  ): VerificationResult {
    return verifyEntry(entry, opts);
  }
}
