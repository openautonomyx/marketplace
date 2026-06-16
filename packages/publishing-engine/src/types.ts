import type { Skill, SkillPublisher } from "@oax/context-engine";

/**
 * Open multi-vendor publishing.
 *
 * Anyone can become a seller and list a skill. The skill is the unit of value
 * that is traded; the marketplace's job is to make that value *trustworthy* by
 * routing every listing through evaluation, benchmarking, certification, and
 * signing before it is listed.
 */
export interface Seller extends SkillPublisher {
  contact?: string;
  registeredAt: string;
}

/** Where a listing sits in the publishing pipeline (before certification). */
export type ListingStatus = "draft" | "submitted" | "listed" | "rejected";

export interface SkillListing {
  id: string;
  seller: Seller;
  skill: Skill;
  status: ListingStatus;
  submittedAt: string;
  /** Reason, when rejected. */
  reason?: string;
}
